# Walk Phase 3 거리 엔진과 물리 QA 후보 계약

## Source of Truth

- 승인 기반: Phase 1 `e59360d9ce0b685868850dbd2a1fb3bbfbda78a3`, Phase 2 최종 `ede37a36d5369fede9ff26b161866a3cc6f9e6db`, tree `a0a92679c0bddd3e3db23939dd47da9dca0e9edc`.
- 구현 위치: `codex/walk-phase3-distance-engine` 전용 worktree. 원본 dirty 181개는 복사·수정·stage하지 않는다.
- 이번 경계는 Phase 3A/B 구현과 집 안 준비 검증이다. 실제 1km 거리 정확도, 정지 10분 drift, 60분 성능 판정은 별도 Phase 3C/D다.
- 상태는 `IMPLEMENTED_PENDING_PHYSICAL_QA` 후보이며 Phase 3 전체 동결이나 Phase 4 승인과 다르다. 실제 보행 재개 승인 전 자동 GPS 야외 테스트를 하지 않는다.
- 증적은 repo 외부 `~/.codex/nuri-walk-evidence/phase3-distance-20261014-yDizss/`에 저장한다. raw/simplified 실제 좌표나 암호화 DB를 이 root에 복사하지 않는다.

## Native Ownership

`WalkForegroundService → ordered Fused samples → WalkDistanceEngineV1 → encrypted Room → bounded bridge`가 거리 owner다. Map SDK, React, Zustand, JS timer는 거리 원본이 아니다.

- Android `Location.distanceBetween`의 WGS84 meter 결과를 Double로 누적한다. 개별 edge를 integer로 반올림하지 않는다.
- bridge는 bounded decimal string, quality와 버전만 보낸다. Phase 3에서는 서버 finish payload/RPC를 만들지 않으므로 integer payload rounding은 아직 호출하지 않는다. Phase 4 payload 경계에서 누적값을 1회 변환하고 Phase 1 계약을 유지해야 한다.
- `measuredDistanceM`은 구조적으로 유효한 ordered sample 사이의 진단용 거리다. accuracy/speed/jump 거부나 정지 억제와 무관한 원시 이동을 포함할 수 있으며 보상 대상이 아니다.
- `acceptedDistanceM`은 local filtered 후보이며 `ACCEPTED_SERVER`가 아니다. local recommendation도 `ELIGIBLE_CANDIDATE` 또는 `INELIGIBLE_CANDIDATE`뿐이다.
- fixed terminal disposition 7개의 합이 quality total과 일치한다. Phase 1 quality keys를 늘리거나 의미를 바꾸지 않는다.
- quality `segmentCount`는 accepted route point가 실제 존재하는 segment 수다. Phase 2 root `segmentCount`는 acquisition epoch 수로, 아직 point가 없는 epoch도 포함할 수 있다.

## Algorithm 1 / Policy 1 Freeze

아래는 물리 QA 이전 후보 정책이다. 실제 보행 오차가 허용 기준을 만족했다는 뜻이 아니다. 물리 실패 근거 없는 수치 완화는 금지한다.

| 항목 | 후보 값 |
|---|---|
| Maximum accuracy | 25m |
| Stale sample | 15s |
| Wall sanity skew | 120s; timestamp 2000~2099 범위 |
| Duplicate | 동일 monotonic timestamp와 좌표; 같은 timestamp 다른 좌표는 timestamp 거부 |
| Maximum plausible speed | 8.5m/s; reported speed와 accuracy-adjusted displacement 모두 검사 |
| Jump | max(60m, elapsed × 8.5m/s + accuracy uncertainty) 초과 |
| Reacquisition | jump 이후 다음 fresh point 새 segment, 이전 anchor 거리 0 |
| Accuracy uncertainty | 이전·현재 accuracy 합 × 0.45 |
| Stationary radius | uncertainty를 1.25~10m로 제한 |
| Stationary observation | 최대 6 points, net/path ≥0.75, 최소 6s 또는 radius ×1.6 고신뢰 이동 |
| GPS gap | 45s 초과; 기간을 중복 집계하지 않으며 다음 fresh point 새 segment |
| Simplification | segment별 deterministic RDP 2m, 35° 이상 turn 강제 보존 |
| Length guard | 원본 filtered length 대비 편차 ≤1.5%; 초과하면 그 bounded chunk를 그대로 유지 |
| Projection | 512 points/page, 1Hz event, chunk cursor 이전/다음/최신 이동 |
| Capacity | 200,000 fixes, 10,000,000m, 음수·non-finite·overflow fail-closed |
| Local quality candidate | accepted fixes ≥10, distance ≥50m, active ≥60s, rejection ratio ≤0.5, gap ratio ≤0.3, max gap ≤120s |
| Mock / old Phase 2 session | 항상 INELIGIBLE_CANDIDATE; 진위 판정이나 과거 거리 소급 없음 |

GPS speed만으로 저속 차량과 달리기를 완전히 구별할 수 없다. 빠른 차량/teleport synthetic 거부와 실제 이동 진위 보장은 구분한다. 서버 accepted 검증은 Phase 4 범위다.

## Encrypted Checkpoint and Boundaries

- Room 1→2는 sessions에 nullable distance envelope/revision, point chunks에 accepted/routeSegment, encrypted QA protocol table을 additive 추가한다. destructive migration은 없다.
- 기존 metadata envelope, command receipt, old point bytes, WALKING/PAUSED/FINISHED_LOCAL/RECOVERY_REQUIRED 상태를 보존한다.
- 이전 Phase 2 session의 distance envelope 부재는 legacy 상태이며 과거 point로 거리를 새로 채우지 않는다. corruption은 거리 0으로 reset하지 않고 stable error로 중지한다.
- 매 sample에서 quality/route flag/distance envelope를 같은 Room transaction으로 갱신한다. FINISH에는 accepted route count와 quality accepted count의 일치를 검사한다.
- pause는 subscription 중지와 거리/point 0 증가. resume, process loss recovery, reboot recovery, GPS gap, jump reacquisition에서 anchor를 새로 만들며 unseen bridge distance는 0이다.
- process/reboot 이후 `RECOVERY_REQUIRED`, 자동 FGS/위치 수집 없음. visible user action으로만 재개한다. 기존 Phase 2 lifecycle을 재설계하지 않는다.

## Bounded Map

- 기존 `react-native-maps`, Google provider, 기존 Maps key 입력만 사용한다. Directions/Places/live broadcast 없음.
- MapView 자체의 location source는 꺼둔다. owner-authorized filtered marker와 segment별 Polyline만 표시한다.
- raw/unfiltered history, arbitrary file API, coordinate injection, encryption metadata는 bridge로 내보내지 않는다.
- 한 page에 511 new points + 같은 segment overlap 1개를 포함한다. 전체 경로는 native에 남고 cursor pagination으로 접근한다. point bound 때문에 route 끝을 잘라 버리지 않는다.
- drag는 FREE_LOOK, 명시적인 내 위치 버튼은 FOLLOW. 새로운 fix는 FREE_LOOK을 덮어쓰지 않는다.
- 공개 서울 합성 경로는 지도 렌더링 control일 뿐이며 distance engine/DB/거리 보상으로 주입하지 않는다. 실제 경로를 스크린샷으로 남기지 않는다.
- Store에서는 `NURI_SECURITY_QA=false`, panel/route bridge/wizard disabled. 제품 Walk UI와 계절 디자인은 미구현이다.

## Self-Contained Wizard

- READINESS는 집 안 기능 점검 1 step과 CLEANUP이다. reference 0은 정확도 측정이 없다는 의미이지 1km 성공 값이 아니다.
- PHYSICAL은 STATIONARY, OPEN_1, OPEN_2, URBAN_1, URBAN_2, REBOOT, CLEANUP이다. 독립 reference label과 meter만 받고 주소/기준 route 좌표는 받지 않는다.
- 표준 status는 NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED, SKIPPED_WITH_REASON이다. protocol/command/session 연결은 encrypted Room에 durable 저장한다.
- start UUID를 먼저 persist한다. 죽은 프로세스의 reservation을 복구해 같은 UUID로 retry한다. finish UUID/revision도 persist하고 runtime idempotency를 재사용한다.
- OPEN_2는 pause, URBAN_1은 3 turns, URBAN_2는 45s gap 및 여러 segments, REBOOT는 이전 checkpoint + 수동 recovery + 새 boot segment 증거를 요구한다.
- 실제 보행 시작은 PO 별도 승인 후다. unsafe/reschedule/GPS unavailable은 이유 있는 skip이지 PASS가 아니다.
- 종료마다 random receipt ID, meter/quality/performance/result/stable code와 canonical SHA-256을 저장한다. receipt checksum은 인증/서명 프로토콜이 아니다.
- export는 앱 전용 external files의 random protocol JSON이며 safe allowlist로 재구성한다. user/pet/session 원문 ID, 좌표, route bytes, local DB path, token은 없다. GET은 encrypted current state에서 export를 복구할 수 있다.
- QA map 닫기/owner 변경 시 구독 해제, 늦은 응답 폐기, JS route page 제거. 서버 데이터는 수정하지 않는다.
- readiness 종료는 즉시 own QA session/chunks/command receipts만 atomic cleanup한다. 실제 보행 raw route는 귀가 후 검토·정리 승인까지 encrypted device 안에 보존한다. PHYSICAL cleanup은 review flag 없으면 거부한다.
- sanitized receipts와 algorithm/policy evidence는 cleanup 후에도 남는다. 다른 Phase 2 session/기록은 삭제하지 않는다.

## Performance Recorder Limits

- 30s native sample + finish 강제 sample, 배터리 시작/끝/최대 온도, thermal peak, process CPU, PSS 시작/끝/peak, RSS peak, native heap 시작/끝/peak, screen on/off와 background summary를 기록한다.
- process-local CPU/frame counter 초기화는 구분하며 이전 프로세스 값을 빼서 음수를 만들지 않는다. 표본 사이 screen-state 변화는 30s 양자화 한계가 있다.
- frame은 app Choreographer/vsync 추정이다. Google Maps Surface/GPU frame timing을 측정했다고 주장하지 않는다.
- public Hermes Release JS heap API가 없어 JS heap은 unavailable metadata로 남긴다. private debugger/global inspection을 추가하지 않는다.
- 60분 battery/CPU/memory regression 판단은 Phase 3C/D다. 개발·성능 관찰을 이유로 batterystats 또는 기기 설정을 reset하지 않는다.

## Validation and Release Boundaries

- Native behavioral fail-first는 400m square turn 누락이었다. stationary confirmation이 corner를 지워 high-confidence short movement 조건을 중앙 policy에 추가했다. compile/module absence를 behavioral evidence로 계산하지 않는다.
- bridge behavioral fail-first는 Phase 2 decoder의 new candidate summary 거부였다. typed additive decoder로 해결했다.
- local gates: Phase 1 regression, affected Phase 2, pure native engine/trajectory/simplification, Android migration/persistence/wizard receipt, map UI, TypeScript, scoped ESLint, manifest/secret/log scan.
- 최종 3A/B source에서 Full Jest 1회. local PASS 후 Phase 3 파일만 commit하고 QA Release 1회/install-r 1회; instrumentation test APK는 별도 보조 산출물이다.
- 실제 Full gate 이력: 첫 실행은 ignored runtime config 미연결로 46 suite 로딩 실패였다. PO 추가1회 승인 후 기존 Phase2 입력의 읽기 전용 link로 최종239 suites/2587 tests PASS, 총2회다. 설정값 출력/복사0과 입력 hash 보존을 확인하고 link를 제거했다. 첫 실패는 final PASS와 별도 보존한다.
- 집 안 native QA는 map loading/marker/polyline/camera/pause/resume/durable wizard/receipt/process restart/짧은 screen-off/cold start만 닫는다. 야외 정확도·reboot 물리 재검증은 이번 readiness 결과에 포함하지 않는다.
- rollback은 Phase 2 approved APK로 install-r할 수 있으나 Room version2 device에서 version1 binary를 실행하면 downgrade 오류가 날 수 있다. destructive downgrade/clear data는 금지한다. additive schema2-compatible rollback 후보가 필요하면 별도 승인한다.
- 기존 Security 20/20 baseline은 유지한다. 새 위치/거리/local persistence/QA export surface는 최종 source freeze 후 Re-Audit 대상이며 Store 승인으로 확대하지 않는다.

## Next Exact Work

Physical QA Readiness Report 후 STOP. PO가 실제 보행 재개를 명시 승인하면 independent OPEN/URBAN reference를 입력하고 앱 wizard로 수행한다. Phase 4, server, XP, Level, record CTA, 최종 UI는 시작하지 않는다.

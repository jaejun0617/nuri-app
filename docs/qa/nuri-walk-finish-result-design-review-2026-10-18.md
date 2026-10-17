# Walk 종료 확인·기기 저장 완료 디자인 검토

## 현재 판정

- 2026-10-18 PO 시안 승인과 후속 지시를 반영한 Metro 디자인 후보다. Release 또는 Phase 3 전체 완료가 아니다.
- 작업 worktree: `/Users/shinjaejun/.codex/worktrees/mint-background-review/nuri`.
- HEAD: `829a72ecf0b23a2ddfd490e0e5980fc28ce817a2`, committed tree: `719aa7298504744cfe9c54efa2ac85c22d46d182`. 이번 변경은 미커밋이며 기존 산책 전·쉬기 시트 변경을 보존한다.
- 거리 엔진·native/Room/FGS·Wizard protocol·서버·RecordCreate·Timeline·XP 변경은 없다. 실제 산책과 서버 승인·기록 저장을 실행하지 않았다.

## 구현 계약

### 종료 확인

- `WalkActionSheet`가 기존 쉬기 시트의 측정 높이 기반 380ms native ease-out 진입·260ms 퇴장, swipe/Back/바깥 터치, reduced motion, background 정리와 중복/실패 경계를 공유한다. `WalkRestSheet`는 기존 세 줄과 동작을 유지하는 wrapper다.
- `WalkFinishSheet`는 별도 중앙 흰 패널 대신 지도 위 하단 시트다. PO가 작다고 지적한 삽화는 176x88dp에서 최대 264dp/2:1로 1.5배 확대했다. 폭이 작은 화면에서는 가로 100% 범위 안에서 축소한다. 잘라내거나 찌그러뜨리지 않는다.
- `오늘 산책, 기분 좋게 마칠까요?`, 함께 걸은 거리, 산책 시간, 의미상 빨간 `산책 마치기`, 보조 `계속 걷기`만 남긴다. 날씨·평균 속도·일반 품질 설명은 제거한다.
- 종료는 기존 native/Wizard 명령만 호출한다. native 성공 전 시트를 먼저 닫지 않으며 실패하면 값과 확인 상태를 유지해 재시도한다. Back은 종료 명령을 실행하지 않는다. 활성 시간은 기존 표시 계약대로 흐르고 PAUSED에서 연 확인은 멈춘 시간을 유지한다.
- native observer가 외부 종료 또는 세션 교체를 알리면 이전 확인 flag를 정리해 다음 산책에 재등장하지 않는다. 이 경계 두 건도 fail-first 후 검증했다.

### 기기 저장 완료

- `WalkLocalResult`는 지도를 기본으로 마운트하지 않는 흰 단독 결과 화면이다. 결과 제목은 `우리, 오늘도 잘 다녀왔어요!`, 보조 문구는 동적 펫 이름을 넣은 `누리와 남긴 소중한 발자국`이다. `산책 결과를 기기에 저장했어요.`는 정확한 저장 경계 안내로 유지한다.
- PO 후속 요청으로 삽화의 화면 높이 비례 제한을 없앴다. 가로 padding 없이 화면 100% 폭과 원본 1402:1122 비율로 표시해 좌우 여백을 줄이며, `contain`을 유지해 동물을 잘라내지 않는다.
- 제목 17/25sp, 시트 제목 16/24sp, 수치 22/30sp, 지표 라벨 11/17sp, 보조/경로 문구 12/18~19sp, 버튼 13/20sp다. CTA 최소 48dp, 긴 이름은 줄바꿈하며 고정 줄 수로 자르지 않는다.
- `걸어온 길 보기`를 누르면 기존 bounded map만 펼친다. ScrollView의 실제 content-size 변경 뒤 한 번만 부드럽게 아래로 이동한다. 반복 layout 갱신이나 접기는 자동 스크롤하지 않는다. reduced motion은 애니메이션 없이 이동한다. 지도 높이는 최대 240dp이고 작은 viewport에서는 `viewport - 16dp` 이내로 줄여 footer 아래에 잘리지 않게 한다.
- 실제 페이지에 앞/뒤 구간이 남으면 `경로 일부를 표시하고 있어요.`를 표시한다. 전체 route를 새로 복제하거나 무제한 조회하지 않는다. 경로가 없으면 버튼을 비활성화하고 가짜 지도를 만들지 않는다.
- 품질 확인이 필요한 typed recommendation일 때만 주의 안내를 추가한다. 서버 저장·Lifetime·Level·XP·일반 기록 완료를 주장하지 않는다. 종료 action은 기존 QA 산책 화면 닫기이며 홈 이동이나 RecordCreate를 새로 연결하지 않는다.

### 계절·강조·미리보기

- 가을만 승인 시안을 바탕으로 종료용 2:1, 결과용 1402x1122 투명 삽화 두 개를 생성했다. 원본과 전체 prompt/hash는 `src/assets/images/walk/finish-result-autumn-v1.source.json`에 보존한다. 봄·여름·겨울은 기존 해당 계절 산책 전 삽화를 재사용하며 가을 fallback은 없다.
- 핵심 제목·수치·경로 열기는 산책 전 화면과 동일한 weather accent의 기존 deep tone을 쓴다. 봄 `#B54C66`, 여름 `#146341`, 가을 `#BF4518`, 겨울 `#0A4578`이다. 활성 화면/쉬기 제목의 dark surface에서는 같은 palette의 기존 glow tone을 사용한다. CTA와 오류/종료의 의미 색상은 바꾸지 않는다.
- 최신 PO 지시로 산책 화면의 `합성 미리보기`·`합성 경로 · 내 펫`·`합성 결과` 표시와 전환 버튼의 해당 문구를 제거했다. 내부 preview/actual 상태·공개 gallery의 익명 펫·경로 분리·QA compile-time gate는 유지한다. 실제 위치 디자인 검토 안내는 별개의 경계이므로 유지한다.

## 검증

- 최종 session-boundary 소스: targeted 15 suites / 451 tests PASS. 이전 레이아웃의 15/447 및 전체 폭 단계의 15/449는 별도 receipt이며 최종 결과로 대체하지 않는다.
- TypeScript PASS, 대상 source/test ESLint 0 errors / 0 warnings, 새 파일의 좌표/토큰/로그 패턴 검색 0, 산책 presentation의 제거 대상 문구 검색 0이다.
- fail-first는 초기 두 화면 계약, 종료 실패/즉시 Back, content-layout 후 자동 스크롤·동작 줄이기·작은 viewport·계절 강조, 삽화 확대와 전체 폭을 나눠 수행했다. 기존 화면의 날씨/합성 라벨/버튼 wrapper 기대만 승인된 디자인에 맞게 수정했으며 모드·사진/소유권·native 호출 방어 검사는 유지한다.
- 이번 Full Suite 실행 0. 과거 Full PASS를 최신 소스의 Full 또는 Release gate로 주장하지 않는다. Build/install/commit/push 0, STORE HOLD다.

## S24 증적

- 외부 root: `/Users/shinjaejun/.codex/nuri-design-evidence/walk-finish-result-implementation-20261018-wVD6nu`.
- `finish-confirm-autumn-large.png`: 확대된 최종 확인 시트. `finished-local-{spring,summer,autumn,winter}-wide.png`: 최종 원본 비율·전체 폭 결과 화면. 각각 1080x2340 원본과 hash/readback receipt를 보존했다. 이전 크기 캡처는 덮어쓰지 않고 별도로 남겼다.
- `finished-route-autumn.png`는 기존 폭 단계의 증적이며 `finished-route-autumn-wide.png`는 최종 전체 폭 후 같은 동작을 재확인한 증적이다. 두 단계 모두 펼침 한 번 뒤 수동 스크롤 없이 지도 전체 프레임이 보인다.
- 화면 라벨 대신 inspector의 `PUBLIC_SYNTHETIC` 값을 먼저 확인하고 명시적인 공개 gallery 선택 뒤에만 촬영했다. service OFF, 실제 위치/프로필/좌표 캡처 0, 실제 종료·저장 명령 0이다.
- 폭 수정 중 훅 제거에 따른 Fast Refresh 훅 순서 오류가 나서 캡처 guard가 차단했다. Metro reload만으로 재진입해 정상 공개 화면을 확인했으며 재설치나 runtime 수정은 없었다. 메뉴의 화면 밖 접근성 노드는 유효 bounds 검사를 보강해 조작 대상에서 제외했다. 실패한 촬영 시도는 파일을 저장하지 않았다.
- 최종 폰트 1.3·긴 이름·reduced motion은 로컬 계약 검증이다. 이번 실제 기기 글꼴 설정 변경·화면 낭독기·native 실패 재현·야외 정확도·프레임 시간 계측은 미수행이다.

## 타임라인 연결 구현 계획: 이번에는 미구현

기준은 기존 [동결 아키텍처](../domains/산책-위치기반-기능/nuri-walk-experience-final-architecture-freeze.md)의 reward separation이다. 재설계하지 않는다.

### 현재 실제 소스

- `src/navigation/RootNavigator.tsx`의 RecordCreate params에는 pet/category/returnTo만 있고 walk session 입력 계약은 없다.
- `src/screens/Records/RecordCreateScreen.tsx`는 `createMemory` 후 `recordTimelineCreateActivity`를 호출하고 로컬 목록 upsert·방금 기록 focus·이미지 업로드/보상 안내·성공 navigation을 처리한다. 일정 연결용 draft/recovery는 이미 있으므로 그 패턴을 검토해 GPS session scope로 확장하되 혼용하지 않는다.
- `src/services/activity/timelineActivity.ts`는 walk memory에 대해 `timeline_walk_post` streak와 `walk_timeline_post`/`timeline_memory`/memory ID 보상을 기존 RPC에 전달한다. Promise.allSettled인 best-effort 후처리이므로 그대로 GPS 정산 transaction이라고 부를 수 없다. 삭제는 walk activity만 제거하고 XP clawback을 새로 수행하지 않는다.
- repo 최신 source-once migration `20261009173033_security_sec017_source_once.sql`은 소유권/source 검증, 계정 직렬화, 원본 source 재지급 차단, walk 두 경로의 펫별 KST 일일 3회 합산 제한을 유지한다. 보상량은 level과 일일 예산에 달라질 수 있으므로 확정 XP 숫자를 CTA에서 보장하지 않는다. 운영 remote catalog는 이번에 조회하지 않았으며 동일 반영 여부는 미확인이다.
- Phase 1 `src/services/walk/domain/recordPolicy.ts`에 이미 서버 승인 조건·GPS bonus 0·단일 claim·원본 memory 반환·삭제 후 재생성 금지·정산 실패 rollback 계약이 있다. 순수 정책 PASS를 실제 DB lock/배포 완료로 혼동하지 않는다.

### 권장 순서

1. Phase 3 잔여 QA 승인 이후, 계획된 서버 승인/outbox 경계를 먼저 구현한다. `FINISHED_LOCAL`은 기기 결과이고 `ACCEPTED_SERVER` 중 progression-eligible인 삭제되지 않은 session만 canonical 거리에 기여한다. 품질상 progression-ineligible이지만 accepted된 session의 일반 기록 허용과 거리 제외를 구분한다. `finish_walk_v1`은 소유권·재전송·중복·겹침·품질을 검증하되 memory/Account XP는 생성하지 않는다. 관련 remote drift/RLS·실패/오프라인·여러 기기 경계를 먼저 검증한다.
2. 이후 기존 RecordCreate에 GPS 연결 모드를 추가한다. navigation은 session ID와 return target만 전달하고 owned accepted session summary를 다시 읽는다. 펫·거리·시간·source·session ID는 읽기 전용, 제목/메모/사진/태그는 기존 폼을 재사용한다. owner+pet+session 단위 draft를 보존하고 오프라인일 때 record 완료를 가장하지 않는다.
3. `create_walk_memory_from_session_v1`에서 memory+영구 claim+기존 daily activity+기존 XP RPC 결과를 한 transaction으로 정산한다. session/original memory UNIQUE와 기존 ledger source-once를 함께 사용한다. 재시도·두 번 탭·다른 기기는 원래 memory/정산 결과를 반환하며 0 XP 유효 정산도 claim을 소비한다. GPS 모드의 클라이언트 `recordTimelineCreateActivity` 재호출은 하지 않는다. manual 경로·기존 XP/streak/count는 그대로 둔다.
4. 실제 memory 저장 후에만 기존 upsert/focus/navigation으로 Timeline에 표시한다. 연결된 summary/reference만 사용하고 route bytes를 memory metadata에 복제하지 않는다. 기록을 건너뛰면 Timeline 기록/Account XP는 없지만 accepted GPS progression은 유지된다. 나중에 기록은 linked memory/영구 claim 존재에서 파생하고, 목록 삭제 후 재생성으로 XP를 반복 획득하지 못하게 한다.

서버·폼·타임라인 연결의 구현 승인과 remote 검증 없이 현재 결과 화면에 실제 기록 CTA를 활성화하지 않는다.

## 보존·다음

- 원본 repository dirty 181, HEAD/status/content hash 일치. staged 0, native/거리/서버/기존 활동·기록 source diff 0이다. 기존 signing/account/user data와 보안 source baseline을 보존하며 보안 20항목 실기기 재실행은 하지 않았다.
- 잔여 타이머 간헐적 2초 점프와 URBAN 기준 미정은 그대로다. 야외 QA/Phase 4를 자동 시작하지 않는다.
- project-memory 현재 상태/최근 로그/다음 우선순위 및 presentation domain에 이 최신 경계를 추가했다. release checklist는 변경하지 않는다.
- 다음 단일 단계는 PO의 두 화면 Metro 시각 검토다. Metro 유지, 기기 제어 STOPPED, build/install/commit/push 보류, STORE HOLD다.

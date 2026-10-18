# Walk 계절 삽화·공통 안내와 잔여 5화면 시안

## 현재 판정

- 후속 PO 지시로 Metro를 종료했다. 이 작업 소유 PID97765의 실행 인자·worktree를 확인하고 SIGTERM으로 종료했으며8081 listener0이다. 아래 Metro ON은 구현/검증 종료 당시의 이력이고 현재 상태는 Metro OFF·기기 제어 STOPPED·5시안/추가 작업 보고 후 PO 대기다. 추가 source 수정·QA·build/install·commit/push는 없다.

- PO가 승인한 디자인 구현·개발용 빌드/교체 설치 1회와 공개 S24 검증을 완료한 Metro 후보다. Release·최종 디자인 동결·실제 산책 완료가 아니다.
- Worktree `/Users/shinjaejun/.codex/worktrees/mint-background-review/nuri`, branch `codex/walk-common-design-review-20261018`, base HEAD `eacc5cb61abbf5ad71c6c868858294f54ada8566`, committed tree `a49f35a600ea6e9b84b3f7c49a30ae7dc565a3c3`다. 변경은 미커밋이고 staged0이다. 빌드 시점14경로는 `validated-source.json`, 최종14경로는 `validated-source-post-context.json` SHA256으로 식별한다. 차이는 Panel의 일반 오류 중첩 방어와 그 테스트뿐이다.
- Evidence root: `/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE`. 기존 실패·캡처·승인 APK를 덮어쓰지 않는다.
- 최종 판정 receipt는 이 root의 `FINAL-CLOSEOUT.json`이다. 앞 단계 `closeout-checks.json`과 최초 캡처도 이력을 위해 보존하며 최종 소스 판정과 섞지 않는다.

## 적용한 범위

### 세 계절 전용 종료·결과 삽화

- 봄·여름·겨울 각각 종료 확인용과 기기 결과용, 총6개 투명 PNG를 built-in image_gen으로 생성했다. 이제 산책 전 이미지를 재사용하지 않는다. 봄은 벚꽃/꽃밭, 여름은 초록 그늘/소풍, 겨울은 눈/목도리의 산책 후 쉬는 장면이다.
- 자산 경로는 `src/assets/images/walk/finish-confirm-{spring,summer,winter}-v1.png`와 `finished-local-{spring,summer,winter}-v1.png`다. 전체 prompt·원본 경로·크기·hash는 같은 폴더의 `finish-result-seasonal-v1.source.json`이 소유한다. 각 파일을 앱 내부 경로로 복사했으며 생성 원본도 보존한다.
- 가을 원본 두 파일의 Git blob과 현재 bytes 일치 PASS. 기존 산책 전 삽화·날씨·강조색·카피·폰트·CTA·거리/시간 계산은 바꾸지 않는다.
- PO의 후속 크기 지시에 따라 가을을 기준으로 네 계절의 실제 UI bounds를 대조했다. 결과 이미지 영역은 모두 `[0,290][1080,1154]`로 좌우 inset0, 제목은 `[68,1212][1013,1283]`다. 종료 확인 이미지 영역은 모두 `[169,1003][911,1475]`, 제목은 `[67,1509][1012,1577]`다. 거리/시간 그룹 위치까지 모두 동일하다. `seasonal-geometry.json`이 각 계절의 전체 비교를 보존한다. 그림의 자세·잎/눈 윤곽은 계절별로 다르며 그림 자체의 픽셀 동일성을 주장하지 않는다.
- 기존 결과 프레임의 전체 폭·1402:1122, 확인 프레임의 최대264dp·contain과 안전 영역을 유지한다. 이미지 찌그러짐·동물 잘림은 공개 S24 캡처에서 발견되지 않았다.

### 공통 안내

- `WalkNoticeSheet`는 기존 `WalkActionSheet`의 측정 높이 기반380ms native ease-out 진입·260ms 퇴장·Back/바깥 터치/swipe·동작 줄이기·busy 방어를 재사용한다. 새 animation dependency나 native 동작은 없다. 제목16/24sp·본문13/21sp·기존 계절 강조/테마·48dp 액션을 사용한다.
- 화면 닫기는 기록 중·일시정지·복구 대기를 구분한다. 기록 중에만 계속 기록된다고 설명하며, 나머지는 멈춤 유지와 명시적 재개를 안내한다. 닫기는 화면만 닫고 pause/resume/finish 명령을 호출하지 않는다.
- 기존 stable code로 위치 권한/정확한 위치 필요, 위치 서비스 꺼짐, 일반 요청 실패를 구분한다. 위치 설정은 실제 모드에서 명시적으로 누를 때만 연다. 요청 실패의 기본 동작은 snapshot 확인이며 실패했던 변이 명령을 자동 재실행하지 않는다. 원문 오류·좌표·사용자 식별값을 안내에 출력하지 않는다.
- 공개 QA에는 위6종을 독립적으로 검토하는 fixture를 추가했다. 이 모드의 버튼은 실제 설정이나 native 변이를 실행하지 않는다. 실제 권한/기기 설정을 바꾸는 QA는 하지 않았다.
- 최종 검토에서 종료·재개 실패의 기존 retry 시트 위에 일반 요청 실패 시트가 겹치는 결함을2개 실패 assertion으로 재현했다. 이 경우 기존 시트가 오류 문맥을 소유하고, 닫은 뒤에도 대기 중 일반 시트가 새로 뜨지 않게 최소 보정했다. 별도 권한/위치 서비스 안내와 일반 화면의 snapshot 확인은 유지한다. native 실패 경계는 mocked bridge 검증이며 기기에서 실제 실패를 강제하지 않는다.
- 쉬기 시트를 닫은 PAUSED 화면에는 기존 `시간과 거리 기록을 멈췄어요`와 작은 계절색 세로 강조를 유지해 걷는 중과 구분한다. 시간/거리 소스·재개/종료 CTA 계약은 그대로다.

## 검증

- 최초 계약 fail-first는5 fail/1 pass로 `fail-first.json`, 오류 중첩2개 실패는 `context-error-fail-first.json`에 보존했다. 최종 presentation5 suites/209 tests(`targeted-context-final.json`), 기존 엔진/bridge/pre-walk/weather/timer 회귀12 suites/272 tests PASS다.
- Full Suite 총2회다. 최초 구현 `full-suite.json` 268 suites/3328 tests PASS 이후 오류 중첩을 보정했다. 최종 코드의 `full-suite-post-context.json`도 **268 suites/3328 tests PASS**, 실패0이다. 두 실행 모두 필터 없는 canonical Jest다. 마지막 실행 이후 코드/앱 자산 변경0이며 문서와 외부 증적만 정리했다.
- TypeScript PASS, 변경 source/test ESLint0 errors/0 warnings, whitespace PASS, 외부 helper syntax PASS, scoped secret guard0이다. 거리 엔진·native/Room/FGS·Wizard protocol·timer·navigation·성능 corrective·서버/기록/XP diff0을 별도로 확인했다.
- Public S24에서 새6개 삽화·가을 기준2화면·공통 안내6종·Back 닫기·시트 닫은 PAUSED 표시를 확인했다. 네 계절 이미지/제목/거리/시간 geometry 일치 PASS다. 최초 검증 후5화면을 촬영해 시안을 생성했고, 오류 중첩 보정 뒤 공통6종/Back/PAUSED를 재확인한 `device-design-validation-post-context.json` 이후 최종5캡처를 갱신했다. 삽화·화면 geometry는 보정하지 않았다.
- 실제 native 거절/실패·재시도 경계는 mocked bridge 로컬 테스트다. 이번에 실제 권한 거절·위치 설정 변경·native 산책·거리 정확도 QA는 하지 않았다. FontScale1.3은 로컬 검증이며 실제 TalkBack·야외 햇빛 가독성·전체 Phase6 responsive 최종 판정은 미확인이다. 기존 간헐적2초 타이머 점프와 URBAN 독립 기준 미정도 해결됐다고 주장하지 않는다.

## 개발용 설치·보존

- 명시 승인된 Debug 빌드1/install-r1, Release0·uninstall0·clear data0·commit0·push0이다. 외부 Debug-only guard가 Release task를 차단하고 기존 secure-input 주입/승인 signer를 사용했다. 서명 값은 source나 로그에 복사하지 않았다.
- Debug APK SHA256 `125d7b8bd77b577b5bfc42ab696bc90337a099bf9471174388b2abac6ac8a64d`. 승인 signer `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` 일치, 설치 APK hash 일치 PASS다. JS/삽화는 검증한 worktree의 Metro8081에서 제공하므로 frozen Release artifact/source-match로 해석하지 않는다. Debuggable은 개발용 승인에 따라 true다.
- UID10402·최초 설치 시각2026-06-02 19:16:57·권한 hash·fontScale1.0·해상도1080x2340/density450·animation 설정이 전후 동일하다. 로그인 유지 상태로 홈/공개 QA에 진입했으며 계정/펫 수정·서버 쓰기·실제 산책/종료/저장 명령0이다. 서비스 OFF다.
- `device-installed.json`은 설치 명령 완료 전 수집되어 이전 Release를 나타내는 중간 관측이다. 최종 설치 판정은 `device-after-install.json`과 `device-final-post-context.json`을 사용한다. 기존 receipt를 덮어쓰지 않았다.
- 원본 repository HEAD `657dd597dbea5fb6b93d79901f0eea05ed745e02`, dirty181/status hash `23228f58bd6a23341fe84799783a55ee9ae3a059357f8946e9b26d615c668827`, content hash `e25464c4036b84fdb9b399b18eda8e34222052d69d2921bfc31a9d31aafe2c8a` 모두 동일하다. 원본 stage/reset/restore/stash/clean0이다. 보안20/20 source baseline 보존이며 새 보안 실기기 전 항목 재실행은 아니다.
- 촬영은 inspector PUBLIC_SYNTHETIC proof와 명시적인 익명 gallery 선택 후에만 허용했다. 실제 위치/프로필 사진/좌표 증적0이다. 일부 상태의 날씨는 기존 실제 Home snapshot 요약(아이콘/온도/상태)이며 위치명은 없으므로 날씨까지 합성이라고 주장하지 않는다.
- QA helper에서 화면 밖/대문자 버튼 조회와 캡처 proof가 맞지 않은 시도는 차단됐고 촬영 파일을 만들지 않았다. 자산 비교의 첫 조회는 버퍼 한도로 중단되어 Git blob 비교로 read-only 확인을 완료했다. 제품 수정/추가 build/install로 우회하지 않았다.
- 마지막 hook 변경 중 Fast Refresh 오류 화면을 guard가 차단했다. Metro reload 후 남은 빈 native QA 창은 앱 데이터·프로세스를 초기화하지 않고 현재 Activity task를 다시 열어 복구했다. 이때 원문 로그/개인 화면을 저장하지 않았으며 새 build/install0, force-stop/clear data0이다. 복구 후 홈 로그인 유지와 공개 gallery 재진입을 확인했다.
- 개발 Activity 재생성 중 React Navigation의 `linking in multiple places` Console Error도 확인했다. LogBox를 닫은 뒤 공개 안내6종/Back/PAUSED와5화면 재진입이 통과했다. Navigation source는 변경하지 않았으며 이 개발 reload 복구를 Release cold-start 검증 또는 전역 navigation 재승인으로 확대하지 않는다.

## 잔여 5화면: 촬영 후 시안만 생성

아래 제안은 앱에 적용하지 않았다. 각 before는 최종 보정 검증 후 갱신한 S241080x2340 공개 fixture이고 after는 최초 검증 후 같은 레이아웃의 캡처로 만든 built-in image_gen 이미지다. 생성 전체 prompt/hash/최초 참조 원본은 외부 `mockups/manifest.json`에 보존했다. 생성 UI는 방향 시안이므로 정확한 글꼴 크기·실제 Android system bar·pixel geometry 검증을 대체하지 않는다.

| 화면 | 현재 화면 | 제안 시안 | 방향 |
| --- | --- | --- | --- |
| 신호 찾기 | [Before](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/remaining-gps-acquiring-final.png) | [After](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/mockups/gps-acquiring-proposal.png) | 첫 위치 전 가짜 현재 마커 대신 기다리는 반려동물 삽화·대기 안내·거리 미확정 표시 |
| 신호 약함 | [Before](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/remaining-gps-weak-final.png) | [After](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/mockups/gps-weak-proposal.png) | 지도 우선, 작은 삽화와 정확한 지점만 기록한다는 안심 안내 |
| 신호 끊김 | [Before](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/remaining-gps-lost-final.png) | [After](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/mockups/gps-lost-proposal.png) | 마지막 확인 지점·추정 거리 없음·끊긴 경로를 분명히 표현 |
| 복구 | [Before](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/remaining-recovery-required-final.png) | [After](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/mockups/recovery-required-proposal.png) | 중복 중앙 패널을 한 하단 시트로 정리, 명시적 이어가기·마치기 |
| 향후 기록 | [Before](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/remaining-future-record-cta-preview-final.png) | [After](/Users/shinjaejun/.codex/nuri-design-evidence/walk-common-design-20261018-7F8cpE/mockups/future-record-cta-preview-proposal.png) | 가을 결과와 같은 전체 폭 삽화, 준비 중인 비활성 기록 CTA |

## 다음 단일 단계

PO가 Metro의 적용 범위와 위5개 시안을 검토한다. 새 시안 구현·Release·commit/push·Timeline 연결·실제 보행·Phase4를 자동 시작하지 않는다. STORE HOLD, 서비스 OFF, 공개 겨울 결과 화면, Metro ON, CODEX_DEVICE_CONTROL STOPPED다. release checklist의 배포 승인 상태는 변경하지 않는다.

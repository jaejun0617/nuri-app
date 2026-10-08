# NURI GLOBAL KEYBOARD OPEN DEFECT FINAL CORRECTIVE REPORT

기준: 2026-10-08 KST. MASTER / NURI-00 단독 수행. 설치 후보의 실제 결과를 기준으로 판정하며 단위 테스트 통과를 native PASS로 확대하지 않는다.

결론: K29는 닫혔지만 K14/K15는 복귀 실패가 남았다. K23의 닫힌 키보드 system-navigation underlap은 해결됐으나 열린 키보드에서 48dp 하단 여백 회귀가 생겼다. 같은 화면을 공유하는 K22도 core 유지와 layout 실패를 분리하여 OPEN으로 기록한다. 이 후보는 최종 승인 가능한 전체 PASS가 아니다.

Canonical evidence root: `/private/tmp/nuri-keyboard-open-corrective-20261008-163925/`.
Previous ledger: `/private/tmp/nuri-global-keyboard-final-20261007-212757/k-id-ledger-final.json`.
작은 최종 metadata는 [영구 증적](nuri-global-keyboard-open-defect-2026-10-08-evidence/README.md)에 보존한다. 기존 evidence와 APK/AAB는 삭제하지 않았다.

## 1. Result

| 항목 | 판정 | 실제 결과 |
| --- | --- | --- |
| K14 | FAIL | Weather caller에서 태그 모달 Back 후 메모 focus는 있으나 IME가 복원되지 않음 |
| K15 | FAIL | 작성 내용 유지, 자동 keyboard/visible-parent 복귀 실패 |
| K23 | FAIL | closed-IME underlap 해결; open-IME 135px 여백 및 최초 composer 경계 clipping 회귀 |
| K29 | PASS | 실제 Samsung 키보드 한글 조합 정상, clear·결과·재진입 정상 |
| K22 regression | FAIL_LAYOUT_CORE_RETAINED | drag/fling·draft·focus는 유지, 같은 135px 하단 여백 회귀 |

ACCESSIBLE_RUNTIME_OPEN_DEFECTS: 4 K-ID (`K14`, `K15`, `K22`, `K23`). 원인 묶음은 Weather 복귀와 Community IME 여백의 2개다.
기존 OPEN 4개 중 K29 1개 종료, K14/K15/K23 3개 미종료, K22 1개 회귀 추가다.

최종 원장: PASS 22, OPEN_REPRODUCED 4, BLOCKED 6, NOT_REACHABLE_WITHOUT_MUTATION 2, DEV_ONLY 1, UNUSED 3. 합계 38. UNEXPLAINED_NOT_RUN 0, UNEXPLAINED_PARTIAL 0, WORK_IN_PROGRESS 0.
이번 APK에서 무관한 33개 경로를 모두 새로 실행한 것이 아니다. 이전 증적·PO 판정은 출처와 이전 APK를 붙여 재사용했다.

## 2. K23

ROOT_CAUSE:
닫힌 IME의 safe-area bottom이 고정 일반 댓글 composer에만 적용되어 인라인 답글/list viewport는 시스템 바를 침범했다. shared screen wrapper에 하단 소유권을 옮겼다.

FILES_CHANGED:
- `src/screens/Community/CommunityDetailScreen.tsx`
- `src/screens/Community/utils/commentViewport.ts`
- 관련 keyboard interaction·viewport·responsive guard 테스트

SYSTEM_NAV_UNDERLAP_BEFORE: 이전 child input `[87,2021][858,2249]`; system navigation 시작 y=2205.
SYSTEM_NAV_UNDERLAP_AFTER: 현재 closed list viewport `[0,251][1080,2205]`, system navigation `[0,2205][1080,2340]`. 목록과 control은 viewport에서 clipping되어 시스템 영역으로 그려지지 않는다.

KEYBOARD_OPEN_SCROLL: core PASS. Root reply에 실제 `테스트` 입력 → drag/fling → viewport 밖 이동 → 사용자 scroll로 복귀 → 입력창 재탭 없이 `테스트테스트`로 계속 입력. IME·focus·draft·reply target 유지. child target에서도 실제 한글 입력과 Back 닫힘을 확인했다. 자동 snap-back·반복 reveal loop는 관찰되지 않았다.

K22_REGRESSION: layout FAIL. `QA_K22` 입력 후 keyboard-open scroll 및 `_CONTINUE` 추가 입력은 정상이고 작성 내용·focus가 유지됐다. 그러나 root composer bottom y=1231, 전체 content end y=1260, IME top y=1395로 135px=48dp 여백이 남는다. 이전 후보 screenshot의 같은 공간에는 이 여백이 없다.

K23_REMAINING: 같은 open-IME viewport end y=1260, IME top y=1395. 처음 focus 시 inline input은 `[87,1136][858,1260]`에서 viewport 경계에 걸렸다. closed underlap 개선만으로 전체 PASS 처리하지 않는다.

확정: 여백 크기와 native navigation 높이가 모두 135px다. 원인 후보: IME 전환에서 root bottom reservation을 48dp→0으로 변경하면서 core KAV frame/offset도 갱신되는 local 상호작용. 세부 native event ordering은 계측하지 않아 이 가설을 전역 native 원인으로 승격하지 않는다. MainActivity·전역 provider·windowSoftInputMode 변경 0.

증적: `k23-closed-bottom.json/png`, `k23-closed-bottom-insets.json`, `k23-child-focus.json`, `k23-offscreen-return.json`, `k23-return-continue.json/png`, `k23-open-return-insets.json`, `k23-native.mp4`, `k22-open-scroll-sanity.json/png`, `k22-draft-focus-retained.json`.

## 3. K14 / K15

ROOT_CAUSE:
기존 Weather parent는 dialog 복귀에서 native focus가 이미 남아 새 onFocus가 발생하지 않는 경로가 있었으며 focused-field reveal이 실행되지 않았다. 최초 증적은 메모 top y=1468 > IME top y=1395였다.

FILES_CHANGED:
- `src/screens/Weather/WeatherActivityRecordScreen.tsx`
- `__tests__/inputFooterKeyboardContracts.test.tsx`

시도한 corrective: modal open 전에 현재 title/memo focus를 ref로 기억하고 blur, modal visibility false 후 다음 animation frame에서 해당 input을 1회 focus, 기존 keyboard-aware onFocus reveal 재사용. `disableScrollOnKeyboardHide` 적용. 임의 timeout·N회 retry 없음. 공통 RecordTagModal source는 수정하지 않았다.

TAG_MODAL_RETURN_BEFORE: parent memo focus/IME open, 메모가 IME 밑에 남아 수동 scroll 필요.
TAG_MODAL_RETURN_AFTER: draft `QA_WEATHER_DRAFT`와 memo focus는 유지되지만 Back 후 IME closed. 최초 캡처 이후 settled 캡처에서도 동일하다. 모달의 tag input에 `QA_TAG`를 입력한 분기에서도 Back 후 같은 실패다. 메모 재탭으로 keyboard를 다시 열고 수동 scroll하면 추가 입력/CTA 접근 가능하지만 필수 자동 복귀 계약은 실패다.

MEMO_VISIBLE_ABOVE_IME: FAIL_AUTOMATIC_RETURN. IME 복원이 실패하므로 닫힌 화면의 memo 가시성만으로 PASS 처리하지 않는다.
MANUAL_SCROLL_REQUIRED: 자동 복귀 실패; 재탭·수동 scroll 복구가 가능했다.
DRAFT: PRESERVED. 입력·태그 추가 제출 및 기록 저장 없음.
FOCUS: native node focused=true, IME=false. 이를 정상 keyboard focus session 복구로 해석하지 않는다.

남은 원인 후보: visibility state 이후의 rAF focus는 native Android dialog 종료/parent window focus 복귀를 보장하지 않는다. 이 후보에서 정상 IME 복구가 안 된 것은 확정, 정확한 window 이벤트 순서는 미계측이다. 현재 RN의 Modal `onDismiss`는 로컬 구현상 iOS 전용이므로 Android 해결책으로 무작정 사용하는 것은 부적합하다.

RECORD_CALLER_REGRESSION:
K12 실제 RecordCreate 본문 focus → tag modal → Back에서 parent focus/IME 복원, 기존 빈 draft 보존을 확인했다. textarea top y=1275는 IME top y=1395보다 위지만 bottom y=1641은 IME 뒤까지 이어진다. 따라서 이 좁은 check를 전체 textarea 가시성/전체 form PASS로 확대하지 않는다. 공통 modal source는 바뀌지 않았다. K13 RecordEdit에는 현재 RecordTagModal consumer가 없어 해당 caller 검증은 N/A다.

증적: `weather-tag-open.json`, `weather-tag-back-1.json`, `weather-tag-return-settled.json/png`, `weather-tag-return-insets.json`, `weather-tag-input-confirmed.json`, `weather-modal-back-ime.json`, `weather-native.mp4`, `record-tag-regression-open.json`, `record-tag-regression-return.json`, `record-tag-regression-settled.json`.

## 4. K29

ROOT_CAUSE: controlled TextInput의 searchQuery 업데이트가 `startTransition` 안에 있어 native IME 조합 중 값 반영을 지연했다. 동일 기기·keyboard에서 다른 입력은 정상이라는 이전 증적과 일치한다.
FILES_CHANGED: `src/screens/Guides/GuideListScreen.tsx`, `__tests__/guideSearchKeyboard.test.tsx`.
CONTROLLED_VALUE_UPDATE: `startTransition(() => setSearchQuery(text))` → synchronous `onChangeText={setSearchQuery}`. 검색 결과 계산은 기존 `useDeferredValue(searchQuery)`로 분리 유지. clear·keyword·검색 닫기 reset도 synchronous query update다. key/remount·자모 가공·임의 timer·uncontrolled 전환 없음.

| 계약 | Samsung Keyboard / 실제 결과 |
| --- | --- |
| `테스트` | 정확히 `테스트` |
| `강아지 건강 관리` | 정확히 `강아지 건강 관리` |
| `test` | 정확히 `test` |
| `123` | 정확히 `123` |
| CLEAR | 버튼으로 빈 query, input focus 유지 |
| 검색 결과 | `reptile`에 파충류 가이드 결과와 기존 audience 표시·ranking 변경 확인 |
| SORT_FILTER | 화면에 별도 sort/filter control 없음. selected-pet audience filter·검색 ranking source 유지, 기존 service tests PASS. 존재하지 않는 control의 native QA를 주장하지 않음 |
| REENTRY | 검색 닫기 후 reopen 빈 query 및 기본 목록 복귀 |
| Android Back | 안전한 이전 화면 복귀 |

실제 한글·영문·숫자는 Samsung 키를 눌러 입력했다. `reptile` 결과 확인은 synthetic ASCII 입력이다. 검색 제출/최근 검색어 저장은 실행하지 않았다.
K19/K32/K33의 공통 input source 변화 0. 이전 native 증적 및 full-suite 회귀 결과만 재사용했으며 이번에 해당 화면의 새 전체 QA를 했다고 주장하지 않는다.

증적: `guide-test-confirmed.json/png`, `guide-long-hangul.json/png`, `guide-english.json`, `guide-numeric.json`, `guide-search-results.json`, `guide-reopened-clear.json`, `guide-native.mp4`.
`guide-hangul-test.json`은 첫 keyboard transition 전에 좌표 입력한 무효 시도다. PASS 근거로 사용하지 않는다.

## 5. Validation

TYPESCRIPT: PASS.
ESLINT: scoped 0 new errors.
TARGETED_TEST: 6 suites / 34 tests PASS.
FULL_SUITE: 최종 190 suites / 1,939 tests PASS. 실제 총 2회이며 2번째 실행은 PO 추가 승인이다.
GIT_DIFF_CHECK: PASS.

첫 full suite는 188 suites PASS / 2 FAIL, 1,937 tests PASS / 2 FAIL이었다. 신규 Guide test의 renderer button 조회와 이전 footer source guard 위치 기대값 문제를 보완했다. Agent가 targeted 문제를 닫기 전에 full suite를 시작한 실행 순서 오류가 있었고 PO 승인 추가 실행으로 재검증했다. 처음부터 1회 PASS라고 보고하지 않는다.
단위 테스트의 Weather focus() 호출 검사는 실제 native dialog/IME 복구를 보증하지 못했다. 이번 native FAIL을 우선한다. native-safe-area transition의 48dp 회귀 역시 mocked inset 테스트만으로 검출하지 못했다.

## 6. Build

BUILD_COUNT_THIS_CORRECTIVE: 1.
INSTALL_COUNT_THIS_CORRECTIVE: 1.
추가 build/install: 0.

APK: `/private/tmp/nuri-keyboard-open-corrective-20261008-163925/nuri-keyboard-open-corrective-release.apk`
APK_SHA256: `7f24f510a4fc2a3f3b3a9aebf2974918b635483fd72051b425a801f18af8783b`
AAB: `/private/tmp/nuri-keyboard-open-corrective-20261008-163925/nuri-keyboard-open-corrective-release.aab`
AAB_SHA256: `207e39d975c172b529eb9730a5ec4f79a9bff6d9c4a46110cdb49bdd14b32d63`
INSTALLED_MATCH: PASS, installed base.apk SHA와 후보 일치.
SIGNER_SHA256: `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3`.
VERSION_NAME: 1.0. VERSION_CODE: 1.

기존 cache를 유지한 `assembleRelease bundleRelease` incremental 실행. BUILD SUCCESSFUL, 3m25s, 1004 tasks: 66 executed / 938 up-to-date. 기존 dirty QA candidate이며 clean Store RC가 아니다. clean/uninstall/clear-data/Metro/fast-refresh 실행 없음.

## 7. Galaxy S24

DEVICE: SM-S937N / R5CY613NMSY / Android 16.
KEYBOARD: Samsung Keyboard 5.9.30.97 / Korean QWERTY.
DISPLAY: 1080x2340 / density450 / 384dp / fontScale1.0.
NAVIGATION: THREE_BUTTON.

K14: FAIL. K15: FAIL. K23: FAIL. K29: PASS.
K22_REGRESSION: FAIL_LAYOUT_CORE_RETAINED.
실기기 조작은 MASTER / NURI-00만 수행, SUPPORT_ROOM 0, CONCURRENT_ADB 0.

PO 체감 확인은 현재 실패를 숨기는 승인 절차가 아니다. 후속 후보가 승인·검증된 뒤 필요한 최대 4개만 요청한다: K23 open/closed 하단, Weather tag→memo, K29 한글 검색, K22 scroll 여백. 전체 38개 반복 요청 없음.

## 8. Runtime

FATAL: 0 observed.
ANR: 0 observed.
RN_FATAL: 0 observed.
FOCUS_LOOP: NONE_OBSERVED_IN_SCOPED_QA.
REVEAL_LOOP: NONE_OBSERVED_IN_SCOPED_QA.

설치 이후 retained log buffer의 현재 app PID 30383, 17,871 lines와 package am_anr event를 확인했다. reset하지 않았고 raw log는 민감정보 보호를 위해 저장하지 않았다. PID가 다른 과거 crash나 장시간 안정성 전체를 PASS로 주장하지 않는다. gfxinfo/frame 성능 측정은 NOT_MEASURED.

## 9. Existing Gates

| K-ID | 유지 상태 |
| --- | --- |
| K04 | BLOCKED_RECOVERY_GATE |
| K05 | BLOCKED_ONBOARDING_FIXTURE |
| K10 | NOT_REACHABLE_WITHOUT_MUTATION |
| K21 | NOT_REACHABLE_WITHOUT_MUTATION |
| K30 | BLOCKED_ADMIN_GATE |
| K31 | BLOCKED_ADMIN_GATE |
| K34 | BLOCKED_ADMIN_GATE |
| K35 | BLOCKED_ADMIN_GATE |
| K36 | DEV_ONLY_CONFIRMED |
| K26 | UNUSED_CONFIRMED |
| K37 | UNUSED_CONFIRMED |
| K38 | UNUSED_CONFIRMED |

Fixture 생성·role 변경·강제 route·신규 pet/owned post 생성 없음. 원장에 기존 이유와 이전 증적 경로 그대로 유지했다.

## 10. Preservation

AUTH_STATE: PRESERVED. 기존 QA session으로 Home 접근, logout/account change 0.
SELECTED_PET: PRESERVED, 누리.
QA_DATA: 기존 저장 콘텐츠 보존, 저장/전송/편집/삭제 0. Community synthetic draft는 모두 비우고 reply 취소, Weather 임시 입력은 저장하지 않고 종료, Guide query 빈 상태 복귀, K12 필드 내용 변경 없음.
DB_DIRECT_MUTATION: 0. DIRECT_SQL: 0. SUPABASE_CHANGE: 0.

앱의 정상 조회 부수 효과를 DB 불변과 혼동하지 않는다. QA-PAGINATION-001의 조회수 표시는 기존 2 → 3으로 바뀌었다. 자동 조회/analytics read 부수 효과를 되돌리지 않았으며 전체 DB row digest를 이번에 검사하지 않았다. QA 저장 콘텐츠 mutation은 없다.

UID: 10402 유지.
FIRST_INSTALL_TIME: 2026-06-02 19:16:57 유지.
LAST_UPDATE_TIME: 2026-10-08 16:59:01.
DEVICE_SETTINGS: 기본 width/density/fontScale/THREE_BUTTON 유지. Samsung 언어 toggle은 실제 한글 QA 후 원래 English로 돌렸고 IME closed Home에서 해제했다.

UNRELATED_DIRTY: PRESERVED. baseline 1,679 files에서 허용된 task source/test 8개와 신규 test 1개만 변경, missing 0 / unexpected 0. 설치 전 frozen candidate 1,680 files와 QA 종료 직후 모두 동일, SOURCE_CHANGE_AFTER_FINAL_CANDIDATE 0. 후속 QA 문서의 최신 상태 블록만 추가하며 기존 본문을 제거하지 않는다.
REQUIRED_ARTIFACT_LOSS: 0, hash baseline의 required repo files 누락 0; 기존 후보 APK/AAB·원장·증적·build outputs 보존. cleanup 0.

## 11. Git

BRANCH: `codex/task6-community-content-policy`.
HEAD: `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`.
ORIGIN_HEAD: local tracking `81ac85ad79024169d293e7c5b862be21f7f6aaf4`, 이번 fetch/remote 재검증 없음.
STAGED: NONE.
COMMIT: NO.
PUSH: NO.

Git diff의 Community 전체 변경에는 이전 protected dirty가 포함된다. 이를 이번 corrective 전체 diff로 잘못 귀속하지 않는다. 이번 task delta는 baseline/candidate fingerprint로 분리했다.

## 12. Final State

K22_K23_CORRECTIVE: LOCAL_CANDIDATE_NATIVE_LAYOUT_REGRESSION_OPEN.
K14_K15_CORRECTIVE: LOCAL_CANDIDATE_NATIVE_RETURN_FAIL_OPEN.
K29_CORRECTIVE: IMPLEMENTED_NATIVE_PASS_PENDING_PO_APPROVAL.
GLOBAL_PHYSICAL_KEYBOARD_QA: COMPLETE_WITH_EXACT_GATES_AND_OPEN_DEFECTS.
REACHABLE_TESTED_PATHS: OPEN_DEFECTS_REMAIN.
ACCESSIBLE_RUNTIME_DEFECTS: 4 K-ID.
ACTIVE_PRODUCTION_PATHS: ALL_ACCOUNTED; 이전 증적 재사용과 이번 좁은 재검증 경계를 유지한다.
UNEXPLAINED_NOT_RUN: 0. UNEXPLAINED_PARTIAL: 0. WORK_IN_PROGRESS: 0.
GLOBAL_KEYBOARD_REFACTOR: NOT_STARTED.
MAIN_ACTIVITY_CHANGE: 0. GLOBAL_NATIVE_INSET_CHANGE: 0.
STORE: HOLD.
AUTO_START_NEXT_WORK: NO.
DEVICE_OWNER: PO.
CODEX_ADB_CONTROL: STOPPED_AFTER_QA.
MASTER_STATE: STOPPED_WAITING_FOR_PO_KEYBOARD_FINAL_APPROVAL.

NEXT_ACTION: PO가 이번 native FAIL 및 K22 회귀를 검토하고, Community의 안정된 inset/frame 소유권 및 Weather의 실제 parent window/focus 복귀를 위한 좁은 후속 corrective·추가 검증/빌드/설치 여부를 결정한다. 현재 source·설치 candidate·증적은 유지하며 자동 재시도·추가 빌드·commit·push·cleanup하지 않는다.

PO 승인을 기다립니다.

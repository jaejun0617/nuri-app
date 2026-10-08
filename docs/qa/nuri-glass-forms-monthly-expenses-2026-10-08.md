# NURI Glass Forms + Monthly Expenses Candidate Report

기준일: 2026-10-08 KST. FINAL_APPROVED. STORE: HOLD.

## PO 최종 승인

PO가 `글라스·월별 지출도 최종 승인하고 함께 포함`으로 이 보고서의 후보 범위를 승인했다. [통합 동결 보고서](nuri-keyboard-glass-expenses-final-freeze-2026-10-08.md)에 빌드·설치·커밋·푸시 closeout을 별도로 기록한다. 아래 build/install 횟수·APK·승인 대기/commit NO는 승인 전 검증 이력이며 이번 추가 closeout 결과와 혼합하지 않는다. 앱 소스 추가 수정·추가 키보드 QA·DB 작업·cleanup·Store는 없다.

## 1. 결과와 승인 경계

- 전체일정의 흰색 `+`, 전체 탭 최신 일정일/시간 우선 정렬, 구체 없는 기존 계절 배경을 적용했다. 앞으로의 일정은 기존 가까운 일정 우선 계약을 유지한다.
- 일정 추가·수정, 알림 시간 확인, 프로필 수정 완료, 기록 수정에 계절 글라스 패널을 적용했다. 첫 후보의 우측 넘침은 `width: 100%`와 바깥 여백의 중복 계산이 원인이었다. 패널을 부모 가용 폭에 stretch하도록 보완했다.
- Home에서 계정 소유의 모든 펫에 대한 이번 달 용품·병원비 합계를 표시한다. 패널에서 월별 총액·종류별 합계·실제 기록 목록을 열고, 다른 월·추억 상세·이전 화면으로 이동한다.
- 기록하기·기록수정·건강 기록 진입을 포함한 실제 작성 경로를 조사했다. 용품/쇼핑과 건강/병원 기록의 금액 필드를 동일 계약으로 저장한다. 기존 병원 하위 분류 데이터도 조회하되, 숨겨진 구형 작성 분류를 새로 활성화하지 않는다.
- 장식용 CTA 아이콘을 제거하고 상단 텍스트 action의 시각 패딩을 줄였다. 도구·OAuth 제공자·분류·상태 아이콘 및 PO가 지정한 일정의 흰색 `+`는 보존한다. 터치 영역 44dp를 시각 패딩과 구분한다.
- 기존 Community K22/K23 및 Weather K14/K15의 두 원인 묶음을 로컬 범위에서 보완하고 최종 설치본으로 재검증했다. MainActivity·전역 native/inset·공통 입력 구조는 변경하지 않았다.
- MASTER 단독 실행, supporting room 없음, concurrent ADB 0. 추가 build/install/cleanup/commit/push/Store 작업은 하지 않는다.

## 2. 지출 데이터 계약

| 항목 | 최종 계약 |
| --- | --- |
| 집계 소유권 | 현재 로그인 계정 전체, 선택 펫과 무관한 모든 소유 펫 |
| 종류 | `other/shopping`, `health`, 기존 `other/hospital` |
| 월 기준 | `occurred_at`; 날짜 없는 구형 데이터만 `created_at`의 KST 날짜 |
| 금액 | 원 단위 0 이상 정수, 작성 필드는 선택 입력, 최대 9자리 |
| 미입력 | null 유지, 0원과 구분, 합계에서 제외 |
| 비지출 분류 | 금액 제거; 식사·산책 등을 지출로 잘못 집계하지 않음 |
| 목록 읽기 | 기존 RLS + 명시적 user 조건, 필요한 열만 조회, ID keyset 500건씩 빈 페이지까지 |
| 목록 표시 | 기록일 최신순, 첫 20건·추가 20건 |
| 변경 후 캐시 | 생성·수정·삭제에서 모든 월 무효화; 날짜 변경 전 월도 갱신 |
| 실패 | 오류 상태 표시, 조회 실패를 0원으로 표시하지 않음 |

집계는 **금액이 입력된 기록의 합계**다. 미기록 지출이나 금액을 입력하지 않은 진료까지 포함한 실제 가계 총지출을 뜻하지 않는다. 은행·영수증 연동은 추가하지 않았다. 전체 월 데이터를 읽는 keyset 계약은 단위 테스트로 검증했으며 운영 대용량 성능 benchmark는 수행하지 않았다.

서버 source of truth는 기존 `memories.price`와 기록 분류/날짜, 펫 소유권이다. linked remote의 기존 catalog 및 승인된 QA 기록 값은 읽기 전용으로 확인했다. SQL/schema/RPC/RLS/Storage policy 변경·migration·직접 SQL mutation은 0이다. 정상 앱 UI로 승인된 QA 저장은 아래와 같이 별도 기록한다.

## 3. 승인된 실제 QA 저장

| QA 기록 | 기존 펫 | 생성 값 | 최종 보존 값 |
| --- | --- | --- | --- |
| QA 20261008 EXPENSE SHOPPING | 누리테스트 | 10월 8일, 100원 | 9월 8일, 150원; 수정 1회 |
| QA 20261008 EXPENSE MEDICAL | 누리 | 10월 8일, 200원 | 동일; 건강 기록 |

- 서로 다른 두 펫의 합계 300원을 Home·월별 화면에서 확인했다. 용품 기록의 날짜·금액을 변경한 후 10월 200원, 9월 150원, Home 이번 달 200원으로 갱신됨을 확인했다.
- 정확한 QA ID는 [작은 QA manifest](nuri-glass-expenses-2026-10-08-evidence/qa-expenses.json)에 보존한다. 생성 2회·기록 수정 1회·삭제 0회다. QA 기록은 남겼으며 기존 사용자 기록은 수정하지 않았다.
- 프로필 완료 화면은 PO 승인에 따라 누리의 기존 정보·사진을 바꾸지 않고 동일 값 1회 저장하여 확인했다. `updated_at` 갱신 가능성을 포함한다. 두 번째 후보에서 다시 저장하지 않았다.
- 정상 앱 생성의 기존 XP 지급·counter·저장 시각 부수 효과를 DB 전체 불변으로 주장하지 않는다. 이전 QA100·댓글·답글·사진은 삭제하지 않았다. 전체 DB의 row-level digest 재감사는 이번 범위에 없다.

## 4. 최종 실기기 판정

| 경로 | 판정 | 실제 확인 | 핵심 evidence 이름 |
| --- | --- | --- | --- |
| Home·월별 지출 | PASS | 모든 펫 합계, 월 이동, 수정 전/후 양쪽 월 반영, 상세와 복귀 | `final-home-expense`, `final-expense-october`, `final-expense-september` |
| 지출 네 계절 | PASS | 같은 금액·목록 유지, 가을·겨울·봄·여름 배경/패널 폭 | `final-expense-october`, `final-expense-winter`, `final-expense-spring`, `final-expense-summer` |
| 전체일정 | PASS | 최신 날짜·시간 순서, 흰색 +, 구체 제거 | `final-schedule-list` |
| 일정 추가·수정 | PASS, 저장 제외 | 최종 폼 폭, 입력/키보드·스크롤·CTA; 기존 일정 변경 없음 | `final-schedule-create-width`, `final-schedule-edit-width`, `final-schedule-memo-ime` |
| 알림 시간 확인 | PASS | 과거 알림 선택 후 저장 전에 glass 확인, 다시 설정·안전 종료 | `final-reminder-notice` |
| 프로필 수정 완료 | PASS, 첫 후보 증거 재사용 | 동일 값 저장 1회 후 완료 화면; 최종 공통 폭 보완은 정적 검사 | `profile-done-glass`, `profile-done-stable` |
| 기록 수정 | PASS | 최종 폭·금액 200·태그/감정·하단 CTA 접근; 최종 후보 저장 없음 | `final-record-edit-width`, `final-record-edit-bottom` |
| K22 일반 댓글 | PASS, scoped revalidation | IME 위 입력·drag/fling·draft·한글·caret 유지 | `final-community-open`, `final-comment-scroll`, `final-comment-hangul`, `final-comment-caret` |
| K23 인라인 답글 | PASS, scoped revalidation | offscreen·복귀·계속 입력·target/draft·selection UI·closed system-nav 경계 | `final-reply-offscreen`, `final-reply-return`, `final-reply-continued`, `final-reply-selection`, `final-reply-closed-stable` |
| K14/K15 Weather 태그 복귀 | PASS, scoped revalidation | Back으로 parent 유지, IME/focus·메모 draft 유지, 추가 입력·CTA 접근 | `final-weather-tag-back-before`, `final-weather-back-parent`, `final-weather-continued`, `final-weather-cta-access` |
| K12 작성 태그 회귀 | PASS, scoped sanity | 기존 native 태그 모달 복귀 후 IME/focus·내용 유지·추가 입력; 무저장 종료 | `final-record-create-tag-open`, `final-record-create-tag-return`, `final-record-create-continued` |

RecordEdit은 inline 태그 입력이며 해당 native tag-modal caller가 없으므로 모달 복귀 검사는 N/A다. 정상 작성·편집 폼의 실제 삭제, 일정 저장, 댓글 전송, Weather 기록 저장은 수행하지 않았다. 합성 미저장 draft만 제거했다.

최종 홈은 누리·가을·키보드 닫힘으로 복구했다(`final-restored-home`). 기기 설정은 baseline과 동일하다. DEVICE_OWNER: PO. CODEX_UI_CONTROL: STOPPED_AFTER_QA. 이후 보존과 runtime 확인은 읽기 전용이며 화면 이동·입력·logcat reset은 하지 않았다.

## 5. 키보드 원인과 측정

### Community K22/K23

- 첫 후보는 controller KAV의 automatic offset이 상세 content의 실제 window origin을 반영하지 못했다. root가 헤더 아래 251px에서 시작하는데 기준을 맞추지 않아 입력 영역이 IME에 가려졌다.
- 최종은 Community content root의 layout에서 실제 window Y를 한 번 측정해 KAV offset으로 전달한다. automatic offset과 중복하지 않고, safe-area bottom은 고정 root가 한 번 소유한다. 반복 timer/측정 retry, user drag 중 자동 snap-back은 추가하지 않았다.
- 일반 composer closed bounds: `[98,2051][847,2176]`, open: `[98,1241][847,1366]`. IME top 1395px 대비 여유 29px, 약 10.3dp. 이전 48dp 여백 회귀와 구분된다.
- 인라인 reply offscreen에서 focus=true·IME open을 유지하고 돌아와 재탭 없이 추가 입력했다. closed reply bounds `[65,1931][882,2091]`, system three-button 영역 top 2205px보다 위다. 열린 상태 복귀 bounds `[65,1235][882,1395]`도 IME 영역을 침범하지 않는다.
- native selection 메뉴·caret 이동을 직접 확인했다. 모든 selection 범위가 모든 offscreen 전환을 통과한다는 장기 반복 보증으로 확대하지 않는다. 댓글·답글은 전송하지 않았다.

### Weather K14/K15

- 별도 Android native tag Dialog가 parent window의 IME 복귀를 깨뜨렸고, 독립 Back handler는 기존 entry-aware handler와 경쟁하여 기록 화면까지 pop했다.
- Weather caller의 태그만 같은 Activity의 embedded modal로 바꿨다. 원래 focus를 저장하고 open 시 blur, close 시 frame signal로 1회 복귀한다. 기존 keyboard-aware reveal을 재사용하고, 기존 entry-aware Back owner 한 곳이 modal close와 screen back을 구분한다. 임의 timeout/retry는 없다.
- 최종 parent memo bounds `[90,1266][990,1638]`, IME top 1395px이다. **메모 전체 높이가 IME 위에 있다는 뜻은 아니다.** 실제 text/caret가 IME 위에 보이고, 수동 scroll 없이 추가 입력했다. 하단 CTA `[90,1147][990,1304]`도 scroll로 접근했다.
- 빠른 두 번 Back에서 먼저 IME가 닫힌 중간 캡처는 성공 증거로 쓰지 않는다. `final-weather-back-parent`의 일반 modal Back 복귀와 추가 입력을 판정 근거로 사용했다.

[이전 38개 원장](nuri-global-keyboard-open-defect-2026-10-08-evidence/k-id-ledger-final.json)은 그대로 보존한다. [이번 4개 delta](nuri-glass-expenses-2026-10-08-evidence/keyboard-revalidation-delta.json)로 K14/K15/K22/K23 OPEN을 scoped PASS로 대체한다. 합성 현재 집계는 이전 PASS 22 + 이번 PASS 4 = 26, 기존 gate 12 유지다. **같은 최종 APK로 38개를 모두 재실행한 것이 아니다.** 기존 다른 22개 증적·6 BLOCKED·2 NOT_REACHABLE·1 DEV·3 UNUSED의 경계를 유지한다. MainActivity 원인 확정·전역 keyboard PASS·ALL_PATHS_PASS는 선언하지 않는다.

## 6. 로컬 검증

| 검사 | actual |
| --- | --- |
| TypeScript | PASS |
| scoped ESLint | source 43파일, errors 0, 기존 warnings 25 |
| 대상 검사 | 9 suites / 123 tests PASS |
| 최종 전체 검사 | 192 suites / 1,952 tests PASS, 24.577초 |
| 전체 검사 실행 횟수 | 실제 5회; 처음 두 번 실패, 이후 세 번 PASS |
| git diff --check | PASS |
| 설치 후 source/test/native/server delta | 0 |

처음 full run은 6 suites/8 tests, 두 번째는 1 suite/5 tests 실패였다. 입력 컴포넌트 이동·변경된 presentation 계약의 구형 source 검사와 test mock을 실제 코드 계약에 맞게 보완했다. 단순 PASS 기대값 변경으로 native 결함을 숨기지 않고 최종 후보 실기기 검증을 별도로 수행했다. 최종 full run 이전 PASS 두 번은 1,950 tests이며 마지막은 추가 회귀 검사 포함 1,952 tests다. 실제 반복 횟수를 1회라고 보고하지 않는다.

삭제 후 지출 캐시 갱신은 단위/source 검사만 수행했으며, 기존 사용자 데이터를 지우는 native 검증은 하지 않았다. 장식 CTA의 전역 source 조사·회귀 검사를 각 화면의 전체 native E2E로 확대하지 않는다.

## 7. Release 후보

| 항목 | actual |
| --- | --- |
| incremental build | 총 2회; 첫 후보 뒤 PO 승인 추가 1회 |
| install-r | 총 2회; uninstall/clear data 없음 |
| final APK | `/private/tmp/nuri-glass-expenses-20261008T092854/nuri-glass-expenses-release.apk` |
| APK SHA-256 | `eae763280deb2bee464ad32413193afebb27484b446743f3be1cb3b37a53cc2d` |
| AAB SHA-256 | `16775d784b181e3c409e8956a7b2ec8ccd75d2db343b6fe48322cecdf167b61e` |
| signer SHA-256 | `08efb41ea4729792ce9fc3d242be9704e84a8ea3eadcbbcf1c8426884db689d3` |
| installed hash match | PASS |
| versionName / code | 1.0 / 1 |
| UID | 10402, 보존 |
| first install | 2026-06-02 19:16:57, 보존 |
| last update | 2026-10-08 19:49:17 |
| device | Galaxy S24, SM-S937N, R5CY613NMSY, Android 16 |
| keyboard | Samsung Keyboard 5.9.30.97, Korean QWERTY |
| display | 1080x2340, density 450, 384dp, fontScale 1.0, THREE_BUTTON |
| Metro / Fast Refresh | OFF / OFF; Release candidate |

최종 build 2분57초, 1,004 tasks 중 66 executed·938 up-to-date. APK/AAB와 첫 후보는 모두 보존했다. DIRTY_QA_NOT_STORE_RC다. final source fingerprint는 [source-candidate](nuri-glass-expenses-2026-10-08-evidence/source-candidate.json)가 소유한다.

## 8. Runtime과 보존

- 최종 설치 시각부터 retained main/system/crash log를 읽기 전용으로 확인했다. 앱 관련 FATAL 0, ANR 0, RN_FATAL 0. raw log·민감정보는 repository로 복사하지 않았다. 이 bounded 구간의 retained-buffer 결과이며 장기 안정성·운영 Crashlytics proof가 아니다.
- baseline 1,690개 보호 파일 누락 0, task 범위 밖 hash 변경 0, 최종 설치 source 이후 변경 0. production assets·native 설정·SQL/migration·build/signing 입력 보존. 기존 문서 본문은 삭제하지 않고 최신 블록만 추가했다.
- 이번 source 43파일·tests 13파일. 사용자 승인된 cross-screen CTA·expense·glass scope와 로컬 keyboard corrective를 포함한다. 기존 unrelated dirty는 그대로 유지한다.
- branch `codex/task6-community-content-policy`, HEAD/origin `26891aaed1fbee37141ecbd89e4d4c18970b4a1d`. STAGED NONE, COMMIT NO, PUSH NO, CLEANUP NO, REQUIRED_ARTIFACT_LOSS 0.
- 기존 GLOBAL_CTA의 빈 Timeline Primary 중복·일정 첫 진입 합성 이상은 별도 OPEN 시각 한계다. 이번의 일부 CTA·일정 redraw 확인만으로 전체 한계를 닫거나 PO 수용으로 승격하지 않는다.

## 9. Evidence

Canonical task root: `/private/tmp/nuri-glass-expenses-20261008T092854/`.

- 최종 native 캡처·bounds JSON, `community-final.mp4`, `weather-final.mp4`, 첫 후보 `attempt-1/`, 최종 APK/AAB는 해당 root에서 유지한다.
- repository에는 [작은 metadata·validation evidence](nuri-glass-expenses-2026-10-08-evidence/README.md)만 보존한다. 대형 APK/AAB/스크린샷/영상 복제는 없다.
- Home baseline·installed-start의 외부 알림 배너 캡처는 비공개 temp에만 유지하며 보고서·repository 증거로 재배포하지 않는다.

## 10. 남은 경계와 다음 한 작업

확대 fontScale·다른 폭/기기·iOS·장기 scroll/selection 반복·운영 대량 지출 성능·전체 38경로 최종 APK 재실행·Store E2E는 미실행이다. 실기기에서 프로필 완료는 첫 후보 증거를 재사용하며 추가 동일 값 저장을 하지 않았다. QA 지출 삭제는 별도 지시 전 금지다.

NEXT_ACTION: PO가 설치된 후보에서 일정/기록 glass·월별 지출·댓글/태그 복귀 체감을 최종 승인한다. 승인 없이 commit/push/freeze·추가 corrective·build/install·cleanup을 시작하지 않는다.

IMPLEMENTATION: COMPLETE_PENDING_PO_APPROVAL.

BOUNDED_GALAXY_S24_QA: PASS.

STORE: HOLD.

AUTO_START_NEXT_WORK: NO.

MASTER_STATE: STOPPED_WAITING_FOR_PO_GLASS_EXPENSE_FINAL_APPROVAL.

PO 승인을 기다립니다.

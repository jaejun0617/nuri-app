# NURI C0 앱 연결 재검증 · 2026-11-11

## 2026-11-13 U1 Google 취소와 NAV-01 실기기 검증

- S25 Edge SM-S937N, Android 17, `com.nuri.app`, 기존 Metro OFF bundled Debug `b73de0f`, 설치 SHA-256 `9e1415c764835b7d4e49c375f1a945e50afaa2d1755f52f50630c160afa93616`. 직전 `db17000`은 Android 전체 삭제 요청/오류 안내만 바꿨다. 이번 실기기 증거는 위 설치본에 한정한다.
- **U1:** Chrome 공식 Google 선택 화면에서 지정 Google QA의 두 정상 진입 모두 동의·본인 확인을 생략했다. Android Back 취소에서는 코드 교환 없이 로그인 입력이 풀렸고 재시도는 PKCE 교환·기존 서버 사용자·원래 펫의 Home까지 확인했다. 동의·재인증의 실화면/실패는 미수락. 기존 scope·권한·브라우저 설정을 변경하지 않았다. 계정 선택과 일반 재로그인을 별도 동의·재인증으로 집계하지 않는다.
- **NAV-01 기존 설치본:** 전체메뉴 알림 설정 시트의 Android Back, 약관 목록→이용약관→Android Back→헤더 닫기로 원래 메뉴 위치, 타임라인 기록 작성의 키보드 Back→나가기 확인→초안 재진입/정리, 기존 기록 상세의 돌아가기→같은 월·행 확인. 11월 지출 진입과 메뉴 복귀는 관찰됐으나 이어서 메뉴 항목 입력이 무시돼 해당 경로 FAIL. 메뉴 닫고 재열기 후 정상.
- **최소 보정:** `MoreDrawerContent`의 월별 지출을 기존 탭 전환 처리로 연결했다. 루트 상세용 잠금은 탭 내부 진입에서 focus 이탈이 없어 남았다. 전체 메뉴/타임라인 구조·애니메이션·권한은 변경하지 않았다. 표적 6 suites/55 tests 및 타입 통과, 대상 lint 오류 0·기존 경고 4. 약 14.6 GiB로 25 GiB 빌드 조건 미충족, 수정 설치본 재검증은 BLOCKED. 기록 저장 복귀는 운영 보상·알림 파생을 보호하기 위해 새 저장 없이 남겼다. 과거 종료·모든 전환 프레임·별도 제공자 오류를 수락하지 않는다.
- 기존 Google QA Home·선택 펫·Chrome·네트워크·설치 해시 유지. 서버 기존 기록 수와 알림 60건/미읽음 29건·읽음 비교값 동일, 이번 초안은 비우고 정리했다. 비공개 증거: `~/.codex/nuri-u1-nav-20261113-WVev0o/`. 기존 PASS·두 보류·4/7·C0 미동결·STORE HOLD 유지.

## 2026-11-13 U2 공지 전체 삭제와 재발행 E2E

- **격리 앱 PASS**, 제품 `db17000`, 보존 APK SHA-256 `abaac4a6397b80174c514d948f618cc435d1246a98f8dab7880329c9faea6eae`, `emulator-5554` / `com.nuri.c0qa`, Metro OFF. 기존 로컬 스키마만 별도 DB에 준비해 운영·기존 격리 자료를 복제하지 않았다. 고정 삭제·발행·inbox 정의와 전용 Auth·PostgREST, 합성 수신자·비교 계정·발행자만 사용했다. 스케줄러·발송 경로 없음.
- 정상 발행 RPC로 `news.published` 한 건을 게시했다. v1을 수신자 앱의 상세와 비교 계정의 정상 읽음 API로 각각 읽은 뒤 시작값을 고정했다. 11:39:24 KST 앱 확인창의 전체 삭제 POST 한 번으로 수신자 v1만 숨김(`dismissed_version=1`), 앱·서버 목록 0. 비교 계정의 v1 목록, 양쪽 최초 읽음, 공지 원본 불변.
- 같은 공지 ID에 `p_reissue=true`로 v2를 게시했다. 11:39:32 KST 앱 목록 재조회에서 v2 한 건만 미읽음, 서버 `read_at=NULL`·미읽음 1. v1 읽음과 숨김 기록, 원본 ID와 생성 시각은 유지됐다. 재발행에 따른 비교 계정의 v2 노출은 정상이며, 비교 계정 읽음·숨김 데이터는 변경되지 않았다.
- 새 빌드·제품 소스·운영 발송 없음. 시험 로그아웃 후 전용 DB·Auth·REST·연결을 정리했고 기존 격리 DB의 보호값은 불변이다. 시작 APK `90491c22…` 복귀와 에뮬레이터 종료를 확인했다. 비공개 근거: `~/.codex/nuri-u2-news-version-20261113-AaeA0E/`의 `execution.json`, `ready.json`, `cleanup.json`, 화면 01~04. 기존 PASS·두 PO 보류·4/7·C0 미동결·STORE HOLD 유지.

## 2026-11-13 U2 격리 전체 삭제 A·B 검증

- **격리 환경 READY, A PASS, B PASS, 정리 COMPLETE.** 기존 `emulator-5554` / `com.nuri.c0qa`, Metro OFF. 제품 기준 `b73de0f`에 이번 전체 삭제 재전송 방지와 결과 미확정 안내를 더한 같은 서명 후보의 설치 APK SHA-256 `abaac4a6397b80174c514d948f618cc435d1246a98f8dab7880329c9faea6eae`, 내장 번들 SHA-256 `8fbc35945b0bf58f377e530e2ba00a64c241847691b69d11d915f30b388cc476`.
- 고정 제품 migration `20261025040438_notification_dismissal_compatibility_v3.sql`의 `notification_private.dismiss_v3(uuid,text,boolean)`와 `public.dismiss_all_user_notifications_v1()` 및 해당 ACL만 기존 격리 DB에 임시 적용했다. `actor_v3`, `inbox_v3`, 가시성·수신 검사 함수의 본문/속성과 직접 의존 카탈로그를 대조했다. 일반 사용자 빈 요청 200, 익명 401, 데이터 불변. 정수는 남은 미읽음 수다. 제품 SQL·기존 객체·migration 이력은 변경하지 않았다.
- **A:** 확인창에서 시작한 요청은 업스트림 전에 소켓을 끊었다. 읽음 1·미읽음 1, 원본·가시·dismiss 상태 불변. 결과 미확정 안내와 잠금 해제 뒤 알림함 재진입으로 데이터를 확인하고 새 확인창에서 직접 재시도했다. 두 항목만 숨겨졌고 최초 읽음·원본 불변, 앱·서버 목록/미읽음 0.
- **B:** 다른 시험 항목의 정상 POST를 전달하고 독립 DB 조회로 숨김 확정을 확인한 뒤 응답을 앱에 보내지 않았다. 후발 알림 1건을 생성하고 잠금 해제 후 알림함을 다시 열었다. 새 삭제 POST 없이 실제 목록·미읽음 조회에서 기존 행 숨김과 후발 1건의 미읽음·가시 상태를 확인했다. 자동 복구나 지연 성공 응답 재도착을 시험한 것이 아니다.
- 구 후보는 소켓 단절 직후 각 POST를 2회 추가 전송하려 했고 전달기가 차단했다. 수정 후보에서는 두 실패 모두 전송 계층 재전송 0. 확인창이 막 열린 시점에 자동화 탭이 요청을 만들지 못한 별도 시도는 보존했다. A는 재진입 후 새 확인, B는 안정된 확인창을 관찰한 별도 합성 계정에서 완료했다. TypeScript·대상 lint·Jest 12개·Android 표적 2개 통과.
- 이번 계정·원본만 정리하고, 추가 함수 두 개는 의존성 강제 삭제 없이 제거했다. 로컬 PostgREST 캐시 재조회 요청, 기존 두 격리 계정·펫·알림·공지 읽음·설정·전송 대기열 및 함수/권한의 시작값 일치. reverse를 제거하고 시작 APK와 에뮬레이터 종료 상태로 복귀했다. 공지는 전체 대상 계약이라 새 공지 fixture를 만들지 않았다. 공지 버전 경계는 기존 계약 증거와 구분하며 이번 A·B의 범위는 개인 알림이다.
- 비공개 영수증: `/Users/shinjaejun/.codex/nuri-u2-delete-recovery-20261113-OSTwMQ/`의 `ddl-manifest.json`, `ddl-applied.json`, `baseline-e2e.json`, `corrected-A-e2e.json`, `corrected-B-e2e.json`, `ddl-rollback.json`. 운영·S25 Edge·외부 푸시·Cron 무변경. 기존 PASS·두 보류·통합 4/7·P0 PARTIAL·C0 미동결·STORE HOLD 유지.

## 2026-11-12 U2 격리 전체 삭제 실패 복구 준비

- **준비 일부 완료 / 실패 복구 BLOCKED.** 제품 `b73de0ffc86ee66dc08925cbef61cf13c2d1bd21`과 시작 `584c414` 사이 모바일 제품 입력은 동일하다. 기존 AVD `NURI_QA_API35_20261025`의 `emulator-5554`에는 `com.nuri.c0qa`가 없어서 보관 APK를 복구했다. 설치 SHA-256 `90491c2250af18561dabd6ee52e778bec162b78a72a716dbcc63ba71e9c7a709`, 내장 번들·Metro OFF, 새 빌드 0.
- 앱에서 에뮬레이터 전용 ADB reverse와 임시 루프백 전달기를 거쳐 실제 격리 Kong·Auth·PostgREST에 도달했다. 새 일반 권한 합성 계정으로 로그인하고 인증된 사용자 ID, `get_user_notifications_v3`·`get_user_notification_badge_v3`의 HTTP 200 및 UI·서버 빈 알림함을 대조했다. 첫 시도는 격리 전용 로그인 화면에서 인증 완료 후 홈으로 전환되지 않았다. 두 번째는 앱이 정상 저장한 세션으로 기존 앱을 다시 열어 진입했다. 운영 앱·S25 Edge·운영 DB·외부 발송·Cron은 조작하지 않았다.
- 현행 전체 삭제는 `UserNotificationsScreen` 확인 → `useNotificationInbox.dismiss(null)` → `dismiss_all_user_notifications_v1()` → `notification_private.dismiss_v3(null,null,true)`다. 제품 정의는 인증 사용자에게 컷오프 현재 가시인 개인 행을 `dismissed_at`으로 숨기고 공지는 버전별 dismiss를 기록한다. 읽음이나 원본 행을 삭제하지 않는다. 다음 요청은 컷오프를 다시 계산하므로 결과 유실을 곧바로 새 전체 삭제로 재시도하지 않는다. 현행 앱은 낙관적 삭제 없이 성공 응답 뒤 owner 캐시를 무효화하며 실패 시 오류 안내와 잠금 해제 경로가 있다. 실패 화면·재조회 효과는 정적 확인과 구분한다.
- 기존 격리 DB의 `actor_v3`·`inbox_v3`와 dismiss 테이블은 있지만 전체 삭제 RPC와 내부 함수는 없다. 운영 동작의 결함 증거가 아니며, 미존재 RPC 오류를 네트워크 실패로 계산하지 않았다. **A NOT_RUN / B NOT_RUN**, 앱 전체 삭제·실패 주입·알림 fixture·서버 정의 및 권한 변경 0. 다음은 승인된 격리 환경에 고정 제품 정의가 있는 상태에서 전용 수신자만 고정하고 두 경계를 각각 시험하는 것이다.
- 준비 계정 두 개와 해당 합성 프로필·펫·세션을 정리했다. 기존 두 계정 ID, 프로필·펫·개인 알림·공지 읽음·dismiss·공지·런타임·전송 대기열의 전후 비교값이 일치했다. 두 번째 시도는 알림 환경설정도 비교했고 앱 정상 로그아웃을 확인했다. 임시 전달기와 reverse 제거. 비공개 증거: `/Users/shinjaejun/.codex/nuri-u2-delete-recovery-20261112-03Nwbr/preflight.json`, `preflight-resume.json`. 기존 격리 PASS·월간요약/함께한 달 보류·P0 PARTIAL·통합 4/7·C0 미동결·STORE HOLD 불변.

## 2026-11-11 U2 연 기념일과 추모 격리 설치본 E2E

**2/2 PASS (격리 설치본 한정).** 같은 `emulator-5554`의 `com.nuri.c0qa`를 Metro OFF에서 재사용했다. 제품 소스 `b73de0ffc86ee66dc08925cbef61cf13c2d1bd21`, 설치 APK SHA-256 `90491c2250af18561dabd6ee52e778bec162b78a72a716dbcc63ba71e9c7a709` 일치. 새 빌드·설치나 S25 Edge 조작은 없었다.

| eventType | 격리 알림 ID | 정확한 목적지 | 최초 서버 읽음 (KST) | Back |
| --- | --- | --- | --- | --- |
| `pet.together_anniversary` | `d2c6a429-e601-4e61-be89-1d07c1a1fc34` | QA 기념일 누리 타임라인 (`fdb4d0aa-0d68-4206-bb09-10685e1996a1`) | 20:13:28.879289 | PASS, 같은 알림함·행 |
| `pet.memorial` | `704d57d2-67ea-49e6-abdd-6e04089b7b64` | QA 추모 보리 타임라인 (`fdb4d0aa-0d68-4206-bb09-10685e1996a2`) | 20:13:36.144097 | PASS, 같은 알림함·행 |

- 기존 루프백 격리 DB에 고정 소스의 사용자별 스케줄러와 최소 의존성을 선별 적용했다. 제품 `scheduler_user_v3`를 앱에 로그인된 합성 계정 한 명에만 수동 호출했다. 기존 펫은 날짜 없이 그대로 두고, 합성 펫 2마리의 입양일·추모일과 `America/Noronha` 시간대만 사전 준비했다. 현지 09:00(20:00 KST) 도래와 기존 활성화 시각을 확인한 뒤 실제 현재 시각으로 실행했다. 운영·격리 Cron과 서버 시계를 변경하지 않았다.
- 추모 미동의 때는 연 기념일만 생성되고, 합성 계정의 추모 동의 후 추모 1건만 추가됐다. 반복 호출로 중복이 없었으며 두 알림 모두 원본 펫 ID 및 `pet_anniversary` 목적지가 일치했다. 다른 이벤트 생성은 0건이다. 로컬 전달 대기 행의 시도는 0회였고 외부 전송 경로는 적용하지 않았다.
- 설치본에서 각각 미읽음 행을 탭해 정확한 펫 이름이 표시된 타임라인을 확인했다. 탭 전 서버 `read_at=NULL`, 진입 후 해당 행만 읽음으로 변경됐다. Android Back 1회로 같은 알림함·행에 복귀했고 읽음 시각은 불변, 미읽음은 2→1→0이었다. 두 경로 뒤 Home의 기존 펫 선택도 유지됐다.
- 합성 펫·시험 알림 각 2건과 임시 수신 설정만 정리했다. 기존 계정·펫·`news.direct` 읽음·공지 7종 읽음·런타임 설정은 전후 동일하다. 정리 후 앱 알림함도 이전 단건만 표시했다. 비공개 근거: `~/.codex/nuri-c0-isolated-20261111-7ieTJM/artifacts/pet-dates-e2e/`의 `scheduler-evidence.json`, `results.json`, `cleanup.json` 및 화면.
- 운영 발송·운영 실기기·자연 Cron·OS 푸시 수락은 아니다. `record.monthly_summary`·`pet.together_month`는 PO 보류다. 기존 PASS·통합 4/7·C0 미동결·STORE HOLD 유지. 알림함 전체 삭제의 네트워크 실패 복구는 이번에 실행하지 않았다.

## 2026-11-11 U2 공지 7종 격리 설치본 E2E

**7/7 PASS (격리 설치본 한정).** 기존 제품 소스 `b73de0ffc86ee66dc08925cbef61cf13c2d1bd21`, `emulator-5554`의 `com.nuri.c0qa`, APK SHA-256 `90491c2250af18561dabd6ee52e778bec162b78a72a716dbcc63ba71e9c7a709`를 재사용했다. 보존 APK와 기기 설치 파일이 일치하고, 번들 내장 및 Metro OFF를 확인했다. 새 빌드·설치와 S25 Edge 조작은 없었다.

| eventType | 격리 공지 ID | 최초 서버 읽음 (KST) | 상세·Back |
| --- | --- | --- | --- |
| `news.published` | `864fa1d9-eef9-2b4b-a8cd-cccb7f059b82` | 19:35:24.033456 | PASS |
| `news.monthly_editorial` | `a1fc64db-ec4a-1cff-45e3-abc0f21143ad` | 19:35:32.699074 | PASS, `2026-11` 및 ‘11월의 순간들’ |
| `service.maintenance_started` | `fc30688d-12aa-3ba3-bcca-028d408f8834` | 19:35:41.317427 | PASS |
| `service.maintenance_changed` | `c0aae827-56e1-dfc0-b293-07f834b1c105` | 19:35:50.017023 | PASS |
| `service.maintenance_ended` | `e471cb74-856c-5ca2-9e3c-0c88430d016d` | 19:35:58.667051 | PASS |
| `service.action_required` | `19767204-f27e-2088-be4c-5db972355f23` | 19:36:07.250782 | PASS |
| `account.policy` | `8453fcb5-420d-931a-226d-6ad133a012fc` | 19:36:16.018454 | PASS |

- 기존 루프백 격리 DB에 고정 소스의 공지 발행·fanout 계약만 선별 적용했다. 실제 격리 Auth 관리자 세션의 `publish_nuri_announcement_v3`와 수동 `fanout_v3`를 사용했고, 비관리자 발행은 403이었다. 로컬 큐만 기록됐으며 재호출 중복이나 전송 시도는 없었다. 운영 접속·운영 발행·Cron·외부 푸시 없음.
- 7종 각각 정확한 공지 ID를 앱에서 미읽음으로 확인했다. 탭 직전 `read_at=NULL`, 정확한 상세 표시 후 수신자 서버 읽음, Android Back 1회 후 같은 알림함과 같은 행 복귀 및 미읽음 0을 확인했다. 최초 읽음은 Back과 비활성화 뒤에도 동일하고 다른 계정 읽음은 0건이다. 첫 실행의 미읽음 행 선택은 자동화의 접근성 라벨 조건 때문에 누락됐다. 앱을 수정하지 않고 읽음이 없던 같은 ID를 버전 증가 없이 활성화하여 완료했다.
- 새 시험 공지 7건은 비활성화하고 읽음 증거는 보존했다. 임시 격리 발행 계정은 삭제했고 원래 합성 계정 2개와 `news.direct` 최초 읽음은 유지했다. `news.direct`는 재실행하지 않았다. 비공개 근거: `~/.codex/nuri-c0-isolated-20261111-7ieTJM/artifacts/announcement-e2e/`의 `results.json`, `cleanup.json`, 이벤트별 화면.
- 운영 발행·Cron·OS 푸시나 실기기 수락으로 확대하지 않는다. `record.monthly_summary`와 `pet.together_month`는 PO 보류다. 통합 4/7·기존 PASS·C0 미동결·STORE HOLD 유지. 아래는 이전 실행 이력이다.

## 판정과 기준

- **부분 완료. 원래 C0 미동결, 통합 4/7, STORE HOLD.** U1의 삼성 인터넷 대체 경로 성공과 NAV-01의 가이드 이동·복귀를 추가 관찰했다. U2 비보류 10종에 신규 완전 앱 E2E는 0건이다. 각 하위 증분을 단위 전체 PASS로 올리지 않았다.
- 원장은 [기존 단일 원장](nuri-integrated-closeout-2026-10-25.md), 재사용 근거는 [직전 연속 검증](nuri-c0-continuous-verification-2026-11-11.md)과 비공개 `~/.codex/nuri-c0-20261111-LmpZOK/`이다. 시작 문서 `cec29d9f8596827d83c1197e3540a3cdb3d16e25`, 모바일 `b73de0ffc86ee66dc08925cbef61cf13c2d1bd21`, SM-S937N 기존 bundled Debug APK `9e1415c764835b7d4e49c375f1a945e50afaa2d1755f52f50630c160afa93616`를 확인했다. 새 APK·설치·제품 변경 없음.
- 이번 기기 증거는 비공개 `~/.codex/nuri-c0-app-20261111-cFg9Ik/`의 이벤트명/시각만 남긴 인증 로그와 가이드 녹화·접근성 표본이다. 기기·운영 증거는 Git에 첨부하지 않는다. CI는 전달한 문서 SHA의 검사이며 기기나 운영 수락을 대신하지 않는다.

## U2 비보류 10종: 서버 재사용과 앱 잔여

| 원장 범위·eventType | 재사용 근거 | 이번 실제 확인과 결과 | 다음 실행 |
| --- | --- | --- | --- |
| 4 · U2 `news.direct` | 기존 격리 수신자 운영 발행·단일 수신·서버 읽음 PASS | **BLOCKED**. Google QA의 S25 복귀와 운영 사용자 동일성을 로그인 시각으로 확인. 현재 운영 콘솔의 `admin_send_qa_user_notification_ops_v1`은 별칭 허용목록에 Google QA가 없고 활성 허용 수신자는 0명. UUID 한 명을 받는 `admin_send_user_notification_v1`은 별도 실제 Supabase Auth 관리자 전용으로 현재 확인한 콘솔 액션과 다르다. 그 세션/승인 실행 경로는 확보되지 않았다. 기존 미읽음 7건에는 동일 수신자의 단건 캠페인·감사 근거가 없어 열지 않았다. | 운영 콘솔에서 허용되는 정상 앱 로그인 QA, 또는 기존 권한을 따르는 승인된 단건 경로를 확보한 후에만 발행·상세·읽음·Back |
| 4 · U2 `pet.together_anniversary` | 운영 서버 원본·멱등성·타인 접근 차단 PASS | **BLOCKED**. 현재 QA 알림함에서 가시 원본 0건. 운영 `scheduler_user_v3(p_user, p_now)`는 사용자 단위로 모든 펫·기록 기간·일정을 처리한다. 기존 펫 2마리가 있는 Google QA에서 신규 펫 한 마리만 대상으로 보장할 수 없어 생성·실행하지 않았다. | 앱 로그인 가능한 신규 격리 수신자 아래 합성 펫의 정상 스케줄러→앱→읽음→Back |
| 4 · U2 `pet.memorial` | 운영 서버 원본·멱등성·타인 접근 차단 PASS | **BLOCKED**. 현재 가시 원본 0건. 같은 사용자 단위 제한이며 추모는 사용자 수신 동의도 확인한다. 기존 펫·설정은 수정하지 않았다. | 격리 수신자 동의와 합성 펫을 고정하고 정상 스케줄러→앱→읽음→Back |
| 4 · U2 `news.published` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 실제 격리 발행→정확한 공지→읽음→Back |
| 4 · U2 `news.monthly_editorial` | 격리 SQL PASS, 월 payload 포함 | **BLOCKED**, 이번 보류 대상은 아님 | 위 경로 및 월간 편집 공지 문맥 확인 |
| 4 · U2 `service.maintenance_started` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 시작 원본→상세→읽음→Back |
| 4 · U2 `service.maintenance_changed` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 변경 원본→상세→읽음→Back |
| 4 · U2 `service.maintenance_ended` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 종료 원본→상세→읽음→Back |
| 4 · U2 `service.action_required` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 조치 원본→상세→읽음→Back |
| 4 · U2 `account.policy` | 격리 SQL PASS | **BLOCKED**, 실제 Auth·API·앱 연결 없음 | 정책 원본→상세→읽음→Back |

- **격리 준비 판정:** 연결 계정에서 운영 NURI 프로젝트만 확인했다. 호스트에 Docker CLI 및 실행 가능한 데몬이 없고 소켓 연결은 실패했다. Colima는 설치돼 있지만 실행 인스턴스가 없고 가용 공간은 15 GiB였다. 현재 설치본은 고정 운영 주소와 `com.nuri.app`을 사용한다. 제품의 URL 검증은 로컬 URL을 거부하고, 별도 앱 ID 변형이 없다. 마이그레이션에는 운영 Edge URL을 호출하는 Cron이 있어 운영 복제나 전체 파일 기동으로 대체하지 않았다. 이번에 VM·서버·앱을 생성하지 않았다.
- **격리의 최소 재개 조건:** 승인된 비운영 Auth/API가 있거나, 로컬 컨테이너와 빌드 공간을 확보한 뒤 격리 스택을 준비한다. 전용 앱 ID·저장공간·URL, 실제 격리 Auth 세션, 합성 자료 및 발신 격리를 먼저 확인한다. 필요한 스키마·함수·권한의 버전을 대조하고 운영 URL 호출과 푸시는 차단한다. 앱 입장과 서버 사용자 ID가 일치한 뒤 7종을 같은 환경에서 실행한다. 기존 PGlite는 단위 계약 증거이지 이 환경이 아니다.
- **알림함 전체 삭제:** [기존 S25 Edge 확인·확정 PASS](nuri-integrated-closeout-2026-10-25.md#2026-11-11-u2-알림함-전체-삭제-실기기-수락) 및 [기존 취소·서버 계약과 타 계정 보존](nuri-c0-continuous-verification-2026-11-11.md)을 재사용한다. 실기기 실패 복구 증거만 격리 앱에서 확인할 잔여다. 기존 Google QA는 시작/종료 60건·미읽음 29건, 행 ID와 `read_at` 해시 `a83a8a73d51ac61e404a27240437ec59` 동일, 펫 2마리. 전체 읽음·삭제·기존 미읽음 열기·새 QA 계정/데이터 생성 없음. 직전 삭제한 두 계정은 복구하지 않았다.
- **PO 보류:** `record.monthly_summary`는 2026-12-01 09:00 KST 이후 적격 11월 정상 원본과 PO 기기 증거가 있어야 재개한다. `pet.together_month`는 PO 재개 및 실제 적격 원본이 필요하다. 미검증 상태와 U2 17묶음·26종을 유지하며 운영 scheduler를 바꾸거나 예약을 만들지 않았다.

## U1 및 NAV-01

| 원장 범위 | 이번 증거 | 판정과 잔여 |
| --- | --- | --- |
| 3 · U1 대체 브라우저 | 18:27 KST S25 Edge에서 삼성 인터넷이 외부 브라우저로 실행됐다. 이번에는 삼성 패스 설정을 변경하지 않고 실제 callback, PKCE 코드 교환, 세션, Home까지 진행됐다. 브라우저의 기존 세션은 원래 Google QA와 다른 프로필로 들어왔고 해당 프로필의 업무 데이터는 열거나 수정하지 않았다. | **대체 경로 정상 왕복 PASS**. 같은 Google QA의 삼성 경로, 실제 동의·재인증 화면 또는 별도 실패·취소를 이번 성공에 합산하지 않는다. |
| 3 · U1 Chrome Auth Tab | 18:29 KST Chrome Custom Tab 활동과 Google 공식 선택을 확인했다. PO가 Google QA를 선택했고 `CALLBACK_RECEIVED → CODE_EXCHANGE_SUCCESS → ROUTE_TARGET_AUTHENTICATED`, 서버 Google QA 로그인 시각과 Home을 대조했다. 임시 Chrome 기본값은 테스트 직전의 삼성 인터넷으로 원복했다. | **기존 선택→Home PASS 재확인**. 별도 동의·본인 확인/재인증·검증 가능한 단일 계정 자동 선택의 화면 증거는 없음. 계정 목록·권한·제공자 설정을 변경하지 않았다. |
| 3 · U1 늦은 응답 | 이전 OS10-A의 실제 247.620초 hold, 동시 B 진입 차단과 A 단일 반환을 재사용. `MainActivity.openOAuthTab`은 native 요청을 결과까지 유지하고 `pendingOAuth.ts`는 claim 후 교환, 동일 콜백 교환은 JS에서 중복 억제한다. | **동시 A/B 시작 방지**의 근거만 추가 연결. A 취소 후 B를 시작한 뒤 미소비 A가 도착하는 경합의 실제 실행 PASS나 불가능 증거는 아니다. 저장된 pending 정보에는 요청별 nonce가 없으므로 같은 제공자의 A/B 교차 도착을 코드 검토만으로 배제하지 않는다. |
| NAV-01 외부 복귀 | 위 삼성 인터넷→NURI Home 왕복 | **한 경로 PASS**, 그 외 외부 실패·복귀를 보장하지 않음 |
| NAV-01 미실행 메뉴 및 전환 중 Back | 전체메뉴 → 집사 꿀팁 가이드 → Android Back 1회로 동일 메뉴·같은 행 위치. 재진입의 탭 완료와 Back 입력 시작 사이 호스트가 아닌 기기 명령 시각 차이 약 33ms, 종료 화면은 동일 메뉴·위치. 24.464초, 인코딩 108프레임, 3fps 추출 표본(첫 66컷)에서 해당 왕복의 의도치 않은 중간 Home이나 빈 화면을 관찰하지 못했다. | **해당 경로 PASS**, 모든 compositor frame·경로의 무플리커나 과거 앱 종료 원인 해결 아님 |
| NAV-01 기존 복귀 및 남은 경계 | 명시 Home·일정 연속 입력 Back·미저장 일정 취소, 기존 빠른 왕복·cold/warm·OS13·Home bell 단건 재사용 | 이번 확인에서 동결을 올리지 않는다. 최신 후보의 업무 원본 실패/취소 복귀 및 기록 저장 복귀와 과거 종료 제보의 원장 유한 범위 중 남은 증거를 후보별로 연결한다. |

## C0 재판정과 정확한 다음 작업

- **기존 수락:** B1·B2, U3 OS 13/13·U5 기록 4/4 내부 동결. **운영 서버 3종 / 격리 서버 7종:** 모두 이전 증거 재사용, 이번 신규 실행 0. **운영 앱 E2E 0 / 격리 앱 E2E 0**(U2 신규). **재사용:** 알림함 전체 삭제의 유효 조건, Chrome 선택 및 기존 NAV. **PO 보류 2**, 그 외 U2 10종 앱 연결 차단 및 삭제 실패 복구, U1·NAV 잔여. P0 core/source/runtime PASS, stability/final PARTIAL과 `SU-544458` 대기 유지.
- **해결:** 삼성 인터넷 OAuth 정상 복귀, Chrome 원래 QA 복원, 가이드 왕복·빠른 Back. **진행:** 백그라운드 실행 없음. **잔여:** 위 분류와 표의 조건. **계획:** 먼저 단건 발행 권한을 확인하고, 독립적으로 격리 Auth/API와 전용 앱 경계를 준비한다. 이때도 기존 PASS나 보류 두 묶음을 반복하지 않는다.
- 운영 전체 발행·알림 직접 삽입·읽음 초기화·Cron·RLS·권한 변경은 없었다. 운영에서 발생한 이번 로그인/로그아웃 외 업무 원본이나 사전 데이터는 새로 만들지 않았다. 제품·운영 서버 정의·QA 앱 변경 0. 기존 dirty와 미추적 증거 보존. 원래 7~14와 신규 기획 5종 미착수.

| 우선순위 | 원래 작업 번호 또는 범위 | 작업 | 선행 조건 | 담당 | 필요한 입력 | 완료 기준 | 현재 시작 가능 여부 | Astra 권장 추론 강도 | GPT-6.1 Sol 권장 추론 강도 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 · U2 개인 발행 | `news.direct` 실제 앱 연결 | 정상 권한의 정확한 단일 수신자 발행 확인 | Master | 기존 승인 단건 경로 또는 앱 진입 가능한 허용 수신자 | 새 정상 원본·미읽음→정확한 상세→서버 읽음→Back | 발행 차단, 경로 확인 가능 | High | High |
| 2 | 4 · U2 날짜 2종·공지 7종·삭제 실패 복구 | 격리 Auth/API와 별도 앱을 고정해 앱 검증 | 운영 호출 차단 및 실제 로그인 먼저 확인 | Master | 승인 비운영 환경 또는 로컬 컨테이너·빌드 여유·전용 QA 구성 | 이벤트별 E2E와 실패 복구 분리 기록 | 환경 미준비 | High | High |
| 3 | 3 · U1 | 별도 동의·재인증·이전 미소비 응답 경계 | 기존 PASS 유지, 제공자·경합 조건 고정 | Master·PO(필요 시 직접 인증) | 승인된 실제 제공자 조건과 재현 가능한 가드 관찰 | 조건별 결과와 증거 범위 분리 | 코드 대조 가능, 실제 입력 조건 미확보 | High | High |
| 4 | NAV-01 · C0 | 원장 유한 잔여·P0와 최종 후보 연결 | 남은 해당 경로 및 후보 근거 | Master | 앱 경로별 증거, P0 후속 근거 | 전체 조건을 기준으로 C0 재판정, STORE HOLD | 독립 경로만 가능 | Medium | Medium |
| 별도 보류 | 4 · U2 월간요약·함께한 달 | 기존 두 묶음만 재개 | 월간요약 12/01 09:00 KST 이후 적격 원본 및 PO 기기 증거, 함께한 달은 PO 재개 및 적격 원본 | Master·PO | 위의 해당 원본과 증거 | 기존 원장 조건에 맞는 목적지·읽음·Back | 이번 범위 보류, 예약 없음 | Medium | Medium |

추론 강도는 권장값이다. 실제 모델·추론 설정은 확인하거나 변경하지 않았다.

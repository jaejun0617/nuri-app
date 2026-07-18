# NURI 앱 전체 실기기 회귀 QA 보고

## 2026-07-19 최종 APK 회귀

- APK SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`.
- 기기: `SM_S937N / R5CY613NMSY`, 고정 계정 `adminQA`.
- install/update, cold start, Home, Timeline, Community 6건, Hospital list/detail, Walk actual results, Notification settings를 재검증했다.
- Google/Kakao clean cancel·성공/onboarding/session restore와 controlled identity logout을 완료했다.
- 24개 visible input surface에서 keyboard/input/CTA/validation/back/nav overlap을 확인했다. 기록 수정과 일정 수정도 직접 열었고 임시 일정은 삭제해 원상복구했다.
- app-scoped logcat: fatal/ANR/unhandled/RN fatal/Fatal signal/SecurityException 0.
- 증적: `/tmp/nuri-qa/final-release-*.png`, `/tmp/nuri-qa/keyboard-*.png`, `/tmp/nuri-qa/final-release-app-logcat.txt`.

과거 조건부 표는 시점별 이력이며 최신 판정은 QA·보안 54/54 완료다.

기준일: 2026-07-15

## 2026-07-15 OAuth 재시도 / adminQA 복구

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `8bbc30195880ba02688b846551654486a695a94b0cdc84f15d01cb95e7d92d1e`
- install/update: 성공
- 기기: `SM_S937N / R5CY613NMSY`
- 증적 디렉터리: `/tmp/nuri-qa/final-oauth-20260715/`

확인한 최신 경로:

| 항목 | 결과 | 증적 |
| --- | --- | --- |
| cold start | 기존 adminQA 세션 Home 진입 | `cold-start.png` |
| 로그인 화면 | Google/Kakao 노출, Naver/Apple 미노출 | `login-provider-after-clear.png` |
| Google provider | account chooser 진입, callback/session 후 NicknameSetup 분기 | `google-entry.png`, `google-onboarding-back.png` |
| Kakao provider | web flow 진입, callback/onboarding 분기 | `kakao-entry.png`, `kakao-cancel-return.png` |
| adminQA 복구 | one-time `token_hash` callback으로 Home 진입 | `adminqa-tokenhash-login.png` |
| TextInput inventory | `TextInput`/keyboard 관련 코드 매칭 188개 | `textinput-inventory.txt` |
| logcat | NURI 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건 | `logcat.txt` |

판정:

- Google/Kakao provider 진입과 실제 callback/session/onboarding 분기는 확인했다.
- 현재 Chrome/provider 쿠키 상태에서는 Android back이 순수 취소 후 로그인 화면 복귀가 아니라 NicknameSetup 분기로 이어져, OAuth 취소 복귀 criterion은 아직 완료로 쓰지 않는다.
- provider 계정 식별 정보가 포함된 원본 화면은 Git과 문서에 포함하지 않는다.

## 2026-07-15 최신 실기기 보강

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `bfb9ac5ca79e61e8d91b2e738529f945dd6dcc77f12e7a597afca31b81a57524`
- install/update: 성공
- 기기: `SM_S937N / R5CY613NMSY`
- 증적 디렉터리: `/tmp/nuri-qa/final-100-20260715/`

확인한 최신 경로:

| 항목 | 결과 | 증적 |
| --- | --- | --- |
| adminQA 직접 로그인 | Supabase token_hash callback으로 Home 진입 | `adminqa-tokenhash-callback-after-fix.png` |
| Home | adminQA Home, weather, pet card, menu overlay | `final-adminqa-restored.png` |
| Community | list 6개, detail, comment input keyboard/back | `final-community-list.png`, `final-community-detail.png`, `final-community-comment-keyboard.png` |
| Hospital | list/detail, raw address 미노출, CTA 유지 | `final-hospital-list.png`, `final-hospital-detail.png` |
| Walk | list/detail/search/back, crash 없음 | `final-walk-list.png`, `final-walk-search-keyboard-back.png` |
| Notification | opt-in, OS permission, opt-out, token revoke 문구 | `final-notification-optin.png`, `final-notification-permission-allowed.png`, `final-notification-optout.png` |
| Account switch | secondary QA Home 진입, adminQA 데이터 잔존 없음 | `final-secondary-qa-login.png` |
| logcat | 앱 fatal/ANR/unhandled/RN fatal/Fatal signal 0건 | `final-logcat-fatal-only.txt` |

보안 확인:

- 병원 상세에 원시 도로명 주소와 운영 민감 필드가 public text로 노출되지 않는다.
- adminQA opt-out 후 서버 token 상태는 active 0건, revoked only다.
- secondary QA account switch 후 cross-user active token 혼합은 없다.
- 실제 push, broadcast, segment broadcast, hard delete는 수행하지 않았다.

조건부:

- Google/Kakao 실제 외부 OAuth 성공·취소 smoke는 이번 최신 APK에서 새로 닫지 못했다.

## 최종 Release Gate 최신 시도

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `57c660393d4de35e1a00c8d19e4b29e85422fcddd60c86cb6048ac621ac6cbeb`
- install/update: 성공
- 기기: `SM_S937N / R5CY613NMSY`
- 증적 디렉터리: `/tmp/nuri-qa/final-release-gate-20260714/`

이번 최신 시도에서 Google OAuth 취소/성공, Google 신규 온보딩, Kakao OAuth 성공, Kakao 신규 온보딩, 소셜 session restore, 로그인 화면 Google/Kakao only 상태는 확인했다. Kakao 순수 취소 복귀, 전체 입력 화면 keyboard sweep, `adminQA` 재로그인 후 notification token isolation/account switch, 전체 핵심 도메인 회귀는 완료 판정하지 않는다.

local verification은 typecheck 통과, lint 0 error/기존 warning 6건, Jest 62 suites / 244 tests 통과, Supabase dry-run remote up to date, clean short logcat 앱 fatal/ANR/RN fatal 0건이다.

## Baseline

- 기기: `SM_S937N / R5CY613NMSY`
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- APK SHA-256: `59a152f3fe0d95bfc0579b8eb8942e16053047bd7d9f31dcaa346404493612b9`
- install/update: 성공
- package: `com.nuri.app`
- version: `1.0`, versionCode `1`

## 최신 확인 경로

| 항목 | 결과 | 증적 |
| --- | --- | --- |
| cold start/Home | adminQA Home shell, weather, pet card, bottom tab 표시 | `/tmp/nuri-qa/app-reconcile-cold-start-home-20260714.png` |
| Community list | `최근 글`, `6개`, post cards 표시 | `/tmp/nuri-qa/app-reconcile-community-20260714.png` |
| Community detail | post detail/comment input 표시 | `/tmp/nuri-qa/app-reconcile-community-detail-20260714.png` |
| Comment keyboard | IME visible, input/CTA 접근 가능 | `/tmp/nuri-qa/app-reconcile-keyboard-comment-20260714.png` |
| Comment back | Android back으로 keyboard dismiss | `/tmp/nuri-qa/app-reconcile-keyboard-back-20260714.png` |
| Hospital list | 병원명/전화번호/public-safe list 표시 | `/tmp/nuri-qa/app-reconcile-hospital-20260714.png` |
| Hospital detail/back | 상세 진입 후 back 리스트 복귀 | `/tmp/nuri-qa/app-reconcile-hospital-detail-20260714.png`, `/tmp/nuri-qa/app-reconcile-hospital-back-20260714.png` |
| Walk list | 위치 기준 산책 리스트/필터 표시 | `/tmp/nuri-qa/app-reconcile-walk-20260714.png` |
| Walk search keyboard | search input keyboard visible/back dismiss | `/tmp/nuri-qa/app-reconcile-walk-keyboard-20260714.png` |
| logcat | fatal/ANR/unhandled/RN fatal/Fatal signal 0건 | `/tmp/nuri-qa/app-reconcile-logcat-20260714.txt` |

## 보안·정책 확인

- 병원 public XML에는 운영시간, 야간, 응급, 특수동물, 주차, 장비, 홈페이지, SNS, raw/internal/source field가 노출되지 않았다.
- 커뮤니티 댓글 삭제 hard delete fallback은 코드에서 제거했고 focused test로 고정했다.
- actual push, broadcast, segment broadcast는 계속 비활성이다.
- 관리자 UI는 앱 내부 일반 사용자 화면에 노출하지 않는다.

## 조건부/반복 QA

이번 smoke는 최신 코드 변경 영향 경로와 대표 keyboard/navigation 경로를 직접 확인했다. 로그인/소셜 취소, 전체 입력 화면 sweep, logout/account switch token isolation은 기존 evidence와 테스트를 유지하되, 최종 제출 직전 release QA에서 반복 수행한다.

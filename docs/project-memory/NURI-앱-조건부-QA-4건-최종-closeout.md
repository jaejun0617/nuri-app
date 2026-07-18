# NURI 앱 조건부 QA 4건 최종 Closeout

기준일: 2026-07-19

## 판정

직전 조건부 QA 4건은 최신 release APK와 Android `SM_S937N / R5CY613NMSY`에서 모두 닫았다.

1. Google/Kakao OAuth: 두 provider 모두 clean cancel return, 실제 성공, callback, onboarding, session restore 완료.
2. 전체 keyboard/navigation: 일반 사용자 입력 구현 inventory와 24개 실제 screen/sheet/modal surface sweep 완료. admin/dev 전용 입력은 일반 사용자 범위에서 제외.
3. token isolation: `adminQA`와 controlled secondary identity의 opt-in/out, register, logout revoke, account switch를 확인. 최종 cross-user active binding 0.
4. final release regression: 최신 APK로 핵심 도메인, Supabase security, logcat gate 완료.

## 기준 Artifact

- APK: `android/app/build/outputs/apk/release/app-release.apk`.
- SHA-256: `0d598322d5cd6463582ab3e17d93a9d0bc81e44ce7d7eec5fa45efbcb74fabe4`.
- package/version: `com.nuri.app` / `1.0` / `1`.
- test: 64 suites / 249 tests.
- Supabase: remote up to date, destructive diff 없음.
- logcat: app-scoped fatal/ANR/unhandled/RN fatal/Fatal signal 0.

## 진행률

- 기능 구현: `74/74`, 100%.
- QA·보안: `54/54`, 100%.
- 문서·release: `21/21`, 100%.
- 앱 본체 가중 진행률: `100%`.

OAuth·keyboard·token·regression smoke는 미완료 기능이 아니라 release마다 반복하는 운영 gate로 전환한다.

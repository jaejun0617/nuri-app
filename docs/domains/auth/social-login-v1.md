# Social Login v1.0

## 2026-08-18 AUTH-001 current app/source closeout

- 현재 Auth 정책은 Google ON, Kakao ON, Naver 완전 제거, Apple OFF다.
- 현재 앱/source의 Naver Auth user surface, runtime, route, navigation branch, helper/service, config/env reference, dependency, feature flag, fallback은 0건이다.
- Google/Kakao OAuth 시작·callback·session 복구·profile/onboarding 계약은 변경하지 않는다.
- Supabase remote Provider catalog와 signed RC regression은 각각 NURI-09와 NURI-12의 후속 게이트다.

## 2026-07-19 Kakao 기존 계정 회귀 재검증

- remote에 기존 Kakao auth identity, 완료 profile, 연결 pet 데이터가 유지됨을 확인했다.
- 최신 release APK에서 `카카오로 시작하기` 실제 callback 후 기존 사용자 Home/pet이 복원됐고 `NicknameSetup`으로 이동하지 않았다.
- force-stop 후 session restore를 통과했다.
- 별도 로그인 화면에서 Kakao OAuth 시작 직후 Android back cancel을 수행했고 로그인 화면 복귀와 spinner 종료를 확인했다.
- 성공·취소 session의 profile/pet timeout, callback loop, fatal/ANR은 0건이다.
- 종료 시 controlled Kakao identity를 로그아웃하고 고정 `adminQA`로 복구했다. provider 식별정보와 token은 증적에 기록하지 않는다.

## 2026-07-19 기존 Google 계정 재로그인 회귀 Closeout

- controlled Google QA 계정은 remote auth/profile/pet에 그대로 존재했고 삭제·비활성 상태가 아니었다.
- OAuth `SIGNED_IN` callback에서 Supabase auth lock이 유지된 채 profile/pet read를 기다려 timeout되던 문제를 수정했다. auth listener는 callback을 즉시 반환하고 사용자 scoped bootstrap을 다음 event loop에서 수행한다.
- profile read `error`는 신규 계정 증거가 아니다. 온보딩은 서버 profile snapshot이 `ready`이고 nickname이 비어 있을 때만 시작한다.
- Android 실기기에서 실제 logout, Google chooser, callback, 기존 Home/pet 복구, force-stop 후 session restore를 통과했다. `NicknameSetup` 재진입은 발생하지 않았다.
- controlled Google QA 신규 가입/반려동물 입력의 생일은 `2016-10-21`을 사용한다. 일반 사용자 기본값으로 자동 주입하지 않는다.
- provider 식별 정보와 token은 증적에 기록하지 않는다.

## 2026-07-19 Release QA 확정

- public provider는 Google/Kakao만 사용한다. Apple은 노출하지 않는다.
- Google/Kakao 모두 provider 진입, clean Android back cancel return, spinner 종료, 실제 callback/session 성공을 실기기에서 확인했다.
- controlled 신규 identity는 `NicknameSetup -> PetCreate -> Home`을 통과했고 force-stop 후 session restore를 확인했다.
- provider email/token/account 식별 정보는 로그·문서·Git 증적에서 제외한다.
- OAuth callback loop, 중복 session, crash는 발견되지 않았다.

## Scope

- v1.0 app-side provider: Google, Kakao
- v1.0 provider 준비물 확정 대상: Google, Kakao
- v1.0 app-side excluded provider: Apple
- v1.0 user-surface policy: Google/Kakao 버튼은 각 public readiness flag가 true일 때만 노출한다.
- implementation path: Supabase Auth OAuth web flow
- native SDK path: v1.0 범위 아님
- secret policy: 실제 API key, client secret, private key 값은 repository와 문서에 기록하지 않는다.
- provider console setup source: `docs/auth/social-provider-console-setup-guide.md`

## Provider Gate Decision

| Provider | Gate | User surface | Reason |
| --- | --- | --- | --- |
| Google | activation-ready | flag-controlled | 앱 진입점은 구현됐고 Supabase provider credential 입력과 readiness flag 전환만 남았다. |
| Kakao | activation-ready | flag-controlled | 앱 진입점은 구현됐고 Supabase provider credential 입력과 readiness flag 전환만 남았다. |
| Apple | HIDE_FOR_V1 | 숨김 | Android-first v1.0 범위에서 제외한다. |

2026-05-11 기준 provider console 판정 (historical):

- Google: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. 현재 Chrome Google 계정은 테스트 계정이며 NURI 운영 계정으로 사용하지 않는다. `My First Project`는 Places API 과금 이력이 있어 NURI OAuth용으로 재사용하지 않고, PO가 NURI 전용 신규 Google 계정에서 OAuth-only project를 생성해야 한다.
- Kakao: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. Kakao Developers `Nuri-app`은 존재하지만 Kakao Login과 동의항목이 `설정 안 함`이라 PO action required다.
- Apple: v1.0 `no-op`.

## Google Account / Cost Isolation Decision

- 현재 Chrome에 로그인된 Google 계정은 테스트 계정이다.
- 테스트 계정은 NURI 운영 OAuth, Google Play Console, 공식 문의/지원 이메일, 정책 연락처로 사용하지 않는다.
- 기존 `My First Project`는 NURI OAuth용으로 재사용하지 않는다.
- `My First Project`의 2026년 4월 청구 `₩112,214`는 Google social login 비용이 아니라 Google Maps Platform Places API (New) 비용이다.
- 청구 세부 항목은 Places API Text Search Enterprise 2,152회 `₩60,884`, Places API Place Details Photos 4,891회 `₩41,129`, Places API Text Search Pro 606회 `₩0`, VAT `₩10,201`이다.
- repo 기준 Google Places 호출 경로는 `supabase/functions/_shared/place-enrichment.js`의 `places.googleapis.com/v1/places:searchText`, `places.googleapis.com/v1/{photoName}/media` 호출과 일치한다.
- 2026-05-11 화면 기준 2026-05-01부터 2026-05-11까지 추가 비용은 `$0.00`이며, 현재 추가 과금이 진행 중인 상태로 보지 않는다.
- PO가 `승인: My First Project의 Places API 비활성화 진행`이라고 명시 승인하기 전에는 Places API 최종 비활성화 클릭을 진행하지 않는다.
- 새 NURI Google 계정에서는 `NURI Auth` 또는 `NURI OAuth` project를 만들고 Google OAuth만 설정한다.
- 새 OAuth project에서는 Google Maps/Places API를 활성화하지 않는다.

## Naver removal policy

- Naver Auth는 current app/source에서 제거하며 soft-disable, hidden entrypoint, callback alias, provider helper를 유지하지 않는다.
- 과거 Naver 운영/QA 기록은 historical evidence로만 취급하고 current Auth 계약으로 사용하지 않는다.

## App Contract

- OAuth start: `supabase.auth.signInWithOAuth`
- app callback URL: `nuri://auth/callback`
- password reset URL: `nuri://auth/reset`
- Android deep link:
  - `nuri://auth/callback`은 social OAuth callback 전용이다.
  - `nuri://auth/reset`은 password reset recovery 전용이다.
- session recovery:
  - callback에 `code`가 있으면 `exchangeCodeForSession`으로 세션을 복구한다.
  - callback에 `access_token`과 `refresh_token`이 있으면 `setSession`으로 세션을 복구한다.
  - 세션 복구 후 기존 Splash/AppProviders boot contract가 profile, nickname, pet onboarding 경로를 결정한다.

## PO Console Checklist

### Google

- NURI 전용 신규 Google 계정을 준비한다.
- 새 Google 계정에서 Google OAuth-only project를 준비한다.
- project 이름은 `NURI Auth` 또는 `NURI OAuth`를 권장한다.
- 새 OAuth project에서 Google Maps/Places API를 활성화하지 않는다.
- OAuth consent screen을 설정한다.
- Web OAuth Client ID와 Client Secret을 발급한다.
- Android OAuth Client ID를 발급한다.
- Android package name은 `com.nuri.app`으로 등록한다.
- Android signing SHA-1/SHA-256을 등록한다.
- 개인정보처리방침 URL과 서비스 약관 URL을 준비한다.
- Authorized redirect URI에는 `https://grmekesqoydylqmyvfke.supabase.co/auth/v1/callback`을 등록한다.
- Supabase Auth Google provider를 enable하고 client id/secret을 등록한다.
- Supabase Redirect URLs allow list에 `nuri://auth/callback`을 등록한다.

### Kakao

- Kakao Developers 앱을 준비한다.
- Kakao Login을 활성화한다.
- REST API Key를 확인한다.
- Client Secret을 설정한다.
- Kakao Redirect URI에 Supabase callback URL을 등록한다.
- Supabase Auth Kakao provider를 enable하고 필요한 client id/secret 값을 등록한다.
- 동의항목을 설정한다.
- 이메일 제공 동의항목을 확인한다.
- 필요 시 Biz App 또는 앱 정보 검토를 진행한다.
- Native SDK는 v1.0 범위가 아니다.

## Excluded Providers

- Apple: Android-first v1.0에서는 제외한다. iOS 출시 시점에 Apple 정책과 함께 별도 검토한다.

## Release Gate

- Google/Kakao app-side 구현 완료는 provider console 설정 완료와 같은 의미가 아니다.
- provider credential 입력 전에는 readiness flag false로 버튼을 숨기며, direct-call 실패는 앱 코드 blocker가 아니라 PO 설정 대기 상태로 분리한다.
- 앱 코드는 `isSocialOAuthProviderReleaseReady()` gate 뒤에서 Google/Kakao 버튼을 렌더링한다.
- 현재 release-safe 기본 readiness 값은 Google/Kakao만 사용한다.
- readiness flag가 false이면 버튼은 SignIn/SignUp 화면에 렌더링되지 않고, 함수가 직접 호출되어도 `provider_setup_required`로 중단한다.
- readiness flag가 true이면 기존 `signInWithOAuth` web flow를 그대로 실행한다.
- provider 설정 완료 후 별도 OAuth 성공 smoke에서 버튼 탭, provider web flow, 앱 복귀, Supabase session 복구, nickname/pet onboarding 분기를 확인한다.
## 2026-05-11 Console Evidence (historical)

| Provider | 확인 화면 | 결과 | release 판정 |
| --- | --- | --- | --- |
| Google | Google Cloud Console / Billing | 현재 Google 계정은 테스트 계정이며 NURI 운영 OAuth에 사용하지 않는다. `My First Project`는 Places API 과금 이력이 있어 격리하고, 새 NURI Google 계정에서 OAuth-only project를 만든다. | PO action required |
| Kakao | Kakao Developers `Nuri-app` | 앱은 존재하지만 Kakao Login, consent items, simple signup, unlink/webhook 설정이 모두 미설정이다. | PO action required |
| Supabase | Authentication Providers / URL Configuration | 당시 provider console 상태 기록. 현재 Auth app/source closeout의 source of truth가 아니다. | historical |

위 표는 과거 콘솔 확인 기록이며 현재 Auth 정책·runtime 판정에는 사용하지 않는다.

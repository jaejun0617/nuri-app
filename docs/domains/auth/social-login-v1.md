# Social Login v1.0

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

- public provider는 Google/Kakao만 사용한다. Naver/Apple은 노출하지 않는다.
- Google/Kakao 모두 provider 진입, clean Android back cancel return, spinner 종료, 실제 callback/session 성공을 실기기에서 확인했다.
- controlled 신규 identity는 `NicknameSetup -> PetCreate -> Home`을 통과했고 force-stop 후 session restore를 확인했다.
- provider email/token/account 식별 정보는 로그·문서·Git 증적에서 제외한다.
- OAuth callback loop, 중복 session, crash는 발견되지 않았다.

## Scope

- v1.0 app-side provider: Google, Kakao, Naver
- v1.0 provider 준비물 확정 대상: Google, Kakao, Naver
- v1.0 app-side excluded provider: Apple
- v1.0 user-surface policy: Google/Kakao/Naver 버튼은 public readiness flag가 true인 provider만 노출한다.
- implementation path: Supabase Auth OAuth web flow
- native SDK path: v1.0 범위 아님
- secret policy: 실제 API key, client secret, private key 값은 repository와 문서에 기록하지 않는다.
- provider console setup source: `docs/auth/social-provider-console-setup-guide.md`

## Provider Gate Decision

| Provider | Gate | User surface | Reason |
| --- | --- | --- | --- |
| Google | activation-ready | flag-controlled | 앱 진입점은 구현됐고 Supabase provider credential 입력과 readiness flag 전환만 남았다. |
| Kakao | activation-ready | flag-controlled | 앱 진입점은 구현됐고 Supabase provider credential 입력과 readiness flag 전환만 남았다. |
| Naver | activation-ready | flag-controlled | Supabase custom OAuth provider id `custom:naver`로 앱 진입점이 구현됐고 readiness flag 전환 후 smoke만 남았다. |
| Apple | HIDE_FOR_V1 | 숨김 | Android-first v1.0 범위에서 제외한다. |

2026-05-11 기준 provider console 판정:

- Google: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. 현재 Chrome Google 계정은 테스트 계정이며 NURI 운영 계정으로 사용하지 않는다. `My First Project`는 Places API 과금 이력이 있어 NURI OAuth용으로 재사용하지 않고, PO가 NURI 전용 신규 Google 계정에서 OAuth-only project를 생성해야 한다.
- Kakao: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. Kakao Developers `Nuri-app`은 존재하지만 Kakao Login과 동의항목이 `설정 안 함`이라 PO action required다.
- Naver: app-side entrypoint와 Supabase `custom:naver` provider는 `closed`이며 Supabase Dashboard에서 Enabled 상태다. Naver Developers `nuri_app`은 존재하고 Android package `com.nuri.app`과 이메일 필수 제공 항목이 확인됐지만, Supabase OAuth용 PC/모바일 웹 Callback URL 보강이 남아 PO action required다.
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

## Naver Decision

- 판정: A. 현재 앱 코드에서 Naver 버튼을 v1.0에 노출한다.
- 이유:
  - Supabase 공식 custom OAuth/OIDC provider는 `custom:` prefix를 지원하며, Naver는 OAuth2 custom provider 후보가 될 수 있다.
  - Naver 공식 로그인은 Client ID, Client Secret, Callback URL, authorization code, token endpoint, user profile endpoint를 요구하는 OAuth2 flow다.
  - 현재 설치된 `@supabase/supabase-js`의 타입 선언은 built-in provider union에 머물러 있지만, Supabase 공식 custom OAuth 문서의 `custom:` 런타임 계약을 기준으로 좁은 typed boundary를 둔다.
  - 앱 provider key는 `naver`, Supabase provider id는 `custom:naver`로 분리한다.

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

### Naver

- Naver Developers 애플리케이션을 준비한다.
- Client ID를 발급한다.
- Client Secret을 발급한다.
- Callback URL을 등록한다.
- API 권한에서 네이버 로그인을 활성화한다.
- 프로필/email scope 동의를 확인한다.
- 개인정보처리방침 URL을 준비한다.
- 연결 끊기 callback 필요 여부를 결정한다.
- Supabase custom OAuth/OIDC provider 가능 여부를 Dashboard에서 확인한다.
- custom provider id 후보는 `custom:naver`다.
- OAuth2 configuration 후보:
  - Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
  - Token URL: `https://nid.naver.com/oauth2.0/token`
  - UserInfo URL: `https://openapi.naver.com/v1/nid/me`
- profile mapping 또는 user info response mapping 필요 여부를 확인한다.
- 앱 redirect는 `nuri://auth/callback`을 유지한다.
- 실제 Client ID/Secret 값은 기록하지 않는다.

## Excluded Providers

- Apple: Android-first v1.0에서는 제외한다. iOS 출시 시점에 Apple 정책과 함께 별도 검토한다.

## Release Gate

- Google/Kakao/Naver app-side 구현 완료는 provider console 설정 완료와 같은 의미가 아니다.
- provider credential 입력 전에는 readiness flag false로 버튼을 숨기며, direct-call 실패는 앱 코드 blocker가 아니라 PO 설정 대기 상태로 분리한다.
- 앱 코드는 `isSocialOAuthProviderReleaseReady()` gate 뒤에서 Google/Kakao/Naver 버튼을 렌더링한다.
- 현재 release-safe 기본 readiness 값은 Google/Kakao/Naver 모두 `false`다.
- readiness flag가 false이면 버튼은 SignIn/SignUp 화면에 렌더링되지 않고, 함수가 직접 호출되어도 `provider_setup_required`로 중단한다.
- readiness flag가 true이면 기존 `signInWithOAuth` web flow를 그대로 실행한다.
- provider 설정 완료 후 별도 OAuth 성공 smoke에서 버튼 탭, provider web flow, 앱 복귀, Supabase session 복구, nickname/pet onboarding 분기를 확인한다.
- Naver는 Supabase custom OAuth/OIDC provider 설정이 완료되어야 실제 성공한다.

## 2026-05-11 Console Evidence

| Provider | 확인 화면 | 결과 | release 판정 |
| --- | --- | --- | --- |
| Google | Google Cloud Console / Billing | 현재 Google 계정은 테스트 계정이며 NURI 운영 OAuth에 사용하지 않는다. `My First Project`는 Places API 과금 이력이 있어 격리하고, 새 NURI Google 계정에서 OAuth-only project를 만든다. | PO action required |
| Kakao | Kakao Developers `Nuri-app` | 앱은 존재하지만 Kakao Login, consent items, simple signup, unlink/webhook 설정이 모두 미설정이다. | PO action required |
| Naver | Naver Developers `nuri_app` | 네이버 로그인 API와 이메일 필수 항목, Android package는 확인됐다. Supabase OAuth용 web callback 환경은 보강해야 한다. | PO action required |
| Supabase | Authentication Providers / URL Configuration | Google/Kakao disabled, `custom:naver` enabled, `nuri://auth/reset`과 `nuri://auth/callback` redirect allow list 등록 확인. | smoke pending |

이 상태에서는 release build의 readiness flag를 false로 유지한다. Provider credential과 callback 설정이 닫히기 전에는 Google/Kakao/Naver 버튼을 노출하지 않는다.

# Social Login v1.0

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

- Google: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. Google Cloud Console은 현재 선택된 project의 결제 계정 문제로 credential 생성 화면에 진입하지 못해 PO action required다.
- Kakao: app-side entrypoint는 `closed`, 기본 readiness flag는 `false`, Supabase provider는 disabled다. Kakao Developers `Nuri-app`은 존재하지만 Kakao Login과 동의항목이 `설정 안 함`이라 PO action required다.
- Naver: app-side entrypoint와 Supabase `custom:naver` provider는 `closed`이며 Supabase Dashboard에서 Enabled 상태다. Naver Developers `nuri_app`은 존재하고 Android package `com.nuri.app`과 이메일 필수 제공 항목이 확인됐지만, Supabase OAuth용 PC/모바일 웹 Callback URL 보강이 남아 PO action required다.
- Apple: v1.0 `no-op`.

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

- Google Cloud Project를 준비한다.
- OAuth consent screen을 설정한다.
- Web OAuth Client ID와 Client Secret을 발급한다.
- Android OAuth Client ID를 발급한다.
- Android package name은 `com.nuri.app`으로 등록한다.
- Android signing SHA-1/SHA-256을 등록한다.
- 개인정보처리방침 URL과 서비스 약관 URL을 준비한다.
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
| Google | Google Cloud Console | 현재 project가 결제 계정 문제로 `재검토 요청` 화면에 막혀 OAuth credential 발급을 진행하지 못한다. | PO action required |
| Kakao | Kakao Developers `Nuri-app` | 앱은 존재하지만 Kakao Login, consent items, simple signup, unlink/webhook 설정이 모두 미설정이다. | PO action required |
| Naver | Naver Developers `nuri_app` | 네이버 로그인 API와 이메일 필수 항목, Android package는 확인됐다. Supabase OAuth용 web callback 환경은 보강해야 한다. | PO action required |
| Supabase | Authentication Providers / URL Configuration | Google/Kakao disabled, `custom:naver` enabled, `nuri://auth/reset`과 `nuri://auth/callback` redirect allow list 등록 확인. | smoke pending |

이 상태에서는 release build의 readiness flag를 false로 유지한다. Provider credential과 callback 설정이 닫히기 전에는 Google/Kakao/Naver 버튼을 노출하지 않는다.

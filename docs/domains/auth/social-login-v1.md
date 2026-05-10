# Social Login v1.0

## Scope

- v1.0 app-side provider: Google, Kakao, Naver
- v1.0 provider 준비물 확정 대상: Google, Kakao, Naver
- v1.0 app-side excluded provider: Apple
- v1.0 user-surface policy: Google/Kakao/Naver 버튼을 노출하고 provider 설정 오류는 안전한 오류 문구로 수렴시킨다.
- implementation path: Supabase Auth OAuth web flow
- native SDK path: v1.0 범위 아님
- secret policy: 실제 API key, client secret, private key 값은 repository와 문서에 기록하지 않는다.
- provider console setup source: `docs/auth/social-provider-console-setup-guide.md`

## Provider Gate Decision

| Provider | Gate | User surface | Reason |
| --- | --- | --- | --- |
| Google | CONFIG_WAITING | 노출 | 앱 진입점은 구현됐고 Supabase provider 설정과 smoke가 남았다. |
| Kakao | CONFIG_WAITING | 노출 | 앱 진입점은 구현됐고 Supabase provider 설정과 smoke가 남았다. |
| Naver | CONFIG_WAITING | 노출 | Supabase custom OAuth provider id `custom:naver`로 앱 진입점을 구현했고 provider 설정과 smoke가 남았다. |
| Apple | HIDE_FOR_V1 | 숨김 | Android-first v1.0 범위에서 제외한다. |

2026-05-10 기준 provider console 판정:

- Google: app-side entrypoint는 `closed`, Supabase provider credential 입력은 `ready-for-PO-action`.
- Kakao: app-side entrypoint는 `closed`, Supabase provider credential 입력은 `ready-for-PO-action`.
- Naver: app-side entrypoint와 Supabase `custom:naver` authorize 진입은 `closed`, OAuth success smoke는 `ready-for-PO-action`.
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
- provider 설정 전 OAuth 실패는 앱 코드 blocker가 아니라 PO 설정 대기 상태로 분리한다.
- 앱 코드는 `isSocialOAuthProviderReleaseReady()` gate 뒤에서 Google/Kakao/Naver 버튼을 렌더링한다.
- 현재 readiness 값은 Google/Kakao/Naver 모두 `true`다.
- provider 설정 완료 후 별도 OAuth 성공 smoke에서 버튼 탭, provider web flow, 앱 복귀, Supabase session 복구, nickname/pet onboarding 분기를 확인한다.
- Naver는 Supabase custom OAuth/OIDC provider 설정이 완료되어야 실제 성공한다.

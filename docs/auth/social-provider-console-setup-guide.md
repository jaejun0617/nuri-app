# Social Provider Console Setup Guide

작성일: 2026-05-10
최신 콘솔 확인: 2026-05-11

## 1. 문서 목적

이 문서는 NURI v1.0 Code Freeze 이후 Google/Kakao/Naver social login의 provider console credential 발급, Supabase Auth provider 입력, redirect/callback 정합성, 보안/API 방어 기준을 PO 실행 단위로 고정한다.

이 문서는 앱 코드 구현 문서가 아니다. social login app-side 구현은 재오픈하지 않는다.

## 2. 현재 social login 상태

| Provider | App-side entrypoint | Supabase provider | Provider console | Callback/redirect | Secret 노출 | Smoke 준비 | 최종 판정 |
|---|---|---|---|---|---|---|---|
| Google | closed | disabled | PO action required | ready-for-PO-action | closed | activation-ready | activation-ready |
| Kakao | closed | disabled | PO action required | ready-for-PO-action | closed | activation-ready | activation-ready |
| Naver | closed | `custom:naver` enabled | PO action required | partial | closed | activation-ready | activation-ready |

현재 repo/remote 공개 Auth endpoint 기준 증거:

- Google app-side: `signInWithGoogle()` exists and uses Supabase OAuth.
- Kakao app-side: `signInWithKakao()` exists and uses Supabase OAuth.
- Naver app-side: `signInWithNaver()` exists and maps app provider `naver` to Supabase provider id `custom:naver`.
- Google Supabase provider: `/auth/v1/authorize?provider=google` returns provider-not-enabled.
- Kakao Supabase provider: `/auth/v1/authorize?provider=kakao` returns provider-not-enabled.
- Naver Supabase custom provider: `/auth/v1/authorize?provider=custom:naver` returns HTTP 302 to the Naver authorize endpoint.
- App callback: `nuri://auth/callback`.
- Password reset callback: `nuri://auth/reset`.
- App readiness flags default to `false` for Google/Kakao/Naver, so release build does not expose disabled-provider buttons.
- Apple: v1.0 no-op.

### 2026-05-11 직접 콘솔 확인 결과

| Provider | 직접 확인한 화면 | 결과 | 남은 PO action | Smoke 판정 |
|---|---|---|---|---|
| Google | Google Cloud Console | 현재 선택된 Google Cloud project가 결제 계정 문제로 `재검토 요청` 화면에 막혀 OAuth credential 생성 화면까지 진행되지 않는다. | 결제 계정 문제를 해소한 뒤 NURI용 project/consent screen/Web OAuth client를 생성하고 Supabase callback URL을 등록한다. | blocked until PO action |
| Kakao | Kakao Developers app `Nuri-app` dashboard | 앱은 존재하지만 `카카오 로그인`, `동의항목`, `간편가입`, `연결 해제`가 모두 `설정 안 함`이다. 앱은 비즈 앱이 아니다. | Kakao Login ON, Redirect URI 등록, Client Secret 활성화, 동의항목과 email/Biz App 정책을 확정한다. | blocked until PO action |
| Naver | Naver Developers app `nuri_app` API 설정 | 앱은 존재하고 네이버 로그인 API가 선택되어 있으며 연락처 이메일 주소가 필수로 체크되어 있다. Android 환경에는 다운로드 URL과 package `com.nuri.app`이 등록되어 있다. | Supabase OAuth용 PC/모바일 웹 Callback URL을 Supabase Auth callback URL로 맞추고, 개발 중 상태의 테스트 계정/검수 범위를 확정한다. | blocked until PO action |
| Supabase | Authentication > Providers / URL Configuration | Google/Kakao provider는 disabled다. Custom provider `custom:naver`는 Enabled다. Additional Redirect URLs에는 `nuri://auth/reset`, `nuri://auth/callback` 2개가 등록되어 있다. | Google/Kakao credential 입력과 enable, Naver provider 설정 유지, readiness flag true 전환은 credential 입력 완료 후 수행한다. | smoke pending |

## 3. 공통 구조

- 앱은 provider OAuth 시작만 담당한다.
- Provider credential과 client secret은 Supabase Dashboard에만 입력한다.
- 앱에는 provider client secret을 넣지 않는다.
- Provider console callback URL은 Supabase Auth callback URL이다.
- 앱 복귀 URL은 `nuri://auth/callback`이다.
- Supabase Additional Redirect URLs에는 `nuri://auth/callback`을 등록한다.
- OAuth 성공 후 session 복구는 기존 `OAuthCallbackScreen -> completeOAuthCallbackSession -> Splash/AppProviders` 흐름을 사용한다.
- 신규 social user의 profile/nickname/pet onboarding 분기는 기존 email/password auth boot contract를 재사용한다.
- Provider activation readiness는 public boolean flag로 제어한다. 이 flag는 secret이 아니며, provider credential 입력 후 release build config에서만 true로 전환한다.

## 3-1. Provider activation-ready 점검표

| Provider | Credential 현재 상태 | Supabase provider 상태 | App-side readiness flag | 버튼 노출 조건 | Direct-call guard | 활성화 후 추가 개발 필요 여부 | 최종 판정 |
|---|---|---|---|---|---|---|---|
| Google | PO 발급 필요 | disabled/미입력 | `EXPO_PUBLIC_ENABLE_GOOGLE_OAUTH=false` | flag true일 때만 노출 | closed | 없음 | activation-ready |
| Kakao | PO 발급 필요 | disabled/미입력 | `EXPO_PUBLIC_ENABLE_KAKAO_OAUTH=false` | flag true일 때만 노출 | closed | 없음 | activation-ready |
| Naver | console app 존재, web callback 보강 필요 | `custom:naver` enabled | `EXPO_PUBLIC_ENABLE_NAVER_OAUTH=false` | flag true일 때만 노출 | closed | 없음 | activation-ready |

Readiness flag source:

- `.env.example`
- release build environment variables
- `src/services/supabase/socialOAuthConfig.ts`

Readiness contract:

- flag false: SignIn/SignUp 화면에서 버튼을 렌더링하지 않는다.
- flag false: provider 함수가 직접 호출되어도 `provider_setup_required`로 안전하게 중단한다.
- flag true: 기존 `signInWithOAuth` web flow를 그대로 실행한다.
- client secret은 flag나 app env에 넣지 않는다.

## 4. Google credential 발급 절차

### Google 발급 대상

- OAuth 2.0 Client ID
- OAuth 2.0 Client Secret
- Web OAuth Client ID/Secret
- 필요 시 Android OAuth Client ID
- release signing SHA-1 / SHA-256
- Supabase Google provider에 입력할 client id / client secret

### Google Console에서 해야 할 일

1. Google Cloud Console에 접속한다.
2. NURI용 Google Cloud Project를 생성하거나 기존 프로젝트를 선택한다.
3. OAuth consent screen을 구성한다.
4. 앱 이름, 지원 이메일, 개발자 연락처를 설정한다.
5. scope는 인증 목적 최소 범위로 제한한다.
6. Credentials 메뉴에서 OAuth Client ID를 생성한다.
7. Supabase social login 기준 Application type은 Web application을 우선 생성한다.
8. Authorized redirect URIs에 Supabase Auth callback URL을 등록한다.
9. 필요 시 Android client를 별도로 생성한다.
10. Android client 생성 시 package name은 `com.nuri.app`으로 등록한다.
11. Android release signing SHA-1/SHA-256 fingerprint를 등록한다.
12. Web client ID / secret을 Supabase Auth Google provider에 입력한다.
13. 앱 코드에는 Google client secret을 넣지 않는다.

### Google 보안/API 방어 기준

- client secret은 앱 코드에 넣지 않는다.
- client secret은 `.env.example` 또는 문서에 쓰지 않는다.
- redirect URI는 Supabase callback URL만 provider console에 allowlist한다.
- 앱 deep link `nuri://auth/callback`은 Supabase Additional Redirect URLs에만 둔다.
- scope는 `openid`, `email`, `profile` 중심의 인증 목적 최소 범위로 제한한다.
- 운영 전 test user / publishing status를 구분한다.
- release signing key SHA-1/SHA-256과 debug key를 혼동하지 않는다.
- token, provider token, full callback URL with code를 로그에 남기지 않는다.

## 5. Kakao credential 발급 절차

### Kakao 발급 대상

- REST API Key
- Kakao Login Client Secret
- Kakao Login Redirect URI
- 필요 시 Native App Key
- Supabase Kakao provider에 입력할 client id / client secret

### Kakao Developers에서 해야 할 일

1. Kakao Developers에 접속한다.
2. 내 애플리케이션을 생성하거나 NURI 앱을 선택한다.
3. 앱 이름 / 사업자 정보 / 플랫폼 정보를 확인한다.
4. App Settings > App > Platform Key에서 REST API Key를 확인한다.
5. REST API Key를 Supabase Kakao provider의 client_id로 사용한다.
6. Product Settings > Kakao Login에서 Kakao Login을 활성화한다.
7. Kakao Login Redirect URI에 Supabase Auth callback URL을 등록한다.
8. Kakao Login Client Secret을 활성화하고 secret을 확인한다.
9. Supabase Auth Kakao provider에 REST API Key와 Client Secret을 입력한다.
10. Consent Items에서 `profile_nickname`, `profile_image`, `account_email` 필요 여부를 결정한다.
11. `account_email`이 필요한 경우 Biz App 조건을 충족한다.
12. 앱 코드에는 Kakao client secret을 넣지 않는다.

### Kakao 보안/API 방어 기준

- Kakao client secret은 앱 코드에 넣지 않는다.
- REST API Key는 client_id 역할이지만 문서와 로그에 무분별하게 노출하지 않는다.
- Redirect URI는 Supabase callback URL과 정확히 일치해야 한다.
- scope는 인증 목적 최소 범위로 제한한다.
- 이메일 제공이 불가능한 계정은 Supabase Kakao provider의 email-less user 허용 정책과 함께 PO가 결정한다.
- token, provider token, full callback URL with code를 로그에 남기지 않는다.

## 6. Naver credential 발급 절차

### Naver 발급 대상

- Client ID
- Client Secret
- Callback URL
- Service URL
- Supabase custom provider 설정값

### Naver Developers에서 해야 할 일

1. Naver Developers에 접속한다.
2. 내 애플리케이션 메뉴에서 애플리케이션을 등록한다.
3. 애플리케이션 이름을 NURI 기준으로 설정한다.
4. 사용 API에서 네이버 로그인을 선택한다.
5. 제공 정보 scope에서 profile/email 제공 항목을 선택한다.
6. Service URL을 운영 기준 URL로 설정한다.
7. Callback URL에 Supabase Auth callback URL을 등록한다.
8. Client ID를 확인한다.
9. Client Secret을 확인한다.
10. Supabase custom OAuth provider `custom:naver`에 Client ID / Secret을 입력한다.
11. 앱 redirect는 `nuri://auth/callback`으로 유지하되, Naver console Callback URL은 Supabase Auth callback URL로 둔다.
12. 앱 코드에는 Naver Client Secret을 넣지 않는다.

### Naver custom OAuth 설정값

| 항목 | 값 |
|---|---|
| Supabase provider id | `custom:naver` |
| Provider type | OAuth2 |
| Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
| Token URL | `https://nid.naver.com/oauth2.0/token` |
| UserInfo URL | `https://openapi.naver.com/v1/nid/me` |
| Scope | `email` 중심. Naver Developers 제공 정보 설정과 일치시킨다. |
| App redirect | `nuri://auth/callback` |
| Provider callback | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |

### Naver 보안/API 방어 기준

- Client Secret은 앱 코드에 넣지 않는다.
- Client Secret은 유출 의심 시 Naver Developers에서 재발급한다.
- Callback URL이 Naver console, Supabase provider, 앱 callback 흐름과 불일치하면 로그인 실패로 분류한다.
- state/CSRF/PKCE 방어는 Supabase OAuth flow에 위임한다.
- 앱 로그에 token, provider token, authorization code, full callback URL을 남기지 않는다.
- Service URL과 Callback URL은 운영 값 기준으로 관리한다.

## 7. Supabase provider 설정 절차

### 공통 Supabase 설정

1. Supabase Dashboard > Authentication > Providers로 이동한다.
2. Google provider를 enable하려면 Google Web OAuth client ID와 client secret을 입력한다.
3. Kakao provider를 enable하려면 Kakao REST API Key와 Kakao Login Client Secret을 입력한다.
4. Naver는 Custom OAuth Providers에서 `custom:naver`를 사용한다.
5. Supabase Auth callback URL은 `https://<PROJECT_REF>.supabase.co/auth/v1/callback` 형식이다.
6. Site URL은 운영 홈페이지 또는 운영 landing/support URL 기준으로 둔다.
7. Additional Redirect URLs에 `nuri://auth/callback`을 등록한다.
8. local callback과 production callback은 분리해서 관리한다.
9. Android deep link intent-filter는 `nuri://auth/callback`을 수신한다.
10. Provider client secret은 Supabase Dashboard에만 입력한다.

### Provider별 Supabase 입력값

| Provider | Supabase provider id | Client ID 위치 | Client Secret 위치 | Callback URL |
|---|---|---|---|---|
| Google | `google` | Google Cloud Web OAuth Client ID | Google Cloud Web OAuth Client Secret | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| Kakao | `kakao` | Kakao REST API Key | Kakao Login Client Secret | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| Naver | `custom:naver` | Naver Developers Client ID | Naver Developers Client Secret | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |

## 8. Redirect / callback 정합성

| 위치 | 값 | 판정 |
|---|---|---|
| 앱 OAuth redirectTo | `nuri://auth/callback` | closed |
| 앱 password reset redirectTo | `nuri://auth/reset` | closed |
| Android intent-filter OAuth | scheme `nuri`, host `auth`, pathPrefix `/callback` | closed |
| Android intent-filter reset | scheme `nuri`, host `auth`, pathPrefix `/reset` | closed |
| React Navigation OAuth route | `OAuthCallback: auth/callback` | closed |
| React Navigation reset route | `PasswordResetRecovery: auth/reset` | closed |
| Supabase Additional Redirect URLs | `nuri://auth/callback` | closed |
| Supabase Additional Redirect URLs | `nuri://auth/reset` | closed |
| Provider console callback | `https://<PROJECT_REF>.supabase.co/auth/v1/callback` | PO action required |

중요: Provider console에는 `nuri://auth/callback`을 넣지 않는다. Provider console에는 Supabase Auth callback URL을 넣고, 앱 deep link는 Supabase redirect allow list에 넣는다.

## 9. 보안/API 방어 기준

| 항목 | Google | Kakao | Naver | 판정 |
|---|---|---|---|---|
| client secret 앱 코드 미노출 | closed | closed | closed | closed |
| `.env.example` secret 미노출 | closed | closed | closed | closed |
| provider token 로그 없음 | closed | closed | closed | closed |
| access/refresh token 로그 없음 | closed | closed | closed | closed |
| OAuth error 로그 민감정보 마스킹 | closed | closed | closed | closed |
| redirect URI allowlist 명확 | ready-for-PO-action | ready-for-PO-action | PO action required | ready-for-PO-action |
| 앱 deep link callback 정합 | closed | closed | closed | closed |
| password reset callback과 분리 | closed | closed | closed | closed |
| social login 약관/개인정보 고지 UI 존재 | closed | closed | closed | closed |
| email 없는 social account 처리 정책 | ready-for-PO-action | ready-for-PO-action | ready-for-PO-action | ready-for-PO-action |
| 중복 탭 방지 | closed | closed | closed | closed |
| 느린 네트워크 실패 처리 | closed | closed | closed | closed |

근거:

- `logOAuthError()`는 dev 환경에서 provider, stage, stable code만 기록한다.
- `OAuthCallbackScreen`은 callback token/code 값을 화면이나 로그에 출력하지 않는다.
- `supabase.auth.exchangeCodeForSession()` 또는 `supabase.auth.setSession()` 후 기존 session storage 계약을 사용한다.
- `.env.example`에는 public boolean readiness flag만 있고, social provider client secret placeholder는 없다.
- Google/Kakao provider는 현재 external provider disabled 상태라 PO credential 입력 전 OAuth success smoke 대상이 아니다.
- Naver `custom:naver`는 Supabase Dashboard에서 Enabled 상태다. 단, Naver Developers에는 Android 환경만 확인되었으므로 Supabase OAuth용 web callback 등록을 PO action으로 남긴다.
- Client secret은 앱 코드와 문서에 기록하지 않는다.

## 10. Provider별 체크리스트

### Google

- [ ] Google Cloud Project 준비
- [ ] 현재 Google Cloud project 결제 계정 문제 해소
- [ ] OAuth consent screen 구성
- [ ] Web OAuth Client ID 생성
- [ ] Web OAuth Client Secret 생성
- [ ] Authorized redirect URI에 Supabase Auth callback URL 등록
- [ ] Android OAuth Client ID 생성
- [ ] package name `com.nuri.app` 등록
- [ ] release SHA-1 등록
- [ ] release SHA-256 등록
- [ ] Privacy Policy URL 등록
- [ ] Terms URL 등록
- [ ] Supabase Google provider enable
- [ ] Supabase Additional Redirect URLs에 `nuri://auth/callback` 등록

### Kakao

- [x] Kakao Developers 앱 준비
- [ ] Kakao Login 활성화
- [ ] REST API Key 확인
- [ ] Client Secret 활성화
- [ ] Kakao Login Redirect URI에 Supabase Auth callback URL 등록
- [ ] profile_nickname 동의항목 설정
- [ ] profile_image 동의항목 설정
- [ ] account_email 필요 여부 결정
- [ ] account_email 필요 시 Biz App 조건 충족
- [ ] Supabase Kakao provider enable

### Naver

- [x] Naver Developers 앱 준비
- [x] Client ID 존재 확인
- [ ] Client Secret은 Supabase Dashboard 입력 상태만 유지하고 문서에는 기록하지 않음
- [ ] Supabase OAuth용 Service URL 설정
- [ ] PC/모바일 웹 Callback URL에 Supabase Auth callback URL 등록
- [x] 연락처 이메일 주소 필수 제공 항목 설정
- [ ] 개인정보처리방침 URL 등록
- [x] Supabase `custom:naver` provider enable 상태 유지
- [ ] UserInfo response mapping이 Supabase custom provider 설정과 맞는지 운영 smoke에서 확인

## 11. PO가 준비해야 하는 값

| Provider | 값 | 입력 위치 | 문서/채팅 기록 여부 |
|---|---|---|---|
| Google | Web OAuth Client ID | Supabase Google provider Client ID | 값 기록 금지 |
| Google | Web OAuth Client Secret | Supabase Google provider Client Secret | 값 기록 금지 |
| Google | Android OAuth Client ID | Google/운영 evidence | 값 기록 금지 |
| Google | release SHA-1/SHA-256 | Google Android OAuth client | 값 기록 가능하나 secret 아님 |
| Kakao | REST API Key | Supabase Kakao provider Client ID | 값 기록 금지 |
| Kakao | Kakao Login Client Secret | Supabase Kakao provider Client Secret | 값 기록 금지 |
| Naver | Client ID | Supabase `custom:naver` Client ID | 값 기록 금지 |
| Naver | Client Secret | Supabase `custom:naver` Client Secret | 값 기록 금지 |

PO는 secret 값을 Codex 채팅이나 repository에 붙여넣지 않고 Supabase Dashboard에 직접 입력한다. 입력 완료 여부만 작업자에게 전달한다.

## 12. Smoke 전 준비 완료 기준

| Provider | Smoke 진입 조건 |
|---|---|
| Google | Supabase Google provider enabled, client id/secret 입력, Google Authorized redirect URI 등록, `nuri://auth/callback` redirect allow list 등록, `EXPO_PUBLIC_ENABLE_GOOGLE_OAUTH=true` |
| Kakao | Supabase Kakao provider enabled, REST API Key/Client Secret 입력, Kakao Login ON, Kakao Redirect URI 등록, 동의항목 설정, `EXPO_PUBLIC_ENABLE_KAKAO_OAUTH=true` |
| Naver | Supabase `custom:naver` enabled, Naver Client ID/Secret 입력, Naver Callback URL 등록, profile/email 제공 항목 설정, `EXPO_PUBLIC_ENABLE_NAVER_OAUTH=true` |

Smoke 성공 기준:

- 버튼 탭 후 provider web flow 진입.
- provider 인증 성공.
- `nuri://auth/callback`으로 앱 복귀.
- Supabase session 복구.
- Splash/AppProviders boot.
- nickname/onboarding 또는 홈 진입.
- crash/ANR 없음.
- token/client secret 로그 없음.

## 13. API credential 발급 후 바로 활성화하는 절차

### Google 활성화 절차

1. Google Cloud Console에서 Web OAuth Client ID/Secret을 발급한다.
2. Authorized redirect URI에 Supabase Auth callback URL을 등록한다.
3. Supabase Dashboard > Authentication > Providers > Google에 Client ID/Secret을 입력한다.
4. Google provider를 enable한다.
5. `EXPO_PUBLIC_ENABLE_GOOGLE_OAUTH=true`로 Google readiness flag를 전환한다.
6. 앱 재빌드 또는 release 설정 반영 방식에 따라 앱을 재시작한다.
7. Android smoke를 수행한다.

### Kakao 활성화 절차

1. Kakao Developers에서 REST API Key를 확인한다.
2. Kakao Login Client Secret을 활성화하고 값을 확인한다.
3. Kakao Login Redirect URI에 Supabase Auth callback URL을 등록한다.
4. Supabase Dashboard > Authentication > Providers > Kakao에 REST API Key/Client Secret을 입력한다.
5. Kakao provider를 enable한다.
6. `EXPO_PUBLIC_ENABLE_KAKAO_OAUTH=true`로 Kakao readiness flag를 전환한다.
7. Android smoke를 수행한다.

### Naver 활성화 절차

1. Naver Developers에서 Client ID/Secret을 확인한다.
2. Naver Callback URL이 Supabase Auth callback URL인지 맞춘다.
3. Supabase Dashboard > Authentication > Providers > Custom OAuth `custom:naver` 설정을 유지한다.
4. `custom:naver` provider를 enable한다.
5. `EXPO_PUBLIC_ENABLE_NAVER_OAUTH=true`로 Naver readiness flag를 전환한다.
6. Android smoke를 수행한다.

주의:

- secret 값은 Codex 채팅에 붙여넣지 않는다.
- secret 값은 앱 코드에 넣지 않는다.
- secret 값은 문서에 기록하지 않는다.
- secret 값은 `.env.example`에 넣지 않는다.
- Supabase Dashboard에 직접 입력한다.
- Codex에는 입력 완료 여부와 readiness flag 반영 여부만 전달한다.
- 입력 완료 후 Codex는 smoke evidence 문서화 턴으로 이동한다.

## 14. 다음 액션

Google/Kakao/Naver provider credential 발급 및 Supabase Dashboard 입력은 PO action으로 진행한다. 2026-05-11 기준 Codex는 Chrome에서 콘솔 화면을 직접 열어 상태를 고정했지만 Google 결제 계정 문제, Kakao Login 미설정, Naver web callback 보강이 남아 있어 OAuth smoke는 아직 수행하지 않는다. Codex는 PO action 완료 후 OAuth 성공 smoke evidence 문서화 턴으로 이동한다.

## 공식 문서 기준

- Supabase Google Auth: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Kakao Auth: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- Supabase Custom OAuth/OIDC Providers: https://supabase.com/docs/guides/auth/custom-oauth-providers
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Google OAuth 2.0 redirect URI: https://developers.google.com/identity/protocols/oauth2/web-server?hl=ko
- Kakao Login prerequisite: https://developers.kakao.com/docs/en/kakaologin/prerequisite
- Kakao Login REST API: https://developers.kakao.com/docs/latest/en/kakaologin/rest-api
- Naver Login development guide: https://developers.naver.com/docs/login/devguide/devguide.md
- Naver Login API spec: https://developers.naver.com/docs/login/api/api.md

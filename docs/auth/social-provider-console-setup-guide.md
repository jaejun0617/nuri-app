# Social Provider Console Setup Guide

작성일: 2026-05-10
최신 콘솔 확인: 2026-05-27 PO 완료 전제
최신 Android/runtime readiness 확인: 2026-05-28

## 1. 문서 목적

이 문서는 NURI v1.0 Code Freeze 이후 social login의 provider console credential 발급, Supabase Auth provider 입력, redirect/callback 정합성, 보안/API 방어 기준을 PO 실행 단위로 고정한다.

이 문서는 앱 코드 구현 문서가 아니다. social login app-side 구현은 재오픈하지 않는다.

2026-05-28 PO 최종 결정 기준 V1.0 public social login provider는 Google + Kakao만 사용한다. Naver OAuth는 V1.0 public surface에서 soft disable한다. Supabase `custom:naver` provider와 관련 코드는 릴리즈 직전 안정성을 위해 hard delete하지 않으며, 완전 삭제는 V1.1 또는 출시 후 cleanup 작업으로 분리한다.

## 2. 현재 social login 상태

| Provider | App-side entrypoint | Supabase provider | Provider console | Callback/redirect | Secret 노출 | Smoke 준비 | 최종 판정 |
|---|---|---|---|---|---|---|---|
| Google | closed | enabled | PO completed | closed | closed | completed | closed |
| Kakao | closed | enabled | PO completed | closed | closed | completed | closed |
| Naver | implemented but hidden | `custom:naver` 유지 | V1.0 제외 | partial-success | closed | smoke 중단 | V1.1 또는 출시 후 재검토 |

현재 repo/remote 공개 Auth endpoint 기준 증거:

- Google app-side: `signInWithGoogle()` exists and uses Supabase OAuth.
- Kakao app-side: `signInWithKakao()` exists and uses Supabase OAuth.
- Naver app-side: `signInWithNaver()` exists and maps app provider `naver` to Supabase provider id `custom:naver`, but the V1.0 public entrypoint is force-closed by the readiness flag.
- Google Supabase provider: `/auth/v1/authorize?provider=google` returns HTTP 302 to Google authorize.
- Kakao Supabase provider: `/auth/v1/authorize?provider=kakao` returns HTTP 302 to Kakao authorize.
- Naver Supabase custom provider: `/auth/v1/authorize?provider=custom:naver` returns HTTP 302 to the Naver authorize endpoint.
- App callback: `nuri://auth/callback`.
- Password reset callback: `nuri://auth/reset`.
- App readiness flags default to `true` for Google/Kakao and `false` for Naver. Naver is soft disabled for V1.0 even if the implementation remains in the codebase.
- Apple: v1.0 no-op.

### 2026-05-27 Android/runtime readiness closeout

| Provider | Supabase runtime authorize | Android SignIn 버튼 | Callback 실패/취소 fallback | 현재 V1.0 분류 |
|---|---|---|---|---|
| Google | HTTP 302 to Google authorize | 버튼 노출 | 성공 session 후 앱 복귀, crash 없음 | V1.0에서 닫음 |
| Kakao | HTTP 302 to Kakao authorize | 버튼 노출 | 성공 session 후 앱 복귀, crash 없음 | V1.0에서 닫음 |
| Naver | `custom:naver` HTTP 302 to Naver authorize | V1.0 미노출 | Naver 성공 smoke 중단 | V1.0 제외 / V1.1 재검토 |

Android 실기기 `R5CY613NMSY` / `SM_S937N`, `com.nuri.app` 기준으로 Google/Kakao는 web flow, 앱 복귀, session 생성까지 성공했다. Naver는 2026-05-27 web flow 진입 후 Naver 페이지의 `pet_nuri 서비스 설정 오류`로 session 생성 전 차단됐고, 2026-05-28 PO 결정에 따라 V1.0 public surface에서 soft disable한다.

### 2026-05-11 직접 콘솔 확인 결과

| Provider | 직접 확인한 화면 | 결과 | 남은 PO action | Smoke 판정 |
|---|---|---|---|---|
| Google | Google Cloud Console / Billing | 현재 Chrome Google 계정은 테스트 계정이며 NURI 운영 OAuth 계정으로 사용하지 않는다. `My First Project`는 Places API 과금 이력이 있으므로 NURI OAuth용으로 재사용하지 않는다. | PO가 NURI 전용 신규 Google 계정을 만들고, 새 계정에서 OAuth-only project를 생성해 Supabase callback URL을 등록한다. | blocked until PO action |
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
| Google | 입력 완료 전제 | enabled | `EXPO_PUBLIC_ENABLE_GOOGLE_OAUTH=true` | 노출 | closed | 없음 | closed |
| Kakao | 입력 완료 전제 | enabled | `EXPO_PUBLIC_ENABLE_KAKAO_OAUTH=true` | 노출 | closed | 없음 | closed |
| Naver | 입력 완료 전제, 서비스 설정 오류 관찰 | `custom:naver` 유지 | `EXPO_PUBLIC_ENABLE_NAVER_OAUTH=false` | 미노출 | closed | V1.1 또는 출시 후 재검토 | V1.0 제외 |

Readiness flag source:

- `.env.example`
- release build environment variables
- `src/services/supabase/socialOAuthConfig.ts`

Readiness contract:

- flag false: SignIn/SignUp 화면에서 버튼을 렌더링하지 않는다.
- flag false: provider 함수가 직접 호출되어도 `provider_setup_required`로 안전하게 중단한다.
- flag true: 기존 `signInWithOAuth` web flow를 그대로 실행한다.
- client secret은 flag나 app env에 넣지 않는다.
- Naver는 V1.0에서 `flag false`와 별도 public-surface guard로 닫는다. `signInWithNaver()`와 `custom:naver` provider는 삭제하지 않는다.

## 3-2. Google 테스트 계정 / My First Project 격리 결정

### 기존 Google 계정 분류

- 현재 Chrome에 로그인된 Google 계정은 테스트 계정이다.
- 이 계정은 NURI 운영 계정으로 사용하지 않는다.
- 이 계정으로 Google OAuth credential을 발급하지 않는다.
- 이 계정은 Google Play Console 등록, 공식 문의/지원 이메일, 앱 정책 연락처로 사용하지 않는다.

### 기존 `My First Project` 처리

- `My First Project`는 NURI OAuth용으로 재사용하지 않는다.
- 이 프로젝트는 Places API 과금 이력이 있는 비용 리스크 프로젝트로 격리한다.
- 현재 결제 계정은 정지 상태로 기록하며, 2026-05-01부터 2026-05-11까지 현재 비용은 `$0.00`이다.
- 2026년 4월 인보이스는 남아 있는 비용 이력으로 보관한다.
- 결제 계정 복구/재검토는 NURI OAuth 작업의 필수 경로가 아니다.

### Google 비용 원인

2026년 4월 청구 `₩112,214`는 Google social login 비용이 아니라 `My First Project`의 Google Maps Platform Places API (New) 사용료다.

| 항목 | 사용량 | 금액 |
|---|---:|---:|
| Places API Text Search Enterprise | 2,152회 | ₩60,884 |
| Places API Place Details Photos | 4,891회 | ₩41,129 |
| Places API Text Search Pro | 606회 | ₩0 |
| VAT | - | ₩10,201 |
| 합계 | - | ₩112,214 |

repo 기준 Google Places 호출 경로:

- `supabase/functions/_shared/place-enrichment.js`
- `places.googleapis.com/v1/places:searchText`
- `places.googleapis.com/v1/{photoName}/media`
- env key 후보: `GOOGLE_PLACES_API_KEY`, `GOOGLE_MAPS_API_KEY`

판정:

- 비용 원인은 NURI의 장소/동물병원 enrichment 계열 Google Places 호출과 일치한다.
- Google OAuth/social login 설정과는 별개다.
- 새 NURI Google 계정의 OAuth project에서는 Maps/Places API를 활성화하지 않는다.

### Places API 비활성화 원칙

PO가 아래 문장으로 명시 승인하기 전에는 Codex가 Places API 최종 비활성화를 클릭하지 않는다.

```text
승인: My First Project의 Places API 비활성화 진행
```

승인이 있으면 별도 턴에서 오직 Places API / Places API (New) 비활성화만 진행한다. 프로젝트 삭제, 결제 연결 해제, 결제 계정 복구, 다른 API 비활성화는 하지 않는다.

## 4. Google credential 발급 절차

이 절차는 NURI 전용 신규 Google 계정에서만 진행한다. 기존 테스트 Google 계정과 `My First Project`는 사용하지 않는다.

### Google 발급 대상

- OAuth 2.0 Client ID
- OAuth 2.0 Client Secret
- Web OAuth Client ID/Secret
- 필요 시 Android OAuth Client ID
- release signing SHA-1 / SHA-256
- Supabase Google provider에 입력할 client id / client secret

### NURI 전용 신규 Google 계정 준비

새 계정의 목적:

- NURI 공식 문의 수신
- Google Cloud OAuth 관리
- 추후 Google Play Console 관리
- 앱 정책 연락처
- 운영 알림 수신
- Supabase/Auth provider 관리 보조 연락처
- 출시 후 고객 문의 대응

이메일 후보 예시:

```text
nuri.app.official@gmail.com
nuri.pet.official@gmail.com
nuri.support.app@gmail.com
nuri.app.help@gmail.com
```

PO가 직접 처리해야 하는 항목:

- 새 Google 계정 생성
- 비밀번호 생성
- 복구 이메일 입력
- 복구 전화번호 입력 여부 결정
- 생년월일 입력
- 본인확인
- 2FA/passkey 설정
- Google 약관 동의
- 결제 정보 입력 여부 결정
- Play Console 개발자 등록 결제 여부 결정
- 공식 문의 이메일 최종 확정

보안 기준:

- 개인 Google 계정과 분리한다.
- 강한 비밀번호를 사용한다.
- 2FA를 활성화한다.
- 복구 이메일을 등록한다.
- 비밀번호, 2FA 코드, 복구 코드는 Codex에게 공유하지 않는다.
- 앱 운영용 계정 접근 권한은 최소 인원만 보유한다.
- 운영 계정은 소셜 로그인 테스트용 개인 계정과 분리한다.

### Google Console에서 해야 할 일

1. 새 NURI Google 계정으로 Chrome에 로그인한다.
2. Google Cloud Console에 접속한다.
3. 새 프로젝트를 생성한다.
4. 프로젝트 이름은 `NURI Auth` 또는 `NURI OAuth`를 권장한다.
5. 이 프로젝트에서는 Google Maps/Places API를 활성화하지 않는다.
6. APIs & Services > OAuth consent screen으로 이동한다.
7. 앱 이름은 `NURI`로 입력한다.
8. 지원 이메일은 새 NURI Google 계정으로 설정한다.
9. 개발자 연락처는 새 NURI Google 계정 또는 공식 문의 이메일로 설정한다.
10. scope는 `openid`, `email`, `profile` 중심의 인증 목적 최소 범위로 제한한다.
11. Credentials > Create Credentials > OAuth Client ID로 이동한다.
12. Application type은 Web application을 선택한다.
13. Authorized redirect URIs에 아래 Supabase Auth callback URL을 등록한다.

```text
https://grmekesqoydylqmyvfke.supabase.co/auth/v1/callback
```

14. Web OAuth Client ID/Secret을 생성한다.
15. Client ID/Secret은 Supabase Dashboard > Authentication > Providers > Google에 직접 입력한다.
16. Google provider를 enable한다.
17. 앱 코드에는 Google client secret을 넣지 않는다.
18. 완료 후 Codex에는 아래 문장만 전달한다.

```text
새 NURI Google 계정에서 Google provider 입력/enable 완료
```

Android OAuth Client ID가 필요한 경우 package name은 `com.nuri.app`으로 등록하고 release signing SHA-1/SHA-256 fingerprint를 사용한다. debug key와 release key를 혼동하지 않는다.

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

- [ ] NURI 전용 신규 Google 계정 준비
- [ ] 새 Google 계정에서 OAuth-only Google Cloud Project 준비
- [ ] 프로젝트 이름 `NURI Auth` 또는 `NURI OAuth` 사용
- [ ] 새 OAuth project에서 Google Maps/Places API 미활성화
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
| Naver | V1.0 smoke 대상 아님. V1.1 또는 출시 후 재검토 시 Supabase `custom:naver` 유지, Naver Client ID/Secret, Callback URL, profile/email 제공 항목을 다시 확인하고 public-surface guard 해제까지 함께 검토한다. |

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

Naver OAuth는 V1.0 public surface에서 soft disable한다. 아래 절차는 V1.1 또는 출시 후 운영 설정 안정화 시점에만 다시 사용한다.

1. Naver Developers에서 Client ID/Secret을 확인한다.
2. Naver Callback URL이 Supabase Auth callback URL인지 맞춘다.
3. Supabase Dashboard > Authentication > Providers > Custom OAuth `custom:naver` 설정을 유지한다.
4. `custom:naver` provider를 enable한다.
5. V1.1 재검토 시점에만 `EXPO_PUBLIC_ENABLE_NAVER_OAUTH=true`와 public-surface guard 해제를 함께 검토한다.
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

Google/Kakao OAuth는 2026-05-27 Android 실기기 성공 smoke로 닫았다. Naver는 `custom:naver` Supabase authorize와 Android web flow 진입은 닫혔지만 Naver Developers `pet_nuri 서비스 설정 오류`로 session 생성 전 차단됐다. 2026-05-28 PO 결정에 따라 V1.0에서는 Naver를 public surface에서 soft disable하고 Google + Kakao만 사용한다. Naver hard delete와 운영 설정 재검토는 V1.1 또는 출시 후 cleanup 작업으로 분리한다. Secret/client secret/token 전체값은 계속 문서와 채팅에 기록하지 않는다.

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

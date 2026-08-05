# NURI-01-인증·온보딩

- 목적: email/social auth, session restore, nickname, onboarding, account entry
- 화면: `src/screens/Auth`, Splash, nickname/welcome, password recovery
- 코드: `src/store/authStore.ts`, `src/services/auth`, `src/services/supabase/auth.ts`, `socialOAuthConfig.ts`
- Supabase: auth identities, profiles access contract, account deletion handoff; 공용 RLS는 NURI-09
- tests/docs: auth, OAuth, session, consent tests; `docs/domains/auth`, legal docs
- 허용: auth/onboarding runtime과 관련 focused tests/docs
- 금지: Pet profile data model, Timeline, provider migration/RLS 직접 변경, release build 수정
- 경계: provider policy가 remote/공용이면 NURI-09 primary, product decision은 NURI-00
- 현재 상태: CREATE_LATER; Naver policy drift는 AUTH-001
- 첫 작업: provider surface와 current docs 정합성 audit

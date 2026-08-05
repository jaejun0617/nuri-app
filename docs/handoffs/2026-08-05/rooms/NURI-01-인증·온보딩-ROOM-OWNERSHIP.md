# NURI-01-인증·온보딩

- 목적: email/social auth, session restore, nickname, onboarding, account entry
- 화면: `src/screens/Auth`, Splash, nickname/welcome, password recovery
- 코드: `src/store/authStore.ts`, `src/services/auth`, `src/services/supabase/auth.ts`, `socialOAuthConfig.ts`
- Supabase: auth identities, profiles access contract, account deletion handoff; 공용 RLS는 NURI-09
- tests/docs: auth, OAuth, session, consent tests; `docs/domains/auth`, legal docs
- 허용: auth/onboarding runtime과 관련 focused tests/docs
- 금지: Pet profile data model, Timeline, provider migration/RLS 직접 변경, release build 수정
- 경계: Naver 완전 제거의 app-side 주 소유는 NURI-01, remote Provider read-only 증거는 NURI-09 지원, Google/Kakao release 회귀는 NURI-12 지원, 정책 결정은 NURI-00
- 현재 상태: ACTIVATE_SCHEDULED, order 5; AUTH-001
- 첫 작업: Naver 사용자 노출·route·flow·helper·config·env·dependency·current 문서 잔존 제거
- 활성화 순서: NURI-01 → NURI-09 → NURI-12
- bootstrap/write: `BOOTSTRAP_READY` 전까지 `WRITE_LOCKED`; NURI-00의 별도 승인 후에만 write

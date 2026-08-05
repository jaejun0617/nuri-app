# NURI-10-관리자웹·운영도구

- 목적: `nuri-web` admin auth, operations, content, hospital, guides, reports, security routes
- 화면/code: `/Users/shinjaejun/Desktop/Frontend/Nuri-App/nuri-web/app`, `components`, `lib`, `scripts`, `tests`
- Supabase: admin API/operator contracts; common RLS is NURI-09
- tests/docs: 14 current admin tests, admin policy and operations docs
- 허용: admin web runtime and operator UX
- 금지: mobile feature code, production role escalation, DB policy without NURI-09
- 경계: Release evidence NURI-12; backend security NURI-09
- 현재 상태: ACTIVATE_LATER; build passed, production operator QA remains
- 첫 작업: real operator permission/audit route QA

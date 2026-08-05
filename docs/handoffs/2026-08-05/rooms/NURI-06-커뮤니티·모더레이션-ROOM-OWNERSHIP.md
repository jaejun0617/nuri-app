# NURI-06-커뮤니티·모더레이션

- 목적: posts, comments/replies, reports, moderation, view count contract
- 화면: `src/screens/Community`, create/edit/detail, comments
- 코드: community components/services and policy utilities
- Supabase: posts/comments/reports/moderation tables and RPC; shared security review NURI-09
- tests/docs: community tests, `docs/커뮤니티-기획`, policy/QA docs
- 허용: community read/write/moderation runtime and server contract proposal
- 금지: notification delivery, admin operator UI, unreviewed view-count shortcut
- 경계: user notification event is NURI-07; admin execution UI is NURI-10
- 현재 상태: ACTIVATE_LATER
- 첫 작업: create/update/comment abuse boundary regression

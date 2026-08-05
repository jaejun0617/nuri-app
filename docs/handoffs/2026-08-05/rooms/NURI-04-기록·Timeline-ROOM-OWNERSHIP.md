# NURI-04-기록·Timeline

- 목적: memories CRUD, Timeline filtering, detail/edit, total summary record parity, entry generation
- 화면: `src/screens/Records`, Timeline stack and gate
- 코드: `src/services/supabase/memories.ts`, `src/services/records`, `src/services/timeline`, navigation Timeline files
- Supabase: memories query/RPC contract; shared policy/migration은 NURI-09
- tests/docs: records, timeline, weekly/total summary, date and navigation tests
- 허용: record CRUD, Timeline filter/list/render/generation, Home payload의 최소 협의 변경
- 금지: Home composition, date picker, DB schema 직접 변경 without NURI-09
- 경계: Home card → Timeline issue의 primary owner; health report가 record semantics를 소비할 때 계약만 공유
- 현재 상태: ACTIVATE_SCHEDULED, order 3; TIMELINE-001
- 첫 작업: clean APK 네 카드 parity/fast re-entry evidence

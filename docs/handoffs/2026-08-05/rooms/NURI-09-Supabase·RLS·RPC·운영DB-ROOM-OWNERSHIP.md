# NURI-09-Supabase·RLS·RPC·운영DB

- 목적: shared backend security/data contract and remote/local drift
- 범위: all `supabase/migrations`, functions, policies, grants, triggers, storage and remote catalog
- 코드: Supabase client adapters only when contract evidence requires it
- tests/docs: migration list, SQL docs, security/operations docs
- 허용: read-only audit; approved additive migration/RLS/RPC work with explicit scope
- 금지: destructive schema/data changes, RLS disable, secret output, unapproved provider deletion
- 경계: feature room owns UX/query intent; this room owns common DB/security execution
- 현재 상태: CREATE_NOW Priority 1; SUPABASE-001/AUTH-001
- 첫 작업: remote policy/RPC/grant catalog and provider policy closeout

# NURI-09-Supabase·RLS·RPC·운영DB

- 목적: shared backend security/data contract and remote/local drift
- 범위: all `supabase/migrations`, functions, policies, grants, triggers, storage and remote catalog
- 코드: Supabase client adapters only when contract evidence requires it
- tests/docs: migration list, SQL docs, security/operations docs
- 허용: read-only audit; approved additive migration/RLS/RPC work with explicit scope
- 금지: destructive schema/data changes, RLS disable, secret output, unapproved provider deletion
- 경계: feature room owns UX/query intent; this room owns common DB/security execution
- 현재 상태: CREATE_NOW supporting / ACTIVATE_PRIORITY_2; SUPABASE-001 및 AUTH-001 지원
- 첫 작업: remote policy/RPC/grant catalog read-only 증거와 Naver Provider 잔존 여부 확인
- 경계: Naver 정책 재결정은 하지 않으며, app-side 제거는 NURI-01이 소유한다.
- bootstrap/write: `BOOTSTRAP_READY` 전까지 `WRITE_LOCKED`; migration·RLS·RPC 변경은 별도 활성화와 승인 없이는 금지

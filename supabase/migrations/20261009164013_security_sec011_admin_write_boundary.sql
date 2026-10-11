begin;
-- Preserve the current server-console RPCs; authenticated clients cannot edit
-- approval/security fields or rewrite audit history directly.
revoke insert,update,delete,truncate,references,trigger on
  public.admin_action_approval_requests,
  public.admin_action_approval_execution_payloads,
  public.admin_action_approval_executions,
  public.admin_action_policies,
  public.admin_operation_audit_logs
from public,anon,authenticated;

drop policy admin_action_approvals_ops_admin_all on public.admin_action_approval_requests;
create policy admin_approvals_ops_admin_read on public.admin_action_approval_requests
  for select to authenticated using(public.is_nuri_ops_admin_v1());
drop policy admin_approval_payloads_ops_admin_all on public.admin_action_approval_execution_payloads;
create policy admin_approval_payloads_ops_admin_read on public.admin_action_approval_execution_payloads
  for select to authenticated using(public.is_nuri_ops_admin_v1());
drop policy admin_approval_executions_ops_admin_all on public.admin_action_approval_executions;
create policy admin_approval_executions_ops_admin_read on public.admin_action_approval_executions
  for select to authenticated using(public.is_nuri_ops_admin_v1());
drop policy admin_action_policies_ops_admin_all on public.admin_action_policies;
create policy admin_action_policies_ops_admin_read on public.admin_action_policies
  for select to authenticated using(public.is_nuri_ops_admin_v1());
drop policy admin_operation_audit_logs_ops_admin_all on public.admin_operation_audit_logs;
create policy admin_operation_audit_logs_ops_admin_read on public.admin_operation_audit_logs
  for select to authenticated using(public.is_nuri_ops_admin_v1());

create function public.reject_admin_audit_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  raise exception using errcode='42501',message='NURI_ADMIN_AUDIT_APPEND_ONLY';
end;
$$;
revoke all on function public.reject_admin_audit_mutation() from public,anon,authenticated,service_role;
create trigger admin_audit_append_only before update or delete
  on public.admin_operation_audit_logs for each row execute function public.reject_admin_audit_mutation();
create trigger admin_audit_no_truncate before truncate
  on public.admin_operation_audit_logs for each statement execute function public.reject_admin_audit_mutation();
revoke update,delete,truncate on public.admin_operation_audit_logs from service_role;
commit;

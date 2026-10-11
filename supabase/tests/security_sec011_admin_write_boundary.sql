begin;
set local statement_timeout='30s';
set local plpgsql.check_asserts=on;
do $$
declare actor uuid; audit_id uuid:=gen_random_uuid(); denied boolean; table_name text;
begin
  insert into public.admin_operation_audit_logs(id,action_type,actor_label,target_type,target_summary,before_state,after_state,risk_level,status)
    values(audit_id,'security_fixture','NURI_SECURITY_AB_AUDIT','system','isolated rollback fixture','{}','{}','low','succeeded');
  for actor in select user_id from public.profiles where nickname in ('kakaoQA','googleQA') and role='user' loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    set local role authenticated;
    assert (select count(*)=0 from public.admin_operation_audit_logs where id=audit_id),'ordinary_user_audit_read_denied';
    foreach table_name in array array['admin_action_approval_requests','admin_action_approval_execution_payloads','admin_action_approval_executions','admin_action_policies','admin_operation_audit_logs'] loop
      assert not has_table_privilege('authenticated','public.'||table_name,'INSERT'),'direct_insert_denied';
      assert not has_table_privilege('authenticated','public.'||table_name,'UPDATE'),'direct_update_denied';
      assert not has_table_privilege('authenticated','public.'||table_name,'DELETE'),'direct_delete_denied';
    end loop;
    denied:=false;
    begin perform public.admin_review_action_approval_request_v1(gen_random_uuid(),'approved','isolated','spoofed-admin');
      exception when insufficient_privilege then denied:=true; end;
    assert denied,'ordinary_user_review_denied';
    denied:=false;
    begin perform public.admin_execute_approved_action_v1(gen_random_uuid(),'spoofed-admin',null,null);
      exception when insufficient_privilege then denied:=true; end;
    assert denied,'ordinary_user_execute_denied';
    denied:=false;
    begin update public.admin_operation_audit_logs set actor_label='spoofed-admin' where id=audit_id;
      exception when insufficient_privilege then denied:=true; end;
    assert denied,'actual_direct_audit_update_denied';
    reset role;
  end loop;
  denied:=false;
  begin update public.admin_operation_audit_logs set actor_label='spoofed-admin' where id=audit_id;
    exception when insufficient_privilege then denied:=sqlerrm='NURI_ADMIN_AUDIT_APPEND_ONLY'; end;
  assert denied,'trusted_update_also_denied';
  denied:=false;
  begin delete from public.admin_operation_audit_logs where id=audit_id;
    exception when insufficient_privilege then denied:=sqlerrm='NURI_ADMIN_AUDIT_APPEND_ONLY'; end;
  assert denied,'trusted_delete_also_denied';
end;
$$;
rollback;
select 'SEC-011 PARTIAL PASS: A/B denial, direct write privileges removed, audit append-only; actor binding not tested' as result;

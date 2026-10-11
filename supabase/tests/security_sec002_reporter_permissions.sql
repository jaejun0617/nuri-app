begin;
set local role anon;
do $$
declare denied boolean := false;
begin
  begin perform public.bump_community_reporter_rate_limit(gen_random_uuid());
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon_rate_mutator';
  denied := false;
  begin perform public.bump_community_reporter_rejected_abuse(gen_random_uuid());
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon_rejected_mutator';
end;
$$;
set local role authenticated;
do $$
declare denied boolean := false;
begin
  begin perform public.bump_community_reporter_rate_limit(gen_random_uuid());
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'auth_rate_mutator';
  denied := false;
  begin perform public.bump_community_reporter_rejected_abuse(gen_random_uuid());
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'auth_rejected_mutator';
  denied := false;
  begin perform public.community_submit_report_v1('post',gen_random_uuid(),'spam','isolated test');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'no_session_report';
end;
$$;
rollback;
select 'SEC-002 anon/auth arbitrary mutator calls DENIED, missing session DENIED' as result;

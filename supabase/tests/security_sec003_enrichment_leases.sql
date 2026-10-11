begin;
set local role anon;
do $$
declare denied boolean := false;
begin
  begin perform public.claim_nuri_place_enrichment_budget('google-places','demand',1,999999);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'anon_budget_denied';
end;
$$;
set local role authenticated;
do $$
declare denied boolean := false;
begin
  begin perform public.claim_nuri_place_enrichment_job_v2('qa','qa','google-places','qa','{}','qa',45);
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'auth_claim_denied';
  assert not has_function_privilege('authenticated','public.complete_nuri_place_enrichment_job(uuid,text,jsonb,text,text)','execute'), 'old_completion_closed';
end;
$$;
set local role service_role;
do $$
declare
  k text := 'SEC-003-rollback-' || gen_random_uuid()::text;
  c record; next_claim record; budget record; denied boolean := false;
begin
  select * into budget from public.claim_nuri_place_enrichment_budget('google-places','demand',0,2147483647);
  assert budget.hard_cap = 6000, 'server_budget_ceiling';
  select * into budget from public.claim_nuri_place_enrichment_budget('google-places','demand',1,0);
  assert not budget.allowed, 'disabled_budget_preserved';
  select * into c from public.claim_nuri_place_enrichment_job_v2('qa',k,'google-places',k,array['phone'],k,2147483647);
  assert c.claim_granted and c.lease_owner is not null, 'server_issued_lease';
  assert c.locked_until <= now() + interval '120 seconds', 'bounded_ttl';
  select * into next_claim from public.claim_nuri_place_enrichment_job_v2('qa',k,'google-places',k,array['phone'],k,45);
  assert not next_claim.claim_granted and next_claim.lease_owner is null, 'lease_not_disclosed_to_peer';
  begin perform public.complete_nuri_place_enrichment_job_v2(c.job_id,'wrong-worker','completed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'wrong_worker_denied';
  update public.nuri_place_enrichment_jobs set locked_until = now() - interval '1 second' where id = c.job_id;
  denied := false;
  begin perform public.complete_nuri_place_enrichment_job_v2(c.job_id,c.lease_owner,'completed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'expired_worker_denied';
  select * into next_claim from public.claim_nuri_place_enrichment_job_v2('qa',k,'google-places',k,array['phone'],k,45);
  assert next_claim.claim_granted and next_claim.lease_owner <> c.lease_owner, 'expired_lease_reclaimed';
  denied := false;
  begin perform public.complete_nuri_place_enrichment_job_v2(c.job_id,next_claim.lease_owner,'running');
  exception when invalid_parameter_value then denied := true; end;
  assert denied, 'invalid_transition_denied';
  perform public.complete_nuri_place_enrichment_job_v2(c.job_id,next_claim.lease_owner,'completed','{"qa":true}');
  assert (select status = 'completed' and locked_until is null from public.nuri_place_enrichment_jobs where id = c.job_id), 'legitimate_worker_completed';
  denied := false;
  begin perform public.complete_nuri_place_enrichment_job_v2(c.job_id,next_claim.lease_owner,'failed');
  exception when insufficient_privilege then denied := true; end;
  assert denied, 'completion_replay_denied';
end;
$$;
rollback;
select 'SEC-003 runtime PASS; isolated job rolled back; external API calls 0' as result;

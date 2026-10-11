begin;
set local statement_timeout='30s';
set local plpgsql.check_asserts=on;
do $$
declare
  a uuid; b uuid; p uuid:=gen_random_uuid(); source_id text:=gen_random_uuid()::text;
  snapshot jsonb; report_id uuid; policy_id uuid; denied boolean;
begin
  select user_id into a from public.profiles where nickname='kakaoQA' and role='user';
  select user_id into b from public.profiles where nickname='googleQA' and role='user';
  assert a is not null and b is not null and a<>b, 'approved_accounts';
  insert into public.pet_travel_places(id,canonical_name,address,latitude,longitude,place_type,primary_source,primary_source_place_id)
    values(p,'NURI_SECURITY_AB_PLACE','isolated fixture',37,127,'outdoor','tour-api',source_id);
  select to_jsonb(t) into snapshot from public.pet_travel_places t where id=p;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  set local role authenticated;
  select r.user_report_id,r.policy_id into report_id,policy_id from public.submit_pet_travel_user_report(
    source_id,'forged provider name','forged address',0,0,'shopping','pet_allowed','NURI_SECURITY_AB_REPORT','{"qa":true}'::jsonb
  ) r;
  assert report_id is not null and policy_id is not null, 'normal_report_saved';
  assert (select count(*)=1 from public.pet_travel_user_reports where id=report_id and user_id=a), 'report_owned_by_actor';
  denied:=false;
  begin perform public.submit_pet_travel_user_report(gen_random_uuid()::text,'forged','forged',0,0,'shopping','pet_allowed',null,'{}');
  exception when invalid_parameter_value then denied:=sqlerrm='travel_place_not_found'; end;
  assert denied, 'client_cannot_create_provider_row';
  reset role;
  assert snapshot=(select to_jsonb(t) from public.pet_travel_places t where id=p), 'canonical_unchanged';
  assert (select requires_onsite_check and source_type='user-report' from public.pet_travel_pet_policies where id=policy_id), 'untrusted_onsite_contract';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  set local role authenticated;
  assert (select count(*)=0 from public.pet_travel_user_reports where id=report_id), 'peer_private_report_read_denied';
  reset role;
end;
$$;
rollback;
select 'SEC-005 PASS: canonical unchanged, untrusted report retained, onsite check retained, unknown provider row creation denied; rollback complete' as result;

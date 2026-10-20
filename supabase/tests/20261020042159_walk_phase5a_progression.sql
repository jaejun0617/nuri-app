-- Runner wraps this script in BEGIN/ROLLBACK. All users/pets are synthetic.
create temporary table walk_c_scope(label text primary key,id uuid not null) on commit drop;
insert into walk_c_scope values('owner',gen_random_uuid()),('other',gen_random_uuid()),
 ('pet',gen_random_uuid()),('pet2',gen_random_uuid()),('foreign_pet',gen_random_uuid());
insert into auth.users(id,raw_user_meta_data)
select id,jsonb_build_object('nickname','c'||left(replace(id::text,'-',''),9)) from walk_c_scope where label in ('owner','other');
insert into public.pets(id,user_id,name)
select p.id,u.id,'Walk C rollback fixture' from walk_c_scope p cross join walk_c_scope u
where (p.label in ('pet','pet2') and u.label='owner') or(p.label='foreign_pet' and u.label='other');
grant select on walk_c_scope to authenticated,anon;
create function pg_temp.c_assert(v boolean,label text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'WALK_C_ASSERT:%',label;end if;end $$;
create function pg_temp.c_expect(sql text,expected text) returns void language plpgsql as $$
declare d text;
begin begin execute sql;exception when others then
 if sqlstate=expected or sqlerrm=expected then return;end if;
 get stacked diagnostics d=pg_exception_detail;
 if nullif(d,'') is not null and d::jsonb->>'walkCode'=expected then return;end if;
 raise exception 'WALK_C_WRONG_ERROR:%',sqlstate;
 end;raise exception 'WALK_C_MISSING_ERROR:%',expected;end $$;

-- Privileged arithmetic/storage-boundary fixtures, not GPS quality acceptance.
create function pg_temp.c_fixture(owner_id uuid,pet uuid,distance_m bigint,eligible boolean default true)
returns uuid language plpgsql as $$
declare sid uuid:=gen_random_uuid();
begin
 insert into public.walk_sessions(user_id,pet_id,client_session_id,state,payload_digest,
 started_at,ended_at,measured_duration_ms,active_duration_ms,measured_distance_m,accepted_distance_m,
 eligibility,quality_summary,payload_version,algorithm_version,quality_schema_version,route_backup_choice,route_revision,accepted_at)
 values(owner_id,pet,sid,'ACCEPTED_SERVER',repeat('a',64), '2026-10-01T00:00:00Z','2026-10-01T01:00:00Z',
 3600000,3600000,distance_m,case when eligible then distance_m else 0 end,
 case when eligible then 'PROGRESSION_ELIGIBLE' else 'PROGRESSION_INELIGIBLE_QUALITY' end,
 '{}',1,1,1,'LOCAL_ONLY',0,now());
 return sid;
end $$;
create function pg_temp.c_finish(pet uuid,distance_m text,st text,en text,duration_ms text)
returns jsonb language plpgsql as $$
declare p jsonb; sid uuid:=gen_random_uuid();r jsonb;
begin
 p:=jsonb_build_object('payloadVersion',1,'clientSessionId',sid,'petId',pet,'startedAt',st,'endedAt',en,
 'measuredDurationMs',duration_ms,'activeDurationMs',duration_ms,'measuredDistanceM',distance_m,
 'algorithmVersion',1,'qualitySchemaVersion',1,'routeBackupChoice','LOCAL_ONLY',
 'qualitySummary','{"schemaVersion":1,"totalFixCount":20,"acceptedFixCount":15,"rejectedAccuracyCount":1,"rejectedTimestampCount":1,"rejectedDuplicateCount":1,"rejectedJumpCount":1,"rejectedSpeedCount":0,"stationarySuppressedCount":1,"segmentCount":1,"gpsGapDurationMs":"0","maxGapDurationMs":"0","mockLocationObserved":false}'::jsonb);
 perform public.start_walk_v1(sid,pet);
 r:=public.finish_walk_v1(p,walk_private.parse_finish_v1(p)->>'digest');
 perform pg_temp.c_assert(r->>'state'='ACCEPTED_SERVER' and r->'summary'->>'eligibility'='PROGRESSION_ELIGIBLE','real_finish_quality');
 return r;
end $$;
do $levels$
declare l numeric;threshold numeric;r jsonb;
begin
 foreach l in array array[1::numeric,2,3,5,10,50,1000,10000000000,1e40] loop
  threshold:=500*l*(l-1);
  r:=walk_private.progression_snapshot_v1(threshold,0);
  perform pg_temp.c_assert(r->>'level'=l::text,'exact_threshold');
  perform pg_temp.c_assert(r->>'thresholdM'=threshold::text,'exact_floor');
  perform pg_temp.c_assert(r->'progress'->>'numeratorM'='0','threshold_progress_zero');
  if l>1 then
   r:=walk_private.progression_snapshot_v1(threshold-1,0);
   perform pg_temp.c_assert(r->>'level'=(l-1)::text,'boundary_minus_one');
  end if;
 end loop;
 perform pg_temp.c_expect('select walk_private.progression_snapshot_v1(-1,0)','WALK_INVALID_DISTANCE');
end $levels$;
select set_config('request.jwt.claim.sub',(select id::text from walk_c_scope where label='owner'),true);
do $functional$
declare owner_id uuid;pet uuid;pet2 uuid;r jsonb;s1 jsonb;s2 jsonb;history jsonb;
begin
 select id into owner_id from walk_c_scope where label='owner';
 select id into pet from walk_c_scope where label='pet';select id into pet2 from walk_c_scope where label='pet2';
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='0' and r->>'level'='1' and r->>'eligibleSessionCount'='0'
  and r->'milestones'='[]'::jsonb,'empty');
 perform pg_temp.c_fixture(owner_id,pet,500,false);
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='0' and r->'milestones'='[]'::jsonb,'ineligible_excluded');
 s1:=pg_temp.c_finish(pet,'6000','2026-10-02T00:00:00Z','2026-10-02T01:00:00Z','3600000');
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='6000' and r->>'level'='4'
  and jsonb_array_length(r->'milestones')=1,'first_eligible');
 s2:=pg_temp.c_finish(pet,'4000','2026-10-02T01:00:00Z','2026-10-02T02:00:00Z','3600000');
 r:=public.get_pet_walk_progression_v1(pet);history:=r->'milestones';
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='10000' and r->>'level'='5'
  and r->>'eligibleSessionCount'='2' and r->>'nextThresholdM'='15000'
  and r->'progress'->>'numeratorM'='0' and r->'progress'->>'denominatorM'='5000'
  and jsonb_array_length(history)=2,'10km_boundary');
 perform pg_temp.c_assert(history->0->>'sourceSessionId'=s1->'summary'->>'sessionId','first_source_immutable');
 perform public.delete_walk_route_v1((s2->>'clientSessionId')::uuid,pet);
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='10000' and r->'milestones'=history,'route_independent');
 perform public.delete_walk_session_v1((s2->>'clientSessionId')::uuid,pet);
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='6000' and r->>'level'='4'
  and r->'milestones'=history,'delete_recalculates_keeps_history');
 perform public.delete_walk_session_v1((s1->>'clientSessionId')::uuid,pet);
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='0' and r->>'level'='1'
  and r->'milestones'=history,'zero_keeps_history');
 perform pg_temp.c_finish(pet,'100000','2026-10-03T00:00:00Z','2026-10-03T04:00:00Z','14400000');
 r:=public.get_pet_walk_progression_v1(pet);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='100000' and r->>'level'='14'
   and jsonb_array_length(r->'milestones')=3,'100km_real_finish_contract');
 -- Two BIGINT storage-boundary rows prove SUM is never narrowed to bigint.
 perform pg_temp.c_fixture(owner_id,pet2,9223372036854775807);
 perform pg_temp.c_fixture(owner_id,pet2,9223372036854775807);
 r:=public.get_pet_walk_progression_v1(pet2);
 perform pg_temp.c_assert(r->>'lifetimeDistanceM'='18446744073709551614'
  and jsonb_array_length(r->'milestones')=3,'sum_above_bigint');
 perform pg_temp.c_assert(public.get_pet_walk_progression_v1(pet)->>'lifetimeDistanceM'='100000','selected_pet_isolation');
 perform pg_temp.c_assert((select count(*)=6 from public.pet_walk_milestones where user_id=owner_id),'unique_milestones');
 -- Same stored eligible row update must not change historical source/earnedAt.
 update public.walk_sessions set accepted_distance_m=accepted_distance_m where user_id=owner_id and pet_id=pet2 and state='ACCEPTED_SERVER';
 perform pg_temp.c_assert(public.get_pet_walk_progression_v1(pet2)->'milestones'=r->'milestones','milestone_replay_identity');
end $functional$;

set local role authenticated;
do $owner_role$
declare pet uuid;begin
 select id into pet from walk_c_scope where label='pet';
 perform pg_temp.c_assert(public.get_pet_walk_progression_v1(pet)->>'level'='14','owner_read');
 perform pg_temp.c_assert((select count(*)=6 from public.pet_walk_milestones),'owner_rls_read');
 perform pg_temp.c_expect('insert into public.pet_walk_milestones default values','42501');
 perform pg_temp.c_expect('update public.pet_walk_milestones set policy_version=1','42501');
 perform pg_temp.c_expect('delete from public.pet_walk_milestones','42501');
 perform pg_temp.c_expect('select walk_private.progression_snapshot_v1(0,0)','42501');
end $owner_role$;
reset role;
update auth.users set banned_until='infinity' where id=(select id from walk_c_scope where label='owner');
set local role authenticated;
do $banned$
begin
 perform pg_temp.c_assert((select count(*)=0 from public.pet_walk_milestones),'banned_history_read');
 perform pg_temp.c_expect(format('select public.get_pet_walk_progression_v1(%L)',(select id from walk_c_scope where label='pet')),'WALK_OWNER_MISMATCH');
end $banned$;
reset role;
update auth.users set banned_until=null where id=(select id from walk_c_scope where label='owner');
select set_config('request.jwt.claim.sub',(select id::text from walk_c_scope where label='other'),true);
set local role authenticated;
do $foreign_role$
declare pet uuid;begin
 select id into pet from walk_c_scope where label='pet';
 perform pg_temp.c_assert((select count(*)=0 from public.pet_walk_milestones),'foreign_rls');
 perform pg_temp.c_expect(format('select public.get_pet_walk_progression_v1(%L)',pet),'WALK_OWNER_MISMATCH');
end $foreign_role$;
reset role;
set local role anon;
do $anon$
begin
 perform pg_temp.c_expect('select count(*) from public.pet_walk_milestones','42501');
 perform pg_temp.c_expect('select public.get_pet_walk_progression_v1(gen_random_uuid())','42501');
end $anon$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from walk_c_scope where label='owner'),true);
do $cascade$
declare pet uuid;owner_id uuid;begin
 select id into pet from walk_c_scope where label='pet';
 select id into owner_id from walk_c_scope where label='owner';
 delete from public.pets where id=pet;
 perform pg_temp.c_assert(not exists(select 1 from public.pet_walk_milestones where pet_id=pet),'pet_final_history_erased');
 delete from auth.users where id=owner_id;
 perform pg_temp.c_assert(not exists(select 1 from public.pet_walk_milestones where user_id=owner_id),'account_final_history_erased');
end $cascade$;
do $catalog$
begin
 perform pg_temp.c_assert((select relrowsecurity from pg_class where oid='public.pet_walk_milestones'::regclass),'rls_enabled');
 perform pg_temp.c_assert(not has_function_privilege('anon','public.get_pet_walk_progression_v1(uuid)','EXECUTE')
  and not has_function_privilege('service_role','public.get_pet_walk_progression_v1(uuid)','EXECUTE'),'grants');
 perform pg_temp.c_assert(not exists(select 1 from pg_proc p,lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where p.oid='public.get_pet_walk_progression_v1(uuid)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'),'public_execute');
end $catalog$;
select 'PHASE5A_PROGRESSION_SQL_PASS' as result;

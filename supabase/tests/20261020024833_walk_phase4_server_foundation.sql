-- Rollback-only synthetic users/pets. No existing users or product content.
-- Run after the migration, or concatenate migration + this body inside BEGIN/ROLLBACK.
create temporary table nuri_walk_test_scope(label text primary key, id uuid not null) on commit drop;
insert into nuri_walk_test_scope values
 ('owner',gen_random_uuid()),('other',gen_random_uuid()),
 ('pet',gen_random_uuid()),('pet2',gen_random_uuid()),('otherpet',gen_random_uuid()),
 ('session',gen_random_uuid()),('session2',gen_random_uuid()),('session3',gen_random_uuid());
insert into auth.users(id,raw_user_meta_data)
select id,jsonb_build_object('nickname','w'||left(replace(id::text,'-',''),8))
from nuri_walk_test_scope where label in ('owner','other');
insert into public.pets(id,user_id,name)
select p.id,u.id,'Walk rollback test' from nuri_walk_test_scope p
cross join nuri_walk_test_scope u where (p.label in ('pet','pet2') and u.label='owner')
 or (p.label='otherpet' and u.label='other');
grant select on nuri_walk_test_scope to authenticated,anon;

create function pg_temp.walk_assert(v boolean, label text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'WALK_TEST_FAILED:%',label; end if; end $$;
create function pg_temp.walk_expect(sql text,expected text) returns void language plpgsql as $$
declare detail text;
begin
  begin execute sql; exception when others then
    if sqlerrm=expected or sqlstate=expected then return; end if;
    get stacked diagnostics detail=pg_exception_detail;
    if nullif(detail,'') is not null and detail::jsonb->>'walkCode'=expected then return;end if;
    raise exception 'WALK_TEST_WRONG_ERROR:% expected:%',sqlstate,expected;
  end;
  raise exception 'WALK_TEST_MISSING_ERROR:%',expected;
end $$;
create function pg_temp.walk_payload(s uuid,pet uuid,st text default '2026-10-13T00:00:00.000Z',
 en text default '2026-10-13T00:32:00.000Z',quality jsonb default null) returns jsonb
language sql as $$ select jsonb_build_object(
 'payloadVersion',1,'clientSessionId',s,'petId',pet,'startedAt',st,'endedAt',en,
 'measuredDurationMs','1920000','activeDurationMs','1800000','measuredDistanceM','2430',
 'algorithmVersion',1,'qualitySchemaVersion',1,
 'qualitySummary',coalesce(quality,'{"schemaVersion":1,"totalFixCount":20,"acceptedFixCount":15,"rejectedAccuracyCount":1,"rejectedTimestampCount":1,"rejectedDuplicateCount":1,"rejectedJumpCount":1,"rejectedSpeedCount":0,"stationarySuppressedCount":1,"segmentCount":1,"gpsGapDurationMs":"1000","maxGapDurationMs":"1000","mockLocationObserved":false}'::jsonb),
 'routeBackupChoice','LOCAL_ONLY') $$;
create function pg_temp.walk_finish(p jsonb) returns jsonb language plpgsql as $$
declare d text; begin
 -- Test-only digest oracle derives from real server parser. Golden vectors below
 -- independently pin compatibility with TypeScript's SHA-256 constants.
 d := walk_private.parse_finish_v1(p)->>'digest';
 return public.finish_walk_v1(p,d);
end $$;

do $catalog$
declare fn regprocedure;
begin
 perform pg_temp.walk_assert((select relrowsecurity from pg_class where oid='public.walk_sessions'::regclass),'rls_enabled');
 perform pg_temp.walk_assert(not has_table_privilege('authenticated','public.walk_sessions','INSERT')
   and not has_table_privilege('authenticated','public.walk_sessions','UPDATE')
   and not has_table_privilege('authenticated','public.walk_sessions','DELETE'),'no_direct_dml');
 perform pg_temp.walk_assert(not has_schema_privilege('authenticated','walk_private','USAGE'),'private_unexposed');
 foreach fn in array array['public.start_walk_v1(uuid,uuid)'::regprocedure,
   'public.finish_walk_v1(jsonb,text)'::regprocedure,'public.cancel_walk_v1(uuid,uuid)'::regprocedure,
   'public.delete_walk_session_v1(uuid,uuid)'::regprocedure,'public.delete_walk_route_v1(uuid,uuid)'::regprocedure,
   'public.get_walk_sessions_v1(uuid[])'::regprocedure] loop
   perform pg_temp.walk_assert((select prosecdef and proconfig @> array['search_path=public, pg_catalog'] from pg_proc where oid=fn),'definer_safe_path');
   perform pg_temp.walk_assert(has_function_privilege('authenticated',fn,'EXECUTE')
     and not has_function_privilege('anon',fn,'EXECUTE')
     and not has_function_privilege('service_role',fn,'EXECUTE'),'role_grants');
   perform pg_temp.walk_assert(not exists(select 1 from pg_proc p,
     lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
     where p.oid=fn and a.grantee=0 and a.privilege_type='EXECUTE'),'public_execute_denied');
 end loop;
end $catalog$;

do $vectors$
declare p jsonb := '{"payloadVersion":1,"clientSessionId":"11111111-1111-4111-8111-111111111111","petId":"22222222-2222-4222-8222-222222222222","startedAt":"2026-10-13T00:00:00.000Z","endedAt":"2026-10-13T00:32:00.000Z","measuredDurationMs":"1920000","activeDurationMs":"1800000","measuredDistanceM":"2430","algorithmVersion":1,"qualitySchemaVersion":1,"qualitySummary":{"schemaVersion":1,"totalFixCount":10,"acceptedFixCount":5,"rejectedAccuracyCount":1,"rejectedTimestampCount":1,"rejectedDuplicateCount":1,"rejectedJumpCount":1,"rejectedSpeedCount":0,"stationarySuppressedCount":1,"segmentCount":1,"gpsGapDurationMs":"1000","maxGapDurationMs":"1000","mockLocationObserved":false},"routeBackupChoice":"LOCAL_ONLY"}'::jsonb; parsed jsonb; bad jsonb; k text;
begin
 parsed := walk_private.parse_finish_v1(p);
 perform pg_temp.walk_assert(parsed->>'digest'='dc77b2bc30280200bf5da43babce17b37134a090ec8f87c2e4c64dd72918b6fd','golden_local');
 perform pg_temp.walk_assert(octet_length(parsed->>'canonical')=696,'golden_bytes');
 perform pg_temp.walk_assert(walk_private.parse_finish_v1(jsonb_set(p,'{routeBackupChoice}','"PRIVATE_BACKUP"'))->>'digest'
 = 'a3dffb3d91caffafa61bed56ba761aec48698a67ef3acfd1821971ffdd4b93c1','golden_private');
 perform pg_temp.walk_assert(walk_private.parse_finish_v1(p||'{"startedAt":"2026-10-13T09:00:00+09:00","endedAt":"2026-10-13T09:32:00+09:00","measuredDistanceM":"002430"}')->>'digest'=parsed->>'digest','normalization');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"latitude":0}'),'WALK_INVALID_PAYLOAD');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"routeBackupChoice":null}'),'WALK_INVALID_PAYLOAD');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"startedAt":"2026-10-13T00:00:00+24:00"}'),'WALK_INVALID_TIMESTAMP_ORDER');
 perform pg_temp.walk_assert(walk_private.iso_v1(walk_private.timestamp_v1('2026-10-13T23:59:00+23:59'))='2026-10-13T00:00:00.000Z','js_offset_2359');
 perform pg_temp.walk_assert(walk_private.iso_v1(walk_private.timestamp_v1('0100-01-01T00:00:00+23:59'))='0099-12-31T00:01:00.000Z','js_offset_year_boundary');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"payloadVersion":2}'),'WALK_UNSUPPORTED_PAYLOAD_VERSION');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"algorithmVersion":2}'),'WALK_UNSUPPORTED_ALGORITHM_VERSION');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"startedAt":"2026-02-30T00:00:00Z"}'),'WALK_INVALID_TIMESTAMP_ORDER');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"measuredDistanceM":"9223372036854775808"}'),'WALK_INTEGER_OUT_OF_RANGE');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',p||'{"activeDurationMs":"1920001"}'),'WALK_INVALID_DURATION');
 foreach k in array array['acceptedFixCount','segmentCount','totalFixCount'] loop
   bad := jsonb_set(p,array['qualitySummary',k],'2147483648');
   perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',bad),'WALK_INVALID_QUALITY_SUMMARY');
 end loop;
 bad := jsonb_set(p,'{qualitySummary,gpsGapDurationMs}','"1920001"');
 perform pg_temp.walk_expect(format('select walk_private.parse_finish_v1(%L::jsonb)',bad),'WALK_INVALID_QUALITY_SUMMARY');
end $vectors$;

-- The real app roles execute public RPCs and direct SELECT; no service-role QA.
select set_config('request.jwt.claim.sub',(select id::text from nuri_walk_test_scope where label='owner'),true);
select set_config('nuri.walk.test_digest',walk_private.parse_finish_v1(pg_temp.walk_payload(
 (select id from nuri_walk_test_scope where label='session'),
 (select id from nuri_walk_test_scope where label='pet')))->>'digest',true);
set local role authenticated;
do $owner$
declare u uuid; pet uuid; pet2 uuid; otherpet uuid; s uuid; p jsonb; r jsonb; replay jsonb;
begin
 select id into pet from nuri_walk_test_scope where label='pet';
 select id into pet2 from nuri_walk_test_scope where label='pet2';
 select id into otherpet from nuri_walk_test_scope where label='otherpet';
 select id into s from nuri_walk_test_scope where label='session';
 perform pg_temp.walk_expect(format('select public.start_walk_v1(%L,%L)',gen_random_uuid(),otherpet),'WALK_OWNER_MISMATCH');
 r := public.start_walk_v1(s,pet);
 perform pg_temp.walk_assert(r->>'state'='ACTIVE','reservation');
 perform pg_temp.walk_assert(public.start_walk_v1(s,pet)=r,'reservation_replay');
 perform pg_temp.walk_expect(format('select public.start_walk_v1(%L,%L)',gen_random_uuid(),pet2),'WALK_ALREADY_ACTIVE');
 perform pg_temp.walk_expect(format('select public.start_walk_v1(%L,%L)',s,pet2),'WALK_PAYLOAD_CONFLICT');
 perform pg_temp.walk_expect('insert into public.walk_sessions(user_id,pet_id,client_session_id,state) values (auth.uid(),gen_random_uuid(),gen_random_uuid(),''ACTIVE'')','42501');
 perform pg_temp.walk_expect('update public.walk_sessions set pet_id=gen_random_uuid()','42501');
 perform pg_temp.walk_expect('delete from public.walk_sessions','42501');
 perform pg_temp.walk_expect('select walk_private.parse_finish_v1(''{}'')','42501');
 p := pg_temp.walk_payload(s,pet);
 -- Public digest is pinned by an exact canonical string created outside role.
 r := public.finish_walk_v1(p,current_setting('nuri.walk.test_digest'));
 perform pg_temp.walk_assert(r->>'state'='ACCEPTED_SERVER','finish');
 perform pg_temp.walk_assert(r->'summary'->>'acceptedDistanceM'='2430','distance_exact_string');
 replay := public.finish_walk_v1(p,current_setting('nuri.walk.test_digest'));
 perform pg_temp.walk_assert(replay=r,'finish_replay');
 perform pg_temp.walk_expect(format('select public.finish_walk_v1(%L::jsonb,%L)',p||'{"measuredDistanceM":"2431"}',current_setting('nuri.walk.test_digest')),'WALK_PAYLOAD_CONFLICT');
 perform pg_temp.walk_assert(public.get_walk_sessions_v1(array[s])->0=r,'complete_reconcile');
end $owner$;
reset role;

-- Digest computation is test setup only, never granted as a client helper.
select set_config('nuri.walk.test_digest',walk_private.parse_finish_v1(pg_temp.walk_payload(
 (select id from nuri_walk_test_scope where label='session2'),
 (select id from nuri_walk_test_scope where label='pet2')))->>'digest',true);
set local role authenticated;
do $overlap$
declare s uuid; pet uuid; r jsonb;
begin
 select id into s from nuri_walk_test_scope where label='session2';
 select id into pet from nuri_walk_test_scope where label='pet2';
 perform public.start_walk_v1(s,pet);
 r := public.finish_walk_v1(pg_temp.walk_payload(s,pet),current_setting('nuri.walk.test_digest'));
 perform pg_temp.walk_assert(r->>'state'='REJECTED_SERVER' and r->>'rejectionCode'='WALK_OVERLAP_CONFLICT','cross_pet_overlap');
 perform pg_temp.walk_assert(public.finish_walk_v1(pg_temp.walk_payload(s,pet),current_setting('nuri.walk.test_digest'))=r,'rejection_replay');
end $overlap$;
reset role;

do $quality$
declare pet uuid; s uuid := gen_random_uuid(); p jsonb; r jsonb; i integer; base timestamp := '2026-10-14T00:00:00';
begin
 select id into pet from nuri_walk_test_scope where label='pet';
 p := pg_temp.walk_payload(s,pet,'2026-10-13T00:32:00Z','2026-10-13T01:04:00Z');
 p := jsonb_set(p,'{qualitySummary,mockLocationObserved}','true');
 perform public.start_walk_v1(s,pet); r := pg_temp.walk_finish(p);
 perform pg_temp.walk_assert(r->>'state'='ACCEPTED_SERVER' and r->'summary'->>'acceptedDistanceM'='0'
   and r->'summary'->>'eligibility'='PROGRESSION_INELIGIBLE_QUALITY','mock_accepted_ineligible_touching_edge');
 p := pg_temp.walk_payload(gen_random_uuid(),pet,'2026-10-13T00:33:00Z','2026-10-13T01:05:00Z');
 perform public.start_walk_v1((p->>'clientSessionId')::uuid,pet); r := pg_temp.walk_finish(p);
 perform pg_temp.walk_assert(r->>'rejectionCode'='WALK_OVERLAP_CONFLICT','ineligible_participates_overlap');
 -- Never accept arbitrary standalone distance or production-intent-free QA.
 perform pg_temp.walk_expect(format('select public.finish_walk_v1(%L::jsonb,%L)',
   pg_temp.walk_payload(gen_random_uuid(),pet),'invalid'),'WALK_PAYLOAD_CONFLICT');
 for i in 1..8 loop
   p := pg_temp.walk_payload(gen_random_uuid(),pet,
     walk_private.iso_v1((base + i*interval '1 hour') at time zone 'UTC'),
     walk_private.iso_v1((base + i*interval '1 hour' + interval '32 minutes') at time zone 'UTC'));
   case i
     when 1 then p := jsonb_set(p,'{activeDurationMs}','"1"');
     when 2 then p := jsonb_set(jsonb_set(jsonb_set(p,'{qualitySummary,acceptedFixCount}','2'),'{qualitySummary,totalFixCount}','7'),'{qualitySummary,segmentCount}','1');
     when 3 then p := jsonb_set(p,'{measuredDistanceM}','"9223372036854775807"');
     when 4 then p := jsonb_set(p,'{measuredDistanceM}','"49"');
     when 5 then p := jsonb_set(p,'{qualitySummary,gpsGapDurationMs}','"600001"');
     when 6 then p := jsonb_set(jsonb_set(p,'{qualitySummary,maxGapDurationMs}','"120001"'),'{qualitySummary,gpsGapDurationMs}','"120001"');
     when 7 then p := jsonb_set(p,'{qualitySummary,totalFixCount}','200001');
     when 8 then p := jsonb_set(jsonb_set(jsonb_set(p,'{qualitySummary,rejectedAccuracyCount}','30'),'{qualitySummary,totalFixCount}','50'),'{qualitySummary,stationarySuppressedCount}','1');
   end case;
   perform public.start_walk_v1((p->>'clientSessionId')::uuid,pet);
   r := pg_temp.walk_finish(p);
   perform pg_temp.walk_assert(r->>'state'='ACCEPTED_SERVER' and r->'summary'->>'acceptedDistanceM'='0'
     and r->'summary'->>'eligibility'='PROGRESSION_INELIGIBLE_QUALITY','adversarial_ineligible_'||i::text);
 end loop;
end $quality$;

select set_config('request.jwt.claim.sub',(select id::text from nuri_walk_test_scope where label='other'),true);
set local role authenticated;
do $isolation$
declare s uuid; pet uuid;
begin
 select id into s from nuri_walk_test_scope where label='session';
 select id into pet from nuri_walk_test_scope where label='pet';
 perform pg_temp.walk_assert((select count(*)=0 from public.walk_sessions),'rls_owner_isolation');
 perform pg_temp.walk_assert(public.get_walk_sessions_v1(array[s])->0->>'state'='NOT_FOUND','rpc_owner_isolation');
 perform pg_temp.walk_expect(format('select public.delete_walk_session_v1(%L,%L)',s,pet),'WALK_OWNER_MISMATCH');
end $isolation$;
reset role;
set local role anon;
do $anon$
begin
 perform pg_temp.walk_expect('select count(*) from public.walk_sessions','42501');
 perform pg_temp.walk_expect('select public.start_walk_v1(gen_random_uuid(),gen_random_uuid())','42501');
 perform pg_temp.walk_expect('select public.finish_walk_v1(''{}'','''')','42501');
end $anon$;
reset role;

select set_config('request.jwt.claim.sub',(select id::text from nuri_walk_test_scope where label='owner'),true);
do $delete_cancel$
declare pet uuid; s uuid; cancelled uuid:=gen_random_uuid(); p jsonb; r jsonb; n integer;
begin
 select id into pet from nuri_walk_test_scope where label='pet';
 select id into s from nuri_walk_test_scope where label='session';
 r := public.delete_walk_route_v1(s,pet);
 perform pg_temp.walk_assert(r->'summary'->>'acceptedDistanceM'='2430'
   and r->'summary'->>'routeRevision'='1','route_delete_distance_preserved');
 perform pg_temp.walk_assert(public.delete_walk_route_v1(s,pet)=r,'route_delete_idempotent');
 r := public.delete_walk_session_v1(s,pet);
 perform pg_temp.walk_assert(r->>'state'='DELETED' and r->'summary'='null'::jsonb,'minimal_tombstone');
 perform pg_temp.walk_expect(format('select pg_temp.walk_finish(%L::jsonb)',pg_temp.walk_payload(s,pet)),'WALK_SESSION_DELETED');
 r := public.cancel_walk_v1(cancelled,pet);
 perform pg_temp.walk_assert(r->>'state'='NOT_ACCEPTED_FINAL','durable_cancel_missing');
 perform pg_temp.walk_assert(public.cancel_walk_v1(cancelled,pet)=r,'cancel_replay');
 perform pg_temp.walk_expect(format('select pg_temp.walk_finish(%L::jsonb)',pg_temp.walk_payload(cancelled,pet)),'WALK_SESSION_DELETED');
 perform pg_temp.walk_assert(not exists(select 1 from public.walk_sessions
   where state='DELETED' and (quality_summary is not null or measured_distance_m is not null or started_at is not null)),'measurement_erasure');
 -- Account/pet final cascade is tested only on these owned rollback fixtures.
 delete from public.pets where id=pet;
 perform pg_temp.walk_assert(not exists(select 1 from public.walk_sessions where pet_id=pet),'pet_final_cascade');
 delete from auth.users where id=(select id from nuri_walk_test_scope where label='owner');
 perform pg_temp.walk_assert(not exists(select 1 from public.walk_sessions where user_id=auth.uid()),'account_final_cascade');
end $delete_cancel$;
select 'PHASE4_SQL_CONTRACT_PASS' as result;

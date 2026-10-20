-- Standalone correction regression; BEGIN/ROLLBACK owned by runner.
create temporary table nuri_walk_guard_fixture(owner_id uuid,pet_id uuid,session_id uuid) on commit drop;
insert into nuri_walk_guard_fixture values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
insert into auth.users(id,raw_user_meta_data)
select owner_id,jsonb_build_object('nickname','w'||left(replace(owner_id::text,'-',''),8)) from nuri_walk_guard_fixture;
insert into public.pets(id,user_id,name) select pet_id,owner_id,'Walk guard rollback fixture' from nuri_walk_guard_fixture;
grant select on nuri_walk_guard_fixture to authenticated;
select set_config('request.jwt.claim.sub',(select owner_id::text from nuri_walk_guard_fixture),true);
do $feasibility$
declare p jsonb; r jsonb; f record; begin
select * into f from nuri_walk_guard_fixture;
p := '{"payloadVersion":1,"clientSessionId":"11111111-1111-4111-8111-111111111111","petId":"22222222-2222-4222-8222-222222222222","startedAt":"2026-10-16T00:00:00.000Z","endedAt":"2026-10-16T00:32:00.000Z","measuredDurationMs":"1920000","activeDurationMs":"60000","measuredDistanceM":"10000000","algorithmVersion":1,"qualitySchemaVersion":1,"qualitySummary":{"schemaVersion":1,"totalFixCount":20,"acceptedFixCount":15,"rejectedAccuracyCount":1,"rejectedTimestampCount":1,"rejectedDuplicateCount":1,"rejectedJumpCount":1,"rejectedSpeedCount":0,"stationarySuppressedCount":1,"segmentCount":1,"gpsGapDurationMs":"1000","maxGapDurationMs":"1000","mockLocationObserved":false},"routeBackupChoice":"LOCAL_ONLY"}'::jsonb;
p:=p||jsonb_build_object('clientSessionId',f.session_id,'petId',f.pet_id);
perform public.start_walk_v1(f.session_id,f.pet_id);
r:=public.finish_walk_v1(p,walk_private.parse_finish_v1(p)->>'digest');
if r->>'state'<>'ACCEPTED_SERVER' or r->'summary'->>'acceptedDistanceM'<>'0' then
 raise exception 'WALK_IMPOSSIBLE_DISTANCE_NOT_SUPPRESSED';end if;
end $feasibility$;
update auth.users set banned_until='infinity' where id=(select owner_id from nuri_walk_guard_fixture);
set local role authenticated;
do $banned$
declare detail text;
begin
if (select count(*) from public.walk_sessions)<>0 then raise exception 'WALK_BANNED_DIRECT_READ_LEAK';end if;
begin perform public.get_walk_sessions_v1(array[(select session_id from nuri_walk_guard_fixture)]);
 raise exception 'WALK_BANNED_RPC_NOT_DENIED';
exception when insufficient_privilege then
 get stacked diagnostics detail=pg_exception_detail;
 if detail::jsonb->>'walkCode' <> 'WALK_OWNER_MISMATCH' then raise;end if;
end;
end $banned$;
reset role;
update auth.users set banned_until=null where id=(select owner_id from nuri_walk_guard_fixture);
insert into public.account_deletion_requests(user_id,status) select owner_id,'pending_grace_period' from nuri_walk_guard_fixture;
set local role authenticated;
do $pending$
declare detail text;
begin
if (select count(*) from public.walk_sessions)<>0 then raise exception 'WALK_PENDING_DELETE_DIRECT_READ_LEAK';end if;
begin perform public.get_walk_sessions_v1(array[(select session_id from nuri_walk_guard_fixture)]);
 raise exception 'WALK_PENDING_DELETE_RPC_NOT_DENIED';
exception when insufficient_privilege then
 get stacked diagnostics detail=pg_exception_detail;
 if detail::jsonb->>'walkCode' <> 'WALK_OWNER_MISMATCH' then raise;end if;
end;
end $pending$;
reset role;
select 'PHASE4_FEASIBILITY_READ_GUARD_PASS' as result;

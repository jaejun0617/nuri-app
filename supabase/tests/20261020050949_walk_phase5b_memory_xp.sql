-- Owned synthetic fixtures only. Runner MUST enclose in BEGIN/ROLLBACK.
set local lock_timeout='2s';
create temporary table walk_d_scope(label text primary key,id uuid not null) on commit drop;
insert into walk_d_scope select v,gen_random_uuid() from unnest(array[
 'owner','other','pet','pet2','foreign_pet','s1','s2','s3','s4','sz','m1','m2','m3','m4','mz','manual','failed',
 'p1','p2','old','pending','deleted','midnight','midnight_memory','rejected','missing_qa']) v;
insert into auth.users(id,raw_user_meta_data) select id,jsonb_build_object('nickname','d'||left(replace(id::text,'-',''),9))
 from walk_d_scope where label in ('owner','other');
insert into public.pets(id,user_id,name) select p.id,u.id,'Walk D rollback fixture' from walk_d_scope p cross join walk_d_scope u
 where(p.label in ('pet','pet2') and u.label='owner')or(p.label='foreign_pet' and u.label='other');
grant select on walk_d_scope to authenticated,anon;
create function pg_temp.d_id(label text) returns uuid language sql stable as $$select id from walk_d_scope where walk_d_scope.label=$1$$;
create function pg_temp.d_assert(v boolean,label text) returns void language plpgsql as $$
begin if v is distinct from true then raise exception 'WALK_D_ASSERT:%',label;end if;end $$;
create function pg_temp.d_expect(sql text,expected text) returns void language plpgsql as $$
declare detail text;
begin begin execute sql;exception when others then
 if sqlstate=expected or sqlerrm=expected then return;end if;
 get stacked diagnostics detail=pg_exception_detail;
 if nullif(detail,'') is not null and detail::jsonb->>'walkCode'=expected then return;end if;
 raise exception 'WALK_D_WRONG_ERROR:%:%',expected,sqlstate;
 end;raise exception 'WALK_D_MISSING_ERROR:%',expected;end $$;
create function pg_temp.d_finish(sid uuid,pet uuid,day integer,ineligible boolean default false,shift_minutes integer default 0) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;
begin
 p:=jsonb_build_object('payloadVersion',1,'clientSessionId',sid,'petId',pet,
 'startedAt',walk_private.iso_v1(format('2026-10-%sT14:30:00.000Z',lpad(day::text,2,'0'))::timestamptz+make_interval(mins=>shift_minutes)),
 'endedAt',walk_private.iso_v1(format('2026-10-%sT15:30:00.000Z',lpad(day::text,2,'0'))::timestamptz+make_interval(mins=>shift_minutes)),
 'measuredDurationMs','3600000','activeDurationMs','3600000','measuredDistanceM','6000',
 'algorithmVersion',1,'qualitySchemaVersion',1,'routeBackupChoice','LOCAL_ONLY',
 'qualitySummary',jsonb_build_object('schemaVersion',1,'totalFixCount',20,'acceptedFixCount',15,
 'rejectedAccuracyCount',1,'rejectedTimestampCount',1,'rejectedDuplicateCount',1,'rejectedJumpCount',1,
 'rejectedSpeedCount',0,'stationarySuppressedCount',1,'segmentCount',1,
 'gpsGapDurationMs','0','maxGapDurationMs','0','mockLocationObserved',ineligible));
 perform public.start_walk_v1(sid,pet);
 perform public.finish_walk_v1(p,walk_private.parse_finish_v1(p)->>'digest');
end $$;
create function pg_temp.d_create(s text,p text,m text) returns jsonb language sql as $$
 select public.create_walk_memory_from_session_v1(pg_temp.d_id(s),pg_temp.d_id(p),pg_temp.d_id(m),gen_random_uuid(),
 '{"title":"Walk D record","content":"synthetic rollback","tags":["산책"]}'::jsonb)
$$;

select set_config('request.jwt.claim.sub',pg_temp.d_id('owner')::text,true);
select pg_temp.d_finish(pg_temp.d_id('s1'),pg_temp.d_id('pet'),1);
select pg_temp.d_finish(pg_temp.d_id('s2'),pg_temp.d_id('pet'),2,true);
select pg_temp.d_finish(pg_temp.d_id('s3'),pg_temp.d_id('pet2'),3);
select pg_temp.d_finish(pg_temp.d_id('s4'),pg_temp.d_id('pet'),4);
select pg_temp.d_assert(not exists(select 1 from public.memories where user_id=pg_temp.d_id('owner'))
 and not exists(select 1 from public.user_xp_ledger where user_id=pg_temp.d_id('owner')),'finish_no_memory_or_xp');
-- Existing verified streak days, synthetic only. Production policies unchanged.
insert into public.memories(id,user_id,pet_id,title,category,created_at,occurred_at)
 select gen_random_uuid(),pg_temp.d_id('owner'),pg_temp.d_id('pet2'),'Walk D prior streak','walk',
 (public.nuri_kst_today_v1()-d)::timestamp at time zone 'Asia/Seoul',public.nuri_kst_today_v1()-d from generate_series(1,2)d;
insert into public.pet_daily_activities(user_id,pet_id,activity_date_kst,source_type,source_id)
 select user_id,pet_id,(created_at at time zone 'Asia/Seoul')::date,'timeline_walk_post',id::text from public.memories
 where user_id=pg_temp.d_id('owner') and pet_id=pg_temp.d_id('pet2');
set local role authenticated;
do $positive$
declare r jsonb;r2 jsonb;p jsonb;
begin
 r:=pg_temp.d_create('s1','pet','m1');
 perform pg_temp.d_assert(r->'reward'->>'xp_awarded'='39' and r->>'replayed'='false','positive39');
 perform pg_temp.d_assert(r->'record'->'claim'->>'settlementOutcome'='XP_AWARDED'
  and r->'record'->'claim'->>'xpLedgerReference' is not null,'positive_ledger');
 perform pg_temp.d_assert(r->'record'->'memory'->>'occurredAt'='2026-10-01','start_kst_date_overnight');
 perform pg_temp.d_assert(r->'record'->'claim'->>'activityDateKst'=(now() at time zone 'Asia/Seoul')::date::text,'save_day_xp');
 r2:=public.create_walk_memory_from_session_v1(pg_temp.d_id('s1'),pg_temp.d_id('pet'),gen_random_uuid(),gen_random_uuid(),'{}');
 perform pg_temp.d_assert(r2->>'replayed'='true' and r2->'record'->'claim'=r->'record'->'claim'
  and r2->'reward'='null'::jsonb and r2->'activity'='null'::jsonb,'replay_original_no_celebration');
 r:=pg_temp.d_create('s2','pet','m2');
 perform pg_temp.d_assert(r->'reward'->>'xp_awarded'='39' and r->'record'->'summary'->>'acceptedDistanceM'='0','ineligible_normal_record_xp');
 perform pg_temp.d_assert(public.get_pet_walk_progression_v1(pg_temp.d_id('pet'))->>'lifetimeDistanceM'='12000','memory_does_not_add_progression');
 p:=public.get_walk_record_history_v1(pg_temp.d_id('pet'),1,null);
 perform pg_temp.d_assert(jsonb_array_length(p->'items')=1 and (p->>'hasMore')::boolean and p->'nextCursor' is not null,'history_limit_plus_one');
 r:=public.get_walk_record_history_v1(pg_temp.d_id('pet'),1,p->'nextCursor');
 perform pg_temp.d_assert(jsonb_array_length(r->'items')=1,'history_no_microsecond_gap');
 perform pg_temp.d_assert(r->'items'->0->>'clientSessionId' is distinct from p->'items'->0->>'clientSessionId','history_no_duplicate');
 perform pg_temp.d_expect(format('select public.get_walk_record_history_v1(%L,2,%L)',pg_temp.d_id('pet'),p->'nextCursor'),'WALK_RECORD_CURSOR_INVALID');
 perform pg_temp.d_assert(jsonb_array_length(public.get_walk_memory_summaries_v1(array[pg_temp.d_id('m1'),pg_temp.d_id('m2')])->'items')=2,'batch_projection');
 perform pg_temp.d_assert(not (public.get_walk_memory_summaries_v1(array[pg_temp.d_id('m1')])->'items'->0 ?| array['memory','claim','content','title','imagePath','imagePaths','xpLedgerReference','route','quality','credential']),'batch_no_body_photo_audit_route');
 perform pg_temp.d_expect(format('update public.memories set pet_id=%L where id=%L',pg_temp.d_id('pet2'),pg_temp.d_id('m1')),'WALK_LINKED_RECORD_IMMUTABLE');
 perform pg_temp.d_expect(format('update public.memories set category=''daily'' where id=%L',pg_temp.d_id('m1')),'WALK_LINKED_RECORD_IMMUTABLE');
 perform pg_temp.d_expect(format('update public.memories set occurred_at=current_date where id=%L',pg_temp.d_id('m1')),'WALK_LINKED_RECORD_IMMUTABLE');
 update public.memories set title='Walk D edited',content='permitted edit',emotion=null,tags=array['산책','수정'],
  category='walk',sub_category=null,price=null,metadata='{}',occurred_at=occurred_at where id=pg_temp.d_id('m1');
 perform pg_temp.d_assert((select title='Walk D edited' from public.memories where id=pg_temp.d_id('m1')),'editable_body');
 perform pg_temp.d_expect('insert into public.walk_record_claims default values','42501');
 perform pg_temp.d_expect('delete from public.walk_record_claims','42501');
 perform pg_temp.d_expect('update public.walk_record_claims set request_id=gen_random_uuid()','42501');
 perform pg_temp.d_expect('insert into public.walk_record_prompt_dismissals default values','42501');
 perform pg_temp.d_expect('update public.walk_record_prompt_dismissals set dismissed_at=now()','42501');
end $positive$;
reset role;

-- Real failure injected only for one synthetic source inside this rollback.
create function pg_temp.d_inject_reward_failure() returns trigger language plpgsql as $$
begin if new.source_id=pg_temp.d_id('failed')::text then raise exception 'D_INJECTED_REWARD_FAILURE' using errcode='XX000';end if;return new;end $$;
create trigger walk_d_owned_failure before insert on public.user_xp_ledger for each row execute function pg_temp.d_inject_reward_failure();
create temporary table walk_d_before as select
 (select count(*) from public.user_xp_ledger where user_id=pg_temp.d_id('owner')) ledger,
 (select count(*) from public.pet_daily_activities where user_id=pg_temp.d_id('owner')) daily,
 (select coalesce(jsonb_agg(to_jsonb(t) order by pet_id),'[]') from public.pet_streak_summaries t where user_id=pg_temp.d_id('owner')) streak,
 (select coalesce(jsonb_agg(to_jsonb(t) order by user_id),'[]') from public.user_level_summaries t where user_id=pg_temp.d_id('owner')) summary,
 (select coalesce(jsonb_agg(to_jsonb(t) order by title_key),'[]') from public.user_titles t where user_id=pg_temp.d_id('owner')) titles;
grant select on walk_d_before to authenticated;
set local role authenticated;
do $failure$
begin
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',
 pg_temp.d_id('s3'),pg_temp.d_id('pet2'),pg_temp.d_id('failed'),gen_random_uuid(),'{"title":"failure"}'),'WALK_REWARD_SETTLEMENT_FAILED');
 perform pg_temp.d_assert(not exists(select 1 from public.memories where id=pg_temp.d_id('failed')),'rollback_memory');
 perform pg_temp.d_assert(not exists(select 1 from public.walk_record_claims where original_memory_id=pg_temp.d_id('failed')),'rollback_claim');
 perform pg_temp.d_assert((select count(*) from public.user_xp_ledger where user_id=pg_temp.d_id('owner'))=(select ledger from walk_d_before),'rollback_primary_and_internal_bonus');
 perform pg_temp.d_assert((select count(*) from public.pet_daily_activities where user_id=pg_temp.d_id('owner'))=(select daily from walk_d_before),'rollback_daily');
 perform pg_temp.d_assert((select coalesce(jsonb_agg(to_jsonb(t) order by pet_id),'[]') from public.pet_streak_summaries t where user_id=pg_temp.d_id('owner'))=(select streak from walk_d_before),'rollback_streak');
 perform pg_temp.d_assert((select coalesce(jsonb_agg(to_jsonb(t) order by user_id),'[]') from public.user_level_summaries t where user_id=pg_temp.d_id('owner'))=(select summary from walk_d_before),'rollback_xp_summary');
 perform pg_temp.d_assert((select coalesce(jsonb_agg(to_jsonb(t) order by title_key),'[]') from public.user_titles t where user_id=pg_temp.d_id('owner'))=(select titles from walk_d_before),'rollback_titles');
end $failure$;
reset role;
drop trigger walk_d_owned_failure on public.user_xp_ledger;
set local role authenticated;
do $bonus_partial$
declare r jsonb;
begin
 r:=pg_temp.d_create('s3','pet2','m3');
 perform pg_temp.d_assert(r->'reward'->>'xp_awarded'='39','primary39_after_failure_retry');
 perform pg_temp.d_assert((select count(*)=1 from public.user_xp_ledger where user_id=pg_temp.d_id('owner') and event_type='streak_3_bonus'),'internal_bonus_exact_once');
 r:=pg_temp.d_create('s4','pet','m4');
 perform pg_temp.d_assert(r->'reward'->>'xp_awarded'='33','remaining_account_budget_partial33');
end $bonus_partial$;
reset role;
-- Synthetic boundary setup: no global XP rule/function changes.
select set_config('request.jwt.claim.sub',pg_temp.d_id('other')::text,true);
select pg_temp.d_finish(pg_temp.d_id('sz'),pg_temp.d_id('foreign_pet'),5);
insert into public.user_xp_ledger(user_id,pet_id,event_type,source_type,source_id,xp,activity_date_kst)
 values(pg_temp.d_id('other'),pg_temp.d_id('foreign_pet'),'timeline_post','d_budget_fixture','owned-synthetic',150,public.nuri_kst_today_v1());
set local role authenticated;
do $zero$
declare r jsonb;
begin
 r:=pg_temp.d_create('sz','foreign_pet','mz');
 perform pg_temp.d_assert(r->'reward'->>'xp_awarded'='0' and r->'record'->'claim'->>'settlementOutcome'='ZERO_XP_VALID'
 and r->'record'->'claim'->'xpLedgerReference'='null'::jsonb,'normal_zero_commits_without_ledger');
end $zero$;
reset role;
delete from public.user_xp_ledger where user_id=pg_temp.d_id('other') and source_type='d_budget_fixture';
set local role authenticated;
do $fence$
declare x record;
begin
 select * into strict x from public.award_user_activity_xp_v1(pg_temp.d_id('foreign_pet'),'walk_timeline_post','timeline_memory',pg_temp.d_id('mz')::text);
 perform pg_temp.d_assert(not x.awarded and x.xp_awarded=0,'legacy_zero_fence_after_budget_frees');
 perform pg_temp.d_assert(not exists(select 1 from public.user_xp_ledger where user_id=pg_temp.d_id('other')),'zero_never_reawarded');
 delete from public.memories where id=pg_temp.d_id('mz');
 perform pg_temp.d_assert(public.get_walk_record_v1(pg_temp.d_id('sz'),pg_temp.d_id('foreign_pet'))->>'recordState'='RECORD_DELETED','memory_delete_state');
 perform pg_temp.d_assert(exists(select 1 from public.walk_record_claims where original_memory_id=pg_temp.d_id('mz')),'deleted_memory_claim_retained');
 perform pg_temp.d_expect(format('insert into public.memories(id,pet_id,title,category) values(%L,%L,''reinsert'',''walk'')',pg_temp.d_id('mz'),pg_temp.d_id('foreign_pet')),'WALK_RECORD_RECREATE_FORBIDDEN');
 insert into public.memories(id,pet_id,title,category) values(pg_temp.d_id('manual'),pg_temp.d_id('foreign_pet'),'manual preserved','walk');
 perform pg_temp.d_expect(format('update public.memories set id=%L where id=%L',pg_temp.d_id('mz'),pg_temp.d_id('manual')),'WALK_RECORD_RECREATE_FORBIDDEN');
 select * into strict x from public.award_user_activity_xp_v1(pg_temp.d_id('foreign_pet'),'walk_timeline_post','timeline_memory',pg_temp.d_id('manual')::text);
 perform pg_temp.d_assert(x.awarded and x.xp_awarded=39,'manual_path_preserved');
 perform pg_temp.d_assert((select count(*)=0 from public.walk_record_claims where user_id=pg_temp.d_id('owner')),'foreign_claim_rls');
end $fence$;
reset role;
select set_config('request.jwt.claim.sub',pg_temp.d_id('owner')::text,true);
set local role authenticated;
do $deletion_prompt$
declare r jsonb;
begin
 -- Claimed session deletion preserves Memory/claim/reward, but create stays denied.
 perform public.delete_walk_session_v1(pg_temp.d_id('s1'),pg_temp.d_id('pet'));
 r:=public.get_walk_record_v1(pg_temp.d_id('s1'),pg_temp.d_id('pet'));
 perform pg_temp.d_assert(r->>'recordState'='RECORDED' and r->>'sessionDeleted'='true'
  and r->'summary'='null'::jsonb and r->'memory'->>'content'='permitted edit','deleted_session_erases_measurement_retains_memory');
 perform pg_temp.d_assert(public.get_walk_memory_summaries_v1(array[pg_temp.d_id('m1')])->'items'->0->'summary'='null'::jsonb,'batch_deleted_session_no_measurements');
 perform pg_temp.d_assert(public.get_pet_walk_progression_v1(pg_temp.d_id('pet'))->>'lifetimeDistanceM'='6000','deleted_session_recalculates_c');
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',
  pg_temp.d_id('s1'),pg_temp.d_id('pet'),gen_random_uuid(),gen_random_uuid(),'{}'),'WALK_SESSION_DELETED');
 perform pg_temp.d_assert(public.get_walk_record_prompt_v1(pg_temp.d_id('pet'))->'item'='null'::jsonb,'all_claimed_no_prompt');
end $deletion_prompt$;
reset role;
select pg_temp.d_finish(pg_temp.d_id('p1'),pg_temp.d_id('pet2'),6,true);
select pg_temp.d_finish(pg_temp.d_id('p2'),pg_temp.d_id('pet2'),7);
select pg_temp.d_finish(pg_temp.d_id('old'),pg_temp.d_id('pet2'),8);
select pg_temp.d_finish(pg_temp.d_id('deleted'),pg_temp.d_id('pet2'),9);
select pg_temp.d_finish(pg_temp.d_id('midnight'),pg_temp.d_id('pet2'),10,false,30);
select pg_temp.d_finish(pg_temp.d_id('rejected'),pg_temp.d_id('pet2'),7);
update public.walk_sessions set accepted_at=now()-interval '2 minutes' where client_session_id=pg_temp.d_id('p1');
update public.walk_sessions set accepted_at=now()-interval '1 minute' where client_session_id=pg_temp.d_id('p2');
update public.walk_sessions set accepted_at=now()-interval '8 days' where client_session_id=pg_temp.d_id('old');
set local role authenticated;
do $prompt_history_inputs$
declare r jsonb;bad jsonb;cur jsonb;sid text;seen text[]:=array[]::text[];
begin
 r:=pg_temp.d_create('midnight','pet2','midnight_memory');
 perform pg_temp.d_assert(r->'record'->'memory'->>'occurredAt'='2026-10-11','exact_kst_midnight_start');
 perform public.delete_walk_session_v1(pg_temp.d_id('deleted'),pg_temp.d_id('pet2'));
 perform public.start_walk_v1(pg_temp.d_id('pending'),pg_temp.d_id('pet2'));
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('pending'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),'{"title":"pending"}'),'WALK_SESSION_REJECTED');
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('deleted'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),'{"title":"deleted"}'),'WALK_SESSION_DELETED');
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('rejected'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),'{"title":"rejected"}'),'WALK_SESSION_REJECTED');
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('missing_qa'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),'{"title":"legacy no server acceptance"}'),'WALK_SESSION_REJECTED');
 perform pg_temp.d_assert(public.get_walk_record_prompt_v1(pg_temp.d_id('pet2'))->'item'->>'clientSessionId'=pg_temp.d_id('p2')::text,'newest_prompt');
 perform public.dismiss_walk_record_prompt_v1(pg_temp.d_id('p2'),pg_temp.d_id('pet2'));
 perform public.dismiss_walk_record_prompt_v1(pg_temp.d_id('p2'),pg_temp.d_id('pet2'));
 perform pg_temp.d_assert(public.get_walk_record_prompt_v1(pg_temp.d_id('pet2'))->'item'->>'clientSessionId'=pg_temp.d_id('p1')::text,'dismissal_then_next_ineligible_record_prompt');
 perform public.dismiss_walk_record_prompt_v1(pg_temp.d_id('p1'),pg_temp.d_id('pet2'));
 perform pg_temp.d_assert(public.get_walk_record_prompt_v1(pg_temp.d_id('pet2'))->'item'='null'::jsonb,'seven_day_and_claim_dismiss_filters');
 loop
  r:=public.get_walk_record_history_v1(pg_temp.d_id('pet2'),1,cur);
  if jsonb_array_length(r->'items')=0 then exit;end if;
  sid:=r->'items'->0->>'clientSessionId';
  perform pg_temp.d_assert(not(sid=any(seen)),'history_duplicate_zero');seen:=array_append(seen,sid);
  exit when not(r->>'hasMore')::boolean;
  cur:=r->'nextCursor';
 end loop;
 perform pg_temp.d_assert(cardinality(seen)=5 and pg_temp.d_id('old')::text=any(seen) and pg_temp.d_id('p2')::text=any(seen),'history_no_missing_dismissed_and_old_discoverable');
 r:=public.get_walk_record_history_v1(pg_temp.d_id('pet2'),1,null);cur:=r->'nextCursor';
 perform pg_temp.d_expect(format('select public.get_walk_record_history_v1(%L,1,%L)',pg_temp.d_id('pet'),cur),'WALK_RECORD_CURSOR_INVALID');
 perform pg_temp.d_expect(format('select public.get_walk_record_history_v1(%L,1,%L)',pg_temp.d_id('pet2'),cur||'{"version":99}'),'WALK_RECORD_CURSOR_INVALID');
 foreach bad in array array['[]'::jsonb,'{"title":"ok","userId":"spoof"}'::jsonb,'{"title":"ok","tags":[1]}'::jsonb,
  '{"title":"ok","metadata":{"walk":true}}'::jsonb,jsonb_build_object('title',repeat('x',101))] loop
  perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('p1'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),bad),'WALK_INVALID_RECORD_INPUT');
 end loop;
 perform pg_temp.d_expect(format('update public.memories set user_id=%L where id=%L',pg_temp.d_id('other'),pg_temp.d_id('m1')),'WALK_LINKED_RECORD_IMMUTABLE');
 perform pg_temp.d_expect(format('update public.memories set metadata=%L where id=%L','{"walk":true}',pg_temp.d_id('m1')),'WALK_LINKED_RECORD_IMMUTABLE');
 perform public.delete_walk_session_v1(pg_temp.d_id('p2'),pg_temp.d_id('pet2'));
 perform pg_temp.d_assert(not exists(select 1 from public.walk_record_prompt_dismissals where session_id=(select id from public.walk_sessions where client_session_id=pg_temp.d_id('p2'))),'session_delete_erases_dismissal_metadata');
 perform public.cancel_walk_v1(pg_temp.d_id('pending'),pg_temp.d_id('pet2'));
 perform pg_temp.d_expect(format('select public.create_walk_memory_from_session_v1(%L,%L,%L,%L,%L)',pg_temp.d_id('pending'),pg_temp.d_id('pet2'),gen_random_uuid(),gen_random_uuid(),'{"title":"cancelled"}'),'WALK_SESSION_DELETED');
end $prompt_history_inputs$;
reset role;
set local role anon;
do $anon$
begin
 perform pg_temp.d_expect('select count(*) from public.walk_record_claims','42501');
 perform pg_temp.d_expect('select public.get_walk_record_prompt_v1(gen_random_uuid())','42501');
end $anon$;
reset role;
-- Final owned pet/account cascades; existing XP pet SET NULL semantics stay.
delete from public.pets where id=pg_temp.d_id('pet2');
select pg_temp.d_assert(not exists(select 1 from public.walk_record_claims where pet_id=pg_temp.d_id('pet2')),'pet_claim_cascade');
select pg_temp.d_assert(exists(select 1 from public.user_xp_ledger where user_id=pg_temp.d_id('owner') and pet_id is null),'pet_xp_retained_set_null');
delete from auth.users where id in (pg_temp.d_id('owner'),pg_temp.d_id('other'));
select pg_temp.d_assert(not exists(select 1 from public.walk_record_claims where user_id in(pg_temp.d_id('owner'),pg_temp.d_id('other'))),'account_claim_cascade');
do $catalog$
declare sig text;p record;
begin
 foreach sig in array array['public.create_walk_memory_from_session_v1(uuid,uuid,uuid,uuid,jsonb)',
  'public.get_walk_record_v1(uuid,uuid)','public.get_walk_memory_summaries_v1(uuid[])',
  'public.get_walk_record_history_v1(uuid,integer,jsonb)','public.get_walk_record_prompt_v1(uuid)',
  'public.dismiss_walk_record_prompt_v1(uuid,uuid)'] loop
  select * into p from pg_proc where oid=sig::regprocedure;
  perform pg_temp.d_assert(p.prosecdef and p.proconfig @> array['search_path=public, pg_catalog']::text[],'rpc_definer_search_path');
  perform pg_temp.d_assert(has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute')
   and not has_function_privilege('service_role',p.oid,'execute') and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),'rpc_explicit_grants');
 end loop;
 perform pg_temp.d_assert((select bool_and(relrowsecurity) from pg_class where oid in('public.walk_record_claims'::regclass,'public.walk_record_prompt_dismissals'::regclass)),'new_rls_enabled');
 perform pg_temp.d_assert(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='walk_record_claims'
  and column_name in('record_summary','accepted_distance_m','started_at','ended_at','quality_summary','xp_awarded')),'no_duplicate_measurement_or_xp_ledger');
 perform pg_temp.d_assert(not exists(select 1 from pg_constraint where conrelid='public.walk_record_claims'::regclass and confrelid='public.memories'::regclass),'no_memory_cascade_erases_claim');
end $catalog$;
select 'PHASE5B_MEMORY_XP_SQL_PASS' as result;

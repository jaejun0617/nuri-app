-- Phase5B only. Memory/claim/daily/existing XP settle in one transaction.
create table public.walk_record_claims(
 session_id uuid primary key references public.walk_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 original_memory_id uuid not null unique,
 request_id uuid not null,
 claimed_at timestamptz not null default now(),
 settled_at timestamptz not null default now(),
 activity_date_kst date not null,
 settlement_outcome text not null check(settlement_outcome in ('XP_AWARDED','ZERO_XP_VALID','RECORD_CREATED_NO_XP_BY_POLICY')),
 xp_ledger_reference uuid references public.user_xp_ledger(id),
 check((settlement_outcome='XP_AWARDED')=(xp_ledger_reference is not null)),
 check(settled_at>=claimed_at)
);
create index walk_record_claims_owner_pet on public.walk_record_claims(user_id,pet_id);
create index walk_record_claims_pet on public.walk_record_claims(pet_id);
create index walk_record_claims_ledger on public.walk_record_claims(xp_ledger_reference) where xp_ledger_reference is not null;
create table public.walk_record_prompt_dismissals(
 session_id uuid primary key references public.walk_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 dismissed_at timestamptz not null default now()
);
create index walk_record_prompt_dismissals_owner_pet on public.walk_record_prompt_dismissals(user_id,pet_id);
create index walk_record_prompt_dismissals_pet on public.walk_record_prompt_dismissals(pet_id);
create index walk_sessions_record_history on public.walk_sessions(user_id,pet_id,accepted_at desc,client_session_id desc)
 where state='ACCEPTED_SERVER' and deleted_at is null;
alter table public.walk_record_claims enable row level security;
alter table public.walk_record_prompt_dismissals enable row level security;
revoke all on public.walk_record_claims,public.walk_record_prompt_dismissals from public,anon,authenticated,service_role;
grant select on public.walk_record_claims,public.walk_record_prompt_dismissals to authenticated;
create policy walk_record_claims_owner_read on public.walk_record_claims for select to authenticated
 using(user_id=(select auth.uid()) and (select walk_private.owner_readable_v1())
 and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=(select auth.uid())));
create policy walk_record_prompt_owner_read on public.walk_record_prompt_dismissals for select to authenticated
 using(user_id=(select auth.uid()) and (select walk_private.owner_readable_v1())
 and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=(select auth.uid())));

-- Soft deletion retains only the existing session tombstone/claim defense;
-- obsolete reminder preferences are erased in the same delete transaction.
create function walk_private.clear_deleted_walk_prompt_v1() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if new.deleted_at is not null and old.deleted_at is null then
  delete from public.walk_record_prompt_dismissals where session_id=new.id;
 end if;
 return new;
end $$;
create trigger walk_sessions_clear_record_prompt after update of deleted_at on public.walk_sessions
 for each row execute function walk_private.clear_deleted_walk_prompt_v1();

create function walk_private.record_fail_v1(code text) returns void language plpgsql
set search_path=pg_catalog as $$
begin
 raise exception using errcode=case when code='WALK_OWNER_MISMATCH' then '42501' else '22023' end,
 message='Walk record request could not be completed',
 detail=jsonb_build_object('walkErrorVersion',1,'walkCode',code)::text;
end $$;

create function walk_private.record_summary_v1(s public.walk_sessions) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select case when s.state='ACCEPTED_SERVER' and s.deleted_at is null then jsonb_build_object(
 'sessionId',s.id,'startedAt',walk_private.iso_v1(s.started_at),'endedAt',walk_private.iso_v1(s.ended_at),
 'measuredDurationMs',s.measured_duration_ms::text,'activeDurationMs',s.active_duration_ms::text,
 'measuredDistanceM',s.measured_distance_m::text,'acceptedDistanceM',s.accepted_distance_m::text,
 'eligibility',s.eligibility,'acceptedAt',walk_private.iso_v1(s.accepted_at)) else null end
$$;
create function walk_private.record_projection_v1(s public.walk_sessions,c public.walk_record_claims,m public.memories) returns jsonb
language sql stable set search_path=pg_catalog as $$
 select jsonb_build_object('version',1,'clientSessionId',s.client_session_id,'petId',s.pet_id,
 'source','GPS_TRACKED','sessionDeleted',s.deleted_at is not null,
 'recordState',case when c.session_id is not null then case when m.id is not null then 'RECORDED' else 'RECORD_DELETED' end
                   when s.state='ACCEPTED_SERVER' and s.deleted_at is null then 'RECORD_PENDING' else null end,
 'summary',walk_private.record_summary_v1(s),
 'claim',case when c.session_id is not null then jsonb_build_object('sessionId',c.session_id,
 'originalMemoryId',c.original_memory_id,'requestId',c.request_id,'claimedAt',walk_private.iso_v1(c.claimed_at),
 'settledAt',walk_private.iso_v1(c.settled_at),'activityDateKst',c.activity_date_kst,
 'settlementOutcome',c.settlement_outcome,'xpLedgerReference',c.xp_ledger_reference) else null end,
 'memory',case when m.id is not null then jsonb_build_object('id',m.id,'petId',m.pet_id,'title',m.title,
 'content',m.content,'emotion',m.emotion,'tags',m.tags,'category',m.category,'occurredAt',m.occurred_at,
 'createdAt',walk_private.iso_v1(m.created_at),'updatedAt',walk_private.iso_v1(m.updated_at),
 'imagePath',m.image_url,'imagePaths',m.image_urls) else null end)
$$;

-- No owner/XP advisory lock here: Memory row -> claim lookup must not invert
create function walk_private.record_reference_v1(s public.walk_sessions,c public.walk_record_claims,m public.memories) returns jsonb
language sql stable set search_path=pg_catalog as $$
 select jsonb_build_object('version',1,'clientSessionId',s.client_session_id,'petId',s.pet_id,'source','GPS_TRACKED',
 'sessionDeleted',s.deleted_at is not null,'summary',walk_private.record_summary_v1(s),
 'originalMemoryId',c.original_memory_id,
 'recordState',case when c.session_id is not null then case when m.id is not null then 'RECORDED' else 'RECORD_DELETED' end
  when s.state='ACCEPTED_SERVER' and s.deleted_at is null then 'RECORD_PENDING' else null end)
$$;

-- No owner/XP advisory lock here: Memory row -> claim lookup must not invert
-- create/replay's Walk-owner -> session -> Memory -> daily-summary -> XP order.
create function walk_private.guard_linked_memory_v1() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if tg_op='INSERT' then
   if exists(select 1 from public.walk_record_claims c where c.original_memory_id=new.id) then
     perform walk_private.record_fail_v1('WALK_RECORD_RECREATE_FORBIDDEN');
   end if;
 else
   if new.id is distinct from old.id and exists(select 1 from public.walk_record_claims c where c.original_memory_id=new.id) then
     perform walk_private.record_fail_v1('WALK_RECORD_RECREATE_FORBIDDEN');
   end if;
   if exists(select 1 from public.walk_record_claims c where c.original_memory_id=old.id)
    and (to_jsonb(new)-array['title','content','emotion','tags','image_url','image_urls','updated_at'])
      is distinct from (to_jsonb(old)-array['title','content','emotion','tags','image_url','image_urls','updated_at']) then
     perform walk_private.record_fail_v1('WALK_LINKED_RECORD_IMMUTABLE');
   end if;
 end if;
 return new;
end $$;
create trigger aaa_0_walk_linked_memory_guard before insert or update on public.memories
 for each row execute function walk_private.guard_linked_memory_v1();
CREATE OR REPLACE FUNCTION public.award_user_activity_xp_v1(p_pet_id uuid, p_event_type text, p_source_type text, p_source_id text)
 RETURNS TABLE(awarded boolean, xp_awarded integer, total_xp integer, level integer, leveled_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_today date := public.nuri_kst_today_v1();
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_source_type text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(btrim(coalesce(p_source_id, '')), '');
  v_base_xp integer;
  v_reward_multiplier numeric;
  v_daily_event_limit integer;
  v_daily_event_count integer;
  v_base_daily_sum integer;
  v_effective_xp integer;
  v_previous_total integer;
  v_previous_level integer;
  v_next_total integer;
  v_next_level integer;
  v_inserted_xp integer;
  v_is_bonus boolean;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_pet_id is not null and not public.owns_pet(p_pet_id) then
    raise exception 'NURI_PET_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  if v_event_type is null or v_source_type is null or v_source_id is null then
    raise exception 'NURI_XP_EVENT_INVALID'
      using errcode = '22023';
  end if;

  v_base_xp := case v_event_type
    when 'walk_record' then 26
    when 'walk_timeline_post' then 39
    when 'timeline_post' then 20
    when 'community_post' then 13
    when 'comment' then 4
    when 'health_record' then 13
    when 'streak_3_bonus' then 39
    when 'streak_7_bonus' then 104
    when 'streak_30_bonus' then 390
    else null
  end;

  v_daily_event_limit := case v_event_type
    when 'walk_record' then 3
    when 'walk_timeline_post' then 3
    when 'timeline_post' then 3
    when 'community_post' then 2
    when 'comment' then 10
    when 'health_record' then 2
    when 'streak_3_bonus' then 1
    when 'streak_7_bonus' then 1
    when 'streak_30_bonus' then 1
    else null
  end;

  if v_base_xp is null or v_daily_event_limit is null then
    raise exception 'NURI_XP_EVENT_INVALID'
      using errcode = '22023';
  end if;

  -- Walking rewards need an owned pet; null must not bypass the per-pet limit.
  if v_event_type in ('walk_record', 'walk_timeline_post') and p_pet_id is null then
    raise exception 'NURI_XP_EVENT_INVALID' using errcode = '22023';
  end if;

  perform public.assert_user_activity_source_v1(p_pet_id,v_event_type,v_source_type,v_source_id);

  -- Serialize the account budget and summary, including accounts with no summary yet.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nuri-user-xp:' || v_actor_id::text, 0)
  );

  select coalesce(s.total_xp, 0)
    into v_previous_total
  from public.user_level_summaries s
  where s.user_id = v_actor_id;

  v_previous_total := coalesce(v_previous_total, 0);
  v_previous_level := public.calculate_nuri_level_v1(v_previous_total);
  -- D: a settled GPS source is permanently consumed even when XP was zero.
  -- Recheck AFTER the existing account XP lock; no claim-row lock or bypass flag.
  if v_source_type='timeline_memory' and exists(
    select 1 from public.walk_record_claims c
    where c.user_id=v_actor_id and c.original_memory_id::text=v_source_id
  ) then
    return query select false,0,v_previous_total,v_previous_level,false;
    return;
  end if;
  -- A mutable record category must not turn one source into several rewards.
  if exists (
    select 1 from public.user_xp_ledger l where l.user_id=v_actor_id
      and l.source_type=v_source_type and l.source_id=v_source_id
  ) then
    return query select false,0,v_previous_total,v_previous_level,false;
    return;
  end if;
  v_reward_multiplier := case
    when v_previous_level <= 10 then 1.0
    when v_previous_level <= 30 then 0.9
    when v_previous_level <= 50 then 0.8
    when v_previous_level <= 70 then 0.7
    when v_previous_level <= 90 then 0.6
    else 0.5
  end;
  v_base_xp := greatest(1, round(v_base_xp::numeric * v_reward_multiplier)::integer);
  v_is_bonus := v_event_type in ('streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus');

  if v_event_type in ('walk_record', 'walk_timeline_post') then
    -- Both walking routes consume the same three awards for this pet and KST day.
    select count(*)::integer
      into v_daily_event_count
    from public.user_xp_ledger l
    where l.user_id = v_actor_id
      and l.pet_id = p_pet_id
      and l.event_type in ('walk_record', 'walk_timeline_post')
      and l.activity_date_kst = v_today;
  else
    select count(*)::integer
      into v_daily_event_count
    from public.user_xp_ledger l
    where l.user_id = v_actor_id
      and l.event_type = v_event_type
      and l.activity_date_kst = v_today;
  end if;

  if v_daily_event_count >= v_daily_event_limit then
    return query
      select false, 0, v_previous_total, v_previous_level, false;
    return;
  end if;

  if v_is_bonus then
    v_effective_xp := v_base_xp;
  else
    select coalesce(sum(l.xp), 0)::integer
      into v_base_daily_sum
    from public.user_xp_ledger l
    where l.user_id = v_actor_id
      and l.activity_date_kst = v_today
      and l.event_type not in ('streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus');

    v_effective_xp := least(v_base_xp, greatest(0, 150 - coalesce(v_base_daily_sum, 0)));
  end if;

  if v_effective_xp <= 0 then
    return query
      select false, 0, v_previous_total, v_previous_level, false;
    return;
  end if;

  insert into public.user_xp_ledger (
    user_id,
    pet_id,
    event_type,
    source_type,
    source_id,
    xp,
    activity_date_kst
  )
  values (
    v_actor_id,
    p_pet_id,
    v_event_type,
    v_source_type,
    v_source_id,
    v_effective_xp,
    v_today
  )
  on conflict (user_id, event_type, source_type, source_id) do nothing
  returning public.user_xp_ledger.xp into v_inserted_xp;

  if v_inserted_xp is null then
    return query
      select false, 0, v_previous_total, v_previous_level, false;
    return;
  end if;

  v_next_total := v_previous_total + v_inserted_xp;
  v_next_level := public.calculate_nuri_level_v1(v_next_total);

  insert into public.user_level_summaries (user_id, total_xp, level, updated_at)
  values (v_actor_id, v_next_total, v_next_level, timezone('utc', now()))
  on conflict (user_id) do update
    set total_xp = excluded.total_xp,
        level = excluded.level,
        updated_at = timezone('utc', now());

  perform public.sync_user_titles_v1(v_actor_id, p_pet_id);

  return query
    select true, v_inserted_xp, v_next_total, v_next_level, v_next_level > v_previous_level;
end;
$function$
;

create function public.get_walk_record_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid;s public.walk_sessions;c public.walk_record_claims;m public.memories;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id and pet_id=p_pet_id;
 if not found then perform walk_private.record_fail_v1('WALK_SESSION_REJECTED');end if;
 select * into c from public.walk_record_claims where session_id=s.id and user_id=actor and pet_id=p_pet_id;
 if c.session_id is not null then select * into m from public.memories where id=c.original_memory_id and user_id=actor and pet_id=p_pet_id;end if;
 return walk_private.record_projection_v1(s,c,m);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm in ('WALK_OWNER_MISMATCH','WALK_INVALID_IDENTIFIER') then perform walk_private.record_fail_v1(sqlerrm);end if;raise;
end $$;

create function public.create_walk_memory_from_session_v1(
 p_client_session_id uuid,p_pet_id uuid,p_memory_id uuid,p_request_id uuid,p_record jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid;s public.walk_sessions;c public.walk_record_claims;m public.memories;
 d record;x record;ledger_id uuid;images text[];tags text[];emotion public.emotion_tag;
 reward_phase boolean:=false;
begin
 perform walk_private.uuid_v1(p_client_session_id::text);perform walk_private.uuid_v1(p_pet_id::text);
 perform walk_private.uuid_v1(p_memory_id::text);perform walk_private.uuid_v1(p_request_id::text);
 if p_record is null or jsonb_typeof(p_record)<>'object' or octet_length(p_record::text)>32768 then
  perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end if;
 actor:=walk_private.actor_v1(p_pet_id);
 select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id for update;
 if not found then perform walk_private.record_fail_v1('WALK_SESSION_REJECTED');end if;
 if s.pet_id<>p_pet_id then perform walk_private.record_fail_v1('WALK_OWNER_MISMATCH');end if;
 -- Pure create plan forbids even a claimed deleted-session CREATE retry.
 -- Its retained Memory remains available through the separate read projection.
 if s.deleted_at is not null then perform walk_private.record_fail_v1('WALK_SESSION_DELETED');end if;
 if s.state<>'ACCEPTED_SERVER' then perform walk_private.record_fail_v1('WALK_SESSION_REJECTED');end if;
 select * into c from public.walk_record_claims where session_id=s.id;
 if found then
   select * into m from public.memories where id=c.original_memory_id and user_id=actor and pet_id=p_pet_id for share;
   if not found then perform walk_private.record_fail_v1('WALK_RECORD_RECREATE_FORBIDDEN');end if;
   return jsonb_build_object('record',walk_private.record_projection_v1(s,c,m),'replayed',true,'activity',null,'reward',null);
 end if;
 if exists(select 1 from public.memories where id=p_memory_id)
   or exists(select 1 from public.walk_record_claims where original_memory_id=p_memory_id) then
   perform walk_private.record_fail_v1('WALK_INVALID_RECORD_RELATION');
 end if;
 if p_record is null or jsonb_typeof(p_record)<>'object' or octet_length(p_record::text)>32768
   or exists(select 1 from jsonb_object_keys(p_record) k where k not in ('title','content','emotion','tags','imagePath','imagePaths'))
   or jsonb_typeof(p_record->'title') is distinct from 'string'
   or char_length(btrim(p_record->>'title')) not between 1 and 100
   or (p_record?'content' and jsonb_typeof(p_record->'content') not in ('string','null'))
   or char_length(coalesce(p_record->>'content',''))>5000
   or (p_record?'emotion' and jsonb_typeof(p_record->'emotion') not in ('string','null'))
   or (p_record?'tags' and jsonb_typeof(p_record->'tags')<>'array')
   or (p_record?'imagePath' and jsonb_typeof(p_record->'imagePath') not in ('string','null'))
   or char_length(coalesce(p_record->>'imagePath',''))>1024
   or (p_record?'imagePaths' and jsonb_typeof(p_record->'imagePaths')<>'array') then
   perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');
 end if;
 if jsonb_array_length(coalesce(p_record->'tags','[]'))>20 or exists(
  select 1 from jsonb_array_elements(coalesce(p_record->'tags','[]')) t
  where jsonb_typeof(t)<>'string' or char_length(t#>>'{}') not between 1 and 100) then
  perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end if;
 if jsonb_array_length(coalesce(p_record->'imagePaths','[]'))>10 or exists(
  select 1 from jsonb_array_elements(coalesce(p_record->'imagePaths','[]')) t
  where jsonb_typeof(t)<>'string' or char_length(t#>>'{}') not between 1 and 1024) then
  perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end if;
 begin emotion:=(p_record->>'emotion')::public.emotion_tag;
 exception when invalid_text_representation then perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end;
 select coalesce(array_agg(t),array[]::text[]) into tags from jsonb_array_elements_text(coalesce(p_record->'tags','[]')) t;
 select coalesce(array_agg(t),array[]::text[]) into images from jsonb_array_elements_text(coalesce(p_record->'imagePaths','[]')) t;
 insert into public.memories(id,user_id,pet_id,title,content,emotion,tags,image_url,image_urls,category,occurred_at,created_at,updated_at,metadata)
 values(p_memory_id,actor,p_pet_id,btrim(p_record->>'title'),p_record->>'content',emotion,tags,p_record->>'imagePath',images,
 'walk',(s.started_at at time zone 'Asia/Seoul')::date,now(),now(),'{}'::jsonb) returning * into m;
 reward_phase:=true;
 -- Keep daily-summary -> possible internal bonus XP -> primary XP order.
 select * into strict d from public.record_pet_daily_activity_v1(p_pet_id,'timeline_walk_post',m.id::text);
 if d.current_streak is null or d.best_streak is null or d.current_streak<1 or d.best_streak<d.current_streak
  or d.today_completed is distinct from true or d.inserted is distinct from true or d.show_celebration is null
  or d.activity_date_kst is distinct from public.nuri_kst_today_v1()
  or not exists(select 1 from public.pet_daily_activities a where a.user_id=actor and a.pet_id=p_pet_id
    and a.source_type='timeline_walk_post' and a.source_id=m.id::text and a.activity_date_kst=d.activity_date_kst) then
   perform walk_private.record_fail_v1('WALK_REWARD_SETTLEMENT_FAILED');end if;
 select * into strict x from public.award_user_activity_xp_v1(p_pet_id,'walk_timeline_post','timeline_memory',m.id::text);
 if x.awarded is null or x.xp_awarded is null or x.total_xp is null or x.level is null or x.leveled_up is null
   or x.xp_awarded<0 or x.total_xp<0 or x.level<1 or x.awarded<>(x.xp_awarded>0) then
   perform walk_private.record_fail_v1('WALK_REWARD_SETTLEMENT_FAILED');end if;
 if x.awarded then
  select id into strict ledger_id from public.user_xp_ledger where user_id=actor and pet_id=p_pet_id
   and event_type='walk_timeline_post' and source_type='timeline_memory' and source_id=m.id::text
   and xp=x.xp_awarded and activity_date_kst=public.nuri_kst_today_v1();
 elsif exists(select 1 from public.user_xp_ledger where user_id=actor and source_type='timeline_memory' and source_id=m.id::text) then
  perform walk_private.record_fail_v1('WALK_REWARD_SETTLEMENT_FAILED');
 end if;
 insert into public.walk_record_claims(session_id,user_id,pet_id,original_memory_id,request_id,activity_date_kst,
 settlement_outcome,xp_ledger_reference)
 values(s.id,actor,p_pet_id,m.id,p_request_id,d.activity_date_kst,
 case when x.awarded then 'XP_AWARDED' else 'ZERO_XP_VALID' end,ledger_id) returning * into c;
 update public.walk_sessions set record_claim_exists=true where id=s.id;
 delete from public.walk_record_prompt_dismissals where session_id=s.id;
 return jsonb_build_object('record',walk_private.record_projection_v1(s,c,m),'replayed',false,
 'activity',to_jsonb(d),'reward',to_jsonb(x));
exception when others then
 if sqlerrm in ('WALK_OWNER_MISMATCH','WALK_INVALID_IDENTIFIER') then perform walk_private.record_fail_v1(sqlerrm);end if;
 if reward_phase then perform walk_private.record_fail_v1('WALK_REWARD_SETTLEMENT_FAILED');end if;
 raise;
end $$;

create function public.get_walk_memory_summaries_v1(p_memory_ids uuid[]) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid:=auth.uid();items jsonb;
begin
 if actor is null or not walk_private.owner_readable_v1() then perform walk_private.record_fail_v1('WALK_OWNER_MISMATCH');end if;
 if p_memory_ids is null or cardinality(p_memory_ids) not between 1 and 100
   or array_position(p_memory_ids,null) is not null
   or cardinality(p_memory_ids)<>(select count(distinct x) from unnest(p_memory_ids) x) then
   perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end if;
 select coalesce(jsonb_agg(jsonb_build_object('version',1,'memoryId',m.id,'petId',c.pet_id,
  'clientSessionId',s.client_session_id,'source','GPS_TRACKED','sessionDeleted',s.deleted_at is not null,
  'recordState','RECORDED','summary',walk_private.record_summary_v1(s)) order by m.id),'[]') into items
 from public.walk_record_claims c join public.walk_sessions s on s.id=c.session_id
 join public.memories m on m.id=c.original_memory_id and m.user_id=c.user_id and m.pet_id=c.pet_id
 join public.pets p on p.id=c.pet_id and p.user_id=actor
 where c.user_id=actor and m.id=any(p_memory_ids);
 return jsonb_build_object('items',items);
end $$;

create function public.get_walk_record_history_v1(p_pet_id uuid,p_limit integer default 30,p_cursor jsonb default null) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid;items jsonb;count_rows integer;cursor_entries jsonb;
 cursor_time timestamptz;cursor_id uuid;cursor_out jsonb;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 if p_limit is null or p_limit not between 1 and 100 then perform walk_private.record_fail_v1('WALK_INVALID_RECORD_INPUT');end if;
 if p_cursor is not null then
  begin
   if jsonb_typeof(p_cursor)<>'object' or p_cursor->'version' is distinct from '1'::jsonb
    or p_cursor->>'petId' is distinct from p_pet_id::text or p_cursor->'pageSize' is distinct from to_jsonb(p_limit)
    or jsonb_typeof(p_cursor->'acceptedAt') is distinct from 'string' or jsonb_typeof(p_cursor->'clientSessionId') is distinct from 'string'
    then perform walk_private.record_fail_v1('WALK_RECORD_CURSOR_INVALID');end if;
   cursor_time:=(p_cursor->>'acceptedAt')::timestamptz;cursor_id:=(p_cursor->>'clientSessionId')::uuid;
   if p_cursor->>'acceptedAt' is distinct from to_char(cursor_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    or p_cursor->>'clientSessionId' is distinct from cursor_id::text
    or (select count(*) from jsonb_object_keys(p_cursor))<>5 then
     perform walk_private.record_fail_v1('WALK_RECORD_CURSOR_INVALID');end if;
  exception when others then perform walk_private.record_fail_v1('WALK_RECORD_CURSOR_INVALID');end;
 end if;
 with page as (
  select s.id,s.accepted_at,s.client_session_id from public.walk_sessions s where s.user_id=actor and s.pet_id=p_pet_id
   and s.state='ACCEPTED_SERVER' and s.deleted_at is null
   and (p_cursor is null or (s.accepted_at,s.client_session_id)<(cursor_time,cursor_id))
  order by s.accepted_at desc,s.client_session_id desc limit p_limit+1
 ), numbered as (
  select s.*,row_number() over(order by s.accepted_at desc,s.client_session_id desc) n from page s
 ) select count(*),coalesce(jsonb_agg(walk_private.record_reference_v1(s,c,m) order by s.accepted_at desc,s.client_session_id desc)
  filter(where n.n<=p_limit),'[]'),
  jsonb_agg(jsonb_build_object('acceptedAt',to_char(s.accepted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'clientSessionId',s.client_session_id) order by s.accepted_at desc,s.client_session_id desc)
    filter(where n.n<=p_limit) into count_rows,items,cursor_entries
 from numbered n join public.walk_sessions s on s.id=n.id
 left join public.walk_record_claims c on c.session_id=s.id
 left join public.memories m on m.id=c.original_memory_id and m.user_id=actor and m.pet_id=p_pet_id;
 if count_rows>p_limit then
  cursor_out:=jsonb_build_object('version',1,'petId',p_pet_id,'pageSize',p_limit)||(cursor_entries->(p_limit-1));
 end if;
 return jsonb_build_object('items',items,'hasMore',count_rows>p_limit,'nextCursor',cursor_out);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm='WALK_OWNER_MISMATCH' then perform walk_private.record_fail_v1(sqlerrm);end if;raise;
end $$;

create function public.get_walk_record_prompt_v1(p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid;s public.walk_sessions;c public.walk_record_claims;m public.memories;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 select w.* into s from public.walk_sessions w
 where w.user_id=actor and w.pet_id=p_pet_id and w.state='ACCEPTED_SERVER' and w.deleted_at is null
 and w.accepted_at>=now()-interval '7 days'
 and not exists(select 1 from public.walk_record_claims r where r.session_id=w.id)
 and not exists(select 1 from public.walk_record_prompt_dismissals d where d.session_id=w.id)
 order by w.accepted_at desc,w.client_session_id desc limit 1;
 return jsonb_build_object('item',case when s.id is not null then walk_private.record_reference_v1(s,c,m) else null end);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm='WALK_OWNER_MISMATCH' then perform walk_private.record_fail_v1(sqlerrm);end if;raise;
end $$;
create function public.dismiss_walk_record_prompt_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid;s public.walk_sessions;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 select * into s from public.walk_sessions where user_id=actor and pet_id=p_pet_id and client_session_id=p_client_session_id;
 if not found or s.state<>'ACCEPTED_SERVER' or s.deleted_at is not null then perform walk_private.record_fail_v1('WALK_SESSION_REJECTED');end if;
 if not exists(select 1 from public.walk_record_claims where session_id=s.id) then
  insert into public.walk_record_prompt_dismissals(session_id,user_id,pet_id) values(s.id,actor,p_pet_id) on conflict(session_id) do nothing;
 end if;
 return jsonb_build_object('clientSessionId',s.client_session_id,'petId',p_pet_id,'dismissed',true);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm='WALK_OWNER_MISMATCH' then perform walk_private.record_fail_v1(sqlerrm);end if;raise;
end $$;

-- Explicit privilege allowlists, including all internal helper/trigger surfaces.
revoke all on function walk_private.record_fail_v1(text),walk_private.record_summary_v1(public.walk_sessions),
 walk_private.record_projection_v1(public.walk_sessions,public.walk_record_claims,public.memories),
 walk_private.record_reference_v1(public.walk_sessions,public.walk_record_claims,public.memories),
 walk_private.guard_linked_memory_v1(),walk_private.clear_deleted_walk_prompt_v1() from public,anon,authenticated,service_role;
revoke all on function public.create_walk_memory_from_session_v1(uuid,uuid,uuid,uuid,jsonb),
 public.get_walk_record_v1(uuid,uuid),public.get_walk_memory_summaries_v1(uuid[]),
 public.get_walk_record_history_v1(uuid,integer,jsonb),public.get_walk_record_prompt_v1(uuid),
 public.dismiss_walk_record_prompt_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_walk_memory_from_session_v1(uuid,uuid,uuid,uuid,jsonb),
 public.get_walk_record_v1(uuid,uuid),public.get_walk_memory_summaries_v1(uuid[]),
 public.get_walk_record_history_v1(uuid,integer,jsonb),public.get_walk_record_prompt_v1(uuid),
 public.dismiss_walk_record_prompt_v1(uuid,uuid) to authenticated;

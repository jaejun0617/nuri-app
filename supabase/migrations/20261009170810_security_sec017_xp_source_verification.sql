-- SEC-017: authorize awards using existing server rows, never caller claims.
create or replace function public.assert_user_activity_source_v1(
  p_pet_id uuid, p_event_type text, p_source_type text, p_source_id text
) returns void language plpgsql security definer
set search_path=public,pg_catalog
as $$
declare
  actor uuid := auth.uid();
  today date := public.nuri_kst_today_v1();
  source_uuid uuid;
  valid_source boolean := false;
  milestone integer;
  actual_streak integer;
begin
  if actor is null or not exists (
    select 1 from auth.users where id=actor and deleted_at is null
  ) then raise exception 'NURI_AUTH_REQUIRED' using errcode='42501'; end if;
  if p_event_type in ('streak_3_bonus','streak_7_bonus','streak_30_bonus') then
    milestone := case p_event_type when 'streak_3_bonus' then 3 when 'streak_7_bonus' then 7 else 30 end;
    if p_pet_id is null or not public.owns_pet(p_pet_id)
      or p_source_type is distinct from 'pet_daily_activity'
      or p_source_id is distinct from p_pet_id::text || ':streak:' || milestone::text then
      raise exception 'NURI_XP_SOURCE_INELIGIBLE' using errcode='22023';
    end if;
    -- Do not trust a cached streak or historical unverified source IDs.
    with verified_days as (
      select distinct a.activity_date_kst as day
      from public.pet_daily_activities a join public.memories m on a.source_id=m.id::text
      where a.user_id=actor and a.pet_id=p_pet_id and a.source_type='timeline_walk_post'
        and m.user_id=actor and m.pet_id=p_pet_id and m.category='walk'
        and a.activity_date_kst=(m.created_at at time zone 'Asia/Seoul')::date
        and m.created_at<=now() and a.activity_date_kst between today-31 and today
    )
    select coalesce(min(d),32) into actual_streak from generate_series(0,31) d
      where not exists (select 1 from verified_days v where v.day=today-d);
    valid_source := actual_streak=milestone;
  else
    begin source_uuid := p_source_id::uuid;
    exception when invalid_text_representation then
      raise exception 'NURI_XP_SOURCE_INELIGIBLE' using errcode='22023';
    end;
    if source_uuid is null or p_source_id is distinct from source_uuid::text then
      raise exception 'NURI_XP_SOURCE_INELIGIBLE' using errcode='22023';
    end if;
    if p_event_type in ('timeline_post','walk_timeline_post','health_record')
      and p_source_type='timeline_memory' and p_pet_id is not null then
      perform 1 from public.memories m where m.id=source_uuid and m.user_id=actor and m.pet_id=p_pet_id
        and public.owns_pet(m.pet_id)
        and (m.created_at at time zone 'Asia/Seoul')::date=today and m.created_at<=now()
        and case p_event_type
          when 'walk_timeline_post' then m.category='walk'
          when 'health_record' then m.category='health'
          else coalesce(m.category,'daily') not in ('walk','health') end
      for share;
      valid_source := found;
    elsif p_event_type='community_post' and p_source_type='community_post' and p_pet_id is null then
      perform 1 from public.posts p where p.id=source_uuid and p.user_id=actor
        and p.status='active' and p.visibility='public' and p.deleted_at is null
        and (p.created_at at time zone 'Asia/Seoul')::date=today and p.created_at<=now()
      for share;
      valid_source := found;
    elsif p_event_type='comment' and p_source_type='community_comment' and p_pet_id is null then
      perform 1 from public.comments c join public.posts p on p.id=c.post_id
      where c.id=source_uuid and c.user_id=actor and c.status='active' and c.deleted_at is null
        and p.status='active' and p.visibility='public' and p.deleted_at is null
        and (c.created_at at time zone 'Asia/Seoul')::date=today and c.created_at<=now()
      for share of c,p;
      valid_source := found;
    end if;
    -- walk_record/walk_place_record has no production source table or caller.
    -- It must stay ineligible until a verifiable source contract is approved.
  end if;
  if not coalesce(valid_source,false) then
    raise exception 'NURI_XP_SOURCE_INELIGIBLE' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.assert_user_activity_source_v1(uuid,text,text,text) from public,anon,authenticated,service_role;

create or replace function public.guard_memory_creation_time_v1()
returns trigger language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
  if current_user in ('anon','authenticated') then
    if tg_op='INSERT' then new.created_at:=now();
    elsif new.created_at is distinct from old.created_at then
      raise exception 'NURI_RECORD_CREATED_AT_IMMUTABLE' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_memory_creation_time_v1() from public,anon,authenticated,service_role;
create trigger aaa_guard_memory_creation_time_v1 before insert or update on public.memories
for each row execute function public.guard_memory_creation_time_v1();

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
$function$;

CREATE OR REPLACE FUNCTION public.record_pet_daily_activity_v1(p_pet_id uuid, p_source_type text, p_source_id text)
 RETURNS TABLE(current_streak integer, best_streak integer, today_completed boolean, inserted boolean, show_celebration boolean, activity_date_kst date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_today date := public.nuri_kst_today_v1();
  v_source_type text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(btrim(coalesce(p_source_id, '')), '');
  v_inserted_id uuid;
  v_summary public.pet_streak_summaries%rowtype;
  v_show_celebration boolean := false;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_pet_id is null or not public.owns_pet(p_pet_id) then
    raise exception 'NURI_PET_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  if v_source_type not in ('timeline_walk_post', 'walk_place_record') or v_source_id is null then
    raise exception 'NURI_DAILY_ACTIVITY_INVALID'
      using errcode = '22023';
  end if;

  if v_source_type is distinct from 'timeline_walk_post' then
    raise exception 'NURI_DAILY_ACTIVITY_INVALID' using errcode='22023';
  end if;
  perform public.assert_user_activity_source_v1(p_pet_id,'walk_timeline_post','timeline_memory',v_source_id);

  insert into public.pet_daily_activities (
    user_id,
    pet_id,
    activity_date_kst,
    source_type,
    source_id
  )
  values (v_actor_id, p_pet_id, v_today, v_source_type, v_source_id)
  on conflict (user_id, pet_id, source_type, source_id) do nothing
  returning id into v_inserted_id;

  perform public.recompute_pet_streak_summary_v1(v_actor_id, p_pet_id);

  select *
    into v_summary
  from public.pet_streak_summaries
  where user_id = v_actor_id
    and pet_id = p_pet_id;

  if v_inserted_id is not null
    and coalesce(v_summary.last_celebrated_date_kst, date '1900-01-01') <> v_today then
    v_show_celebration := true;
    update public.pet_streak_summaries
      set last_celebrated_date_kst = v_today,
          updated_at = timezone('utc', now())
    where user_id = v_actor_id
      and pet_id = p_pet_id;
  end if;

  if v_summary.current_streak in (3, 7, 30) and v_inserted_id is not null then
    perform public.award_user_activity_xp_v1(
      p_pet_id,
      case v_summary.current_streak
        when 3 then 'streak_3_bonus'
        when 7 then 'streak_7_bonus'
        else 'streak_30_bonus'
      end,
      'pet_daily_activity',
      p_pet_id::text || ':streak:' || v_summary.current_streak::text
    );
  end if;

  return query
    select
      coalesce(v_summary.current_streak, 0),
      coalesce(v_summary.best_streak, 0),
      coalesce(v_summary.today_completed, false),
      v_inserted_id is not null,
      v_show_celebration,
      v_today;
end;
$function$;

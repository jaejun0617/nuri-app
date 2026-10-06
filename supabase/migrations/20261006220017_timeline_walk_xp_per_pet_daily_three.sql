-- PO approved 2026-10-07: per-pet KST-day walking allowance; account XP cap unchanged.
-- Replace only the existing award function. CREATE OR REPLACE preserves its ACL/owner.
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
$function$

begin;

set local search_path = public, pg_catalog;

-- Corrective migration for V1.1 second MVP:
-- PL/pgSQL output column names (`total_xp`, `level`) can shadow table columns.
-- Qualify user_level_summaries columns explicitly to keep lint and runtime stable.

create or replace function public.award_user_activity_xp_v1(
  p_pet_id uuid,
  p_event_type text,
  p_source_type text,
  p_source_id text
)
returns table (
  awarded boolean,
  xp_awarded integer,
  total_xp integer,
  level integer,
  leveled_up boolean
)
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_today date := public.nuri_kst_today_v1();
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_source_type text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(btrim(coalesce(p_source_id, '')), '');
  v_base_xp integer;
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
    when 'walk_record' then 20
    when 'walk_timeline_post' then 30
    when 'timeline_post' then 15
    when 'community_post' then 10
    when 'comment' then 3
    when 'health_record' then 10
    when 'streak_3_bonus' then 30
    when 'streak_7_bonus' then 80
    when 'streak_30_bonus' then 300
    else null
  end;

  v_daily_event_limit := case v_event_type
    when 'walk_record' then 2
    when 'walk_timeline_post' then 1
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

  select coalesce(s.total_xp, 0), coalesce(s.level, 1)
    into v_previous_total, v_previous_level
  from public.user_level_summaries s
  where s.user_id = v_actor_id;

  v_previous_total := coalesce(v_previous_total, 0);
  v_previous_level := coalesce(v_previous_level, 1);
  v_is_bonus := v_event_type in ('streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus');

  select count(*)::integer
    into v_daily_event_count
  from public.user_xp_ledger l
  where l.user_id = v_actor_id
    and l.event_type = v_event_type
    and l.activity_date_kst = v_today;

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
$$;

revoke all on function public.award_user_activity_xp_v1(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.award_user_activity_xp_v1(uuid, text, text, text)
  to authenticated;

commit;

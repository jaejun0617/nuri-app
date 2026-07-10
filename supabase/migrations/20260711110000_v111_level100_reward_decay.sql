begin;

set local search_path = public, pg_catalog;

-- V1.1.1 pre-store progression polish:
-- - keep the existing Lv.1~30 thresholds stable for release regression safety
-- - extend long-term growth to Lv.100 without changing app RPC call signatures
-- - slightly increase base XP, then apply a level-band decay multiplier for future awards
-- - update QA-only ranking fixtures so Lv.100/max visual QA has deterministic data

alter table public.user_level_summaries
  drop constraint if exists user_level_summaries_level_check;

alter table public.user_level_summaries
  drop constraint if exists user_level_summaries_level_range_v111_check;

alter table public.user_level_summaries
  drop constraint if exists user_level_summaries_level_range_v111_level100_check;

alter table public.user_level_summaries
  add constraint user_level_summaries_level_range_v111_level100_check
  check (level between 1 and 100) not valid;

alter table public.user_level_summaries
  validate constraint user_level_summaries_level_range_v111_level100_check;

alter table public.activity_ranking_qa_fixtures
  drop constraint if exists activity_ranking_qa_fixtures_level_check;

alter table public.activity_ranking_qa_fixtures
  drop constraint if exists activity_ranking_qa_fixtures_level_range_v111_level100_check;

alter table public.activity_ranking_qa_fixtures
  add constraint activity_ranking_qa_fixtures_level_range_v111_level100_check
  check (level between 1 and 100) not valid;

alter table public.activity_ranking_qa_fixtures
  validate constraint activity_ranking_qa_fixtures_level_range_v111_level100_check;

create or replace function public.nuri_level_threshold_xp_v1(
  p_level integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when coalesce(p_level, 1) <= 1 then 0
    when p_level = 2 then 100
    when p_level = 3 then 250
    when p_level = 4 then 450
    when p_level = 5 then 700
    when p_level = 6 then 1000
    when p_level = 7 then 1350
    when p_level = 8 then 1750
    when p_level = 9 then 2150
    when p_level = 10 then 2500
    when p_level = 11 then 3200
    when p_level = 12 then 4200
    when p_level = 13 then 5500
    when p_level = 14 then 7200
    when p_level = 15 then 9400
    when p_level = 16 then 12200
    when p_level = 17 then 15700
    when p_level = 18 then 20000
    when p_level = 19 then 25200
    when p_level = 20 then 31400
    when p_level = 21 then 38700
    when p_level = 22 then 47200
    when p_level = 23 then 57000
    when p_level = 24 then 68200
    when p_level = 25 then 80900
    when p_level = 26 then 95200
    when p_level = 27 then 111200
    when p_level = 28 then 129000
    when p_level = 29 then 148700
    when p_level = 30 then 170400
    when p_level >= 100 then 1250000
    else (
      round(
        (
          170400::numeric +
          (1250000::numeric - 170400::numeric) *
          power(((least(greatest(p_level, 31), 100) - 30)::numeric / 70::numeric), 1.28)
        ) / 100::numeric
      ) * 100
    )::integer
  end;
$$;

create or replace function public.calculate_nuri_level_v1(
  p_total_xp integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select coalesce(max(level_value), 1)::integer
  from generate_series(1, 100) as levels(level_value)
  where greatest(coalesce(p_total_xp, 0), 0) >= public.nuri_level_threshold_xp_v1(level_value);
$$;

create or replace function public.nuri_level_floor_xp_v1(
  p_level integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select public.nuri_level_threshold_xp_v1(least(greatest(coalesce(p_level, 1), 1), 100));
$$;

create or replace function public.nuri_level_next_xp_v1(
  p_level integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select public.nuri_level_threshold_xp_v1(
    least(greatest(coalesce(p_level, 1), 1) + 1, 100)
  );
$$;

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

insert into public.activity_ranking_qa_fixtures (
  fixture_key,
  display_name,
  total_xp,
  level,
  walk_score,
  post_score,
  comment_score,
  health_score,
  life_score,
  grooming_score
)
values
  ('adminQA3', 'adminQA3', 1250000, 100, 980, 132, 84, 45, 36, 14),
  ('adminQA4', 'adminQA4', 783700, 75, 720, 88, 112, 32, 24, 8),
  ('adminQA5', 'adminQA5', 459400, 55, 410, 156, 26, 58, 18, 5),
  ('adminQA6', 'adminQA6', 207200, 35, 260, 48, 64, 20, 54, 11),
  ('adminQA7', 'adminQA7', 9400, 15, 94, 26, 18, 12, 22, 4),
  ('adminQA8', 'adminQA8', 2500, 10, 20, 8, 6, 3, 5, 1)
on conflict (fixture_key) do update
  set display_name = excluded.display_name,
      total_xp = excluded.total_xp,
      level = excluded.level,
      walk_score = excluded.walk_score,
      post_score = excluded.post_score,
      comment_score = excluded.comment_score,
      health_score = excluded.health_score,
      life_score = excluded.life_score,
      grooming_score = excluded.grooming_score,
      is_active = true;

revoke all on function public.nuri_level_threshold_xp_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.calculate_nuri_level_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.nuri_level_floor_xp_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.nuri_level_next_xp_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.award_user_activity_xp_v1(uuid, text, text, text)
  from public, anon, authenticated, service_role;

grant execute on function public.award_user_activity_xp_v1(uuid, text, text, text)
  to authenticated;

comment on function public.nuri_level_threshold_xp_v1(integer)
  is 'NURI Lv.1~100 XP threshold policy. Lv.1~30 remains release-compatible; Lv.31~100 uses a long-term curved progression up to 1,250,000 XP.';
comment on function public.award_user_activity_xp_v1(uuid, text, text, text)
  is 'Awards user activity XP with V1.1.1 Lv.100 level curve, increased base rewards, level-band reward decay, daily caps, and source idempotency.';

commit;

begin;

set local search_path = public, extensions;

-- V1.1 second MVP foundation:
-- - user+pet scoped daily activity streaks
-- - app-internal notification read path
-- - XP / level / title ledger
-- All objects are additive. No existing production data is rewritten.

create table if not exists public.pet_daily_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  activity_date_kst date not null,
  source_type text not null,
  source_id text not null,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint pet_daily_activities_source_type_check
    check (source_type in ('timeline_walk_post', 'walk_place_record')),
  constraint pet_daily_activities_source_id_not_blank
    check (btrim(source_id) <> ''),
  constraint pet_daily_activities_unique_source
    unique (user_id, pet_id, source_type, source_id)
);

create index if not exists idx_pet_daily_activities_user_pet_date
  on public.pet_daily_activities (user_id, pet_id, activity_date_kst desc);

create table if not exists public.pet_streak_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_completed_date_kst date,
  today_completed boolean not null default false,
  last_celebrated_date_kst date,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, pet_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'notice',
  target_scope text not null default 'all',
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint announcements_type_check
    check (type in ('notice', 'account', 'service', 'event')),
  constraint announcements_target_scope_check
    check (target_scope in ('all'))
);

create index if not exists idx_announcements_active_created
  on public.announcements (is_active, created_at desc);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'account',
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_notifications_type_check
    check (type in ('notice', 'account', 'service', 'event'))
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

create index if not exists idx_user_notifications_user_unread
  on public.user_notifications (user_id, read_at)
  where read_at is null;

create table if not exists public.user_notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, announcement_id)
);

create table if not exists public.user_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  event_type text not null,
  source_type text not null,
  source_id text not null,
  xp integer not null check (xp > 0),
  activity_date_kst date not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_xp_ledger_event_type_check
    check (
      event_type in (
        'walk_record',
        'walk_timeline_post',
        'timeline_post',
        'community_post',
        'comment',
        'health_record',
        'streak_3_bonus',
        'streak_7_bonus',
        'streak_30_bonus'
      )
    ),
  constraint user_xp_ledger_source_id_not_blank
    check (btrim(source_id) <> ''),
  constraint user_xp_ledger_unique_source
    unique (user_id, event_type, source_type, source_id)
);

create index if not exists idx_user_xp_ledger_user_date
  on public.user_xp_ledger (user_id, activity_date_kst desc);

create index if not exists idx_user_xp_ledger_user_event_date
  on public.user_xp_ledger (user_id, event_type, activity_date_kst desc);

create table if not exists public.user_level_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level between 1 and 10),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  title_key text not null,
  title_name text not null,
  earned_at timestamptz not null default timezone('utc', now()),
  source_type text not null,
  constraint user_titles_title_key_not_blank
    check (btrim(title_key) <> '')
);

create unique index if not exists idx_user_titles_unique_key
  on public.user_titles (user_id, title_key);

create index if not exists idx_user_titles_user_earned
  on public.user_titles (user_id, earned_at desc);

alter table public.pet_daily_activities enable row level security;
alter table public.pet_streak_summaries enable row level security;
alter table public.announcements enable row level security;
alter table public.user_notifications enable row level security;
alter table public.user_notification_reads enable row level security;
alter table public.user_xp_ledger enable row level security;
alter table public.user_level_summaries enable row level security;
alter table public.user_titles enable row level security;

drop policy if exists pet_daily_activities_select_own on public.pet_daily_activities;
create policy pet_daily_activities_select_own
  on public.pet_daily_activities
  for select
  to authenticated
  using (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists pet_streak_summaries_select_own on public.pet_streak_summaries;
create policy pet_streak_summaries_select_own
  on public.pet_streak_summaries
  for select
  to authenticated
  using (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists announcements_select_active_authenticated on public.announcements;
create policy announcements_select_active_authenticated
  on public.announcements
  for select
  to authenticated
  using (
    is_active = true
    and target_scope = 'all'
    and (starts_at is null or starts_at <= timezone('utc', now()))
    and (expires_at is null or expires_at > timezone('utc', now()))
  );

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
  on public.user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_notification_reads_select_own on public.user_notification_reads;
create policy user_notification_reads_select_own
  on public.user_notification_reads
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_xp_ledger_select_own on public.user_xp_ledger;
create policy user_xp_ledger_select_own
  on public.user_xp_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_level_summaries_select_own on public.user_level_summaries;
create policy user_level_summaries_select_own
  on public.user_level_summaries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_titles_select_own on public.user_titles;
create policy user_titles_select_own
  on public.user_titles
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.nuri_kst_today_v1()
returns date
language sql
stable
set search_path = public, pg_catalog
as $$
  select (timezone('Asia/Seoul', now()))::date;
$$;

create or replace function public.calculate_nuri_level_v1(
  p_total_xp integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when coalesce(p_total_xp, 0) >= 2500 then 10
    when coalesce(p_total_xp, 0) >= 2150 then 9
    when coalesce(p_total_xp, 0) >= 1750 then 8
    when coalesce(p_total_xp, 0) >= 1350 then 7
    when coalesce(p_total_xp, 0) >= 1000 then 6
    when coalesce(p_total_xp, 0) >= 700 then 5
    when coalesce(p_total_xp, 0) >= 450 then 4
    when coalesce(p_total_xp, 0) >= 250 then 3
    when coalesce(p_total_xp, 0) >= 100 then 2
    else 1
  end;
$$;

create or replace function public.nuri_level_floor_xp_v1(
  p_level integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when p_level >= 10 then 2500
    when p_level = 9 then 2150
    when p_level = 8 then 1750
    when p_level = 7 then 1350
    when p_level = 6 then 1000
    when p_level = 5 then 700
    when p_level = 4 then 450
    when p_level = 3 then 250
    when p_level = 2 then 100
    else 0
  end;
$$;

create or replace function public.nuri_level_next_xp_v1(
  p_level integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when p_level >= 10 then 2500
    when p_level = 9 then 2500
    when p_level = 8 then 2150
    when p_level = 7 then 1750
    when p_level = 6 then 1350
    when p_level = 5 then 1000
    when p_level = 4 then 700
    when p_level = 3 then 450
    when p_level = 2 then 250
    else 100
  end;
$$;

create or replace function public.sync_user_titles_v1(
  p_user_id uuid,
  p_pet_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_walk_count integer;
  v_timeline_count integer;
  v_community_count integer;
  v_comment_count integer;
begin
  select count(*)::integer
    into v_walk_count
  from public.user_xp_ledger
  where user_id = p_user_id
    and event_type in ('walk_record', 'walk_timeline_post');

  select count(*)::integer
    into v_timeline_count
  from public.user_xp_ledger
  where user_id = p_user_id
    and event_type in ('timeline_post', 'walk_timeline_post');

  select count(*)::integer
    into v_community_count
  from public.user_xp_ledger
  where user_id = p_user_id
    and event_type = 'community_post';

  select count(*)::integer
    into v_comment_count
  from public.user_xp_ledger
  where user_id = p_user_id
    and event_type = 'comment';

  if v_walk_count >= 1 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'first_walk_friend', '첫 산책 친구', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_walk_count >= 7 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'walk_sprout', '산책 새싹', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_walk_count >= 30 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'neighborhood_walker', '동네 산책러', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_walk_count >= 100 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'walk_king', '산책왕', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;

  if v_timeline_count >= 1 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'first_memory_record', '첫 추억 기록', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_timeline_count >= 10 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'memory_collector', '추억 수집가', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_timeline_count >= 50 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'record_master', '기록 장인', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;

  if v_community_count >= 1 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'first_hello_done', '첫 인사 완료', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_community_count >= 10 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'neighborhood_news', '동네 소식통', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;

  if v_comment_count >= 30 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'comment_fairy', '댓글 요정', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
  if v_comment_count >= 100 then
    insert into public.user_titles (user_id, pet_id, title_key, title_name, source_type)
    values (p_user_id, p_pet_id, 'warm_commenter', '따뜻한 참견러', 'xp_ledger')
    on conflict (user_id, title_key) do nothing;
  end if;
end;
$$;

create or replace function public.recompute_pet_streak_summary_v1(
  p_user_id uuid,
  p_pet_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_today date := public.nuri_kst_today_v1();
  v_last_date date;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_today_completed boolean := false;
begin
  select max(activity_date_kst)
    into v_last_date
  from public.pet_daily_activities
  where user_id = p_user_id
    and pet_id = p_pet_id;

  if v_last_date is null then
    insert into public.pet_streak_summaries (
      user_id,
      pet_id,
      current_streak,
      best_streak,
      last_completed_date_kst,
      today_completed,
      updated_at
    )
    values (p_user_id, p_pet_id, 0, 0, null, false, timezone('utc', now()))
    on conflict (user_id, pet_id) do update
      set current_streak = 0,
          best_streak = greatest(public.pet_streak_summaries.best_streak, 0),
          last_completed_date_kst = null,
          today_completed = false,
          updated_at = timezone('utc', now());
    return;
  end if;

  with recursive streak_days(day_kst, streak_count) as (
    select v_last_date, 1
    union all
    select (streak_days.day_kst - interval '1 day')::date,
           streak_days.streak_count + 1
    from streak_days
    where exists (
      select 1
      from public.pet_daily_activities pda
      where pda.user_id = p_user_id
        and pda.pet_id = p_pet_id
        and pda.activity_date_kst = (streak_days.day_kst - interval '1 day')::date
    )
  )
  select max(streak_count)::integer
    into v_current_streak
  from streak_days;

  select exists (
    select 1
    from public.pet_daily_activities
    where user_id = p_user_id
      and pet_id = p_pet_id
      and activity_date_kst = v_today
  )
    into v_today_completed;

  select coalesce(max(run_length), 0)::integer
    into v_best_streak
  from (
    select count(*) as run_length
    from (
      select
        activity_date_kst,
        activity_date_kst
          - (row_number() over (order by activity_date_kst))::integer as streak_group
      from (
        select distinct activity_date_kst
        from public.pet_daily_activities
        where user_id = p_user_id
          and pet_id = p_pet_id
      ) distinct_days
    ) grouped_days
    group by streak_group
  ) runs;

  insert into public.pet_streak_summaries (
    user_id,
    pet_id,
    current_streak,
    best_streak,
    last_completed_date_kst,
    today_completed,
    updated_at
  )
  values (
    p_user_id,
    p_pet_id,
    coalesce(v_current_streak, 0),
    coalesce(v_best_streak, 0),
    v_last_date,
    v_today_completed,
    timezone('utc', now())
  )
  on conflict (user_id, pet_id) do update
    set current_streak = excluded.current_streak,
        best_streak = greatest(public.pet_streak_summaries.best_streak, excluded.best_streak),
        last_completed_date_kst = excluded.last_completed_date_kst,
        today_completed = excluded.today_completed,
        updated_at = timezone('utc', now());
end;
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

  select coalesce(total_xp, 0), coalesce(level, 1)
    into v_previous_total, v_previous_level
  from public.user_level_summaries
  where user_id = v_actor_id;

  v_previous_total := coalesce(v_previous_total, 0);
  v_previous_level := coalesce(v_previous_level, 1);
  v_is_bonus := v_event_type in ('streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus');

  select count(*)::integer
    into v_daily_event_count
  from public.user_xp_ledger
  where user_id = v_actor_id
    and event_type = v_event_type
    and activity_date_kst = v_today;

  if v_daily_event_count >= v_daily_event_limit then
    return query
      select false, 0, v_previous_total, v_previous_level, false;
    return;
  end if;

  if v_is_bonus then
    v_effective_xp := v_base_xp;
  else
    select coalesce(sum(xp), 0)::integer
      into v_base_daily_sum
    from public.user_xp_ledger
    where user_id = v_actor_id
      and activity_date_kst = v_today
      and event_type not in ('streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus');

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
  returning xp into v_inserted_xp;

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

create or replace function public.record_pet_daily_activity_v1(
  p_pet_id uuid,
  p_source_type text,
  p_source_id text
)
returns table (
  current_streak integer,
  best_streak integer,
  today_completed boolean,
  inserted boolean,
  show_celebration boolean,
  activity_date_kst date
)
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
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
$$;

create or replace function public.remove_pet_daily_activity_source_v1(
  p_pet_id uuid,
  p_source_type text,
  p_source_id text
)
returns table (
  current_streak integer,
  best_streak integer,
  today_completed boolean,
  removed boolean,
  activity_date_kst date
)
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_source_type text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_source_id text := nullif(btrim(coalesce(p_source_id, '')), '');
  v_removed_count integer := 0;
  v_summary public.pet_streak_summaries%rowtype;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_pet_id is null or not public.owns_pet(p_pet_id) then
    raise exception 'NURI_PET_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  delete from public.pet_daily_activities
  where user_id = v_actor_id
    and pet_id = p_pet_id
    and source_type = v_source_type
    and source_id = v_source_id;

  get diagnostics v_removed_count = row_count;

  perform public.recompute_pet_streak_summary_v1(v_actor_id, p_pet_id);

  select *
    into v_summary
  from public.pet_streak_summaries
  where user_id = v_actor_id
    and pet_id = p_pet_id;

  return query
    select
      coalesce(v_summary.current_streak, 0),
      coalesce(v_summary.best_streak, 0),
      coalesce(v_summary.today_completed, false),
      v_removed_count > 0,
      public.nuri_kst_today_v1();
end;
$$;

create or replace function public.get_pet_daily_status_v1(
  p_pet_id uuid
)
returns table (
  current_streak integer,
  best_streak integer,
  today_completed boolean,
  last_completed_date_kst date,
  activity_date_kst date
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_today date := public.nuri_kst_today_v1();
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_pet_id is null or not public.owns_pet(p_pet_id) then
    raise exception 'NURI_PET_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  return query
    select
      coalesce(s.current_streak, 0),
      coalesce(s.best_streak, 0),
      exists (
        select 1
        from public.pet_daily_activities pda
        where pda.user_id = v_actor_id
          and pda.pet_id = p_pet_id
          and pda.activity_date_kst = v_today
      ) as today_completed,
      s.last_completed_date_kst,
      v_today
    from public.pet_streak_summaries s
    where s.user_id = v_actor_id
      and s.pet_id = p_pet_id;

  if not found then
    return query select 0, 0, false, null::date, v_today;
  end if;
end;
$$;

create or replace function public.get_user_notification_unread_count_v1()
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select (
    select count(*)::integer
    from public.user_notifications n
    where n.user_id = v_actor_id
      and n.read_at is null
  ) + (
    select count(*)::integer
    from public.announcements a
    where a.is_active = true
      and a.target_scope = 'all'
      and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
      and (a.expires_at is null or a.expires_at > timezone('utc', now()))
      and not exists (
        select 1
        from public.user_notification_reads r
        where r.user_id = v_actor_id
          and r.announcement_id = a.id
      )
  )
    into v_count;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.get_user_notifications_v1(
  p_limit integer default 50
)
returns table (
  notification_id uuid,
  notification_source text,
  title text,
  body text,
  type text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return query
    select *
    from (
      select
        n.id as notification_id,
        'user'::text as notification_source,
        n.title,
        n.body,
        n.type,
        n.read_at,
        n.created_at
      from public.user_notifications n
      where n.user_id = v_actor_id

      union all

      select
        a.id as notification_id,
        'announcement'::text as notification_source,
        a.title,
        a.body,
        a.type,
        r.read_at,
        a.created_at
      from public.announcements a
      left join public.user_notification_reads r
        on r.announcement_id = a.id
       and r.user_id = v_actor_id
      where a.is_active = true
        and a.target_scope = 'all'
        and (a.starts_at is null or a.starts_at <= timezone('utc', now()))
        and (a.expires_at is null or a.expires_at > timezone('utc', now()))
    ) rows
    order by rows.created_at desc, rows.notification_id desc
    limit v_limit;
end;
$$;

create or replace function public.mark_user_notification_read_v1(
  p_notification_id uuid,
  p_notification_source text default 'user'
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_source text := nullif(btrim(coalesce(p_notification_source, '')), '');
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if p_notification_id is null then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if v_source = 'user' then
    update public.user_notifications
      set read_at = coalesce(read_at, timezone('utc', now()))
    where id = p_notification_id
      and user_id = v_actor_id;
  elsif v_source = 'announcement' then
    insert into public.user_notification_reads (user_id, announcement_id, read_at)
    values (v_actor_id, p_notification_id, timezone('utc', now()))
    on conflict (user_id, announcement_id) do update
      set read_at = excluded.read_at;
  else
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  return public.get_user_notification_unread_count_v1();
end;
$$;

create or replace function public.get_user_level_summary_v1()
returns table (
  total_xp integer,
  level integer,
  current_level_xp integer,
  next_level_xp integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_summary public.user_level_summaries%rowtype;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  select *
    into v_summary
  from public.user_level_summaries
  where user_id = v_actor_id;

  if v_summary.user_id is null then
    return query
      select 0, 1, 0, 100, null::timestamptz;
    return;
  end if;

  return query
    select
      v_summary.total_xp,
      v_summary.level,
      public.nuri_level_floor_xp_v1(v_summary.level),
      public.nuri_level_next_xp_v1(v_summary.level),
      v_summary.updated_at;
end;
$$;

create or replace function public.get_user_titles_v1()
returns table (
  title_key text,
  title_name text,
  earned_at timestamptz,
  source_type text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  return query
    select t.title_key, t.title_name, t.earned_at, t.source_type
    from public.user_titles t
    where t.user_id = v_actor_id
    order by t.earned_at desc, t.title_name asc;
end;
$$;

revoke all on function public.nuri_kst_today_v1() from public, anon, authenticated, service_role;
revoke all on function public.calculate_nuri_level_v1(integer) from public, anon, authenticated, service_role;
revoke all on function public.nuri_level_floor_xp_v1(integer) from public, anon, authenticated, service_role;
revoke all on function public.nuri_level_next_xp_v1(integer) from public, anon, authenticated, service_role;
revoke all on function public.sync_user_titles_v1(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.recompute_pet_streak_summary_v1(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_pet_daily_activity_v1(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.remove_pet_daily_activity_source_v1(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.get_pet_daily_status_v1(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_user_notification_unread_count_v1() from public, anon, authenticated, service_role;
revoke all on function public.get_user_notifications_v1(integer) from public, anon, authenticated, service_role;
revoke all on function public.mark_user_notification_read_v1(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.award_user_activity_xp_v1(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.get_user_level_summary_v1() from public, anon, authenticated, service_role;
revoke all on function public.get_user_titles_v1() from public, anon, authenticated, service_role;

grant execute on function public.record_pet_daily_activity_v1(uuid, text, text) to authenticated;
grant execute on function public.remove_pet_daily_activity_source_v1(uuid, text, text) to authenticated;
grant execute on function public.get_pet_daily_status_v1(uuid) to authenticated;
grant execute on function public.get_user_notification_unread_count_v1() to authenticated;
grant execute on function public.get_user_notifications_v1(integer) to authenticated;
grant execute on function public.mark_user_notification_read_v1(uuid, text) to authenticated;
grant execute on function public.award_user_activity_xp_v1(uuid, text, text, text) to authenticated;
grant execute on function public.get_user_level_summary_v1() to authenticated;
grant execute on function public.get_user_titles_v1() to authenticated;

comment on table public.pet_daily_activities
  is 'V1.1 user+pet scoped daily activity ledger for streak recognition. Client access is read-only through RLS; writes use RPC.';
comment on table public.user_notifications
  is 'V1.1 app-internal user notification read path. Push delivery and operator sender UI are excluded.';
comment on table public.user_xp_ledger
  is 'V1.1 XP ledger with source event idempotency and user isolation.';

commit;

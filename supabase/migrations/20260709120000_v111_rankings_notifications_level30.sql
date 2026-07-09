begin;

set local search_path = public, pg_catalog;

-- V1.1.1 advanced foundation:
-- - extend the existing XP level contract from Lv.1~10 to Lv.1~30
-- - add safe admin notification groundwork without exposing app-internal admin UI
-- - add a QA-only self notification RPC for live retention smoke without service_role secrets
-- - add read-only long summary and privacy-limited ranking RPCs
-- All changes are additive or non-breaking function replacements.

alter table public.user_notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.user_level_summaries
  drop constraint if exists user_level_summaries_level_check;

alter table public.user_level_summaries
  drop constraint if exists user_level_summaries_level_range_v111_check;

alter table public.user_level_summaries
  add constraint user_level_summaries_level_range_v111_check
  check (level between 1 and 30) not valid;

alter table public.user_level_summaries
  validate constraint user_level_summaries_level_range_v111_check;

create or replace function public.calculate_nuri_level_v1(
  p_total_xp integer
)
returns integer
language sql
immutable
set search_path = public, pg_catalog
as $$
  select case
    when coalesce(p_total_xp, 0) >= 170400 then 30
    when coalesce(p_total_xp, 0) >= 148700 then 29
    when coalesce(p_total_xp, 0) >= 129000 then 28
    when coalesce(p_total_xp, 0) >= 111200 then 27
    when coalesce(p_total_xp, 0) >= 95200 then 26
    when coalesce(p_total_xp, 0) >= 80900 then 25
    when coalesce(p_total_xp, 0) >= 68200 then 24
    when coalesce(p_total_xp, 0) >= 57000 then 23
    when coalesce(p_total_xp, 0) >= 47200 then 22
    when coalesce(p_total_xp, 0) >= 38700 then 21
    when coalesce(p_total_xp, 0) >= 31400 then 20
    when coalesce(p_total_xp, 0) >= 25200 then 19
    when coalesce(p_total_xp, 0) >= 20000 then 18
    when coalesce(p_total_xp, 0) >= 15700 then 17
    when coalesce(p_total_xp, 0) >= 12200 then 16
    when coalesce(p_total_xp, 0) >= 9400 then 15
    when coalesce(p_total_xp, 0) >= 7200 then 14
    when coalesce(p_total_xp, 0) >= 5500 then 13
    when coalesce(p_total_xp, 0) >= 4200 then 12
    when coalesce(p_total_xp, 0) >= 3200 then 11
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
    when p_level >= 30 then 170400
    when p_level = 29 then 148700
    when p_level = 28 then 129000
    when p_level = 27 then 111200
    when p_level = 26 then 95200
    when p_level = 25 then 80900
    when p_level = 24 then 68200
    when p_level = 23 then 57000
    when p_level = 22 then 47200
    when p_level = 21 then 38700
    when p_level = 20 then 31400
    when p_level = 19 then 25200
    when p_level = 18 then 20000
    when p_level = 17 then 15700
    when p_level = 16 then 12200
    when p_level = 15 then 9400
    when p_level = 14 then 7200
    when p_level = 13 then 5500
    when p_level = 12 then 4200
    when p_level = 11 then 3200
    when p_level = 10 then 2500
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
    when p_level >= 30 then 170400
    when p_level = 29 then 170400
    when p_level = 28 then 148700
    when p_level = 27 then 129000
    when p_level = 26 then 111200
    when p_level = 25 then 95200
    when p_level = 24 then 80900
    when p_level = 23 then 68200
    when p_level = 22 then 57000
    when p_level = 21 then 47200
    when p_level = 20 then 38700
    when p_level = 19 then 31400
    when p_level = 18 then 25200
    when p_level = 17 then 20000
    when p_level = 16 then 15700
    when p_level = 15 then 12200
    when p_level = 14 then 9400
    when p_level = 13 then 7200
    when p_level = 12 then 5500
    when p_level = 11 then 4200
    when p_level = 10 then 3200
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

update public.user_level_summaries s
set level = public.calculate_nuri_level_v1(s.total_xp),
    updated_at = timezone('utc', now())
where s.level is distinct from public.calculate_nuri_level_v1(s.total_xp);

create or replace function public.is_nuri_notification_admin_v1()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'super_admin')
    );
$$;

create or replace function public.is_nuri_qa_fixture_user_v1()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and lower(p.nickname::text) in (
        'adminqa',
        'adminqa3',
        'adminqa4',
        'adminqa5',
        'adminqa6',
        'adminqa7',
        'adminqa8'
      )
  );
$$;

create table if not exists public.admin_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null default 'notice',
  metadata jsonb not null default '{}'::jsonb,
  send_status text not null default 'sent',
  notification_id uuid references public.user_notifications(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  disabled_at timestamptz,
  constraint admin_notification_campaigns_type_check
    check (notification_type in ('notice', 'account', 'service', 'event')),
  constraint admin_notification_campaigns_status_check
    check (send_status in ('draft', 'sent', 'disabled', 'failed')),
  constraint admin_notification_campaigns_title_not_blank
    check (btrim(title) <> ''),
  constraint admin_notification_campaigns_body_not_blank
    check (btrim(body) <> '')
);

create table if not exists public.admin_notification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  campaign_id uuid references public.admin_notification_campaigns(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  notification_id uuid references public.user_notifications(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_notification_audit_logs_action_not_blank
    check (btrim(action) <> '')
);

alter table public.admin_notification_campaigns enable row level security;
alter table public.admin_notification_audit_logs enable row level security;

drop policy if exists admin_notification_campaigns_admin_select
  on public.admin_notification_campaigns;
create policy admin_notification_campaigns_admin_select
  on public.admin_notification_campaigns
  for select
  to authenticated
  using (public.is_nuri_notification_admin_v1());

drop policy if exists admin_notification_audit_logs_admin_select
  on public.admin_notification_audit_logs;
create policy admin_notification_audit_logs_admin_select
  on public.admin_notification_audit_logs
  for select
  to authenticated
  using (public.is_nuri_notification_admin_v1());

create or replace function public.admin_send_user_notification_v1(
  p_target_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'notice',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_type text := nullif(btrim(coalesce(p_type, 'notice')), '');
  v_campaign_id uuid;
  v_notification_id uuid;
begin
  if v_actor_id is null or not public.is_nuri_notification_admin_v1() then
    raise exception 'NURI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if p_target_user_id is null or v_title is null or v_body is null then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if v_type not in ('notice', 'account', 'service', 'event') then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'NURI_NOTIFICATION_TARGET_INVALID'
      using errcode = '22023';
  end if;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    type,
    metadata
  )
  values (
    p_target_user_id,
    v_title,
    v_body,
    v_type,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_notification_id;

  insert into public.admin_notification_campaigns (
    created_by,
    target_user_id,
    title,
    body,
    notification_type,
    metadata,
    send_status,
    notification_id,
    sent_at
  )
  values (
    v_actor_id,
    p_target_user_id,
    v_title,
    v_body,
    v_type,
    coalesce(p_metadata, '{}'::jsonb),
    'sent',
    v_notification_id,
    timezone('utc', now())
  )
  returning id into v_campaign_id;

  insert into public.admin_notification_audit_logs (
    actor_user_id,
    action,
    campaign_id,
    target_user_id,
    notification_id,
    details
  )
  values (
    v_actor_id,
    'send_user_notification',
    v_campaign_id,
    p_target_user_id,
    v_notification_id,
    jsonb_build_object('type', v_type)
  );

  return v_notification_id;
end;
$$;

create or replace function public.create_qa_user_notification_v1(
  p_title text default 'QA_RETENTION_NOTICE',
  p_body text default 'home quick dismiss와 inbox delete 분리 live smoke용 알림입니다.'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_notification_id uuid;
  v_today_count integer;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if not public.is_nuri_qa_fixture_user_v1() then
    raise exception 'NURI_QA_USER_REQUIRED'
      using errcode = '42501';
  end if;

  if v_title is null or v_title not like 'QA_RETENTION_%' then
    raise exception 'NURI_QA_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  select count(*)::integer
    into v_today_count
  from public.user_notifications n
  where n.user_id = v_actor_id
    and n.title like 'QA_RETENTION_%'
    and timezone('Asia/Seoul', n.created_at)::date = public.nuri_kst_today_v1();

  if coalesce(v_today_count, 0) >= 5 then
    raise exception 'NURI_QA_NOTIFICATION_DAILY_LIMIT'
      using errcode = '22023';
  end if;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    type,
    metadata
  )
  values (
    v_actor_id,
    v_title,
    coalesce(v_body, 'QA notification retention smoke'),
    'notice',
    jsonb_build_object('qa', true, 'purpose', 'notification_retention_live_smoke')
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create table if not exists public.activity_ranking_qa_fixtures (
  id uuid primary key default gen_random_uuid(),
  fixture_key text not null unique,
  display_name text not null,
  total_xp integer not null check (total_xp >= 0),
  level integer not null check (level between 1 and 30),
  walk_score integer not null default 0 check (walk_score >= 0),
  post_score integer not null default 0 check (post_score >= 0),
  comment_score integer not null default 0 check (comment_score >= 0),
  health_score integer not null default 0 check (health_score >= 0),
  life_score integer not null default 0 check (life_score >= 0),
  grooming_score integer not null default 0 check (grooming_score >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.activity_ranking_qa_fixtures enable row level security;

drop policy if exists activity_ranking_qa_fixtures_admin_select
  on public.activity_ranking_qa_fixtures;
create policy activity_ranking_qa_fixtures_admin_select
  on public.activity_ranking_qa_fixtures
  for select
  to authenticated
  using (public.is_nuri_notification_admin_v1());

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
  ('adminQA3', 'adminQA3', 170400, 30, 980, 132, 84, 45, 36, 14),
  ('adminQA4', 'adminQA4', 95200, 26, 720, 88, 112, 32, 24, 8),
  ('adminQA5', 'adminQA5', 57000, 23, 410, 156, 26, 58, 18, 5),
  ('adminQA6', 'adminQA6', 31400, 20, 260, 48, 64, 20, 54, 11),
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

create or replace function public.get_user_activity_long_summary_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  with ledger as (
    select
      coalesce(sum(l.xp), 0)::integer as total_xp,
      coalesce(sum(l.xp) filter (
        where l.event_type in (
          'walk_record',
          'walk_timeline_post',
          'streak_3_bonus',
          'streak_7_bonus',
          'streak_30_bonus'
        )
      ), 0)::integer as walk_xp,
      coalesce(sum(l.xp) filter (
        where l.event_type in ('timeline_post', 'walk_timeline_post')
      ), 0)::integer as timeline_xp,
      coalesce(sum(l.xp) filter (where l.event_type = 'health_record'), 0)::integer as health_xp,
      coalesce(sum(l.xp) filter (where l.event_type = 'community_post'), 0)::integer as community_xp,
      coalesce(sum(l.xp) filter (where l.event_type = 'comment'), 0)::integer as comment_xp,
      count(*)::integer as ledger_count
    from public.user_xp_ledger l
    where l.user_id = v_actor_id
  ),
  memories_by_category as (
    select
      count(*) filter (where m.category = 'walk')::integer as walk_count,
      count(*) filter (where m.category = 'meal')::integer as meal_count,
      count(*) filter (where m.category = 'health')::integer as health_count,
      count(*) filter (where m.category = 'diary')::integer as diary_count,
      count(*) filter (where m.category = 'other')::integer as life_count,
      count(*) filter (where m.sub_category = 'grooming')::integer as grooming_count
    from public.memories m
    where m.user_id = v_actor_id
  ),
  community as (
    select
      coalesce((
        select count(*)::integer
        from public.posts p
        where p.user_id = v_actor_id
          and p.deleted_at is null
          and p.status = 'active'
      ), 0) as post_count,
      coalesce((
        select count(*)::integer
        from public.comments c
        where c.user_id = v_actor_id
          and c.deleted_at is null
          and c.status = 'active'
      ), 0) as comment_count
  )
  select jsonb_build_object(
    'level', coalesce(s.level, 1),
    'totalXp', coalesce(s.total_xp, 0),
    'currentLevelXp', public.nuri_level_floor_xp_v1(coalesce(s.level, 1)),
    'nextLevelXp', public.nuri_level_next_xp_v1(coalesce(s.level, 1)),
    'ledger', to_jsonb(ledger),
    'memories', to_jsonb(memories_by_category),
    'community', to_jsonb(community)
  )
    into v_result
  from ledger
  cross join memories_by_category
  cross join community
  left join public.user_level_summaries s
    on s.user_id = v_actor_id;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.get_activity_ranking_v1(
  p_category text default 'overall',
  p_limit integer default 20,
  p_include_qa_fixture boolean default false
)
returns table (
  rank_no integer,
  display_name text,
  score integer,
  level integer,
  total_xp integer,
  category text,
  is_current_user boolean,
  row_source text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_category text := lower(nullif(btrim(coalesce(p_category, 'overall')), ''));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_include_qa boolean;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if v_category not in ('overall', 'walk', 'posts', 'comments', 'health', 'life', 'grooming') then
    v_category := 'overall';
  end if;

  v_include_qa := coalesce(p_include_qa_fixture, false)
    and public.is_nuri_qa_fixture_user_v1();

  return query
    with eligible_users as (
      select s.user_id, s.total_xp, s.level
      from public.user_level_summaries s
      where not exists (
        select 1
        from public.account_deletion_requests r
        where r.user_id = s.user_id
          and r.status in (
            'requested',
            'in_progress',
            'db_deleted',
            'cleanup_pending',
            'completed',
            'completed_with_cleanup_pending',
            'unknown_pending_confirmation'
          )
      )
    ),
    ledger_scores as (
      select
        l.user_id,
        coalesce(sum(l.xp) filter (
          where l.event_type in (
            'walk_record',
            'walk_timeline_post',
            'streak_3_bonus',
            'streak_7_bonus',
            'streak_30_bonus'
          )
        ), 0)::integer as walk_score,
        count(*) filter (
          where l.event_type in ('timeline_post', 'walk_timeline_post', 'community_post')
        )::integer as post_score,
        count(*) filter (where l.event_type = 'comment')::integer as comment_score,
        count(*) filter (where l.event_type = 'health_record')::integer as health_score
      from public.user_xp_ledger l
      group by l.user_id
    ),
    memory_scores as (
      select
        m.user_id,
        count(*) filter (where m.category = 'other')::integer as life_score,
        count(*) filter (where m.sub_category = 'grooming')::integer as grooming_score
      from public.memories m
      group by m.user_id
    ),
    real_rows as (
      select
        case v_category
          when 'overall' then eu.total_xp
          when 'walk' then coalesce(ls.walk_score, 0)
          when 'posts' then coalesce(ls.post_score, 0)
          when 'comments' then coalesce(ls.comment_score, 0)
          when 'health' then coalesce(ls.health_score, 0)
          when 'life' then coalesce(ms.life_score, 0)
          when 'grooming' then coalesce(ms.grooming_score, 0)
          else eu.total_xp
        end::integer as score,
        eu.level::integer as level,
        eu.total_xp::integer as total_xp,
        v_category as category,
        (eu.user_id = v_actor_id) as is_current_user,
        'user'::text as row_source,
        null::text as fixture_name
      from eligible_users eu
      left join ledger_scores ls
        on ls.user_id = eu.user_id
      left join memory_scores ms
        on ms.user_id = eu.user_id
    ),
    fixture_rows as (
      select
        case v_category
          when 'overall' then f.total_xp
          when 'walk' then f.walk_score
          when 'posts' then f.post_score
          when 'comments' then f.comment_score
          when 'health' then f.health_score
          when 'life' then f.life_score
          when 'grooming' then f.grooming_score
          else f.total_xp
        end::integer as score,
        f.level::integer as level,
        f.total_xp::integer as total_xp,
        v_category as category,
        false as is_current_user,
        'qa_fixture'::text as row_source,
        f.display_name as fixture_name
      from public.activity_ranking_qa_fixtures f
      where v_include_qa = true
        and f.is_active = true
    ),
    union_rows as (
      select * from real_rows
      union all
      select * from fixture_rows
    ),
    ranked as (
      select
        row_number() over (
          order by union_rows.score desc,
                   union_rows.total_xp desc,
                   union_rows.level desc,
                   union_rows.row_source asc,
                   coalesce(union_rows.fixture_name, '') asc
        )::integer as rank_no,
        union_rows.score,
        union_rows.level,
        union_rows.total_xp,
        union_rows.category,
        union_rows.is_current_user,
        union_rows.row_source,
        union_rows.fixture_name
      from union_rows
      where union_rows.score > 0
    )
    select
      ranked.rank_no,
      case
        when ranked.is_current_user then '나'
        when ranked.row_source = 'qa_fixture' then ranked.fixture_name
        else '누리 친구 ' || ranked.rank_no::text
      end as display_name,
      ranked.score,
      ranked.level,
      ranked.total_xp,
      ranked.category,
      ranked.is_current_user,
      ranked.row_source
    from ranked
    order by ranked.rank_no
    limit v_limit;
end;
$$;

revoke all on function public.is_nuri_notification_admin_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.is_nuri_qa_fixture_user_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.admin_send_user_notification_v1(uuid, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.create_qa_user_notification_v1(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.get_user_activity_long_summary_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.get_activity_ranking_v1(text, integer, boolean)
  from public, anon, authenticated, service_role;

grant execute on function public.is_nuri_notification_admin_v1()
  to authenticated;
grant execute on function public.is_nuri_qa_fixture_user_v1()
  to authenticated;
grant execute on function public.admin_send_user_notification_v1(uuid, text, text, text, jsonb)
  to authenticated;
grant execute on function public.create_qa_user_notification_v1(text, text)
  to authenticated;
grant execute on function public.get_user_activity_long_summary_v1()
  to authenticated;
grant execute on function public.get_activity_ranking_v1(text, integer, boolean)
  to authenticated;

comment on column public.user_notifications.metadata
  is 'Optional internal metadata for admin/QA-generated app notifications. It is not returned by the public app notification read RPC.';
comment on table public.admin_notification_campaigns
  is 'V1.1.1 admin notification groundwork. Admin-only RPC materializes user_notifications and records audit evidence; no app-internal general-user sender UI.';
comment on table public.activity_ranking_qa_fixtures
  is 'QA-only deterministic ranking fixtures. Included only when the caller is an approved adminQA fixture user and explicitly requests fixture ranking rows.';
comment on function public.get_activity_ranking_v1(text, integer, boolean)
  is 'Privacy-limited NURI activity ranking RPC. It returns masked display labels and no email/user_id/raw identifiers.';

commit;

-- NURI 커뮤니티 운영 스키마 최종본
-- 작성일: 2026-03-23
-- 작성 기준:
-- - docs/커뮤니티-기획/커뮤니티-실서비스급-아키텍처-기획서.md
-- - docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql
--
-- 목적:
-- - 기존 public.posts / comments / likes / reports / audit_logs seed 구조를
--   커뮤니티 MVP + 운영/모더레이션 기준까지 확장하는 최종 목표 SQL이다.
-- - 이 파일은 전체 목표 상태를 한 번에 보여주는 기준본이다.
-- - 실제 적용은 1단계/2단계/3단계 분리 SQL을 우선 권장한다.
--
-- 주의:
-- - image_url 컬럼은 signed URL이 아니라 storage path 저장을 전제로 한다.
-- - 삭제의 source of truth는 deleted_at 이다. status = 'deleted'는 deleted_at과 함께만 사용한다.
-- - auto_hidden 임계값은 PO 승인값 기준으로 posts/comments 신고 누적 트리거에 포함한다.
-- - 현재 프로젝트 role 체계는 public.profiles.role 에 admin / super_admin 존재를 전제한다.
-- - 게시/댓글/신고 rate limiting은 앱 debounce가 아니라 DB trigger 기준 계약을 source of truth로 본다.

begin;

-- ============================================================
-- 1) POSTS 보강
-- ============================================================
alter table public.posts
  add column if not exists title text,
  add column if not exists status text not null default 'active',
  add column if not exists category text,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists report_count integer not null default 0,
  add column if not exists author_snapshot_nickname text,
  add column if not exists author_snapshot_avatar_url text,
  add column if not exists pet_snapshot_name text,
  add column if not exists pet_snapshot_species text,
  add column if not exists pet_snapshot_breed text,
  add column if not exists pet_snapshot_age_label text,
  add column if not exists pet_snapshot_avatar_path text,
  add column if not exists show_pet_age boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists operator_memo text;

update public.posts
set title = coalesce(
  nullif(left(btrim(split_part(content, E'\n', 1)), 80), ''),
  left(btrim(content), 80)
)
where title is null
   or btrim(title) = '';

alter table public.posts
  alter column title set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_status_check'
  ) then
    alter table public.posts
      add constraint posts_status_check
      check (status in ('active', 'hidden', 'auto_hidden', 'deleted', 'banned'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_title_length_check'
  ) then
    alter table public.posts
      add constraint posts_title_length_check
      check (char_length(btrim(title)) between 1 and 80);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_deleted_consistency_check'
  ) then
    alter table public.posts
      add constraint posts_deleted_consistency_check
      check (
        (deleted_at is null and status <> 'deleted')
        or (deleted_at is not null and status = 'deleted')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_check'
  ) then
    alter table public.posts
      add constraint posts_category_check
      check (category is null or category in ('free', 'question', 'info', 'daily'));
  end if;
end
$$;

create index if not exists idx_posts_active_public_feed
  on public.posts (created_at desc, id desc)
  where visibility = 'public' and status = 'active' and deleted_at is null;

create index if not exists idx_posts_category_active_public_feed
  on public.posts (category, created_at desc, id desc)
  where visibility = 'public' and status = 'active' and deleted_at is null;

drop index if exists idx_posts_user_created_at;
create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists idx_posts_status_created_at
  on public.posts (status, created_at desc, id desc);

-- ============================================================
-- 2) COMMENTS 보강
-- ============================================================
alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists depth smallint not null default 0,
  add column if not exists reply_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'active';

alter table public.comments
  drop constraint if exists comments_status_check;

alter table public.comments
  add constraint comments_status_check
  check (status in ('active', 'hidden', 'auto_hidden', 'deleted'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_depth_check'
  ) then
    alter table public.comments
      add constraint comments_depth_check
      check (depth in (0, 1));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_depth_parent_consistency_check'
  ) then
    alter table public.comments
      add constraint comments_depth_parent_consistency_check
      check (
        (depth = 0 and parent_comment_id is null)
        or (depth = 1 and parent_comment_id is not null)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_parent_not_self_check'
  ) then
    alter table public.comments
      add constraint comments_parent_not_self_check
      check (parent_comment_id is null or parent_comment_id <> id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_deleted_consistency_check'
  ) then
    alter table public.comments
      add constraint comments_deleted_consistency_check
      check (
        (deleted_at is null and status <> 'deleted')
        or (deleted_at is not null and status = 'deleted')
      );
  end if;
end
$$;

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create index if not exists idx_comments_post_parent_created_at
  on public.comments (post_id, parent_comment_id, created_at asc, id asc);

create index if not exists idx_comments_parent_created_at
  on public.comments (parent_comment_id, created_at asc, id asc)
  where parent_comment_id is not null;

create index if not exists idx_comments_post_active_created_at
  on public.comments (post_id, created_at asc, id asc)
  where status = 'active' and deleted_at is null;

create index if not exists idx_comments_user_created_at
  on public.comments (user_id, created_at desc, id desc);

create index if not exists idx_comments_post_like_rank
  on public.comments (post_id, like_count desc, created_at asc, id asc)
  where parent_comment_id is null and status = 'active' and deleted_at is null;

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_comment_likes_comment_user unique (comment_id, user_id)
);

create index if not exists idx_comment_likes_comment
  on public.comment_likes (comment_id, created_at desc);

create index if not exists idx_comment_likes_user
  on public.comment_likes (user_id, created_at desc);

-- ============================================================
-- 3) REPORTS 보강
-- ============================================================
alter table public.reports
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists operator_memo text,
  add column if not exists reason_category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_reason_category_check'
  ) then
    alter table public.reports
      add constraint reports_reason_category_check
      check (
        reason_category is null
        or reason_category in (
          'spam',
          'hate',
          'advertising',
          'misinformation',
          'personal_info',
          'other'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_status_check'
  ) then
    alter table public.reports
      add constraint reports_status_check
      check (
        status in (
          'open',
          'triaged',
          'reviewing',
          'resolved',
          'rejected',
          'resolved_actioned',
          'resolved_no_action',
          'rejected_abuse'
        )
      );
  end if;
end
$$;

create unique index if not exists uq_reports_reporter_target
  on public.reports (reporter_id, target_type, target_id);

create index if not exists idx_reports_target
  on public.reports (target_type, target_id, created_at desc);

-- ============================================================
-- 4) MODERATION / TRACKING TABLES
-- ============================================================
create table if not exists public.community_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  content_status_snapshot text not null,
  report_count integer not null default 0,
  unique_reporter_count integer not null default 0,
  latest_reported_at timestamptz,
  queue_status text not null default 'open',
  priority integer not null default 0,
  assigned_to uuid references auth.users(id) on delete set null,
  decision text,
  decision_reason text,
  operator_memo text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_community_moderation_queue_target unique (target_type, target_id),
  constraint community_moderation_queue_target_type_check
    check (target_type in ('post', 'comment')),
  constraint community_moderation_queue_status_check
    check (queue_status in ('open', 'triaged', 'reviewing', 'resolved'))
);

create index if not exists idx_community_moderation_queue_priority
  on public.community_moderation_queue (priority desc, latest_reported_at desc, created_at desc);

create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  before_status text,
  after_status text,
  source_report_id uuid references public.reports(id) on delete set null,
  reason_code text,
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint community_moderation_actions_target_type_check
    check (target_type in ('post', 'comment'))
);

create index if not exists idx_community_moderation_actions_target
  on public.community_moderation_actions (target_type, target_id, created_at desc);

create table if not exists public.community_reporter_flags (
  reporter_id uuid primary key references auth.users(id) on delete cascade,
  flag_status text not null default 'clear',
  rate_limit_hit_count integer not null default 0,
  rejected_abuse_count integer not null default 0,
  last_reported_at timestamptz,
  last_rate_limited_at timestamptz,
  last_rejected_abuse_at timestamptz,
  operator_memo text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint community_reporter_flags_status_check
    check (flag_status in ('clear', 'watch'))
);

create table if not exists public.community_image_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  storage_bucket text not null default 'community-images',
  user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  upload_status text not null default 'uploaded',
  source_post_status text,
  cleanup_reason text,
  attached_at timestamptz,
  cleanup_requested_at timestamptz,
  cleanup_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint community_image_assets_status_check
    check (upload_status in ('uploaded', 'attached', 'cleanup_pending', 'cleaned_up'))
);

create index if not exists idx_community_image_assets_post
  on public.community_image_assets (post_id, upload_status, created_at desc);

create index if not exists idx_community_image_assets_user
  on public.community_image_assets (user_id, created_at desc);

-- ============================================================
-- 5) AUDIT LOGS 보강
-- ============================================================
create index if not exists idx_audit_logs_user_id
  on public.audit_logs (user_id, created_at desc);

-- ============================================================
-- 6) ADMIN / MODERATION HELPER
-- ============================================================
create or replace function public.is_community_admin()
returns boolean
language plpgsql
stable
as $$
declare
  is_admin boolean := false;
begin
  begin
    select exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
    )
    into is_admin;
  exception
    when undefined_column then
      return false;
  end;

  return coalesce(is_admin, false);
end;
$$;

create or replace function public.community_normalize_text(input_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(btrim(coalesce(input_text, ''))), '\s+', ' ', 'g');
$$;

create or replace function public.is_active_community_report_status(target_status text)
returns boolean
language sql
immutable
as $$
  select coalesce(target_status, 'open') in ('open', 'triaged', 'reviewing');
$$;

create or replace function public.assert_community_actor_id_is_active(
  target_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  actor_deleted_at timestamptz := null;
  actor_banned_until timestamptz := null;
begin
  if target_actor_id is null then
    raise exception '로그인 후 다시 시도해 주세요.';
  end if;

  begin
    select u.deleted_at, u.banned_until
    into actor_deleted_at, actor_banned_until
    from auth.users u
    where u.id = target_actor_id;

    if actor_deleted_at is not null then
      raise exception '현재 계정 상태로는 커뮤니티 작업을 할 수 없어요. 운영팀에 문의해 주세요.';
    end if;

    if actor_banned_until is not null and actor_banned_until > timezone('utc', now()) then
      raise exception '현재 계정 상태로는 커뮤니티 작업을 할 수 없어요. 운영팀에 문의해 주세요.';
    end if;
  exception
    when undefined_column then
      return;
  end;
end;
$$;

create or replace function public.assert_community_actor_is_active()
returns void
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  perform public.assert_community_actor_id_is_active(auth.uid());
end;
$$;

create or replace function public.bump_community_reporter_rate_limit(
  target_reporter_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 주의:
  -- - report insert trigger 안에서 이 함수를 호출하면 failed transaction과 함께 rollback된다.
  -- - 실제 rate-limit trace 영속화는 차단 응답 직후 follow-up RPC에서 이 함수를 다시 호출하는 경로를 기준으로 본다.
  if target_reporter_id is null then
    return;
  end if;

  insert into public.community_reporter_flags (
    reporter_id,
    flag_status,
    rate_limit_hit_count,
    last_reported_at,
    last_rate_limited_at
  )
  values (
    target_reporter_id,
    'watch',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (reporter_id) do update
  set
    flag_status = 'watch',
    rate_limit_hit_count = public.community_reporter_flags.rate_limit_hit_count + 1,
    last_reported_at = timezone('utc', now()),
    last_rate_limited_at = timezone('utc', now()),
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.bump_community_reporter_rejected_abuse(
  target_reporter_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_reporter_id is null then
    return;
  end if;

  insert into public.community_reporter_flags (
    reporter_id,
    flag_status,
    rejected_abuse_count,
    last_reported_at,
    last_rejected_abuse_at
  )
  values (
    target_reporter_id,
    'watch',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (reporter_id) do update
  set
    flag_status = 'watch',
    rejected_abuse_count = public.community_reporter_flags.rejected_abuse_count + 1,
    last_reported_at = timezone('utc', now()),
    last_rejected_abuse_at = timezone('utc', now()),
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.set_community_target_status(
  p_target_type text,
  p_target_id uuid,
  p_after_status text,
  p_action_type text,
  p_reason_code text default null,
  p_source_report_id uuid default null,
  p_memo text default null,
  p_actor_id uuid default null,
  p_queue_status text default null,
  p_decision text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_before_status text := null;
  v_trimmed_memo text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  if p_target_type not in ('post', 'comment') then
    raise exception '지원하지 않는 moderation 대상입니다.';
  end if;

  if p_target_type = 'post' then
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted', 'banned') then
      raise exception '지원하지 않는 게시글 상태입니다.';
    end if;

    select status into v_before_status
    from public.posts
    where id = p_target_id;

    if v_before_status is null then
      raise exception 'moderation 대상 게시글을 찾을 수 없어요.';
    end if;

    update public.posts
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      moderated_at = v_now,
      moderated_by = p_actor_id,
      operator_memo = coalesce(v_trimmed_memo, operator_memo)
    where id = p_target_id;
  else
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted') then
      raise exception '지원하지 않는 댓글 상태입니다.';
    end if;

    select status into v_before_status
    from public.comments
    where id = p_target_id;

    if v_before_status is null then
      raise exception 'moderation 대상 댓글을 찾을 수 없어요.';
    end if;

    update public.comments
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      updated_at = v_now
    where id = p_target_id;
  end if;

  insert into public.community_moderation_actions (
    action_type,
    actor_id,
    target_type,
    target_id,
    before_status,
    after_status,
    source_report_id,
    reason_code,
    memo
  )
  values (
    p_action_type,
    p_actor_id,
    p_target_type,
    p_target_id,
    v_before_status,
    p_after_status,
    p_source_report_id,
    p_reason_code,
    v_trimmed_memo
  );

  update public.community_moderation_queue
  set
    content_status_snapshot = p_after_status,
    queue_status = coalesce(p_queue_status, queue_status),
    decision = coalesce(p_decision, decision),
    decision_reason = coalesce(p_reason_code, decision_reason),
    operator_memo = coalesce(v_trimmed_memo, operator_memo),
    resolved_at = case
      when coalesce(p_queue_status, queue_status) = 'resolved' or p_decision is not null
        then coalesce(resolved_at, v_now)
      else resolved_at
    end,
    updated_at = v_now
  where target_type = p_target_type
    and target_id = p_target_id;

  return v_before_status;
end;
$$;

create or replace function public.refresh_community_moderation_queue(
  p_target_type text,
  p_target_id uuid,
  p_source_report_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_current_status text := null;
  v_report_count integer := 0;
  v_unique_reporter_count integer := 0;
  v_latest_reported_at timestamptz := null;
  v_has_personal_info boolean := false;
  v_has_hate boolean := false;
  v_priority integer := 0;
begin
  if p_target_type = 'post' then
    select status into v_current_status
    from public.posts
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    select status into v_current_status
    from public.comments
    where id = p_target_id;
  else
    return;
  end if;

  if v_current_status is null then
    return;
  end if;

  select
    count(*),
    count(distinct reporter_id),
    max(created_at),
    coalesce(bool_or(reason_category = 'personal_info'), false),
    coalesce(bool_or(reason_category = 'hate'), false)
  into
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    v_has_personal_info,
    v_has_hate
  from public.reports
  where target_type = p_target_type
    and target_id = p_target_id
    and public.is_active_community_report_status(status);

  if v_report_count = 0 then
    update public.community_moderation_queue
    set
      report_count = 0,
      unique_reporter_count = 0,
      latest_reported_at = null,
      content_status_snapshot = v_current_status,
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
    return;
  end if;

  v_priority := (
    case
      when v_has_personal_info or v_has_hate then 400
      when v_current_status = 'auto_hidden' then 300
      else 100
    end
  ) + least(v_unique_reporter_count, 99);

  insert into public.community_moderation_queue (
    target_type,
    target_id,
    content_status_snapshot,
    report_count,
    unique_reporter_count,
    latest_reported_at,
    queue_status,
    priority
  )
  values (
    p_target_type,
    p_target_id,
    v_current_status,
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    'open',
    v_priority
  )
  on conflict (target_type, target_id) do update
  set
    content_status_snapshot = excluded.content_status_snapshot,
    report_count = excluded.report_count,
    unique_reporter_count = excluded.unique_reporter_count,
    latest_reported_at = excluded.latest_reported_at,
    queue_status = case
      when public.community_moderation_queue.queue_status = 'resolved' then 'open'
      else public.community_moderation_queue.queue_status
    end,
    decision = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision
    end,
    decision_reason = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision_reason
    end,
    resolved_at = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.resolved_at
    end,
    priority = excluded.priority,
    updated_at = v_now;

  if p_target_type = 'post'
     and v_unique_reporter_count >= 3
     and v_current_status = 'active'
  then
    perform public.set_community_target_status(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  elsif p_target_type = 'comment'
     and v_unique_reporter_count >= 2
     and v_current_status = 'active'
  then
    perform public.set_community_target_status(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  end if;
end;
$$;

create or replace function public.apply_community_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_after_status text,
  p_reason_code text default null,
  p_source_report_id uuid default null,
  p_operator_memo text default null,
  p_queue_status text default 'resolved',
  p_report_status text default null,
  p_decision text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_next_report_status text := coalesce(
    p_report_status,
    case
      when p_after_status = 'active' then 'resolved_no_action'
      else 'resolved_actioned'
    end
  );
begin
  if not public.is_community_admin() then
    raise exception '운영 권한이 필요합니다.';
  end if;

  perform public.set_community_target_status(
    p_target_type,
    p_target_id,
    p_after_status,
    case
      when p_after_status = 'active' then 'restore'
      else 'manual_moderation'
    end,
    p_reason_code,
    p_source_report_id,
    p_operator_memo,
    auth.uid(),
    p_queue_status,
    coalesce(
      p_decision,
      case
        when p_after_status = 'active' then 'restored'
        else p_after_status
      end
    )
  );

  if p_source_report_id is not null then
    update public.reports
    set
      status = v_next_report_status,
      resolved_by = auth.uid(),
      resolved_at = v_now,
      operator_memo = coalesce(nullif(btrim(coalesce(p_operator_memo, '')), ''), operator_memo)
    where id = p_source_report_id;
  end if;
end;
$$;

create or replace function public.can_insert_community_comment(
  target_post_id uuid,
  target_parent_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if target_parent_comment_id is null then
    return exists (
      select 1
      from public.posts p
      where p.id = target_post_id
        and (
          public.is_community_admin()
          or p.user_id = auth.uid()
          or (
            p.visibility = 'public'
            and p.status = 'active'
            and p.deleted_at is null
          )
        )
    );
  end if;

  return exists (
    select 1
    from public.posts p
    join public.comments parent on parent.post_id = p.id
    where p.id = target_post_id
      and parent.id = target_parent_comment_id
      and parent.post_id = target_post_id
      and parent.parent_comment_id is null
      and parent.depth = 0
      and parent.deleted_at is null
      and parent.status = 'active'
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  );
end;
$$;

-- ============================================================
-- 6) COUNTER SYNC TRIGGERS
-- ============================================================
create or replace function public.guard_community_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  recent_5m_count integer := 0;
  recent_1h_count integer := 0;
  payload_hash text := md5(
    public.community_normalize_text(new.title) || '|' || public.community_normalize_text(new.content)
  );
begin
  perform public.assert_community_actor_is_active();

  if actor_id is null or new.user_id is distinct from actor_id then
    raise exception '본인 계정으로만 게시글을 작성할 수 있어요.';
  end if;

  select count(*)
  into recent_5m_count
  from public.posts p
  where p.user_id = actor_id
    and p.created_at >= timezone('utc', now()) - interval '5 minutes';

  select count(*)
  into recent_1h_count
  from public.posts p
  where p.user_id = actor_id
    and p.created_at >= timezone('utc', now()) - interval '1 hour';

  if recent_5m_count >= 3 or recent_1h_count >= 10 then
    raise exception '게시글은 5분에 3개, 1시간에 10개까지 작성할 수 있어요. 잠시 후 다시 시도해 주세요.';
  end if;

  if exists (
    select 1
    from public.posts p
    where p.user_id = actor_id
      and p.created_at >= timezone('utc', now()) - interval '30 seconds'
      and md5(
        public.community_normalize_text(p.title) || '|' || public.community_normalize_text(p.content)
      ) = payload_hash
  ) then
    raise exception '같은 제목과 본문은 30초 안에 다시 등록할 수 없어요.';
  end if;

  new.title := btrim(new.title);
  new.content := btrim(new.content);
  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'active');
  new.visibility := coalesce(new.visibility, 'public');
  return new;
end;
$$;

drop trigger if exists trg_guard_community_post_insert on public.posts;
create trigger trg_guard_community_post_insert
before insert on public.posts
for each row execute function public.guard_community_post_insert();

create or replace function public.guard_community_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  recent_1m_count integer := 0;
  recent_10m_count integer := 0;
  payload_hash text := md5(public.community_normalize_text(new.content));
begin
  perform public.assert_community_actor_is_active();

  if actor_id is null or new.user_id is distinct from actor_id then
    raise exception '본인 계정으로만 댓글을 작성할 수 있어요.';
  end if;

  select count(*)
  into recent_1m_count
  from public.comments c
  where c.user_id = actor_id
    and c.created_at >= timezone('utc', now()) - interval '1 minute';

  select count(*)
  into recent_10m_count
  from public.comments c
  where c.user_id = actor_id
    and c.created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_1m_count >= 5 or recent_10m_count >= 20 then
    raise exception '댓글은 1분에 5개, 10분에 20개까지 작성할 수 있어요. 잠시 후 다시 시도해 주세요.';
  end if;

  if exists (
    select 1
    from public.comments c
    where c.user_id = actor_id
      and c.post_id = new.post_id
      and c.created_at >= timezone('utc', now()) - interval '30 seconds'
      and md5(public.community_normalize_text(c.content)) = payload_hash
  ) then
    raise exception '같은 게시글에는 같은 댓글을 30초 안에 다시 등록할 수 없어요.';
  end if;

  new.content := btrim(new.content);
  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'active');
  return new;
end;
$$;

drop trigger if exists trg_guard_community_comment_insert on public.comments;
create trigger trg_guard_community_comment_insert
before insert on public.comments
for each row execute function public.guard_community_comment_insert();

create or replace function public.guard_community_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  recent_10m_count integer := 0;
  recent_1d_count integer := 0;
  target_owner_id uuid := null;
  target_status text := null;
  target_deleted_at timestamptz := null;
begin
  perform public.assert_community_actor_is_active();

  if actor_id is null or new.reporter_id is distinct from actor_id then
    raise exception '본인 계정으로만 신고할 수 있어요.';
  end if;

  if new.target_type = 'post' then
    select p.user_id, p.status, p.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.posts p
    where p.id = new.target_id;
  elsif new.target_type = 'comment' then
    select c.user_id, c.status, c.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.comments c
    where c.id = new.target_id;
  else
    raise exception '지원하지 않는 신고 대상입니다.';
  end if;

  if target_owner_id is null then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if target_owner_id = actor_id then
    raise exception '본인이 작성한 글이나 댓글은 신고할 수 없어요.';
  end if;

  if target_deleted_at is not null or target_status <> 'active' then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if exists (
    select 1
    from public.reports r
    where r.reporter_id = actor_id
      and r.target_type = new.target_type
      and r.target_id = new.target_id
  ) then
    return new;
  end if;

  select count(*)
  into recent_10m_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '10 minutes';

  select count(*)
  into recent_1d_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '1 day';

  if recent_10m_count >= 5 or recent_1d_count >= 20 then
    raise exception '신고는 10분에 5건, 하루에 20건까지 접수할 수 있어요. 잠시 후 다시 시도해 주세요.';
  end if;

  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'open');
  new.reason := btrim(coalesce(new.reason, ''));
  return new;
end;
$$;

drop trigger if exists trg_guard_community_report_insert on public.reports;
create trigger trg_guard_community_report_insert
before insert on public.reports
for each row execute function public.guard_community_report_insert();

create or replace function public.enforce_comment_thread_integrity()
returns trigger
language plpgsql
as $$
declare
  parent_comment_record public.comments%rowtype;
begin
  if new.parent_comment_id is null then
    new.depth := 0;
    return new;
  end if;

  select *
  into parent_comment_record
  from public.comments
  where id = new.parent_comment_id;

  if not found then
    raise exception 'parent comment not found';
  end if;

  if parent_comment_record.post_id <> new.post_id then
    raise exception 'reply must reference a comment in the same post';
  end if;

  if parent_comment_record.parent_comment_id is not null or parent_comment_record.depth <> 0 then
    raise exception 'reply depth exceeds supported range';
  end if;

  if parent_comment_record.deleted_at is not null or parent_comment_record.status <> 'active' then
    raise exception 'cannot reply to inactive parent comment';
  end if;

  new.depth := 1;
  return new;
end;
$$;

drop trigger if exists trg_enforce_comment_thread_integrity on public.comments;
create trigger trg_enforce_comment_thread_integrity
before insert or update of parent_comment_id, post_id on public.comments
for each row execute function public.enforce_comment_thread_integrity();

create or replace function public.cascade_comment_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if new.parent_comment_id is not null then
    return null;
  end if;

  if old.status = new.status and old.deleted_at is not distinct from new.deleted_at then
    return null;
  end if;

  if new.status = 'deleted' and new.deleted_at is not null then
    update public.comments
    set
      status = 'deleted',
      deleted_at = coalesce(deleted_at, new.deleted_at),
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status <> 'deleted';
  elsif new.status in ('hidden', 'auto_hidden') then
    update public.comments
    set
      status = new.status,
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status = 'active';
  elsif new.status = 'active' and new.deleted_at is null then
    update public.comments
    set
      status = 'active',
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status in ('hidden', 'auto_hidden');
  end if;

  return null;
end;
$$;

drop trigger if exists trg_cascade_comment_soft_delete on public.comments;
create trigger trg_cascade_comment_soft_delete
after update of deleted_at, status on public.comments
for each row execute function public.cascade_comment_soft_delete();

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
    set like_count = greatest(like_count - 1, 0)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.repair_post_counts(target_post_id uuid default null)
returns void
language plpgsql
as $$
begin
  update public.posts p
  set
    like_count = (
      select count(*)
      from public.likes l
      where l.post_id = p.id
    ),
    comment_count = (
      select count(*)
      from public.comments c
      where c.post_id = p.id
        and c.deleted_at is null
        and c.status = 'active'
    ),
    report_count = (
      select count(*)
      from public.reports r
      where r.target_type = 'post'
        -- 현재 seed 스키마 기준 public.reports.target_id 는 uuid다.
        -- 따라서 캐스팅 없이 uuid = uuid 비교를 유지해 인덱스 활용을 보장한다.
        and r.target_id = p.id
    )
  where target_post_id is null
    or p.id = target_post_id;
end;
$$;

drop trigger if exists trg_sync_post_like_count on public.likes;
create trigger trg_sync_post_like_count
after insert or delete on public.likes
for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
as $$
declare
  old_countable boolean := false;
  new_countable boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_countable := old.deleted_at is null and old.status = 'active';
  end if;

  if tg_op <> 'DELETE' then
    new_countable := new.deleted_at is null and new.status = 'active';
  end if;

  if tg_op = 'INSERT' and new_countable then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' and old_countable then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.post_id;
  elsif tg_op = 'UPDATE' and old_countable = true and new_countable = false then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = new.post_id;
  elsif tg_op = 'UPDATE' and old_countable = false and new_countable = true then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comment_count on public.comments;
create trigger trg_sync_post_comment_count
after insert or delete or update of deleted_at, status on public.comments
for each row execute function public.sync_post_comment_count();

create or replace function public.sync_comment_reply_count()
returns trigger
language plpgsql
as $$
declare
  target_parent_id uuid := null;
  alternate_parent_id uuid := null;
begin
  if tg_op <> 'INSERT' then
    target_parent_id := old.parent_comment_id;
  end if;

  if tg_op <> 'DELETE' then
    if target_parent_id is null then
      target_parent_id := new.parent_comment_id;
    elsif new.parent_comment_id is distinct from old.parent_comment_id then
      alternate_parent_id := new.parent_comment_id;
    end if;
  end if;

  if target_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = target_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = target_parent_id;
  end if;

  if alternate_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = alternate_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = alternate_parent_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_comment_reply_count on public.comments;
create trigger trg_sync_comment_reply_count
after insert or delete or update of parent_comment_id, deleted_at, status on public.comments
for each row execute function public.sync_comment_reply_count();

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments
    set like_count = like_count + 1
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_comment_like_count on public.comment_likes;
create trigger trg_sync_comment_like_count
after insert or delete on public.comment_likes
for each row execute function public.sync_comment_like_count();

create or replace function public.sync_post_report_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.target_type = 'post' then
    update public.posts
    set report_count = report_count + 1
    where id = new.target_id;
  elsif tg_op = 'DELETE' and old.target_type = 'post' then
    update public.posts
    set report_count = greatest(report_count - 1, 0)
    where id = old.target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_report_count on public.reports;
create trigger trg_sync_post_report_count
after insert or delete on public.reports
for each row execute function public.sync_post_report_count();

create or replace function public.sync_community_report_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_community_moderation_queue(new.target_type, new.target_id, new.id);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_community_moderation_queue(old.target_type, old.target_id, null);
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'rejected_abuse' and old.status is distinct from 'rejected_abuse' then
      perform public.bump_community_reporter_rejected_abuse(new.reporter_id);
    end if;

    if new.status is distinct from old.status
       or new.reason_category is distinct from old.reason_category
    then
      perform public.refresh_community_moderation_queue(new.target_type, new.target_id, new.id);
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_community_report_change on public.reports;
create trigger trg_sync_community_report_change
after insert or update or delete on public.reports
for each row execute function public.sync_community_report_change();

create or replace function public.sync_community_post_image_assets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_paths text[] := array(
    select distinct btrim(path)
    from unnest(
      case
        when new.image_urls is not null and coalesce(array_length(new.image_urls, 1), 0) > 0
          then new.image_urls
        when new.image_url is not null and btrim(new.image_url) <> ''
          then array[new.image_url]
        else array[]::text[]
      end
    ) as path
    where btrim(path) <> ''
  );
  current_post_status text := new.status;
  next_cleanup_reason text := case
    when new.status = 'active' then 'detached'
    else new.status
  end;
begin
  update public.community_image_assets
  set
    source_post_status = current_post_status,
    upload_status = case
      when current_post_status = 'active' and storage_path = any(active_paths) then 'attached'
      else 'cleanup_pending'
    end,
    attached_at = case
      when current_post_status = 'active' and storage_path = any(active_paths)
        then coalesce(attached_at, timezone('utc', now()))
      else attached_at
    end,
    cleanup_reason = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else next_cleanup_reason
    end,
    cleanup_requested_at = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else coalesce(cleanup_requested_at, timezone('utc', now()))
    end,
    cleanup_completed_at = case
      when current_post_status = 'active' and storage_path = any(active_paths) then null
      else cleanup_completed_at
    end,
    updated_at = timezone('utc', now())
  where post_id = new.id
    and upload_status <> 'cleaned_up';

  return null;
end;
$$;

drop trigger if exists trg_sync_community_post_image_assets on public.posts;
create trigger trg_sync_community_post_image_assets
after insert or update of image_url, image_urls, status, deleted_at on public.posts
for each row execute function public.sync_community_post_image_assets();

-- ============================================================
-- 7) RLS 재작성
-- ============================================================
drop policy if exists "posts_select_public_or_own" on public.posts;
drop policy if exists "posts_crud_own" on public.posts;
drop policy if exists "posts_select_active_public" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

create policy "posts_select_active_public"
on public.posts for select
using (
  (
    visibility = 'public'
    and status = 'active'
    and deleted_at is null
  )
  or auth.uid() = user_id
  or public.is_community_admin()
);

create policy "posts_insert_own"
on public.posts for insert
with check (auth.uid() = user_id);

create policy "posts_update_own"
on public.posts for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "posts_delete_own"
on public.posts for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "comments_select_by_post_visibility" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;

create policy "comments_select_by_post_visibility"
on public.comments for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or comments.user_id = auth.uid()
);

create policy "comments_insert_own"
on public.comments for insert
with check (
  auth.uid() = user_id
  and public.can_insert_community_comment(comments.post_id, comments.parent_comment_id)
);

create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "likes_select_by_post_visibility" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;
drop policy if exists "comment_likes_select_by_comment_visibility" on public.comment_likes;
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
drop policy if exists "comment_likes_delete_own" on public.comment_likes;

create policy "likes_select_by_post_visibility"
on public.likes for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = likes.post_id
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or likes.user_id = auth.uid()
);

create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id or public.is_community_admin());

create policy "comment_likes_select_by_comment_visibility"
on public.comment_likes for select
using (
  exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_likes.comment_id
      and c.deleted_at is null
      and c.status = 'active'
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or comment_likes.user_id = auth.uid()
);

create policy "comment_likes_insert_own"
on public.comment_likes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_likes.comment_id
      and c.deleted_at is null
      and c.status = 'active'
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
);

create policy "comment_likes_delete_own"
on public.comment_likes for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_admin_select" on public.reports;
drop policy if exists "reports_select_own_or_admin" on public.reports;
drop policy if exists "reports_admin_update" on public.reports;

create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "reports_select_own_or_admin"
on public.reports for select
using (auth.uid() = reporter_id or public.is_community_admin());

create policy "reports_admin_update"
on public.reports for update
using (public.is_community_admin())
with check (public.is_community_admin());

drop policy if exists "audit_logs_select_own" on public.audit_logs;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
drop policy if exists "audit_logs_select_own_or_admin" on public.audit_logs;

create policy "audit_logs_select_own_or_admin"
on public.audit_logs for select
using (public.is_community_admin() or auth.uid() = user_id);

alter table public.community_moderation_queue enable row level security;
alter table public.community_moderation_actions enable row level security;
alter table public.community_reporter_flags enable row level security;
alter table public.community_image_assets enable row level security;

drop policy if exists "community_moderation_queue_admin_select" on public.community_moderation_queue;
drop policy if exists "community_moderation_queue_admin_update" on public.community_moderation_queue;
drop policy if exists "community_moderation_actions_admin_select" on public.community_moderation_actions;
drop policy if exists "community_reporter_flags_admin_select" on public.community_reporter_flags;
drop policy if exists "community_reporter_flags_admin_update" on public.community_reporter_flags;
drop policy if exists "community_image_assets_select_own_or_admin" on public.community_image_assets;

create policy "community_moderation_queue_admin_select"
on public.community_moderation_queue for select
using (public.is_community_admin());

create policy "community_moderation_queue_admin_update"
on public.community_moderation_queue for update
using (public.is_community_admin())
with check (public.is_community_admin());

create policy "community_moderation_actions_admin_select"
on public.community_moderation_actions for select
using (public.is_community_admin());

create policy "community_reporter_flags_admin_select"
on public.community_reporter_flags for select
using (public.is_community_admin());

create policy "community_reporter_flags_admin_update"
on public.community_reporter_flags for update
using (public.is_community_admin())
with check (public.is_community_admin());

create policy "community_image_assets_select_own_or_admin"
on public.community_image_assets for select
using (public.is_community_admin() or auth.uid() = user_id);

-- ============================================================
-- 8) STORAGE: community-images
-- ============================================================
-- 앱 레이어 주의:
-- - image_url 은 storage path 저장만 담당한다.
-- - 실제 렌더링은 앱 레이어에서 signed URL 생성/캐시/만료 갱신을 직접 처리해야 한다.
create or replace function public.guard_community_image_upload()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  actor_id uuid := auth.uid();
  owner_id_candidate text := nullif(btrim(coalesce(new.owner_id, '')), '');
  path_segments text[];
  target_post_id uuid := null;
  recent_upload_count integer := 0;
  current_post_upload_count integer := 0;
begin
  if new.bucket_id <> 'community-images' then
    return new;
  end if;

  if actor_id is null and owner_id_candidate is not null then
    begin
      actor_id := owner_id_candidate::uuid;
    exception
      when invalid_text_representation then
        actor_id := null;
    end;
  end if;

  actor_id := coalesce(actor_id, new.owner);

  perform public.assert_community_actor_id_is_active(actor_id);

  path_segments := storage.foldername(new.name);
  if coalesce(array_length(path_segments, 1), 0) < 2 then
    raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end if;

  if actor_id is null or path_segments[1] <> actor_id::text then
    raise exception '본인 경로에만 이미지를 업로드할 수 있어요.';
  end if;

  begin
    target_post_id := path_segments[2]::uuid;
  exception
    when invalid_text_representation then
      raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end;

  perform 1
  from public.posts p
  where p.id = target_post_id
    and p.user_id = actor_id
    and p.deleted_at is null
    and p.status = 'active';

  if not found then
    raise exception '이미지 업로드 대상 게시글을 확인할 수 없어요.';
  end if;

  select count(*)
  into recent_upload_count
  from public.community_image_assets a
  where a.user_id = actor_id
    and a.created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_upload_count >= 10 then
    raise exception '이미지 업로드는 10분에 10장까지 가능해요. 잠시 후 다시 시도해 주세요.';
  end if;

  select count(*)
  into current_post_upload_count
  from public.community_image_assets a
  where a.post_id = target_post_id
    and a.upload_status in ('uploaded', 'attached');

  if current_post_upload_count >= 3 then
    raise exception '게시글당 이미지는 최대 3장까지 첨부할 수 있어요.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_community_image_upload on storage.objects;
create trigger trg_guard_community_image_upload
before insert on storage.objects
for each row execute function public.guard_community_image_upload();

create or replace function public.sync_community_image_asset_from_storage()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  path_segments text[];
  target_post_id uuid := null;
  target_user_id uuid := null;
begin
  if tg_op = 'INSERT' and new.bucket_id <> 'community-images' then
    return null;
  end if;

  if tg_op = 'DELETE' and old.bucket_id <> 'community-images' then
    return null;
  end if;

  path_segments := storage.foldername(coalesce(new.name, old.name));

  begin
    if coalesce(array_length(path_segments, 1), 0) >= 1 then
      target_user_id := path_segments[1]::uuid;
    end if;
  exception
    when invalid_text_representation then
      target_user_id := null;
  end;

  begin
    if coalesce(array_length(path_segments, 1), 0) >= 2 then
      target_post_id := path_segments[2]::uuid;
    end if;
  exception
    when invalid_text_representation then
      target_post_id := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.community_image_assets (
      storage_path,
      user_id,
      post_id,
      upload_status,
      created_at,
      updated_at
    )
    values (
      new.name,
      target_user_id,
      target_post_id,
      'uploaded',
      coalesce(new.created_at, timezone('utc', now())),
      timezone('utc', now())
    )
    on conflict (storage_path) do update
    set
      user_id = coalesce(excluded.user_id, public.community_image_assets.user_id),
      post_id = coalesce(excluded.post_id, public.community_image_assets.post_id),
      upload_status = 'uploaded',
      updated_at = timezone('utc', now());

    return null;
  end if;

  update public.community_image_assets
  set
    upload_status = 'cleaned_up',
    cleanup_completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where storage_path = old.name;

  return null;
end;
$$;

drop trigger if exists trg_sync_community_image_asset_from_storage on storage.objects;
create trigger trg_sync_community_image_asset_from_storage
after insert or delete on storage.objects
for each row execute function public.sync_community_image_asset_from_storage();

-- trigger 도입 이전에 업로드된 community-images row를 추적 테이블에 맞춰 backfill한다.
insert into public.community_image_assets (
  storage_path,
  user_id,
  post_id,
  upload_status,
  created_at,
  updated_at
)
select
  o.name,
  case
    when coalesce((storage.foldername(o.name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(o.name))[1])::uuid
    else null
  end,
  case
    when coalesce((storage.foldername(o.name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(o.name))[2])::uuid
    else null
  end,
  'uploaded',
  coalesce(o.created_at, timezone('utc', now())),
  timezone('utc', now())
from storage.objects o
where o.bucket_id = 'community-images'
on conflict (storage_path) do update
set
  user_id = coalesce(excluded.user_id, public.community_image_assets.user_id),
  post_id = coalesce(excluded.post_id, public.community_image_assets.post_id),
  upload_status = case
    when public.community_image_assets.upload_status = 'cleaned_up'
      then public.community_image_assets.upload_status
    else 'uploaded'
  end,
  updated_at = timezone('utc', now());

insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', false)
on conflict (id) do nothing;

drop policy if exists "community_images_insert_own" on storage.objects;
create policy "community_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "community_images_select_authenticated" on storage.objects;
create policy "community_images_select_authenticated"
on storage.objects for select to authenticated
using (
  bucket_id = 'community-images'
  and (
    public.is_community_admin()
    or exists (
      select 1
      from public.posts p
      where p.id::text = (storage.foldername(name))[2]
        and p.deleted_at is null
        and p.status = 'active'
        and (
          p.visibility = 'public'
          or p.user_id = auth.uid()
        )
    )
  )
);

drop policy if exists "community_images_delete_own" on storage.objects;
create policy "community_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

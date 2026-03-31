-- backfilled baseline-history skeleton
-- file: 20260330140443_backfilled_baseline_history_account_deletion_consent.sql
-- created_at: 2026-03-30 14:04:43 Asia/Seoul
--
-- This file is a backfilled baseline-history skeleton for pre-Task6 auth/account.
-- It does not recreate or impersonate the original historical execution order.
-- The timestamp is the actual skeleton creation time.
--
-- runtime source of truth != execution history
-- - Runtime/source-of-truth for this axis is described by:
--   1) docs/sql/인증-계정/계정삭제-동의이력-최종.sql
--   2) linked remote runtime objects once re-verified
-- - Execution history is currently missing this baseline family in supabase/migrations/*.
-- - This skeleton prepares a future executable backfill package without claiming
--   that the original rollout happened through these files.
--
-- included objects for this axis
-- - public.user_consent_history
-- - public.account_deletion_requests
-- - public.account_deletion_cleanup_items
-- - account_deletion_set_updated_at() and trg_account_deletion_cleanup_items_updated_at
-- - account_deletion_table_exists(), account_deletion_column_exists()
-- - build_account_deletion_response()
-- - enqueue_account_deletion_cleanup_item()
-- - sync_account_deletion_cleanup_summary()
-- - create_account_deletion_request()
-- - mark_account_deletion_unknown()
-- - claim_account_deletion_cleanup_items()
-- - complete_account_deletion_cleanup_item()
-- - delete_my_account()
-- - related RLS policies and execute grants
--
-- excluded objects for this axis
-- - public.profiles base schema and signup trigger ownership
-- - nickname policy tables/functions/triggers/grants
-- - storage worker implementation outside SQL RPC boundary
-- - release checklist, app UX behavior, QA evidence capture
-- - seed rows of any kind
-- - public.set_updated_at(), app_role, profiles.role definitions
--
-- dependency boundaries
-- - depends on auth core axis for stable public.profiles and auth user bootstrap
-- - independent from nickname policy axis except for shared user/account semantics
-- - function body will reference cross-domain tables for delete/anonymize paths,
--   but this axis does not own those table definitions
--
-- remote already-exists collision risk
-- - high: delete_my_account() signature/body, account_deletion_requests, cleanup queue
-- - medium: grant surface, nullable compatibility alters on external tables
-- - medium/high: helper functions that may already exist with later behavior
--
-- verification required before any real SQL is filled or applied
-- - verify linked remote signatures for delete/create/cleanup RPC family
-- - verify current status enums/check constraints and grant recipients
-- - verify exact user_consent_history anonymization columns and policies
-- - verify external-table references inside delete_my_account() body against remote
-- - verify nullable alters for reports/pet_place_user_reports/pet_travel_user_reports
--
-- do not apply before verification
-- - this skeleton intentionally carries no executable DDL/DML yet
-- - next fill-in must preserve auth/account ownership and keep cross-domain schema
--   definitions out of this file

begin;

-- ============================================================================
-- section 0. skeleton status
-- ============================================================================
-- Fresh remote verification basis:
-- - linked remote re-checked on 2026-03-30 UTC before this body fill
-- - current remote still keeps legacy `delete_my_account()` void overload
-- - current remote also keeps broader execute ACLs than the docs-final contract

-- ============================================================================
-- section 1. source references for future fill-in
-- ============================================================================
-- docs mirror source:
-- - docs/sql/인증-계정/계정삭제-동의이력-최종.sql
-- bootstrap source:
-- - not primary for this axis; bootstrap is only a dependency context for core tables
-- remote verification source:
-- - linked remote catalog rechecked on 2026-03-30 before this body fill

-- ============================================================================
-- section 2. planned executable blocks
-- ============================================================================
-- 2-1. user_consent_history DDL and policy block
create extension if not exists pgcrypto;

create table if not exists public.user_consent_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing')),
  agreed boolean not null,
  policy_version text not null,
  source text not null default 'signup',
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  anonymized_subject_id uuid,
  anonymized_at timestamptz,
  retention_note text
);

alter table public.user_consent_history
  alter column user_id drop not null;

alter table public.user_consent_history
  add column if not exists anonymized_subject_id uuid,
  add column if not exists anonymized_at timestamptz,
  add column if not exists retention_note text;

create index if not exists idx_user_consent_history_user_created_at
  on public.user_consent_history (user_id, created_at desc);

create index if not exists idx_user_consent_history_anonymized_at
  on public.user_consent_history (anonymized_at desc);

alter table public.user_consent_history enable row level security;

drop policy if exists "user_consent_history_select_own"
  on public.user_consent_history;

create policy "user_consent_history_select_own"
  on public.user_consent_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_consent_history_insert_own"
  on public.user_consent_history;

create policy "user_consent_history_insert_own"
  on public.user_consent_history
  for insert
  with check (auth.uid() = user_id);

-- 2-2. account_deletion_requests DDL/index block
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  request_origin text not null default 'app',
  idempotency_key text,
  status text not null default 'requested',
  storage_cleanup_pending boolean not null default false,
  cleanup_item_count integer not null default 0,
  cleanup_completed_count integer not null default 0,
  requested_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  db_deleted_at timestamptz,
  cleanup_started_at timestamptz,
  cleanup_completed_at timestamptz,
  completed_at timestamptz,
  last_status_changed_at timestamptz not null default timezone('utc', now()),
  last_error_code text,
  last_error_message text,
  constraint account_deletion_requests_status_check
    check (
      status in (
        'requested',
        'in_progress',
        'db_deleted',
        'cleanup_pending',
        'completed',
        'completed_with_cleanup_pending',
        'failed',
        'unknown_pending_confirmation'
      )
    ),
  constraint account_deletion_requests_request_origin_not_blank_check
    check (char_length(btrim(request_origin)) between 1 and 80),
  constraint account_deletion_requests_cleanup_counts_check
    check (
      cleanup_item_count >= 0
      and cleanup_completed_count >= 0
      and cleanup_completed_count <= cleanup_item_count
    ),
  constraint account_deletion_requests_last_error_code_not_blank_check
    check (
      last_error_code is null
      or char_length(btrim(last_error_code)) > 0
    ),
  constraint account_deletion_requests_last_error_message_not_blank_check
    check (
      last_error_message is null
      or char_length(btrim(last_error_message)) > 0
    )
);

create unique index if not exists uq_account_deletion_requests_idempotency_key
  on public.account_deletion_requests (idempotency_key)
  where idempotency_key is not null;

create unique index if not exists uq_account_deletion_requests_active_user
  on public.account_deletion_requests (user_id)
  where status in (
    'requested',
    'in_progress',
    'db_deleted',
    'cleanup_pending',
    'completed_with_cleanup_pending',
    'unknown_pending_confirmation'
  );

create index if not exists idx_account_deletion_requests_user_requested
  on public.account_deletion_requests (user_id, requested_at desc);

create index if not exists idx_account_deletion_requests_status_requested
  on public.account_deletion_requests (status, requested_at desc);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "account_deletion_requests_select_own" on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
on public.account_deletion_requests
for select
using (auth.uid() = user_id);

-- 2-3. account_deletion_cleanup_items DDL/index/trigger block
create table if not exists public.account_deletion_cleanup_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_deletion_requests(id) on delete cascade,
  bucket_name text not null,
  storage_path text not null,
  cleanup_action text not null default 'delete_object',
  status text not null default 'pending',
  attempts integer not null default 0,
  last_attempted_at timestamptz,
  processing_started_at timestamptz,
  cleanup_completed_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_deletion_cleanup_items_bucket_name_not_blank_check
    check (char_length(btrim(bucket_name)) > 0),
  constraint account_deletion_cleanup_items_storage_path_not_blank_check
    check (char_length(btrim(storage_path)) > 0),
  constraint account_deletion_cleanup_items_cleanup_action_check
    check (cleanup_action in ('delete_object')),
  constraint account_deletion_cleanup_items_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint account_deletion_cleanup_items_attempts_check
    check (attempts >= 0),
  constraint account_deletion_cleanup_items_last_error_code_not_blank_check
    check (
      last_error_code is null
      or char_length(btrim(last_error_code)) > 0
    ),
  constraint account_deletion_cleanup_items_last_error_message_not_blank_check
    check (
      last_error_message is null
      or char_length(btrim(last_error_message)) > 0
    ),
  constraint account_deletion_cleanup_items_unique_target
    unique (request_id, bucket_name, storage_path)
);

create index if not exists idx_account_deletion_cleanup_items_request_created
  on public.account_deletion_cleanup_items (request_id, created_at asc);

create index if not exists idx_account_deletion_cleanup_items_status_created
  on public.account_deletion_cleanup_items (status, created_at asc);

create index if not exists idx_account_deletion_cleanup_items_processing_started
  on public.account_deletion_cleanup_items (processing_started_at asc)
  where processing_started_at is not null;

alter table public.account_deletion_cleanup_items enable row level security;

create or replace function public.account_deletion_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_account_deletion_cleanup_items_updated_at
  on public.account_deletion_cleanup_items;
create trigger trg_account_deletion_cleanup_items_updated_at
before update on public.account_deletion_cleanup_items
for each row execute function public.account_deletion_set_updated_at();

-- 2-4. helper function block
create or replace function public.account_deletion_table_exists(
  p_schema text,
  p_table text
)
returns boolean
language sql
stable
as $$
  select to_regclass(format('%I.%I', p_schema, p_table)) is not null;
$$;

create or replace function public.account_deletion_column_exists(
  p_schema text,
  p_table text,
  p_column text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = p_schema
      and table_name = p_table
      and column_name = p_column
  );
$$;

create or replace function public.build_account_deletion_response(
  p_request_id uuid
)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'request_id', r.id,
        'status', r.status,
        'storage_cleanup_pending', r.storage_cleanup_pending,
        'cleanup_item_count', r.cleanup_item_count,
        'cleanup_completed_count', r.cleanup_completed_count,
        'requested_at', r.requested_at,
        'completed_at', r.completed_at,
        'last_error_code', r.last_error_code,
        'last_error_message', r.last_error_message
      )
      from public.account_deletion_requests r
      where r.id = p_request_id
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.enqueue_account_deletion_cleanup_item(
  p_request_id uuid,
  p_bucket_name text,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_name text := btrim(coalesce(p_bucket_name, ''));
  v_storage_path text := btrim(coalesce(p_storage_path, ''));
begin
  if p_request_id is null or v_bucket_name = '' or v_storage_path = '' then
    return;
  end if;

  insert into public.account_deletion_cleanup_items (
    request_id,
    bucket_name,
    storage_path
  )
  values (
    p_request_id,
    v_bucket_name,
    v_storage_path
  )
  on conflict (request_id, bucket_name, storage_path) do nothing;
end;
$$;

create or replace function public.sync_account_deletion_cleanup_summary(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_count integer := 0;
  v_completed_count integer := 0;
  v_pending_count integer := 0;
  v_now timestamptz := timezone('utc', now());
begin
  if p_request_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'completed')::integer,
    count(*) filter (where status <> 'completed')::integer
  into
    v_total_count,
    v_completed_count,
    v_pending_count
  from public.account_deletion_cleanup_items
  where request_id = p_request_id;

  update public.account_deletion_requests
  set cleanup_item_count = v_total_count,
      cleanup_completed_count = v_completed_count,
      storage_cleanup_pending = (v_pending_count > 0),
      cleanup_completed_at = case
        when v_total_count > 0 and v_pending_count = 0
          then coalesce(cleanup_completed_at, v_now)
        else cleanup_completed_at
      end,
      completed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then coalesce(completed_at, v_now)
        else completed_at
      end,
      status = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then 'completed'
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then 'completed_with_cleanup_pending'
        else status
      end,
      last_status_changed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then v_now
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then v_now
        else last_status_changed_at
      end
  where id = p_request_id;
end;
$$;

-- 2-5. RPC block
create or replace function public.create_account_deletion_request(
  p_idempotency_key text default null,
  p_request_origin text default 'app'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_request_origin text := btrim(coalesce(p_request_origin, 'app'));
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_request_origin = '' then
    v_request_origin := 'app';
  end if;

  if v_idempotency_key is not null then
    select *
      into v_request
    from public.account_deletion_requests
    where user_id = v_user_id
      and idempotency_key = v_idempotency_key
    order by requested_at desc
    limit 1;

    if found then
      return public.build_account_deletion_response(v_request.id);
    end if;
  end if;

  select *
    into v_request
  from public.account_deletion_requests
  where user_id = v_user_id
    and status in (
      'requested',
      'in_progress',
      'db_deleted',
      'cleanup_pending',
      'completed_with_cleanup_pending',
      'unknown_pending_confirmation'
    )
  order by requested_at desc
  limit 1;

  if found then
    return public.build_account_deletion_response(v_request.id);
  end if;

  insert into public.account_deletion_requests (
    user_id,
    request_origin,
    idempotency_key,
    status
  )
  values (
    v_user_id,
    v_request_origin,
    v_idempotency_key,
    'requested'
  )
  returning *
    into v_request;

  return public.build_account_deletion_response(v_request.id);
end;
$$;

create or replace function public.mark_account_deletion_unknown(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_request
  from public.account_deletion_requests
  where id = p_request_id
    and user_id = v_user_id
  limit 1;

  if not found then
    raise exception 'account_deletion_request_not_found';
  end if;

  if v_request.status in ('completed', 'completed_with_cleanup_pending') then
    return public.build_account_deletion_response(v_request.id);
  end if;

  update public.account_deletion_requests
  set status = 'unknown_pending_confirmation',
      last_status_changed_at = v_now
  where id = v_request.id;

  return public.build_account_deletion_response(v_request.id);
end;
$$;

create or replace function public.claim_account_deletion_cleanup_items(
  p_limit integer default 20
)
returns table (
  cleanup_item_id uuid,
  request_id uuid,
  bucket_name text,
  storage_path text,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 20), 1);
  v_now timestamptz := timezone('utc', now());
begin
  return query
  with picked as (
    select item.id
    from public.account_deletion_cleanup_items item
    where item.status in ('pending', 'failed')
    order by
      case when item.status = 'pending' then 0 else 1 end,
      item.created_at asc,
      item.id asc
    limit v_limit
    for update skip locked
  ),
  updated_items as (
    update public.account_deletion_cleanup_items item
    set status = 'processing',
        attempts = item.attempts + 1,
        processing_started_at = v_now,
        last_attempted_at = v_now,
        last_error_code = null,
        last_error_message = null
    from picked
    where item.id = picked.id
    returning item.id, item.request_id, item.bucket_name, item.storage_path, item.attempts
  ),
  touched_requests as (
    update public.account_deletion_requests req
    set cleanup_started_at = coalesce(req.cleanup_started_at, v_now),
        status = case
          when req.status = 'completed_with_cleanup_pending'
            then 'cleanup_pending'
          else req.status
        end,
        last_status_changed_at = case
          when req.status = 'completed_with_cleanup_pending'
            then v_now
          else req.last_status_changed_at
        end
    where req.id in (select request_id from updated_items)
    returning req.id
  )
  select
    updated_items.id,
    updated_items.request_id,
    updated_items.bucket_name,
    updated_items.storage_path,
    updated_items.attempts
  from updated_items;
end;
$$;

create or replace function public.complete_account_deletion_cleanup_item(
  p_cleanup_item_id uuid,
  p_success boolean,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  update public.account_deletion_cleanup_items
  set status = case when p_success then 'completed' else 'failed' end,
      cleanup_completed_at = case when p_success then v_now else cleanup_completed_at end,
      processing_started_at = null,
      last_attempted_at = v_now,
      last_error_code = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_code, '')), '')
      end,
      last_error_message = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_message, '')), '')
      end
  where id = p_cleanup_item_id
  returning request_id
    into v_request_id;

  if v_request_id is null then
    raise exception 'account_deletion_cleanup_item_not_found';
  end if;

  perform public.sync_account_deletion_cleanup_summary(v_request_id);
  return public.build_account_deletion_response(v_request_id);
end;
$$;

-- Fresh remote re-verification found the legacy zero-arg overload still present.
-- This draft explicitly removes it so the executable baseline-history package only
-- preserves the JSON status contract.
drop function if exists public.delete_my_account();

create or replace function public.delete_my_account(
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_retained_subject_id uuid := gen_random_uuid();
  v_error_code text;
  v_error_message text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_request_id is null then
    select *
      into v_request
    from public.account_deletion_requests
    where user_id = v_user_id
      and status in (
        'requested',
        'in_progress',
        'db_deleted',
        'cleanup_pending',
        'completed_with_cleanup_pending',
        'unknown_pending_confirmation'
      )
    order by requested_at desc
    limit 1;

    if not found then
      insert into public.account_deletion_requests (
        user_id,
        request_origin,
        status
      )
      values (
        v_user_id,
        'app',
        'requested'
      )
      returning *
        into v_request;
    end if;
  else
    select *
      into v_request
    from public.account_deletion_requests
    where id = p_request_id
      and user_id = v_user_id
    limit 1;

    if not found then
      raise exception 'account_deletion_request_not_found';
    end if;
  end if;

  if v_request.status in ('completed', 'completed_with_cleanup_pending') then
    return public.build_account_deletion_response(v_request.id);
  end if;

  update public.account_deletion_requests
  set status = 'in_progress',
      started_at = coalesce(started_at, v_now),
      last_status_changed_at = v_now,
      last_error_code = null,
      last_error_message = null
  where id = v_request.id;

  if public.account_deletion_table_exists('public', 'pets')
    and public.account_deletion_column_exists('public', 'pets', 'profile_image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'pet-profiles', btrim(profile_image_url)
      from public.pets
      where user_id = $2
        and profile_image_url is not null
        and btrim(profile_image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories')
    and public.account_deletion_column_exists('public', 'memories', 'image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(image_url)
      from public.memories
      where user_id = $2
        and image_url is not null
        and btrim(image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories')
    and public.account_deletion_column_exists('public', 'memories', 'image_urls') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select distinct $1, 'memory-images', btrim(path_value)
      from public.memories m
      cross join lateral unnest(coalesce(m.image_urls, '{}'::text[])) as path_value
      where m.user_id = $2
        and btrim(path_value) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memory_images') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(original_path)
      from public.memory_images
      where user_id = $2
        and btrim(original_path) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;

    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(timeline_thumb_path)
      from public.memory_images
      where user_id = $2
        and timeline_thumb_path is not null
        and btrim(timeline_thumb_path) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts')
    and public.account_deletion_column_exists('public', 'posts', 'image_url') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'community-images', btrim(image_url)
      from public.posts
      where user_id = $2
        and image_url is not null
        and btrim(image_url) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts')
    and public.account_deletion_column_exists('public', 'posts', 'image_urls') then
    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select distinct $1, 'community-images', btrim(path_value)
      from public.posts p
      cross join lateral unnest(coalesce(p.image_urls, '{}'::text[])) as path_value
      where p.user_id = $2
        and btrim(path_value) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_user_id;
  end if;

  perform public.sync_account_deletion_cleanup_summary(v_request.id);

  if public.account_deletion_table_exists('public', 'user_consent_history') then
    update public.user_consent_history
    set user_id = null,
        anonymized_subject_id = coalesce(anonymized_subject_id, v_retained_subject_id),
        anonymized_at = coalesce(anonymized_at, v_now),
        source = 'account_deletion_retained',
        retention_note = coalesce(
          retention_note,
          'account deletion retained record'
        )
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'reports') then
    update public.reports
    set reporter_id = null
    where reporter_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_user_reports') then
    update public.pet_place_user_reports
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_travel_user_reports') then
    update public.pet_travel_user_reports
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_care_guide_events') then
    update public.pet_care_guide_events
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'audit_logs') then
    update public.audit_logs
    set user_id = null
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_search_logs') then
    update public.pet_place_search_logs
    set user_id = null,
        session_id = gen_random_uuid()
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_verification_logs') then
    update public.pet_place_verification_logs
    set actor_user_id = null
    where actor_user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_bookmarks') then
    delete from public.pet_place_bookmarks
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comment_likes') then
    delete from public.comment_likes
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'likes') then
    delete from public.likes
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comments') then
    delete from public.comments
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts') then
    delete from public.posts
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'letters') then
    delete from public.letters
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'emotions') then
    delete from public.emotions
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'daily_recall') then
    delete from public.daily_recall
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'ai_messages') then
    delete from public.ai_messages
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'anniversaries') then
    delete from public.anniversaries
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'notifications') then
    delete from public.notifications
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'billing_events') then
    delete from public.billing_events
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'subscriptions') then
    delete from public.subscriptions
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_schedules') then
    delete from public.pet_schedules
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memory_images') then
    delete from public.memory_images
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories') then
    delete from public.memories
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pets') then
    delete from public.pets
    where user_id = v_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'profiles') then
    delete from public.profiles
    where user_id = v_user_id;
  end if;

  update public.account_deletion_requests
  set status = 'db_deleted',
      db_deleted_at = v_now,
      last_status_changed_at = v_now
  where id = v_request.id;

  perform public.sync_account_deletion_cleanup_summary(v_request.id);

  update public.account_deletion_requests
  set status = case
        when cleanup_item_count > cleanup_completed_count
          then 'completed_with_cleanup_pending'
        else 'completed'
      end,
      storage_cleanup_pending = (cleanup_item_count > cleanup_completed_count),
      completed_at = coalesce(completed_at, v_now),
      cleanup_completed_at = case
        when cleanup_item_count = cleanup_completed_count
          then coalesce(cleanup_completed_at, v_now)
        else cleanup_completed_at
      end,
      last_status_changed_at = v_now
  where id = v_request.id;

  delete from auth.users
  where id = v_user_id;

  return public.build_account_deletion_response(v_request.id);
exception
  when others then
    get stacked diagnostics
      v_error_code = returned_sqlstate,
      v_error_message = message_text;

    if v_request.id is not null then
      update public.account_deletion_requests
      set status = 'failed',
          last_error_code = nullif(btrim(coalesce(v_error_code, '')), ''),
          last_error_message = nullif(btrim(coalesce(v_error_message, '')), ''),
          last_status_changed_at = timezone('utc', now())
      where id = v_request.id;

      return public.build_account_deletion_response(v_request.id);
    end if;

    raise;
end;
$$;

-- 2-6. grant and compatibility block
do $$
begin
  if public.account_deletion_table_exists('public', 'reports') then
    execute 'alter table public.reports alter column reporter_id drop not null';
  end if;
end
$$;

do $$
begin
  if public.account_deletion_table_exists('public', 'pet_place_user_reports') then
    execute 'alter table public.pet_place_user_reports alter column user_id drop not null';
  end if;
end
$$;

do $$
begin
  if public.account_deletion_table_exists('public', 'pet_travel_user_reports') then
    execute 'alter table public.pet_travel_user_reports alter column user_id drop not null';
  end if;
end
$$;

revoke all on function public.enqueue_account_deletion_cleanup_item(uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.sync_account_deletion_cleanup_summary(uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_account_deletion_request(text, text) from public, anon, authenticated, service_role;
revoke all on function public.mark_account_deletion_unknown(uuid) from public, anon, authenticated, service_role;
revoke all on function public.delete_my_account(uuid) from public, anon, authenticated, service_role;
revoke all on function public.claim_account_deletion_cleanup_items(integer) from public, anon, authenticated, service_role;
revoke all on function public.complete_account_deletion_cleanup_item(uuid, boolean, text, text) from public, anon, authenticated, service_role;

grant execute on function public.create_account_deletion_request(text, text) to authenticated;
grant execute on function public.mark_account_deletion_unknown(uuid) to authenticated;
grant execute on function public.delete_my_account(uuid) to authenticated;
grant execute on function public.claim_account_deletion_cleanup_items(integer) to service_role;
grant execute on function public.complete_account_deletion_cleanup_item(uuid, boolean, text, text) to service_role;

-- ============================================================================
-- section 3. explicit exclusions and non-goals
-- ============================================================================
-- Not owned here:
-- - actual storage worker runtime outside claim/complete RPC contract
-- - release QA checklist updates
-- - app timeout handling / UX messaging code
-- - profile base schema or nickname blocked-term policy

-- ============================================================================
-- section 4. collision checkpoints to re-verify before fill-in
-- ============================================================================
-- Fresh remote re-verification result:
-- - table/function bodies are largely aligned with docs-final SQL
-- - remote still exposes the legacy zero-arg `delete_my_account()` overload
-- - remote routine execute ACLs are broader than docs-final grants

-- ============================================================================
-- section 5. implementation notes for the next fill-in turn
-- ============================================================================
-- - Keep helper ownership explicit; do not inline unrelated domain DDL.
-- - Treat cross-domain delete/anonymize targets as verification gates, not owned schema.
-- - Remote apply review is now locked to keep the legacy overload drop and the
--   deterministic revoke/regrant narrowing in this axis.
-- - Final approval still needs a token-enabled linked remote catalog recheck
--   before actual apply.

commit;

begin;

alter table public.account_deletion_requests
  add column if not exists scheduled_deletion_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists restored_at timestamptz;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
    check (
      status in (
        'requested',
        'pending_grace_period',
        'cancelled',
        'in_progress',
        'db_deleted',
        'cleanup_pending',
        'completed',
        'completed_with_cleanup_pending',
        'failed',
        'unknown_pending_confirmation'
      )
    );

drop index if exists uq_account_deletion_requests_active_user;

create unique index if not exists uq_account_deletion_requests_active_user
  on public.account_deletion_requests (user_id)
  where status in (
    'requested',
    'pending_grace_period',
    'in_progress',
    'db_deleted',
    'cleanup_pending',
    'completed_with_cleanup_pending',
    'unknown_pending_confirmation'
  );

create index if not exists idx_account_deletion_requests_status_scheduled
  on public.account_deletion_requests (status, scheduled_deletion_at asc)
  where scheduled_deletion_at is not null;

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
        'actual_status', r.status,
        'storage_cleanup_pending', r.storage_cleanup_pending,
        'cleanup_item_count', r.cleanup_item_count,
        'cleanup_completed_count', r.cleanup_completed_count,
        'requested_at', r.requested_at,
        'scheduled_deletion_at', r.scheduled_deletion_at,
        'cancelled_at', r.cancelled_at,
        'restored_at', r.restored_at,
        'completed_at', r.completed_at,
        'last_error_code', r.last_error_code,
        'last_error_message', r.last_error_message,
        'can_restore',
          (
            r.status = 'pending_grace_period'
            and r.scheduled_deletion_at is not null
            and r.scheduled_deletion_at > timezone('utc', now())
          )
      )
      from public.account_deletion_requests r
      where r.id = p_request_id
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.build_account_deletion_compat_response(
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
        'status',
          case
            when r.status = 'pending_grace_period' then 'completed'
            else r.status
          end,
        'actual_status', r.status,
        'storage_cleanup_pending',
          case
            when r.status = 'pending_grace_period' then false
            else r.storage_cleanup_pending
          end,
        'cleanup_item_count',
          case
            when r.status = 'pending_grace_period' then 0
            else r.cleanup_item_count
          end,
        'cleanup_completed_count',
          case
            when r.status = 'pending_grace_period' then 0
            else r.cleanup_completed_count
          end,
        'requested_at', r.requested_at,
        'scheduled_deletion_at', r.scheduled_deletion_at,
        'cancelled_at', r.cancelled_at,
        'restored_at', r.restored_at,
        'completed_at',
          case
            when r.status = 'pending_grace_period'
              then coalesce(r.completed_at, r.requested_at)
            else r.completed_at
          end,
        'last_error_code', r.last_error_code,
        'last_error_message', r.last_error_message,
        'can_restore',
          (
            r.status = 'pending_grace_period'
            and r.scheduled_deletion_at is not null
            and r.scheduled_deletion_at > timezone('utc', now())
          )
      )
      from public.account_deletion_requests r
      where r.id = p_request_id
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.request_account_deletion(
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
  v_now timestamptz := timezone('utc', now());
  v_scheduled_deletion_at timestamptz := timezone('utc', now()) + interval '7 days';
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
    from public.account_deletion_requests req
    where req.user_id = v_user_id
      and req.idempotency_key = v_idempotency_key
    order by req.requested_at desc
    limit 1;

    if found then
      if v_request.status in ('requested', 'unknown_pending_confirmation')
        and v_request.started_at is null
        and v_request.db_deleted_at is null
        and v_request.completed_at is null then
        update public.account_deletion_requests req
        set status = 'pending_grace_period',
            scheduled_deletion_at = coalesce(req.scheduled_deletion_at, v_scheduled_deletion_at),
            request_origin = v_request_origin,
            cancelled_at = null,
            restored_at = null,
            last_status_changed_at = v_now,
            last_error_code = null,
            last_error_message = null
        where req.id = v_request.id
        returning *
          into v_request;
      end if;

      return public.build_account_deletion_response(v_request.id);
    end if;
  end if;

  select *
    into v_request
  from public.account_deletion_requests req
  where req.user_id = v_user_id
    and req.status in (
      'requested',
      'pending_grace_period',
      'in_progress',
      'db_deleted',
      'cleanup_pending',
      'completed_with_cleanup_pending',
      'unknown_pending_confirmation'
    )
  order by req.requested_at desc
  limit 1;

  if found then
    if v_request.status in ('requested', 'unknown_pending_confirmation')
      and v_request.started_at is null
      and v_request.db_deleted_at is null
      and v_request.completed_at is null then
      update public.account_deletion_requests req
      set status = 'pending_grace_period',
          scheduled_deletion_at = coalesce(req.scheduled_deletion_at, v_scheduled_deletion_at),
          request_origin = v_request_origin,
          cancelled_at = null,
          restored_at = null,
          last_status_changed_at = v_now,
          last_error_code = null,
          last_error_message = null
      where req.id = v_request.id
      returning *
        into v_request;
    end if;

    return public.build_account_deletion_response(v_request.id);
  end if;

  insert into public.account_deletion_requests (
    user_id,
    request_origin,
    idempotency_key,
    status,
    requested_at,
    scheduled_deletion_at,
    last_status_changed_at
  )
  values (
    v_user_id,
    v_request_origin,
    v_idempotency_key,
    'pending_grace_period',
    v_now,
    v_scheduled_deletion_at,
    v_now
  )
  returning *
    into v_request;

  return public.build_account_deletion_response(v_request.id);
end;
$$;

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
  v_result jsonb;
  v_request_id uuid;
begin
  v_result := public.request_account_deletion(
    p_idempotency_key,
    p_request_origin
  );

  v_request_id := nullif(v_result ->> 'request_id', '')::uuid;
  if v_request_id is null then
    return v_result;
  end if;

  return public.build_account_deletion_compat_response(v_request_id);
end;
$$;

create or replace function public.cancel_account_deletion(
  p_request_id uuid default null,
  p_restore_origin text default 'app'
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
  v_restore_origin text := btrim(coalesce(p_restore_origin, 'app'));
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_restore_origin = '' then
    v_restore_origin := 'app';
  end if;

  if p_request_id is null then
    select *
      into v_request
    from public.account_deletion_requests req
    where req.user_id = v_user_id
      and req.status = 'pending_grace_period'
    order by req.requested_at desc
    limit 1;
  else
    select *
      into v_request
    from public.account_deletion_requests req
    where req.id = p_request_id
      and req.user_id = v_user_id
    limit 1;
  end if;

  if not found then
    raise exception 'account_deletion_request_not_found';
  end if;

  if v_request.status = 'cancelled' then
    return public.build_account_deletion_response(v_request.id);
  end if;

  if v_request.status <> 'pending_grace_period' then
    raise exception 'account_deletion_request_not_restorable';
  end if;

  if v_request.scheduled_deletion_at is null
    or v_request.scheduled_deletion_at <= v_now then
    raise exception 'account_deletion_restore_window_closed';
  end if;

  update public.account_deletion_requests req
  set status = 'cancelled',
      cancelled_at = coalesce(req.cancelled_at, v_now),
      restored_at = coalesce(req.restored_at, v_now),
      request_origin = v_restore_origin,
      last_status_changed_at = v_now,
      last_error_code = null,
      last_error_message = null
  where req.id = v_request.id
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
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_request
  from public.account_deletion_requests req
  where req.id = p_request_id
    and req.user_id = v_user_id
  limit 1;

  if not found then
    raise exception 'account_deletion_request_not_found';
  end if;

  return public.build_account_deletion_compat_response(v_request.id);
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
    returning
      item.id as cleanup_item_id,
      item.request_id as claimed_request_id,
      item.bucket_name as claimed_bucket_name,
      item.storage_path as claimed_storage_path,
      item.attempts as claimed_attempts
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
    where req.id in (
      select ui.claimed_request_id
      from updated_items ui
    )
    returning req.id
  )
  select
    ui.cleanup_item_id,
    ui.claimed_request_id as request_id,
    ui.claimed_bucket_name as bucket_name,
    ui.claimed_storage_path as storage_path,
    ui.claimed_attempts as attempts
  from updated_items ui;
end;
$$;

create or replace function public.execute_account_deletion_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_target_user_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_retained_subject_id uuid := gen_random_uuid();
  v_error_code text;
  v_error_message text;
begin
  if p_request_id is null then
    raise exception 'account_deletion_request_not_found';
  end if;

  select *
    into v_request
  from public.account_deletion_requests req
  where req.id = p_request_id
  limit 1;

  if not found then
    raise exception 'account_deletion_request_not_found';
  end if;

  if v_request.status in ('completed', 'completed_with_cleanup_pending', 'cleanup_pending') then
    return public.build_account_deletion_response(v_request.id);
  end if;

  if v_request.status = 'cancelled' then
    return public.build_account_deletion_response(v_request.id);
  end if;

  if v_request.status = 'pending_grace_period'
    and v_request.scheduled_deletion_at is not null
    and v_request.scheduled_deletion_at > v_now then
    raise exception 'account_deletion_grace_period_not_elapsed';
  end if;

  v_target_user_id := v_request.user_id;
  if v_target_user_id is null then
    raise exception 'account_deletion_target_user_missing';
  end if;

  update public.account_deletion_requests req
  set status = 'in_progress',
      started_at = coalesce(req.started_at, v_now),
      last_status_changed_at = v_now,
      last_error_code = null,
      last_error_message = null
  where req.id = v_request.id;

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
    using v_request.id, v_target_user_id;
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
    using v_request.id, v_target_user_id;
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
    using v_request.id, v_target_user_id;
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
    using v_request.id, v_target_user_id;

    execute $sql$
      insert into public.account_deletion_cleanup_items (request_id, bucket_name, storage_path)
      select $1, 'memory-images', btrim(timeline_thumb_path)
      from public.memory_images
      where user_id = $2
        and timeline_thumb_path is not null
        and btrim(timeline_thumb_path) <> ''
      on conflict (request_id, bucket_name, storage_path) do nothing
    $sql$
    using v_request.id, v_target_user_id;
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
    using v_request.id, v_target_user_id;
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
    using v_request.id, v_target_user_id;
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
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'reports') then
    update public.reports
    set reporter_id = null
    where reporter_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_user_reports') then
    update public.pet_place_user_reports
    set user_id = null
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_travel_user_reports') then
    update public.pet_travel_user_reports
    set user_id = null
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_care_guide_events') then
    update public.pet_care_guide_events
    set user_id = null
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'audit_logs') then
    update public.audit_logs
    set user_id = null
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_search_logs') then
    update public.pet_place_search_logs
    set user_id = null,
        session_id = gen_random_uuid()
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_verification_logs') then
    update public.pet_place_verification_logs
    set actor_user_id = null
    where actor_user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_place_bookmarks') then
    delete from public.pet_place_bookmarks
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comment_likes') then
    delete from public.comment_likes
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'likes') then
    delete from public.likes
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'comments') then
    delete from public.comments
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'posts') then
    delete from public.posts
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'letters') then
    delete from public.letters
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'emotions') then
    delete from public.emotions
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'daily_recall') then
    delete from public.daily_recall
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'ai_messages') then
    delete from public.ai_messages
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'anniversaries') then
    delete from public.anniversaries
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'notifications') then
    delete from public.notifications
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'billing_events') then
    delete from public.billing_events
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'subscriptions') then
    delete from public.subscriptions
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pet_schedules') then
    delete from public.pet_schedules
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memory_images') then
    delete from public.memory_images
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'memories') then
    delete from public.memories
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'pets') then
    delete from public.pets
    where user_id = v_target_user_id;
  end if;

  if public.account_deletion_table_exists('public', 'profiles') then
    delete from public.profiles
    where user_id = v_target_user_id;
  end if;

  update public.account_deletion_requests req
  set status = 'db_deleted',
      db_deleted_at = v_now,
      last_status_changed_at = v_now
  where req.id = v_request.id;

  perform public.sync_account_deletion_cleanup_summary(v_request.id);

  update public.account_deletion_requests req
  set status = case
        when req.cleanup_item_count > req.cleanup_completed_count
          then 'completed_with_cleanup_pending'
        else 'completed'
      end,
      storage_cleanup_pending = (req.cleanup_item_count > req.cleanup_completed_count),
      completed_at = coalesce(req.completed_at, v_now),
      cleanup_completed_at = case
        when req.cleanup_item_count = req.cleanup_completed_count
          then coalesce(req.cleanup_completed_at, v_now)
        else req.cleanup_completed_at
      end,
      last_status_changed_at = v_now
  where req.id = v_request.id;

  delete from auth.users
  where id = v_target_user_id;

  return public.build_account_deletion_response(v_request.id);
exception
  when others then
    get stacked diagnostics
      v_error_code = returned_sqlstate,
      v_error_message = message_text;

    if v_request.id is not null then
      update public.account_deletion_requests req
      set status = 'failed',
          last_error_code = nullif(btrim(coalesce(v_error_code, '')), ''),
          last_error_message = nullif(btrim(coalesce(v_error_message, '')), ''),
          last_status_changed_at = timezone('utc', now())
      where req.id = v_request.id;

      return public.build_account_deletion_response(v_request.id);
    end if;

    raise;
end;
$$;

create or replace function public.delete_my_account(
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_request_id uuid;
begin
  v_result := public.request_account_deletion(
    null,
    'app'
  );

  v_request_id := nullif(v_result ->> 'request_id', '')::uuid;
  if v_request_id is null then
    return v_result;
  end if;

  return public.build_account_deletion_compat_response(v_request_id);
end;
$$;

revoke all on function public.build_account_deletion_compat_response(uuid) from public, anon, authenticated, service_role;
revoke all on function public.request_account_deletion(text, text) from public, anon, authenticated, service_role;
revoke all on function public.cancel_account_deletion(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.execute_account_deletion_request(uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_account_deletion_request(text, text) from public, anon, authenticated, service_role;
revoke all on function public.mark_account_deletion_unknown(uuid) from public, anon, authenticated, service_role;
revoke all on function public.delete_my_account(uuid) from public, anon, authenticated, service_role;
revoke all on function public.claim_account_deletion_cleanup_items(integer) from public, anon, authenticated, service_role;
revoke all on function public.complete_account_deletion_cleanup_item(uuid, boolean, text, text) from public, anon, authenticated, service_role;

grant execute on function public.request_account_deletion(text, text) to authenticated;
grant execute on function public.create_account_deletion_request(text, text) to authenticated;
grant execute on function public.cancel_account_deletion(uuid, text) to authenticated;
grant execute on function public.mark_account_deletion_unknown(uuid) to authenticated;
grant execute on function public.delete_my_account(uuid) to authenticated;
grant execute on function public.execute_account_deletion_request(uuid) to service_role;
grant execute on function public.claim_account_deletion_cleanup_items(integer) to service_role;
grant execute on function public.complete_account_deletion_cleanup_item(uuid, boolean, text, text) to service_role;

commit;

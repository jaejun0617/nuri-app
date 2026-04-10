begin;

alter table public.account_deletion_requests
  add column if not exists finalizer_claimed_at timestamptz,
  add column if not exists finalizer_worker_id text;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_finalizer_worker_id_not_blank_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_finalizer_worker_id_not_blank_check
    check (
      finalizer_worker_id is null
      or char_length(btrim(finalizer_worker_id)) > 0
    );

create index if not exists idx_account_deletion_requests_due_pending
  on public.account_deletion_requests (scheduled_deletion_at asc, requested_at asc, id asc)
  where status = 'pending_grace_period'
    and scheduled_deletion_at is not null;

create index if not exists idx_account_deletion_requests_finalizer_claimed
  on public.account_deletion_requests (finalizer_claimed_at asc)
  where status = 'in_progress'
    and db_deleted_at is null
    and completed_at is null;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.claim_due_account_deletion_requests(
  p_limit integer default 10,
  p_worker_id text default null
)
returns table (
  request_id uuid,
  user_id uuid,
  scheduled_deletion_at timestamptz,
  requested_at timestamptz,
  claimed_at timestamptz,
  worker_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 10), 1);
  v_now timestamptz := timezone('utc', now());
  v_worker_id text := nullif(btrim(coalesce(p_worker_id, '')), '');
begin
  return query
  with candidate as (
    select req.id
    from public.account_deletion_requests req
    where (
      req.status = 'pending_grace_period'
      and req.scheduled_deletion_at is not null
      and req.scheduled_deletion_at <= v_now
    )
    or (
      req.status = 'in_progress'
      and req.db_deleted_at is null
      and req.completed_at is null
      and req.finalizer_claimed_at is not null
      and req.finalizer_claimed_at <= v_now - interval '30 minutes'
    )
    order by
      coalesce(req.scheduled_deletion_at, req.requested_at) asc,
      req.requested_at asc,
      req.id asc
    limit v_limit
    for update skip locked
  ),
  updated_requests as (
    update public.account_deletion_requests req
    set status = 'in_progress',
        started_at = coalesce(req.started_at, v_now),
        finalizer_claimed_at = v_now,
        finalizer_worker_id = coalesce(v_worker_id, req.finalizer_worker_id),
        last_status_changed_at = case
          when req.status <> 'in_progress' then v_now
          else req.last_status_changed_at
        end,
        last_error_code = null,
        last_error_message = null
    from candidate
    where req.id = candidate.id
    returning
      req.id,
      req.user_id,
      req.scheduled_deletion_at,
      req.requested_at,
      req.finalizer_claimed_at,
      req.finalizer_worker_id
  )
  select
    updated_requests.id as request_id,
    updated_requests.user_id,
    updated_requests.scheduled_deletion_at,
    updated_requests.requested_at,
    updated_requests.finalizer_claimed_at as claimed_at,
    updated_requests.finalizer_worker_id as worker_id
  from updated_requests;
end;
$$;

create or replace function public.register_account_deletion_worker_schedule(
  p_function_url text,
  p_cron_secret text,
  p_schedule text default '*/10 * * * *'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url text := nullif(btrim(coalesce(p_function_url, '')), '');
  v_cron_secret text := nullif(btrim(coalesce(p_cron_secret, '')), '');
  v_schedule text := nullif(btrim(coalesce(p_schedule, '')), '');
  v_job_name constant text := 'account-deletion-worker-every-10-min';
  v_job_id bigint;
  v_existing_job_id bigint;
  v_command text;
begin
  if v_function_url is null then
    raise exception 'account_deletion_worker_url_required';
  end if;

  if v_cron_secret is null then
    raise exception 'account_deletion_worker_cron_secret_required';
  end if;

  if v_schedule is null then
    v_schedule := '*/10 * * * *';
  end if;

  for v_existing_job_id in
    select jobid
    from cron.job
    where jobname = v_job_name
  loop
    perform cron.unschedule(v_existing_job_id);
  end loop;

  v_command := format(
    $fmt$
      select
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := jsonb_build_object(
            'source', 'pg_cron',
            'finalizerLimit', 10,
            'cleanupLimit', 50,
            'cleanupBatchPerBucket', 20
          )
        ) as request_id;
    $fmt$,
    v_function_url,
    v_cron_secret
  );

  select cron.schedule(v_job_name, v_schedule, v_command)
    into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.unregister_account_deletion_worker_schedule()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id bigint;
  v_removed integer := 0;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'account-deletion-worker-every-10-min'
  loop
    perform cron.unschedule(v_job_id);
    v_removed := v_removed + 1;
  end loop;

  return v_removed;
end;
$$;

revoke all on function public.claim_due_account_deletion_requests(integer, text) from public, anon, authenticated, service_role;
revoke all on function public.register_account_deletion_worker_schedule(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.unregister_account_deletion_worker_schedule() from public, anon, authenticated, service_role;

grant execute on function public.claim_due_account_deletion_requests(integer, text) to service_role;
grant execute on function public.register_account_deletion_worker_schedule(text, text, text) to service_role;
grant execute on function public.unregister_account_deletion_worker_schedule() to service_role;

commit;

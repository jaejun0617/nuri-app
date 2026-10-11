begin;
CREATE OR REPLACE FUNCTION public.claim_nuri_place_enrichment_budget(p_provider text, p_track text, p_units integer, p_hard_cap integer DEFAULT 6000)
 RETURNS TABLE(allowed boolean, usage_month date, used_units integer, remaining_units integer, hard_cap integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_provider text := nullif(trim(p_provider), '');
  v_track text := nullif(trim(p_track), '');
  v_units integer := coalesce(p_units, 0);
  v_hard_cap integer := least(greatest(coalesce(p_hard_cap, 0), 0), 6000);
  v_budget_month date := date_trunc('month', timezone('utc', now()))::date;
  v_used_units integer := 0;
begin
  if v_provider is distinct from 'google-places' or v_track not in ('demand','background')
     or v_units not between 0 and 3 then
    raise exception using errcode = '22023', message = 'enrichment_budget_input_invalid';
  end if;
  if v_provider is null then
    raise exception using errcode = 'P0001', message = 'provider_required';
  end if;

  if v_track is null then
    raise exception using errcode = 'P0001', message = 'track_required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      format('nuri_place_enrichment_budget:%s:%s', v_provider, v_budget_month::text),
      0
    )
  );

  select coalesce(sum(u.budget_units), 0)::integer
    into v_used_units
  from public.nuri_place_enrichment_usage u
  where u.provider = v_provider
    and u.budget_month = v_budget_month;

  if v_units = 0 then
    return query
    select
      true,
      v_budget_month,
      v_used_units,
      greatest(v_hard_cap - v_used_units, 0),
      v_hard_cap;
    return;
  end if;

  if v_used_units + v_units > v_hard_cap then
    return query
    select
      false,
      v_budget_month,
      v_used_units,
      greatest(v_hard_cap - v_used_units, 0),
      v_hard_cap;
    return;
  end if;

  insert into public.nuri_place_enrichment_usage (
    provider,
    track,
    budget_month,
    request_count,
    budget_units,
    last_request_at
  )
  values (
    v_provider,
    v_track,
    v_budget_month,
    1,
    v_units,
    timezone('utc', now())
  )
  on conflict (provider, track, budget_month)
  do update
  set
    request_count = public.nuri_place_enrichment_usage.request_count + 1,
    budget_units = public.nuri_place_enrichment_usage.budget_units + v_units,
    last_request_at = timezone('utc', now());

  v_used_units := v_used_units + v_units;

  return query
  select
    true,
    v_budget_month,
    v_used_units,
    greatest(v_hard_cap - v_used_units, 0),
    v_hard_cap;
end;
$function$;

revoke all on function public.claim_nuri_place_enrichment_budget(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_nuri_place_enrichment_budget(text,text,integer,integer) to service_role;

-- Old RPCs cannot complete a job without a server-issued lease. Kept for history only.
revoke all on function public.claim_nuri_place_enrichment_job(text,text,text,text,text[],text,text,integer) from public, anon, authenticated, service_role;
revoke all on function public.complete_nuri_place_enrichment_job(uuid,text,jsonb,text,text) from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_nuri_place_enrichment_job_v2(p_domain text, p_place_key text, p_provider text, p_cache_key text, p_requested_fields text[], p_dedupe_key text, p_lock_ttl_seconds integer DEFAULT 45)
 RETURNS TABLE(job_id uuid, claim_granted boolean, status text, requested_fields text[], locked_until timestamp with time zone, cache_key text, updated_at timestamp with time zone, lease_owner text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_domain text := nullif(trim(p_domain), '');
  v_place_key text := nullif(trim(p_place_key), '');
  v_provider text := nullif(trim(p_provider), '');
  v_cache_key text := nullif(trim(p_cache_key), '');
  v_dedupe_key text := nullif(trim(p_dedupe_key), '');
  v_worker_id text := gen_random_uuid()::text;
  v_requested_fields text[] := coalesce(p_requested_fields, '{}'::text[]);
  v_lock_ttl_seconds integer := least(greatest(coalesce(p_lock_ttl_seconds, 45), 15), 120);
  v_now timestamptz := timezone('utc', now());
  v_job public.nuri_place_enrichment_jobs;
begin
  if v_provider is distinct from 'google-places' then
    raise exception using errcode = '22023', message = 'enrichment_provider_invalid';
  end if;
  if v_domain is null then
    raise exception using errcode = 'P0001', message = 'domain_required';
  end if;

  if v_place_key is null then
    raise exception using errcode = 'P0001', message = 'place_key_required';
  end if;

  if v_provider is null then
    raise exception using errcode = 'P0001', message = 'provider_required';
  end if;

  if v_cache_key is null then
    raise exception using errcode = 'P0001', message = 'cache_key_required';
  end if;

  if v_dedupe_key is null then
    raise exception using errcode = 'P0001', message = 'dedupe_key_required';
  end if;

  insert into public.nuri_place_enrichment_jobs (
    domain,
    place_key,
    provider,
    dedupe_key,
    cache_key,
    requested_fields,
    status
  )
  values (
    v_domain,
    v_place_key,
    v_provider,
    v_dedupe_key,
    v_cache_key,
    v_requested_fields,
    'queued'
  )
  on conflict (dedupe_key)
  do nothing;

  select *
    into v_job
  from public.nuri_place_enrichment_jobs
  where dedupe_key = v_dedupe_key
  for update;

  update public.nuri_place_enrichment_jobs
  set requested_fields = (
    select coalesce(array_agg(distinct field order by field), '{}'::text[])
    from unnest(
      coalesce(v_job.requested_fields, '{}'::text[]) || v_requested_fields
    ) as field
  )
  where id = v_job.id
  returning *
    into v_job;

  if v_job.status = 'running'
     and v_job.locked_until is not null
     and v_job.locked_until > v_now then
    return query
    select
      v_job.id,
      false,
      v_job.status,
      v_job.requested_fields,
      v_job.locked_until,
      v_job.cache_key,
      v_job.updated_at,
      null::text;
    return;
  end if;

  update public.nuri_place_enrichment_jobs
  set
    status = 'running',
    worker_id = v_worker_id,
    attempt_count = attempt_count + 1,
    locked_until = v_now + make_interval(secs => v_lock_ttl_seconds),
    last_error_code = null,
    last_error_message = null,
    completed_at = null
  where id = v_job.id
  returning *
    into v_job;

  return query
  select
    v_job.id,
    true,
    v_job.status,
    v_job.requested_fields,
    v_job.locked_until,
    v_job.cache_key,
    v_job.updated_at,
    v_job.worker_id;
end;
$function$;

revoke all on function public.claim_nuri_place_enrichment_job_v2(text,text,text,text,text[],text,integer) from public, anon, authenticated;
grant execute on function public.claim_nuri_place_enrichment_job_v2(text,text,text,text,text[],text,integer) to service_role;

create or replace function public.complete_nuri_place_enrichment_job_v2(
  p_job_id uuid, p_lease_owner text, p_status text,
  p_result_snapshot jsonb default '{}'::jsonb, p_error_code text default null, p_error_message text default null
) returns public.nuri_place_enrichment_jobs
language plpgsql security definer set search_path = '' as $$
declare v_job public.nuri_place_enrichment_jobs%rowtype;
begin
  if p_status is null or p_status not in ('completed','failed','budget_blocked')
     or jsonb_typeof(coalesce(p_result_snapshot,'{}'::jsonb)) <> 'object'
     or pg_column_size(p_result_snapshot) > 65536 then
    raise exception using errcode = '22023', message = 'enrichment_completion_input_invalid';
  end if;
  select * into v_job from public.nuri_place_enrichment_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'running' or v_job.locked_until is null
     or v_job.locked_until <= clock_timestamp() or p_lease_owner is null
     or v_job.worker_id is distinct from p_lease_owner then
    raise exception using errcode = '42501', message = 'enrichment_lease_invalid';
  end if;
  update public.nuri_place_enrichment_jobs set status = p_status,
    result_snapshot = coalesce(p_result_snapshot,'{}'::jsonb),
    last_error_code = left(p_error_code,80), last_error_message = left(p_error_message,500),
    locked_until = null, completed_at = now()
  where id = p_job_id returning * into v_job;
  return v_job;
end;
$$;
revoke all on function public.complete_nuri_place_enrichment_job_v2(uuid,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.complete_nuri_place_enrichment_job_v2(uuid,text,text,jsonb,text,text) to service_role;
commit;

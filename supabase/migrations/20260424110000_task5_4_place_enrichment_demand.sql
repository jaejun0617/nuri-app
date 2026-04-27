begin;

create table if not exists public.nuri_place_provider_cache (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  place_key text not null,
  provider text not null,
  cache_key text not null,
  attempted_fields text[] not null default '{}'::text[],
  provider_place_id text,
  matched_name text,
  matched_address text,
  match_score integer not null default 0,
  phone text,
  latitude double precision,
  longitude double precision,
  photo_uri text,
  google_maps_uri text,
  photo_attributions jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  last_error_code text,
  fetched_at timestamptz not null default timezone('utc', now()),
  cache_expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint nuri_place_provider_cache_domain_check
    check (char_length(trim(domain)) > 0),
  constraint nuri_place_provider_cache_place_key_check
    check (char_length(trim(place_key)) > 0),
  constraint nuri_place_provider_cache_provider_check
    check (char_length(trim(provider)) > 0),
  constraint nuri_place_provider_cache_cache_key_check
    check (char_length(trim(cache_key)) > 0),
  constraint nuri_place_provider_cache_attempted_fields_check
    check (
      attempted_fields <@ array['phone', 'coordinates', 'thumbnail']::text[]
    ),
  constraint nuri_place_provider_cache_photo_attributions_array_check
    check (jsonb_typeof(photo_attributions) = 'array'),
  constraint nuri_place_provider_cache_raw_payload_object_check
    check (jsonb_typeof(raw_payload) = 'object'),
  constraint nuri_place_provider_cache_unique_place
    unique (domain, place_key, provider)
);

comment on table public.nuri_place_provider_cache is
  'NURI 공용 장소 provider cache. Places 기반 on-demand enrichment 결과를 30일 TTL로 저장한다.';

create index if not exists idx_nuri_place_provider_cache_lookup
  on public.nuri_place_provider_cache (domain, place_key, provider);

create index if not exists idx_nuri_place_provider_cache_expiry
  on public.nuri_place_provider_cache (provider, cache_expires_at asc);

drop trigger if exists trg_nuri_place_provider_cache_updated_at on public.nuri_place_provider_cache;
create trigger trg_nuri_place_provider_cache_updated_at
before update on public.nuri_place_provider_cache
for each row execute function public.set_updated_at();

alter table public.nuri_place_provider_cache enable row level security;

create table if not exists public.nuri_place_enrichment_usage (
  provider text not null,
  track text not null,
  budget_month date not null,
  request_count integer not null default 0,
  budget_units integer not null default 0,
  last_request_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint nuri_place_enrichment_usage_provider_check
    check (char_length(trim(provider)) > 0),
  constraint nuri_place_enrichment_usage_track_check
    check (char_length(trim(track)) > 0),
  constraint nuri_place_enrichment_usage_request_count_check
    check (request_count >= 0),
  constraint nuri_place_enrichment_usage_budget_units_check
    check (budget_units >= 0),
  constraint nuri_place_enrichment_usage_pk
    primary key (provider, track, budget_month)
);

comment on table public.nuri_place_enrichment_usage is
  'Provider enrichment 예산 단위 사용량 집계. SQL RPC에서 하드캡을 강제한다.';

drop trigger if exists trg_nuri_place_enrichment_usage_updated_at on public.nuri_place_enrichment_usage;
create trigger trg_nuri_place_enrichment_usage_updated_at
before update on public.nuri_place_enrichment_usage
for each row execute function public.set_updated_at();

alter table public.nuri_place_enrichment_usage enable row level security;

create table if not exists public.nuri_place_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  place_key text not null,
  provider text not null,
  dedupe_key text not null,
  cache_key text not null,
  requested_fields text[] not null default '{}'::text[],
  status text not null default 'queued',
  worker_id text,
  attempt_count integer not null default 0,
  locked_until timestamptz,
  result_snapshot jsonb not null default '{}'::jsonb,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint nuri_place_enrichment_jobs_domain_check
    check (char_length(trim(domain)) > 0),
  constraint nuri_place_enrichment_jobs_place_key_check
    check (char_length(trim(place_key)) > 0),
  constraint nuri_place_enrichment_jobs_provider_check
    check (char_length(trim(provider)) > 0),
  constraint nuri_place_enrichment_jobs_dedupe_key_check
    check (char_length(trim(dedupe_key)) > 0),
  constraint nuri_place_enrichment_jobs_cache_key_check
    check (char_length(trim(cache_key)) > 0),
  constraint nuri_place_enrichment_jobs_requested_fields_check
    check (
      requested_fields <@ array['phone', 'coordinates', 'thumbnail']::text[]
    ),
  constraint nuri_place_enrichment_jobs_status_check
    check (
      status in (
        'queued',
        'running',
        'completed',
        'failed',
        'budget_blocked'
      )
    ),
  constraint nuri_place_enrichment_jobs_result_snapshot_object_check
    check (jsonb_typeof(result_snapshot) = 'object'),
  constraint nuri_place_enrichment_jobs_attempt_count_check
    check (attempt_count >= 0),
  constraint nuri_place_enrichment_jobs_dedupe_key_unique
    unique (dedupe_key)
);

comment on table public.nuri_place_enrichment_jobs is
  'On-demand place enrichment dedupe/lock queue. 동일 장소 동시 요청을 provider 1회 호출로 병합한다.';

create index if not exists idx_nuri_place_enrichment_jobs_lookup
  on public.nuri_place_enrichment_jobs (domain, place_key, provider);

create index if not exists idx_nuri_place_enrichment_jobs_running
  on public.nuri_place_enrichment_jobs (status, locked_until asc);

drop trigger if exists trg_nuri_place_enrichment_jobs_updated_at on public.nuri_place_enrichment_jobs;
create trigger trg_nuri_place_enrichment_jobs_updated_at
before update on public.nuri_place_enrichment_jobs
for each row execute function public.set_updated_at();

alter table public.nuri_place_enrichment_jobs enable row level security;

create or replace function public.claim_nuri_place_enrichment_budget(
  p_provider text,
  p_track text,
  p_units integer,
  p_hard_cap integer default 6000
)
returns table (
  allowed boolean,
  budget_month date,
  used_units integer,
  remaining_units integer,
  hard_cap integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := nullif(trim(p_provider), '');
  v_track text := nullif(trim(p_track), '');
  v_units integer := greatest(coalesce(p_units, 0), 0);
  v_hard_cap integer := greatest(coalesce(p_hard_cap, 0), 0);
  v_budget_month date := date_trunc('month', timezone('utc', now()))::date;
  v_used_units integer := 0;
begin
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

  select coalesce(sum(budget_units), 0)::integer
    into v_used_units
  from public.nuri_place_enrichment_usage
  where provider = v_provider
    and budget_month = v_budget_month;

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
$$;

comment on function public.claim_nuri_place_enrichment_budget(text, text, integer, integer) is
  'Provider enrichment budget unit 하드캡을 SQL 트랜잭션 수준에서 강제한다.';

create or replace function public.claim_nuri_place_enrichment_job(
  p_domain text,
  p_place_key text,
  p_provider text,
  p_cache_key text,
  p_requested_fields text[],
  p_dedupe_key text,
  p_worker_id text,
  p_lock_ttl_seconds integer default 45
)
returns table (
  job_id uuid,
  claim_granted boolean,
  status text,
  requested_fields text[],
  locked_until timestamptz,
  cache_key text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := nullif(trim(p_domain), '');
  v_place_key text := nullif(trim(p_place_key), '');
  v_provider text := nullif(trim(p_provider), '');
  v_cache_key text := nullif(trim(p_cache_key), '');
  v_dedupe_key text := nullif(trim(p_dedupe_key), '');
  v_worker_id text := nullif(trim(p_worker_id), '');
  v_requested_fields text[] := coalesce(p_requested_fields, '{}'::text[]);
  v_lock_ttl_seconds integer := greatest(coalesce(p_lock_ttl_seconds, 45), 15);
  v_now timestamptz := timezone('utc', now());
  v_job public.nuri_place_enrichment_jobs;
begin
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
      v_job.updated_at;
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
    v_job.updated_at;
end;
$$;

comment on function public.claim_nuri_place_enrichment_job(text, text, text, text, text[], text, text, integer) is
  '동일 장소 on-demand enrichment 요청의 중복 실행을 병합하고 단일 worker claim을 보장한다.';

create or replace function public.complete_nuri_place_enrichment_job(
  p_job_id uuid,
  p_status text,
  p_result_snapshot jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_error_message text default null
)
returns public.nuri_place_enrichment_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := nullif(trim(p_status), '');
  v_job public.nuri_place_enrichment_jobs;
begin
  if p_job_id is null then
    raise exception using errcode = 'P0001', message = 'job_id_required';
  end if;

  if v_status is null then
    raise exception using errcode = 'P0001', message = 'status_required';
  end if;

  update public.nuri_place_enrichment_jobs
  set
    status = v_status,
    result_snapshot = coalesce(p_result_snapshot, '{}'::jsonb),
    last_error_code = p_error_code,
    last_error_message = p_error_message,
    locked_until = null,
    completed_at = timezone('utc', now())
  where id = p_job_id
  returning *
    into v_job;

  return v_job;
end;
$$;

comment on function public.complete_nuri_place_enrichment_job(uuid, text, jsonb, text, text) is
  'On-demand enrichment job 종료 상태를 기록한다.';

commit;

begin;

-- Internal weather operations only. No user/profile/media table is touched.
create table public.nuri_weather_leases (
  location_key text primary key check (length(location_key) between 1 and 120),
  owner uuid not null,
  expires_at timestamptz not null
);
create table public.nuri_weather_counters (
  counter_key text not null check (length(counter_key) between 1 and 160),
  window_start timestamptz not null,
  calls integer not null check (calls >= 0),
  expires_at timestamptz not null,
  primary key (counter_key, window_start)
);
create index nuri_weather_counters_expiry on public.nuri_weather_counters(expires_at);
create table public.nuri_weather_provider_health (
  provider text primary key check (provider in ('open-meteo-forecast','open-meteo-aq')),
  consecutive_failures integer not null default 0,
  suppressed_until timestamptz,
  updated_at timestamptz not null default now()
);
create table public.nuri_weather_metrics (
  day date not null,
  provider text not null check (length(provider) between 1 and 40),
  metric text not null check (metric in (
    'requests','provider_request','provider_success','provider_failure','timeout',
    'cache_hit','cache_miss','fresh_cache','stale_cache','unavailable',
    'location_mismatch','missing_fields','response_latency','provider_latency','rate_limited'
  )),
  location_bucket text not null check (length(location_bucket) <= 80),
  total bigint not null default 0 check (total >= 0),
  samples bigint not null default 0 check (samples >= 0),
  primary key (day,provider,metric,location_bucket)
);

alter table public.nuri_weather_leases enable row level security;
alter table public.nuri_weather_counters enable row level security;
alter table public.nuri_weather_provider_health enable row level security;
alter table public.nuri_weather_metrics enable row level security;
revoke all on public.nuri_weather_leases, public.nuri_weather_counters,
  public.nuri_weather_provider_health, public.nuri_weather_metrics from public,anon,authenticated;
grant select,insert,update,delete on public.nuri_weather_leases, public.nuri_weather_counters,
  public.nuri_weather_provider_health, public.nuri_weather_metrics to service_role;

create function public.nuri_weather_acquire_lease(p_key text,p_owner uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare acquired boolean := false;
begin
  insert into public.nuri_weather_leases(location_key,owner,expires_at)
    values(p_key,p_owner,clock_timestamp()+interval '20 seconds')
    on conflict(location_key) do update set owner=excluded.owner,expires_at=excluded.expires_at
    where nuri_weather_leases.expires_at <= clock_timestamp()
    returning true into acquired;
  return coalesce(acquired,false);
end;
$$;

create function public.nuri_weather_release_lease(p_key text,p_owner uuid)
returns void language sql security invoker set search_path='' as $$
  delete from public.nuri_weather_leases where location_key=p_key and owner=p_owner;
$$;

-- Atomic reservation prevents independent Edge instances from overspending one window.
create function public.nuri_weather_consume(p_key text,p_seconds integer,p_limit integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare stamp timestamptz; allowed boolean := false;
begin
  if p_seconds not in (60,3600,86400) or p_limit < 1 or p_limit > 100000 then
    raise exception 'invalid_weather_budget';
  end if;
  stamp := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_seconds) * p_seconds);
  insert into public.nuri_weather_counters(counter_key,window_start,calls,expires_at)
    values(p_key,stamp,1,stamp+make_interval(secs=>p_seconds)+interval '1 hour')
    on conflict(counter_key,window_start) do update set calls=nuri_weather_counters.calls+1
    where nuri_weather_counters.calls < p_limit
    returning true into allowed;
  delete from public.nuri_weather_counters where ctid in (
    select ctid from public.nuri_weather_counters where expires_at < clock_timestamp() limit 100
  );
  delete from public.nuri_weather_leases where ctid in (
    select ctid from public.nuri_weather_leases where expires_at < clock_timestamp()-interval '1 minute' limit 100
  );
  return coalesce(allowed,false);
end;
$$;

create function public.nuri_weather_provider_result(p_provider text,p_success boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  insert into public.nuri_weather_provider_health(provider,consecutive_failures,suppressed_until)
    values(p_provider,case when p_success then 0 else 1 end,null)
    on conflict(provider) do update set
      consecutive_failures=case when p_success then 0 else nuri_weather_provider_health.consecutive_failures+1 end,
      suppressed_until=case when p_success then null
        when nuri_weather_provider_health.consecutive_failures+1 >= 3 then clock_timestamp()+interval '60 seconds'
        else null end,
      updated_at=clock_timestamp();
end;
$$;

create function public.nuri_weather_record_metric(p_provider text,p_metric text,p_bucket text,p_value bigint)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_value < 0 or p_value > 10000000 then raise exception 'invalid_weather_metric'; end if;
  insert into public.nuri_weather_metrics(day,provider,metric,location_bucket,total,samples)
    values((clock_timestamp() at time zone 'UTC')::date,p_provider,p_metric,p_bucket,p_value,1)
    on conflict(day,provider,metric,location_bucket) do update set
      total=nuri_weather_metrics.total+excluded.total,samples=nuri_weather_metrics.samples+1;
  delete from public.nuri_weather_metrics where ctid in (
    select ctid from public.nuri_weather_metrics where day < current_date-14 limit 100
  );
end;
$$;

revoke all on function public.nuri_weather_acquire_lease(text,uuid),
  public.nuri_weather_release_lease(text,uuid), public.nuri_weather_consume(text,integer,integer),
  public.nuri_weather_provider_result(text,boolean), public.nuri_weather_record_metric(text,text,text,bigint)
  from public,anon,authenticated;
grant execute on function public.nuri_weather_acquire_lease(text,uuid),
  public.nuri_weather_release_lease(text,uuid), public.nuri_weather_consume(text,integer,integer),
  public.nuri_weather_provider_result(text,boolean), public.nuri_weather_record_metric(text,text,text,bigint)
  to service_role;

comment on column public.nuri_weather_cache.expires_at is 'Fresh TTL baseline: fetched_at + 15 minutes; no read-based extension.';
comment on column public.nuri_weather_cache.stale_until is 'Safe stale ceiling: fetched_at + 1 hour; expired data is unavailable.';
commit;

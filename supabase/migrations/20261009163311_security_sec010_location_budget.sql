begin;
-- Fixed-size counters: one row per caller and one global row. No query/location data.
create table public.location_discovery_rate_limits (
  bucket_key text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  minute_start timestamptz not null,
  day_start timestamptz not null,
  minute_requests integer not null default 0 check (minute_requests >= 0),
  day_requests integer not null default 0 check (day_requests >= 0)
);
alter table public.location_discovery_rate_limits enable row level security;
revoke all on public.location_discovery_rate_limits from public, anon, authenticated, service_role;

create function public.claim_location_discovery_budget(p_user_id uuid)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_minute timestamptz := date_trunc('minute',v_now);
  v_day timestamptz := date_trunc('day',v_now at time zone 'UTC') at time zone 'UTC';
  v_global public.location_discovery_rate_limits%rowtype;
  v_caller public.location_discovery_rate_limits%rowtype;
begin
  if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then
    raise exception using errcode='42501',message='location_caller_invalid';
  end if;
  -- One lock order serializes both limits, including concurrent Edge instances.
  perform pg_advisory_xact_lock(hashtextextended('nuri:location-discovery-budget',0));
  insert into public.location_discovery_rate_limits(bucket_key,user_id,minute_start,day_start)
    values('global',null,v_minute,v_day),('user:'||p_user_id::text,p_user_id,v_minute,v_day)
    on conflict(bucket_key) do nothing;
  update public.location_discovery_rate_limits
    set minute_requests=case when minute_start<>v_minute then 0 else minute_requests end,
        day_requests=case when day_start<>v_day then 0 else day_requests end,
        minute_start=v_minute,day_start=v_day
    where bucket_key in ('global','user:'||p_user_id::text);
  select * into v_global from public.location_discovery_rate_limits where bucket_key='global';
  select * into v_caller from public.location_discovery_rate_limits where bucket_key='user:'||p_user_id::text;
  if v_global.day_requests>=10000 or v_caller.day_requests>=500 then
    return query select false,greatest(1,ceil(extract(epoch from (v_day+interval '1 day'-v_now)))::integer);
    return;
  end if;
  if v_caller.minute_requests>=60 then
    return query select false,greatest(1,ceil(extract(epoch from (v_minute+interval '1 minute'-v_now)))::integer);
    return;
  end if;
  update public.location_discovery_rate_limits
    set minute_requests=minute_requests+1,day_requests=day_requests+1
    where bucket_key in ('global','user:'||p_user_id::text);
  return query select true,0;
end;
$$;
revoke all on function public.claim_location_discovery_budget(uuid) from public,anon,authenticated;
grant execute on function public.claim_location_discovery_budget(uuid) to service_role;
commit;

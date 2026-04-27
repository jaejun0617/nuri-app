begin;

drop function if exists public.claim_nuri_place_enrichment_budget(text, text, integer, integer);

create or replace function public.claim_nuri_place_enrichment_budget(
  p_provider text,
  p_track text,
  p_units integer,
  p_hard_cap integer default 6000
)
returns table (
  allowed boolean,
  usage_month date,
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
$$;

commit;

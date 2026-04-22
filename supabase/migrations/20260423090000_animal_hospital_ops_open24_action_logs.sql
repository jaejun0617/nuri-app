begin;

create or replace function public.animal_hospital_ops_summary()
returns table (
  total_canonical bigint,
  source_rows bigint,
  public_visible bigint,
  active_not_hidden bigint,
  source_unlinked_rows bigint,
  canonical_drift_suspected bigint,
  pending_phone bigint,
  pending_coordinates bigint,
  pending_thumbnail bigint,
  pending_open24_hours bigint,
  provider_only_candidates integer,
  canonical_linked integer,
  hidden_count bigint,
  inactive_count bigint,
  approved_phone_coverage bigint,
  approved_coordinates_coverage bigint,
  approved_thumbnail_coverage bigint,
  approved_open24_hours_coverage bigint,
  latest_runtime_snapshot_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_animal_hospital_admin() then
    raise exception 'ANIMAL_HOSPITAL_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  with latest_runtime as (
    select *
    from public.animal_hospital_runtime_match_snapshots
    order by created_at desc
    limit 1
  ),
  approved_counts as (
    select
      count(distinct animal_hospital_id) filter (where field_key = 'phone') as phone_count,
      count(distinct animal_hospital_id) filter (where field_key = 'coordinates') as coordinates_count,
      count(distinct animal_hospital_id) filter (where field_key = 'thumbnail') as thumbnail_count,
      count(distinct animal_hospital_id) filter (where field_key = 'open24Hours') as open24_count
    from public.animal_hospital_verifications
    where status = 'approved'
      and (expires_at is null or expires_at > timezone('utc', now()))
  ),
  pending_counts as (
    select
      count(*) filter (where field_key = 'phone') as phone_count,
      count(*) filter (where field_key = 'coordinates') as coordinates_count,
      count(*) filter (where field_key = 'thumbnail') as thumbnail_count,
      count(*) filter (where field_key = 'open24Hours') as open24_count
    from public.animal_hospital_verifications
    where status = 'pending'
  )
  select
    (select count(*) from public.animal_hospitals),
    (select count(*) from public.animal_hospital_source_records),
    (select count(*) from public.animal_hospitals where is_active = true and is_hidden = false),
    (select count(*) from public.animal_hospitals where is_active = true and is_hidden = false),
    (select count(*) from public.animal_hospital_source_records where canonical_hospital_id is null),
    (
      select count(*)
      from public.animal_hospital_source_records s
      join public.animal_hospitals h on h.id = s.canonical_hospital_id
      where s.source_kind = 'official-registry'
        and (
          s.name is distinct from h.canonical_name
          or s.normalized_primary_address is distinct from h.normalized_primary_address
          or s.official_phone is distinct from h.official_phone
          or s.latitude is distinct from h.latitude
          or s.longitude is distinct from h.longitude
          or s.coordinate_normalization_status is distinct from h.coordinate_normalization_status
        )
    ),
    coalesce((select phone_count from pending_counts), 0),
    coalesce((select coordinates_count from pending_counts), 0),
    coalesce((select thumbnail_count from pending_counts), 0),
    coalesce((select open24_count from pending_counts), 0),
    coalesce((select provider_only_count from latest_runtime), 0),
    coalesce((select canonical_linked_count from latest_runtime), 0),
    (select count(*) from public.animal_hospitals where is_hidden = true),
    (select count(*) from public.animal_hospitals where is_active = false),
    coalesce((select phone_count from approved_counts), 0),
    coalesce((select coordinates_count from approved_counts), 0),
    coalesce((select thumbnail_count from approved_counts), 0),
    coalesce((select open24_count from approved_counts), 0),
    (select created_at from latest_runtime);
end;
$$;

grant execute on function public.animal_hospital_ops_summary() to authenticated;

create or replace function public.animal_hospital_ops_review_items(
  p_status_filter text default 'pending',
  p_field_filter text default null,
  p_source_type text default null,
  p_search text default null,
  p_limit integer default 80
)
returns table (
  animal_hospital_id text,
  name text,
  address text,
  is_active boolean,
  is_hidden boolean,
  lifecycle_note text,
  source_type text,
  source_record_key text,
  verification_id uuid,
  field_key text,
  verification_status text,
  current_public_value jsonb,
  candidate_value jsonb,
  verification_source text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  note text,
  evidence jsonb,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(btrim(coalesce(p_status_filter, 'pending')), '');
  v_field text := nullif(btrim(coalesce(p_field_filter, '')), '');
  v_source text := nullif(btrim(coalesce(p_source_type, '')), '');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_animal_hospital_admin() then
    raise exception 'ANIMAL_HOSPITAL_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_status is not null
    and v_status not in ('all', 'pending', 'approved', 'rejected', 'held', 'hidden', 'inactive') then
    raise exception 'ANIMAL_HOSPITAL_STATUS_FILTER_INVALID'
      using errcode = '22023';
  end if;

  if v_field is not null
    and v_field not in ('phone', 'coordinates', 'thumbnail', 'open24Hours') then
    raise exception 'ANIMAL_HOSPITAL_FIELD_FILTER_INVALID'
      using errcode = '22023';
  end if;

  return query
  select
    h.id,
    h.canonical_name,
    h.primary_address,
    h.is_active,
    h.is_hidden,
    h.lifecycle_note,
    coalesce(s.provider, h.primary_source_provider) as source_type,
    coalesce(s.source_key, h.official_source_key) as source_record_key,
    v.id as verification_id,
    v.field_key,
    v.status,
    case
      when v.field_key = 'phone' then coalesce((
        select av.verified_value
        from public.animal_hospital_verifications av
        where av.animal_hospital_id = h.id
          and av.field_key = 'phone'
          and av.status = 'approved'
          and (av.expires_at is null or av.expires_at > timezone('utc', now()))
        order by av.reviewed_at desc nulls last, av.updated_at desc
        limit 1
      ), '{}'::jsonb)
      when v.field_key = 'coordinates' then coalesce((
        select av.verified_value
        from public.animal_hospital_verifications av
        where av.animal_hospital_id = h.id
          and av.field_key = 'coordinates'
          and av.status = 'approved'
          and (av.expires_at is null or av.expires_at > timezone('utc', now()))
        order by av.reviewed_at desc nulls last, av.updated_at desc
        limit 1
      ), '{}'::jsonb)
      when v.field_key = 'thumbnail' then coalesce((
        select av.verified_value
        from public.animal_hospital_verifications av
        where av.animal_hospital_id = h.id
          and av.field_key = 'thumbnail'
          and av.status = 'approved'
          and (av.expires_at is null or av.expires_at > timezone('utc', now()))
        order by av.reviewed_at desc nulls last, av.updated_at desc
        limit 1
      ), '{}'::jsonb)
      when v.field_key = 'open24Hours' then coalesce((
        select av.verified_value
        from public.animal_hospital_verifications av
        where av.animal_hospital_id = h.id
          and av.field_key = 'open24Hours'
          and av.status = 'approved'
          and (av.expires_at is null or av.expires_at > timezone('utc', now()))
        order by av.reviewed_at desc nulls last, av.updated_at desc
        limit 1
      ), '{}'::jsonb)
      else jsonb_build_object(
        'phone', h.official_phone,
        'latitude', h.latitude,
        'longitude', h.longitude
      )
    end as current_public_value,
    coalesce(v.verified_value, '{}'::jsonb),
    v.verification_source,
    v.reviewer_id,
    v.reviewed_at,
    v.note,
    coalesce(v.evidence, '{}'::jsonb),
    coalesce(v.updated_at, h.updated_at)
  from public.animal_hospitals h
  left join lateral (
    select sr.*
    from public.animal_hospital_source_records sr
    where sr.canonical_hospital_id = h.id
    order by
      case when sr.source_kind = 'official-registry' then 0 else 1 end,
      sr.updated_at desc
    limit 1
  ) s on true
  left join public.animal_hospital_verifications v
    on v.animal_hospital_id = h.id
    and (v_field is null or v.field_key = v_field)
    and (
      v_status in ('all', 'hidden', 'inactive')
      or v.status = coalesce(v_status, 'pending')
    )
  where
    (
      v_status = 'all'
      or v_status = 'hidden' and h.is_hidden = true
      or v_status = 'inactive' and h.is_active = false
      or v_status in ('pending', 'approved', 'rejected', 'held') and v.id is not null
      or v_status is null and v.id is not null
    )
    and (v_source is null or coalesce(s.provider, h.primary_source_provider) = v_source)
    and (
      v_search is null
      or h.canonical_name ilike '%' || v_search || '%'
      or h.primary_address ilike '%' || v_search || '%'
      or h.id ilike '%' || v_search || '%'
      or h.official_source_key ilike '%' || v_search || '%'
      or coalesce(s.source_key, '') ilike '%' || v_search || '%'
      or coalesce(s.provider_record_id, '') ilike '%' || v_search || '%'
    )
  order by coalesce(v.updated_at, h.updated_at) desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

grant execute on function public.animal_hospital_ops_review_items(text, text, text, text, integer) to authenticated;

create or replace function public.animal_hospital_ops_detail(p_animal_hospital_id text)
returns table (
  hospital jsonb,
  source_records jsonb,
  verifications jsonb,
  action_logs jsonb,
  public_projection jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_animal_hospital_admin() then
    raise exception 'ANIMAL_HOSPITAL_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    to_jsonb(h.*) as hospital,
    coalesce((
      select jsonb_agg(to_jsonb(s.*) order by s.updated_at desc)
      from public.animal_hospital_source_records s
      where s.canonical_hospital_id = h.id
    ), '[]'::jsonb) as source_records,
    coalesce((
      select jsonb_agg(to_jsonb(v.*) order by v.updated_at desc)
      from public.animal_hospital_verifications v
      where v.animal_hospital_id = h.id
    ), '[]'::jsonb) as verifications,
    coalesce((
      select jsonb_agg(to_jsonb(l.*) order by l.created_at desc)
      from (
        select *
        from public.animal_hospital_operator_action_log
        where animal_hospital_id = h.id
        order by created_at desc
        limit 20
      ) l
    ), '[]'::jsonb) as action_logs,
    jsonb_build_object(
      'phone', (
        select v.verified_value
        from public.animal_hospital_verifications v
        where v.animal_hospital_id = h.id
          and v.field_key = 'phone'
          and v.status = 'approved'
          and (v.expires_at is null or v.expires_at > timezone('utc', now()))
        order by v.reviewed_at desc nulls last, v.updated_at desc
        limit 1
      ),
      'coordinates', (
        select v.verified_value
        from public.animal_hospital_verifications v
        where v.animal_hospital_id = h.id
          and v.field_key = 'coordinates'
          and v.status = 'approved'
          and (v.expires_at is null or v.expires_at > timezone('utc', now()))
        order by v.reviewed_at desc nulls last, v.updated_at desc
        limit 1
      ),
      'thumbnail', (
        select v.verified_value
        from public.animal_hospital_verifications v
        where v.animal_hospital_id = h.id
          and v.field_key = 'thumbnail'
          and v.status = 'approved'
          and (v.expires_at is null or v.expires_at > timezone('utc', now()))
        order by v.reviewed_at desc nulls last, v.updated_at desc
        limit 1
      ),
      'open24Hours', (
        select v.verified_value
        from public.animal_hospital_verifications v
        where v.animal_hospital_id = h.id
          and v.field_key = 'open24Hours'
          and v.status = 'approved'
          and (v.expires_at is null or v.expires_at > timezone('utc', now()))
        order by v.reviewed_at desc nulls last, v.updated_at desc
        limit 1
      )
    ) as public_projection
  from public.animal_hospitals h
  where h.id = p_animal_hospital_id;
end;
$$;

grant execute on function public.animal_hospital_ops_detail(text) to authenticated;

commit;

begin;

create extension if not exists pg_trgm;

create index if not exists idx_animal_hospitals_public_canonical_name_trgm
  on public.animal_hospitals using gin (canonical_name gin_trgm_ops)
  where is_active = true and is_hidden = false;

create index if not exists idx_animal_hospitals_public_primary_address_trgm
  on public.animal_hospitals using gin (primary_address gin_trgm_ops)
  where is_active = true and is_hidden = false;

create index if not exists idx_animal_hospitals_public_coordinates
  on public.animal_hospitals (latitude, longitude)
  where is_active = true
    and is_hidden = false
    and latitude is not null
    and longitude is not null;

create index if not exists idx_animal_hospital_verifications_sensitive_approved
  on public.animal_hospital_verifications (field_key, animal_hospital_id)
  where status = 'approved'
    and field_key in ('open24Hours', 'exoticAnimalCare');

drop function if exists public.animal_hospital_public_search_v1(
  text,
  double precision,
  double precision,
  boolean,
  integer,
  integer,
  boolean,
  boolean
);

create function public.animal_hospital_public_search_v1(
  p_query text default null,
  p_anchor_lat double precision default null,
  p_anchor_lng double precision default null,
  p_use_nearby boolean default true,
  p_radius_meters integer default 5000,
  p_limit integer default 40,
  p_open24_hours_only boolean default false,
  p_exotic_animal_care_only boolean default false
)
returns table (
  id text,
  official_source_key text,
  primary_source_provider text,
  primary_source_record_id text,
  canonical_name text,
  normalized_name text,
  primary_address text,
  road_address text,
  lot_address text,
  normalized_primary_address text,
  latitude numeric,
  longitude numeric,
  coordinate_source text,
  coordinate_normalization_status text,
  status_code text,
  status_summary text,
  license_status_text text,
  operation_status_text text,
  official_phone text,
  normalized_phone text,
  public_trust_status text,
  freshness_status text,
  requires_verification boolean,
  has_source_conflict boolean,
  source_updated_at timestamptz,
  canonical_updated_at timestamptz,
  reviewed_at timestamptz,
  is_active boolean,
  is_hidden boolean,
  lifecycle_note text,
  provider_place_id text,
  provider_place_url text,
  distance_meters integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as not materialized (
    select
      nullif(btrim(p_query), '') as query_text,
      case
        when nullif(btrim(p_query), '') is null then null
        else '%' ||
          replace(
            replace(
              replace(nullif(btrim(p_query), ''), E'\\', E'\\\\'),
              '%',
              E'\\%'
            ),
            '_',
            E'\\_'
          ) ||
          '%'
      end as query_pattern,
      p_anchor_lat as anchor_lat,
      p_anchor_lng as anchor_lng,
      coalesce(p_use_nearby, true) as use_nearby,
      greatest(1000, least(coalesce(p_radius_meters, 5000), 10000))::double precision as radius_meters,
      greatest(1, least(coalesce(p_limit, 40), 80)) as result_limit,
      coalesce(p_open24_hours_only, false) as open24_hours_only,
      coalesce(p_exotic_animal_care_only, false) as exotic_animal_care_only,
      coalesce((
        p_anchor_lat between -90 and 90
        and p_anchor_lng between -180 and 180
      ), false) as has_anchor
  ),
  candidates as (
    select
      h.*,
      case
        when p.has_anchor
          and h.latitude is not null
          and h.longitude is not null
        then round(
          6371000 * 2 * atan2(
            sqrt(
              power(sin(radians((h.latitude::double precision - p.anchor_lat) / 2)), 2)
              + cos(radians(p.anchor_lat))
              * cos(radians(h.latitude::double precision))
              * power(sin(radians((h.longitude::double precision - p.anchor_lng) / 2)), 2)
            ),
            sqrt(greatest(
              0::double precision,
              1 - (
                power(sin(radians((h.latitude::double precision - p.anchor_lat) / 2)), 2)
                + cos(radians(p.anchor_lat))
                * cos(radians(h.latitude::double precision))
                * power(sin(radians((h.longitude::double precision - p.anchor_lng) / 2)), 2)
              )
            ))
          )
        )::integer
        else null
      end as calculated_distance_meters
    from public.animal_hospitals h
    cross join params p
    where h.is_active = true
      and h.is_hidden = false
      and (
        not p.use_nearby
        or (
          h.latitude is not null
          and h.longitude is not null
        )
      )
      and (
        not p.use_nearby
        or not p.has_anchor
        or (
          h.latitude between
            (p.anchor_lat - (p.radius_meters / 111000.0))::numeric
            and
            (p.anchor_lat + (p.radius_meters / 111000.0))::numeric
          and h.longitude between
            (
              p.anchor_lng -
              (
                p.radius_meters /
                (111000.0 * greatest(cos(radians(p.anchor_lat)), 0.2))
              )
            )::numeric
            and
            (
              p.anchor_lng +
              (
                p.radius_meters /
                (111000.0 * greatest(cos(radians(p.anchor_lat)), 0.2))
              )
            )::numeric
        )
      )
      and (
        p.query_text is null
        or h.canonical_name ilike p.query_pattern escape E'\\'
        or h.primary_address ilike p.query_pattern escape E'\\'
      )
      and (
        not p.open24_hours_only
        or exists (
          select 1
          from public.animal_hospital_verifications v
          where v.animal_hospital_id = h.id
            and v.field_key = 'open24Hours'
            and v.status = 'approved'
            and (v.expires_at is null or v.expires_at > timezone('utc', now()))
            and lower(
              coalesce(
                v.verified_value ->> 'open24Hours',
                v.verified_value ->> 'value',
                v.verified_value ->> 'isOpen24Hours',
                ''
              )
            ) in ('true', '1', 'yes', 'y')
        )
      )
      and (
        not p.exotic_animal_care_only
        or exists (
          select 1
          from public.animal_hospital_verifications v
          where v.animal_hospital_id = h.id
            and v.field_key = 'exoticAnimalCare'
            and v.status = 'approved'
            and (v.expires_at is null or v.expires_at > timezone('utc', now()))
            and lower(
              coalesce(
                v.verified_value ->> 'exoticAnimalCare',
                v.verified_value ->> 'value',
                v.verified_value ->> 'supportsExoticAnimalCare',
                ''
              )
            ) in ('true', '1', 'yes', 'y')
        )
      )
  ),
  filtered as (
    select c.*
    from candidates c
    cross join params p
    where
      not p.use_nearby
      or not p.has_anchor
      or c.calculated_distance_meters <= p.radius_meters
  )
  select
    f.id,
    f.official_source_key,
    f.primary_source_provider,
    f.primary_source_record_id,
    f.canonical_name,
    f.normalized_name,
    f.primary_address,
    f.road_address,
    f.lot_address,
    f.normalized_primary_address,
    f.latitude,
    f.longitude,
    f.coordinate_source,
    f.coordinate_normalization_status,
    f.status_code,
    f.status_summary,
    f.license_status_text,
    f.operation_status_text,
    f.official_phone,
    f.normalized_phone,
    f.public_trust_status,
    f.freshness_status,
    f.requires_verification,
    f.has_source_conflict,
    f.source_updated_at,
    f.canonical_updated_at,
    f.reviewed_at,
    f.is_active,
    f.is_hidden,
    f.lifecycle_note,
    f.provider_place_id,
    f.provider_place_url,
    f.calculated_distance_meters as distance_meters
  from filtered f
  cross join params p
  order by
    case when p.has_anchor then f.calculated_distance_meters end asc nulls last,
    case when not p.has_anchor then f.canonical_updated_at end desc nulls last,
    f.canonical_name asc,
    f.id asc
  limit (select result_limit from params);
$$;

grant execute on function public.animal_hospital_public_search_v1(
  text,
  double precision,
  double precision,
  boolean,
  integer,
  integer,
  boolean,
  boolean
) to anon, authenticated;

comment on function public.animal_hospital_public_search_v1(
  text,
  double precision,
  double precision,
  boolean,
  integer,
  integer,
  boolean,
  boolean
) is
  '동물병원 public 검색 v1. PostGIS 없이 Haversine 거리 계산, public visible 필터, approved 민감 필터, 정렬 후 limit만 담당한다.';

commit;

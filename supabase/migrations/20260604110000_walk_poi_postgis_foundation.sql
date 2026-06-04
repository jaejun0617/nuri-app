begin;

set local search_path = public, extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.is_walk_poi_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'super_admin')
    );
$$;

create table if not exists public.walk_pois (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  category text not null default 'other',
  category_label text not null default '산책 장소',
  description text,
  primary_address text,
  road_address text,
  lot_address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  location geography(Point, 4326) not null,
  lifecycle_status text not null default 'active',
  visibility_status text not null default 'hidden',
  review_status text not null default 'pending',
  quality_score numeric(5, 2) not null default 0,
  source_attribution text,
  primary_source_provider text not null default 'operator-seed',
  primary_source_record_id uuid,
  source_updated_at timestamptz,
  last_reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  search_text text generated always as (
    lower(
      btrim(
        coalesce(canonical_name, '') || ' ' ||
        coalesce(category_label, '') || ' ' ||
        coalesce(primary_address, '') || ' ' ||
        coalesce(road_address, '') || ' ' ||
        coalesce(lot_address, '') || ' ' ||
        coalesce(description, '')
      )
    )
  ) stored,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint walk_pois_name_not_blank check (btrim(canonical_name) <> ''),
  constraint walk_pois_normalized_name_not_blank check (btrim(normalized_name) <> ''),
  constraint walk_pois_category_check check (
    category in (
      'park',
      'trail',
      'walkway',
      'waterside',
      'forest',
      'pet-friendly-area',
      'other'
    )
  ),
  constraint walk_pois_coordinate_range_check check (
    latitude between -90 and 90
    and longitude between -180 and 180
  ),
  constraint walk_pois_lifecycle_status_check check (
    lifecycle_status in ('active', 'inactive', 'archived')
  ),
  constraint walk_pois_visibility_status_check check (
    visibility_status in ('hidden', 'public', 'internal')
  ),
  constraint walk_pois_review_status_check check (
    review_status in ('pending', 'approved', 'rejected', 'held')
  ),
  constraint walk_pois_quality_score_check check (
    quality_score between 0 and 100
  ),
  constraint walk_pois_source_provider_check check (
    primary_source_provider in (
      'public-data',
      'osm',
      'operator-seed',
      'kakao-local-admin',
      'manual'
    )
  ),
  constraint walk_pois_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

comment on table public.walk_pois is
  'V1.1 walk/location discovery canonical POI table. Public clients must read through approved projection RPCs, not internal source/review fields.';
comment on column public.walk_pois.location is
  'PostGIS geography point synced from latitude/longitude for ST_DWithin/ST_Distance radius queries.';
comment on column public.walk_pois.primary_source_provider is
  'Canonical source marker. Kakao Local is allowed only as admin seed assistance, never as user runtime trust.';
comment on column public.walk_pois.metadata is
  'Internal canonical metadata. Provider raw payloads belong in walk_poi_source_records and are not public.';

create or replace function public.sync_walk_poi_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.latitude is null or new.longitude is null then
    raise exception 'WALK_POI_COORDINATES_REQUIRED'
      using errcode = '23514';
  end if;

  if new.latitude < -90
     or new.latitude > 90
     or new.longitude < -180
     or new.longitude > 180 then
    raise exception 'WALK_POI_COORDINATES_INVALID'
      using errcode = '23514';
  end if;

  new.location :=
    st_setsrid(
      st_makepoint(new.longitude::double precision, new.latitude::double precision),
      4326
    )::geography;

  return new;
end;
$$;

drop trigger if exists trg_walk_pois_sync_location on public.walk_pois;
create trigger trg_walk_pois_sync_location
before insert or update of latitude, longitude
on public.walk_pois
for each row
execute function public.sync_walk_poi_location();

drop trigger if exists trg_walk_pois_updated_at on public.walk_pois;
create trigger trg_walk_pois_updated_at
before update on public.walk_pois
for each row
execute function public.set_updated_at();

create table if not exists public.walk_poi_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  import_mode text not null default 'dry_run',
  import_status text not null default 'draft',
  source_name text,
  source_uri text,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint walk_poi_import_batches_source_provider_check check (
    source_provider in (
      'public-data',
      'osm',
      'operator-seed',
      'kakao-local-admin',
      'manual'
    )
  ),
  constraint walk_poi_import_batches_mode_check check (
    import_mode in ('dry_run', 'commit')
  ),
  constraint walk_poi_import_batches_status_check check (
    import_status in ('draft', 'running', 'completed', 'failed', 'cancelled')
  ),
  constraint walk_poi_import_batches_summary_object_check check (
    jsonb_typeof(summary) = 'object'
  )
);

comment on table public.walk_poi_import_batches is
  'Admin/import batch ledger for public data, OSM, operator seed, and Kakao Local admin-only seed assistance.';

drop trigger if exists trg_walk_poi_import_batches_updated_at on public.walk_poi_import_batches;
create trigger trg_walk_poi_import_batches_updated_at
before update on public.walk_poi_import_batches
for each row
execute function public.set_updated_at();

create table if not exists public.walk_poi_source_records (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.walk_poi_import_batches(id) on delete set null,
  walk_poi_id uuid references public.walk_pois(id) on delete set null,
  source_provider text not null,
  external_source_id text,
  source_name text not null,
  source_category text,
  source_address text,
  source_road_address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  source_updated_at timestamptz,
  candidate_status text not null default 'pending',
  confidence_score numeric(5, 2) not null default 0,
  payload_hash text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint walk_poi_source_records_source_provider_check check (
    source_provider in (
      'public-data',
      'osm',
      'operator-seed',
      'kakao-local-admin',
      'manual'
    )
  ),
  constraint walk_poi_source_records_candidate_status_check check (
    candidate_status in ('pending', 'linked', 'rejected', 'held', 'ignored')
  ),
  constraint walk_poi_source_records_confidence_score_check check (
    confidence_score between 0 and 100
  ),
  constraint walk_poi_source_records_coordinate_range_check check (
    (latitude is null and longitude is null)
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint walk_poi_source_records_raw_payload_object_check check (
    jsonb_typeof(raw_payload) = 'object'
  )
);

comment on table public.walk_poi_source_records is
  'Internal source/candidate records. Raw provider payloads are admin-only and never returned from public RPCs.';

drop trigger if exists trg_walk_poi_source_records_updated_at on public.walk_poi_source_records;
create trigger trg_walk_poi_source_records_updated_at
before update on public.walk_poi_source_records
for each row
execute function public.set_updated_at();

create table if not exists public.walk_poi_reviews (
  id uuid primary key default gen_random_uuid(),
  walk_poi_id uuid not null references public.walk_pois(id) on delete cascade,
  source_record_id uuid references public.walk_poi_source_records(id) on delete set null,
  review_status text not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  note text,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint walk_poi_reviews_status_check check (
    review_status in ('approved', 'rejected', 'held')
  ),
  constraint walk_poi_reviews_diff_object_check check (jsonb_typeof(diff) = 'object')
);

comment on table public.walk_poi_reviews is
  'Admin review decisions for canonical POIs and imported candidates.';

create table if not exists public.walk_poi_audit_logs (
  id bigint generated always as identity primary key,
  walk_poi_id uuid references public.walk_pois(id) on delete set null,
  source_record_id uuid references public.walk_poi_source_records(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  before_state jsonb,
  after_state jsonb,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint walk_poi_audit_logs_action_type_not_blank check (btrim(action_type) <> ''),
  constraint walk_poi_audit_logs_before_object_check check (
    before_state is null or jsonb_typeof(before_state) = 'object'
  ),
  constraint walk_poi_audit_logs_after_object_check check (
    after_state is null or jsonb_typeof(after_state) = 'object'
  )
);

comment on table public.walk_poi_audit_logs is
  'Admin-only audit log for POI import, review, merge, visibility, and canonical changes.';

create table if not exists public.walk_poi_search_aliases (
  id uuid primary key default gen_random_uuid(),
  walk_poi_id uuid not null references public.walk_pois(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  language_code text not null default 'ko',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint walk_poi_search_aliases_alias_not_blank check (btrim(alias) <> ''),
  constraint walk_poi_search_aliases_normalized_alias_not_blank check (
    btrim(normalized_alias) <> ''
  ),
  constraint walk_poi_search_aliases_language_not_blank check (
    btrim(language_code) <> ''
  )
);

comment on table public.walk_poi_search_aliases is
  'Admin-managed aliases for Korean place names and common search variants.';

create unique index if not exists idx_walk_poi_search_aliases_unique
  on public.walk_poi_search_aliases (walk_poi_id, normalized_alias);

create index if not exists idx_walk_pois_public_location_gist
  on public.walk_pois
  using gist (location)
  where lifecycle_status = 'active'
    and visibility_status = 'public'
    and review_status = 'approved';

create index if not exists idx_walk_pois_public_state
  on public.walk_pois (review_status, visibility_status, lifecycle_status, quality_score desc);

create index if not exists idx_walk_pois_canonical_name_trgm
  on public.walk_pois using gin (canonical_name gin_trgm_ops);

create index if not exists idx_walk_pois_search_text_trgm
  on public.walk_pois using gin (search_text gin_trgm_ops);

create index if not exists idx_walk_pois_search_text_fts
  on public.walk_pois using gin (to_tsvector('simple', search_text));

create index if not exists idx_walk_poi_source_records_poi_status
  on public.walk_poi_source_records (walk_poi_id, candidate_status);

create unique index if not exists idx_walk_poi_source_records_external_unique
  on public.walk_poi_source_records (source_provider, external_source_id)
  where external_source_id is not null;

create index if not exists idx_walk_poi_source_records_batch
  on public.walk_poi_source_records (import_batch_id, candidate_status);

create index if not exists idx_walk_poi_reviews_poi_reviewed_at
  on public.walk_poi_reviews (walk_poi_id, reviewed_at desc);

create index if not exists idx_walk_poi_audit_logs_poi_created_at
  on public.walk_poi_audit_logs (walk_poi_id, created_at desc);

create index if not exists idx_walk_poi_aliases_alias_trgm
  on public.walk_poi_search_aliases using gin (alias gin_trgm_ops);

alter table public.walk_pois enable row level security;
alter table public.walk_poi_import_batches enable row level security;
alter table public.walk_poi_source_records enable row level security;
alter table public.walk_poi_reviews enable row level security;
alter table public.walk_poi_audit_logs enable row level security;
alter table public.walk_poi_search_aliases enable row level security;

drop policy if exists walk_pois_admin_all on public.walk_pois;
create policy walk_pois_admin_all
on public.walk_pois
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

drop policy if exists walk_poi_import_batches_admin_all on public.walk_poi_import_batches;
create policy walk_poi_import_batches_admin_all
on public.walk_poi_import_batches
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

drop policy if exists walk_poi_source_records_admin_all on public.walk_poi_source_records;
create policy walk_poi_source_records_admin_all
on public.walk_poi_source_records
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

drop policy if exists walk_poi_reviews_admin_all on public.walk_poi_reviews;
create policy walk_poi_reviews_admin_all
on public.walk_poi_reviews
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

drop policy if exists walk_poi_audit_logs_admin_all on public.walk_poi_audit_logs;
create policy walk_poi_audit_logs_admin_all
on public.walk_poi_audit_logs
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

drop policy if exists walk_poi_search_aliases_admin_all on public.walk_poi_search_aliases;
create policy walk_poi_search_aliases_admin_all
on public.walk_poi_search_aliases
for all
to authenticated
using (public.is_walk_poi_admin())
with check (public.is_walk_poi_admin());

revoke all on table public.walk_pois from anon, authenticated;
revoke all on table public.walk_poi_import_batches from anon, authenticated;
revoke all on table public.walk_poi_source_records from anon, authenticated;
revoke all on table public.walk_poi_reviews from anon, authenticated;
revoke all on table public.walk_poi_audit_logs from anon, authenticated;
revoke all on table public.walk_poi_search_aliases from anon, authenticated;

grant select, insert, update, delete on table public.walk_pois to authenticated;
grant select, insert, update, delete on table public.walk_poi_import_batches to authenticated;
grant select, insert, update, delete on table public.walk_poi_source_records to authenticated;
grant select, insert, update, delete on table public.walk_poi_reviews to authenticated;
grant select, insert, update, delete on table public.walk_poi_audit_logs to authenticated;
grant select, insert, update, delete on table public.walk_poi_search_aliases to authenticated;

create or replace function public.walk_poi_public_search_v1(
  p_query text default null,
  p_anchor_lat double precision default null,
  p_anchor_lng double precision default null,
  p_radius_meters integer default 5000,
  p_limit integer default 40,
  p_bbox_min_lat double precision default null,
  p_bbox_min_lng double precision default null,
  p_bbox_max_lat double precision default null,
  p_bbox_max_lng double precision default null
)
returns table (
  id uuid,
  name text,
  category text,
  category_label text,
  description text,
  address text,
  road_address text,
  latitude double precision,
  longitude double precision,
  distance_meters integer,
  source_attribution text,
  public_trust_status text,
  reviewed_at timestamptz,
  updated_at timestamptz,
  quality_score numeric
)
language sql
stable
security definer
set search_path = public, extensions
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
      greatest(250, least(coalesce(p_radius_meters, 5000), 30000))::double precision as radius_meters,
      greatest(1, least(coalesce(p_limit, 40), 80)) as result_limit,
      coalesce((
        p_anchor_lat between -90 and 90
        and p_anchor_lng between -180 and 180
      ), false) as has_anchor,
      case
        when p_anchor_lat between -90 and 90
          and p_anchor_lng between -180 and 180
        then st_setsrid(st_makepoint(p_anchor_lng, p_anchor_lat), 4326)::geography
        else null
      end as anchor_geog,
      coalesce((
        p_bbox_min_lat between -90 and 90
        and p_bbox_max_lat between -90 and 90
        and p_bbox_min_lng between -180 and 180
        and p_bbox_max_lng between -180 and 180
        and p_bbox_min_lat <= p_bbox_max_lat
        and p_bbox_min_lng <= p_bbox_max_lng
      ), false) as has_bbox,
      p_bbox_min_lat as bbox_min_lat,
      p_bbox_min_lng as bbox_min_lng,
      p_bbox_max_lat as bbox_max_lat,
      p_bbox_max_lng as bbox_max_lng
  )
  select
    w.id,
    w.canonical_name as name,
    w.category,
    w.category_label,
    w.description,
    w.primary_address as address,
    w.road_address,
    w.latitude::double precision,
    w.longitude::double precision,
    case
      when params.has_anchor then round(st_distance(w.location, params.anchor_geog))::integer
      else null
    end as distance_meters,
    w.source_attribution,
    'approved'::text as public_trust_status,
    w.last_reviewed_at as reviewed_at,
    w.updated_at,
    w.quality_score
  from public.walk_pois w
  cross join params
  where w.lifecycle_status = 'active'
    and w.visibility_status = 'public'
    and w.review_status = 'approved'
    and (
      not params.has_bbox
      or (
        w.latitude::double precision between params.bbox_min_lat and params.bbox_max_lat
        and w.longitude::double precision between params.bbox_min_lng and params.bbox_max_lng
      )
    )
    and (
      not params.has_anchor
      or st_dwithin(w.location, params.anchor_geog, params.radius_meters)
    )
    and (
      params.query_text is null
      or w.canonical_name ilike params.query_pattern escape E'\\'
      or coalesce(w.primary_address, '') ilike params.query_pattern escape E'\\'
      or coalesce(w.road_address, '') ilike params.query_pattern escape E'\\'
      or coalesce(w.category_label, '') ilike params.query_pattern escape E'\\'
      or to_tsvector('simple', w.search_text) @@ plainto_tsquery('simple', params.query_text)
      or exists (
        select 1
        from public.walk_poi_search_aliases a
        where a.walk_poi_id = w.id
          and a.alias ilike params.query_pattern escape E'\\'
      )
    )
  order by
    case
      when params.has_anchor then st_distance(w.location, params.anchor_geog)
      else null
    end asc nulls last,
    w.quality_score desc,
    w.canonical_name asc
  limit (select result_limit from params);
$$;

create or replace function public.walk_poi_public_nearby_v1(
  p_anchor_lat double precision,
  p_anchor_lng double precision,
  p_radius_meters integer default 5000,
  p_limit integer default 40,
  p_bbox_min_lat double precision default null,
  p_bbox_min_lng double precision default null,
  p_bbox_max_lat double precision default null,
  p_bbox_max_lng double precision default null
)
returns table (
  id uuid,
  name text,
  category text,
  category_label text,
  description text,
  address text,
  road_address text,
  latitude double precision,
  longitude double precision,
  distance_meters integer,
  source_attribution text,
  public_trust_status text,
  reviewed_at timestamptz,
  updated_at timestamptz,
  quality_score numeric
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select *
  from public.walk_poi_public_search_v1(
    null,
    p_anchor_lat,
    p_anchor_lng,
    p_radius_meters,
    p_limit,
    p_bbox_min_lat,
    p_bbox_min_lng,
    p_bbox_max_lat,
    p_bbox_max_lng
  );
$$;

create or replace function public.walk_poi_public_detail_v1(
  p_walk_poi_id uuid
)
returns table (
  id uuid,
  name text,
  category text,
  category_label text,
  description text,
  address text,
  road_address text,
  latitude double precision,
  longitude double precision,
  source_attribution text,
  public_trust_status text,
  reviewed_at timestamptz,
  updated_at timestamptz,
  quality_score numeric
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    w.id,
    w.canonical_name as name,
    w.category,
    w.category_label,
    w.description,
    w.primary_address as address,
    w.road_address,
    w.latitude::double precision,
    w.longitude::double precision,
    w.source_attribution,
    'approved'::text as public_trust_status,
    w.last_reviewed_at as reviewed_at,
    w.updated_at,
    w.quality_score
  from public.walk_pois w
  where w.id = p_walk_poi_id
    and w.lifecycle_status = 'active'
    and w.visibility_status = 'public'
    and w.review_status = 'approved';
$$;

create or replace function public.walk_poi_admin_import_dry_run_v1(
  p_source_provider text,
  p_payload jsonb
)
returns table (
  ok boolean,
  source_provider text,
  candidate_count integer,
  message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_candidate_count integer := 0;
begin
  if not public.is_walk_poi_admin() then
    raise exception 'WALK_POI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if p_source_provider not in (
    'public-data',
    'osm',
    'operator-seed',
    'kakao-local-admin',
    'manual'
  ) then
    raise exception 'WALK_POI_SOURCE_PROVIDER_INVALID'
      using errcode = '22023';
  end if;

  if p_payload is null then
    raise exception 'WALK_POI_IMPORT_PAYLOAD_REQUIRED'
      using errcode = '22023';
  end if;

  v_candidate_count := case jsonb_typeof(p_payload)
    when 'array' then jsonb_array_length(p_payload)
    when 'object' then 1
    else 0
  end;

  if v_candidate_count = 0 then
    raise exception 'WALK_POI_IMPORT_PAYLOAD_INVALID'
      using errcode = '22023';
  end if;

  return query
  select
    true,
    p_source_provider,
    v_candidate_count,
    'dry_run_valid'::text;
end;
$$;

revoke all on function public.walk_poi_public_search_v1(
  text,
  double precision,
  double precision,
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
) from public;
grant execute on function public.walk_poi_public_search_v1(
  text,
  double precision,
  double precision,
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
) to anon, authenticated;

revoke all on function public.walk_poi_public_nearby_v1(
  double precision,
  double precision,
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
) from public;
grant execute on function public.walk_poi_public_nearby_v1(
  double precision,
  double precision,
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
) to anon, authenticated;

revoke all on function public.walk_poi_public_detail_v1(uuid) from public;
grant execute on function public.walk_poi_public_detail_v1(uuid) to anon, authenticated;

revoke all on function public.walk_poi_admin_import_dry_run_v1(text, jsonb) from public;
grant execute on function public.walk_poi_admin_import_dry_run_v1(text, jsonb) to authenticated;

commit;

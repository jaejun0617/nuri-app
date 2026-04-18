begin;

create or replace function public.is_animal_hospital_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create table if not exists public.animal_hospitals (
  id text primary key,
  official_source_key text not null unique,
  primary_source_provider text not null,
  primary_source_record_id text not null,
  canonical_name text not null,
  normalized_name text not null,
  primary_address text not null,
  road_address text,
  lot_address text,
  normalized_primary_address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  coordinate_source text not null,
  coordinate_normalization_status text not null,
  status_code text not null,
  status_summary text not null,
  license_status_text text,
  operation_status_text text,
  official_phone text,
  normalized_phone text,
  public_trust_status text not null,
  freshness_status text not null,
  requires_verification boolean not null default true,
  has_source_conflict boolean not null default false,
  source_updated_at timestamptz,
  canonical_updated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  lifecycle_note text,
  provider_place_id text,
  provider_place_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospitals_primary_source_provider_check
    check (
      primary_source_provider in (
        'official-localdata',
        'municipal-open-data',
        'kakao-place',
        'google-place',
        'naver-place',
        'operator-review'
      )
    ),
  constraint animal_hospitals_coordinate_source_check
    check (
      coordinate_source in (
        'official-wgs84',
        'epsg5174-pending',
        'external-fallback',
        'unknown'
      )
    ),
  constraint animal_hospitals_coordinate_normalization_status_check
    check (
      coordinate_normalization_status in (
        'exact',
        'fallback',
        'missing',
        'conversion-required'
      )
    ),
  constraint animal_hospitals_status_code_check
    check (
      status_code in (
        'operating',
        'closed',
        'suspended',
        'verification-required'
      )
    ),
  constraint animal_hospitals_public_trust_status_check
    check (
      public_trust_status in (
        'candidate',
        'needs_verification',
        'trust_reviewed'
      )
    ),
  constraint animal_hospitals_freshness_status_check
    check (
      freshness_status in (
        'fresh',
        'stale',
        'unknown'
      )
    ),
  constraint animal_hospitals_primary_address_not_blank_check
    check (char_length(btrim(primary_address)) > 0),
  constraint animal_hospitals_normalized_name_not_blank_check
    check (char_length(btrim(normalized_name)) > 0)
);

comment on table public.animal_hospitals is
  '동물병원 canonical master. public query는 이 테이블만 기준으로 읽고 raw source는 분리 유지한다.';

create table if not exists public.animal_hospital_source_records (
  id text primary key,
  source_key text not null unique,
  official_source_key text,
  provider text not null,
  source_kind text not null,
  provider_record_id text not null,
  name text,
  normalized_name text,
  lot_address text,
  road_address text,
  normalized_primary_address text,
  license_status_text text,
  operation_status_text text,
  official_phone text,
  normalized_phone text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  x5174 numeric(12, 3),
  y5174 numeric(12, 3),
  coordinate_crs text not null,
  coordinate_source text not null,
  coordinate_normalization_status text not null,
  source_updated_at timestamptz,
  ingested_at timestamptz not null default timezone('utc', now()),
  snapshot_id text,
  snapshot_fetched_at timestamptz,
  ingest_mode text not null default 'snapshot',
  row_checksum text,
  metadata jsonb not null default '{}'::jsonb,
  canonical_hospital_id text references public.animal_hospitals(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_source_records_provider_check
    check (
      provider in (
        'official-localdata',
        'municipal-open-data',
        'kakao-place',
        'google-place',
        'naver-place',
        'operator-review'
      )
    ),
  constraint animal_hospital_source_records_source_kind_check
    check (
      source_kind in (
        'official-registry',
        'runtime-linkage',
        'review'
      )
    ),
  constraint animal_hospital_source_records_coordinate_crs_check
    check (
      coordinate_crs in (
        'WGS84',
        'EPSG:5174',
        'UNKNOWN'
      )
    ),
  constraint animal_hospital_source_records_coordinate_source_check
    check (
      coordinate_source in (
        'official-wgs84',
        'epsg5174-pending',
        'external-fallback',
        'unknown'
      )
    ),
  constraint animal_hospital_source_records_coordinate_normalization_status_check
    check (
      coordinate_normalization_status in (
        'exact',
        'fallback',
        'missing',
        'conversion-required'
      )
    ),
  constraint animal_hospital_source_records_ingest_mode_check
    check (
      ingest_mode in (
        'snapshot',
        'delta'
      )
    ),
  constraint animal_hospital_source_records_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint animal_hospital_source_records_raw_payload_object_check
    check (jsonb_typeof(raw_payload) = 'object')
);

comment on table public.animal_hospital_source_records is
  '공식 source raw provenance 최신 상태. snapshot 메타와 checksum을 남겨 delta ingestion 확장 기반으로 사용한다.';

create table if not exists public.animal_hospital_change_log (
  id bigint generated always as identity primary key,
  canonical_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  source_record_id text not null references public.animal_hospital_source_records(id) on delete cascade,
  change_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_change_log_change_type_check
    check (
      change_type in (
        'inserted',
        'updated',
        'unchanged',
        'failed'
      )
    ),
  constraint animal_hospital_change_log_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

comment on table public.animal_hospital_change_log is
  '동물병원 canonical write-path 감사 로그 최소 버전.';

create index if not exists idx_animal_hospitals_active_query
  on public.animal_hospitals (is_active, is_hidden, canonical_updated_at desc);

create index if not exists idx_animal_hospitals_name_address
  on public.animal_hospitals (normalized_name, normalized_primary_address);

create index if not exists idx_animal_hospitals_phone
  on public.animal_hospitals (normalized_phone);

create index if not exists idx_animal_hospitals_coordinates
  on public.animal_hospitals (latitude, longitude);

create index if not exists idx_animal_hospital_source_records_provider_record
  on public.animal_hospital_source_records (provider, provider_record_id);

create index if not exists idx_animal_hospital_source_records_snapshot
  on public.animal_hospital_source_records (snapshot_id, ingested_at desc);

create index if not exists idx_animal_hospital_change_log_canonical_created
  on public.animal_hospital_change_log (canonical_hospital_id, created_at desc);

drop trigger if exists trg_animal_hospitals_updated_at on public.animal_hospitals;
create trigger trg_animal_hospitals_updated_at
before update on public.animal_hospitals
for each row execute function public.set_updated_at();

drop trigger if exists trg_animal_hospital_source_records_updated_at on public.animal_hospital_source_records;
create trigger trg_animal_hospital_source_records_updated_at
before update on public.animal_hospital_source_records
for each row execute function public.set_updated_at();

alter table public.animal_hospitals enable row level security;
alter table public.animal_hospital_source_records enable row level security;
alter table public.animal_hospital_change_log enable row level security;

drop policy if exists "animal_hospitals_read_public" on public.animal_hospitals;
create policy "animal_hospitals_read_public"
on public.animal_hospitals
for select
to anon, authenticated
using (is_active = true and is_hidden = false);

drop policy if exists "animal_hospitals_admin_all" on public.animal_hospitals;
create policy "animal_hospitals_admin_all"
on public.animal_hospitals
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

drop policy if exists "animal_hospital_source_records_admin_all" on public.animal_hospital_source_records;
create policy "animal_hospital_source_records_admin_all"
on public.animal_hospital_source_records
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

drop policy if exists "animal_hospital_change_log_admin_all" on public.animal_hospital_change_log;
create policy "animal_hospital_change_log_admin_all"
on public.animal_hospital_change_log
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

commit;

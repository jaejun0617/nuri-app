begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_pet_travel_admin()
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

create table if not exists public.pet_travel_places (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  address text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  place_type text not null,
  primary_source text not null,
  primary_source_place_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_travel_places_canonical_name_not_blank_check
    check (char_length(btrim(canonical_name)) > 0),
  constraint pet_travel_places_address_not_blank_check
    check (char_length(btrim(address)) > 0),
  constraint pet_travel_places_place_type_check
    check (
      place_type in (
        'travel-attraction',
        'outdoor',
        'stay',
        'restaurant',
        'experience',
        'pet-venue',
        'shopping',
        'mixed'
      )
    ),
  constraint pet_travel_places_primary_source_check
    check (
      primary_source in (
        'tour-api',
        'kakao-local',
        'naver-local',
        'google-places',
        'system'
      )
    ),
  constraint pet_travel_places_primary_source_place_id_pair_check
    check (
      (primary_source = 'system' and primary_source_place_id is null)
      or (primary_source <> 'system' and primary_source_place_id is not null)
    ),
  constraint pet_travel_places_latitude_range_check
    check (latitude between -90 and 90),
  constraint pet_travel_places_longitude_range_check
    check (longitude between -180 and 180)
);

comment on table public.pet_travel_places is
  '반려동물과 여행 canonical place 기준 테이블. 외부 provider id와 분리된 내부 anchor';
comment on column public.pet_travel_places.primary_source is
  '현재 canonical place의 대표 원본 source. dedicated source_links는 다음 단계 확장 대상';

create table if not exists public.pet_travel_pet_policies (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.pet_travel_places(id) on delete cascade,
  source_type text not null,
  policy_status text not null,
  policy_note text,
  confidence numeric(4, 3) not null default 0,
  requires_onsite_check boolean not null default true,
  evidence_summary text,
  evidence_payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_travel_pet_policies_source_type_check
    check (
      source_type in (
        'tour-api',
        'user-report',
        'admin-review',
        'system-inference'
      )
    ),
  constraint pet_travel_pet_policies_policy_status_check
    check (
      policy_status in (
        'unknown',
        'allowed',
        'restricted',
        'not_allowed'
      )
    ),
  constraint pet_travel_pet_policies_confidence_range_check
    check (confidence between 0 and 1),
  constraint pet_travel_pet_policies_evidence_payload_object_check
    check (jsonb_typeof(evidence_payload) = 'object')
);

comment on table public.pet_travel_pet_policies is
  '반려동물과 여행 Trust Layer 정책 테이블. source별 정책, confidence, 근거를 누적 저장';
comment on column public.pet_travel_pet_policies.policy_status is
  'unknown / allowed / restricted / not_allowed';
comment on column public.pet_travel_pet_policies.source_type is
  'tour-api / user-report / admin-review / system-inference';
comment on column public.pet_travel_pet_policies.requires_onsite_check is
  'allowed여도 현장 확인이 필요하면 true를 유지한다';

create table if not exists public.pet_travel_user_reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.pet_travel_places(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  report_type text not null,
  report_note text,
  evidence_payload jsonb not null default '{}'::jsonb,
  report_status text not null default 'submitted',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_travel_user_reports_report_type_check
    check (
      report_type in (
        'pet_allowed',
        'pet_restricted',
        'info_outdated'
      )
    ),
  constraint pet_travel_user_reports_report_status_check
    check (
      report_status in (
        'submitted',
        'reviewed',
        'dismissed'
      )
    ),
  constraint pet_travel_user_reports_evidence_payload_object_check
    check (jsonb_typeof(evidence_payload) = 'object'),
  constraint pet_travel_user_reports_unique_user_place_type
    unique (place_id, user_id, report_type)
);

comment on table public.pet_travel_user_reports is
  '반려동물과 여행 유저 제보 원본 테이블. Trust Layer confidence 보강 근거';
comment on column public.pet_travel_user_reports.report_type is
  'pet_allowed / pet_restricted / info_outdated';
comment on column public.pet_travel_user_reports.report_status is
  'submitted / reviewed / dismissed';

create unique index if not exists idx_pet_travel_places_primary_source
  on public.pet_travel_places (primary_source, primary_source_place_id)
  where primary_source <> 'system' and primary_source_place_id is not null;

create index if not exists idx_pet_travel_places_name
  on public.pet_travel_places (canonical_name);

create index if not exists idx_pet_travel_places_type_updated
  on public.pet_travel_places (place_type, updated_at desc);

create index if not exists idx_pet_travel_places_coordinates
  on public.pet_travel_places (latitude, longitude);

create unique index if not exists idx_pet_travel_pet_policies_active_source
  on public.pet_travel_pet_policies (place_id, source_type)
  where is_active = true;

create index if not exists idx_pet_travel_pet_policies_place_created
  on public.pet_travel_pet_policies (place_id, created_at desc);

create index if not exists idx_pet_travel_pet_policies_status_updated
  on public.pet_travel_pet_policies (policy_status, updated_at desc);

create index if not exists idx_pet_travel_pet_policies_source_updated
  on public.pet_travel_pet_policies (source_type, updated_at desc);

create index if not exists idx_pet_travel_user_reports_place_created
  on public.pet_travel_user_reports (place_id, created_at desc);

create index if not exists idx_pet_travel_user_reports_user_created
  on public.pet_travel_user_reports (user_id, created_at desc);

create index if not exists idx_pet_travel_user_reports_status_created
  on public.pet_travel_user_reports (report_status, created_at desc);

create index if not exists idx_pet_travel_user_reports_place_type_status
  on public.pet_travel_user_reports (place_id, report_type, report_status);

drop trigger if exists trg_pet_travel_places_updated_at on public.pet_travel_places;
create trigger trg_pet_travel_places_updated_at
before update on public.pet_travel_places
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_travel_pet_policies_updated_at on public.pet_travel_pet_policies;
create trigger trg_pet_travel_pet_policies_updated_at
before update on public.pet_travel_pet_policies
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_travel_user_reports_updated_at on public.pet_travel_user_reports;
create trigger trg_pet_travel_user_reports_updated_at
before update on public.pet_travel_user_reports
for each row execute function public.set_updated_at();

alter table public.pet_travel_places enable row level security;
alter table public.pet_travel_pet_policies enable row level security;
alter table public.pet_travel_user_reports enable row level security;

drop policy if exists "pet_travel_places_read_public" on public.pet_travel_places;
create policy "pet_travel_places_read_public"
on public.pet_travel_places
for select
to anon, authenticated
using (true);

drop policy if exists "pet_travel_places_admin_all" on public.pet_travel_places;
create policy "pet_travel_places_admin_all"
on public.pet_travel_places
for all
to authenticated
using (public.is_pet_travel_admin())
with check (public.is_pet_travel_admin());

drop policy if exists "pet_travel_pet_policies_read_public" on public.pet_travel_pet_policies;
create policy "pet_travel_pet_policies_read_public"
on public.pet_travel_pet_policies
for select
to anon, authenticated
using (true);

drop policy if exists "pet_travel_pet_policies_admin_all" on public.pet_travel_pet_policies;
create policy "pet_travel_pet_policies_admin_all"
on public.pet_travel_pet_policies
for all
to authenticated
using (public.is_pet_travel_admin())
with check (public.is_pet_travel_admin());

drop policy if exists "pet_travel_user_reports_select_own_or_admin" on public.pet_travel_user_reports;
create policy "pet_travel_user_reports_select_own_or_admin"
on public.pet_travel_user_reports
for select
to authenticated
using (user_id = auth.uid() or public.is_pet_travel_admin());

drop policy if exists "pet_travel_user_reports_insert_own" on public.pet_travel_user_reports;
create policy "pet_travel_user_reports_insert_own"
on public.pet_travel_user_reports
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pet_travel_user_reports_update_own_or_admin" on public.pet_travel_user_reports;
create policy "pet_travel_user_reports_update_own_or_admin"
on public.pet_travel_user_reports
for update
to authenticated
using (user_id = auth.uid() or public.is_pet_travel_admin())
with check (user_id = auth.uid() or public.is_pet_travel_admin());

drop policy if exists "pet_travel_user_reports_delete_own_or_admin" on public.pet_travel_user_reports;
create policy "pet_travel_user_reports_delete_own_or_admin"
on public.pet_travel_user_reports
for delete
to authenticated
using (user_id = auth.uid() or public.is_pet_travel_admin());

commit;

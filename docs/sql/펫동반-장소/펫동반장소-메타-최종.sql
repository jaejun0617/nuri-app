-- 이 파일은 펫동반 장소 메타 레이어의 현재 최종본이다.
-- `pet_place_service_meta`, source link, external signal, bookmark/report 보조 집계와 관리자 검수 객체를 관리한다.
-- 문서용 source of truth이며, linked remote에는 대표 테이블이 실제 존재하는지 먼저 확인한 뒤 적용/차이 분석에 사용한다.
-- 공용 초기 구성 SQL과 일부 기본 helper가 겹치더라도, 현재 도메인 최종 상태 판단은 이 파일을 우선 기준으로 삼는다.

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

create or replace function public.is_pet_place_admin()
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

create table if not exists public.pet_place_service_meta (
  id uuid primary key default gen_random_uuid(),
  canonical_name text,
  canonical_category text,
  canonical_address text,
  canonical_road_address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  verification_status text not null default 'unknown',
  source_type text not null default 'system-inference',
  primary_source_provider text,
  primary_source_place_id text,
  pet_policy_text text,
  operating_status_label text,
  admin_note text,
  user_report_count integer not null default 0,
  bookmarked_count integer not null default 0,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_service_meta_verification_status_check
    check (
      verification_status in (
        'unknown',
        'keyword-inferred',
        'user-reported',
        'admin-verified',
        'rejected'
      )
    ),
  constraint pet_place_service_meta_source_type_check
    check (
      source_type in (
        'system-inference',
        'user-report',
        'admin-review'
      )
    ),
  constraint pet_place_service_meta_primary_source_pair_check
    check (
      (primary_source_provider is null and primary_source_place_id is null)
      or (primary_source_provider is not null and primary_source_place_id is not null)
    ),
  constraint pet_place_service_meta_counts_non_negative_check
    check (user_report_count >= 0 and bookmarked_count >= 0),
  constraint pet_place_service_meta_coordinates_pair_check
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    )
);

alter table public.pet_place_service_meta
  add column if not exists canonical_name text,
  add column if not exists canonical_category text,
  add column if not exists canonical_address text,
  add column if not exists canonical_road_address text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists verification_status text,
  add column if not exists source_type text,
  add column if not exists primary_source_provider text,
  add column if not exists primary_source_place_id text,
  add column if not exists pet_policy_text text,
  add column if not exists operating_status_label text,
  add column if not exists admin_note text,
  add column if not exists user_report_count integer,
  add column if not exists bookmarked_count integer,
  add column if not exists last_verified_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.pet_place_service_meta
  alter column verification_status set default 'unknown',
  alter column source_type set default 'system-inference',
  alter column user_report_count set default 0,
  alter column bookmarked_count set default 0,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.pet_place_service_meta
set
  verification_status = coalesce(nullif(btrim(verification_status), ''), 'unknown'),
  source_type = coalesce(nullif(btrim(source_type), ''), 'system-inference'),
  user_report_count = coalesce(user_report_count, 0),
  bookmarked_count = coalesce(bookmarked_count, 0),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.pet_place_service_meta
  alter column verification_status set not null,
  alter column source_type set not null,
  alter column user_report_count set not null,
  alter column bookmarked_count set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.pet_place_service_meta
  drop constraint if exists pet_place_service_meta_verification_status_check,
  drop constraint if exists pet_place_service_meta_source_type_check,
  drop constraint if exists pet_place_service_meta_primary_source_pair_check,
  drop constraint if exists pet_place_service_meta_counts_non_negative_check,
  drop constraint if exists pet_place_service_meta_coordinates_pair_check;

alter table public.pet_place_service_meta
  add constraint pet_place_service_meta_verification_status_check
    check (
      verification_status in (
        'unknown',
        'keyword-inferred',
        'user-reported',
        'admin-verified',
        'rejected'
      )
    ),
  add constraint pet_place_service_meta_source_type_check
    check (
      source_type in (
        'system-inference',
        'user-report',
        'admin-review'
      )
    ),
  add constraint pet_place_service_meta_primary_source_pair_check
    check (
      (primary_source_provider is null and primary_source_place_id is null)
      or (primary_source_provider is not null and primary_source_place_id is not null)
    ),
  add constraint pet_place_service_meta_counts_non_negative_check
    check (user_report_count >= 0 and bookmarked_count >= 0),
  add constraint pet_place_service_meta_coordinates_pair_check
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    );

comment on table public.pet_place_service_meta is
  '펫동반 장소 canonical 메타 본체. 최종 검증 상태와 운영 메모의 source of truth';
comment on column public.pet_place_service_meta.primary_source_provider is
  '현재 canonical 대표 source provider. 실제 외부 원본 매핑은 pet_place_source_links에서 관리';
comment on column public.pet_place_service_meta.verification_status is
  'unknown / keyword-inferred / user-reported / admin-verified / rejected';
comment on column public.pet_place_service_meta.source_type is
  'system-inference / user-report / admin-review';

create table if not exists public.pet_place_source_links (
  id uuid primary key default gen_random_uuid(),
  pet_place_meta_id uuid not null references public.pet_place_service_meta(id) on delete cascade,
  provider text not null,
  provider_place_id text not null,
  source_place_name text,
  source_category_label text,
  source_address text,
  source_road_address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  source_payload jsonb not null default '{}'::jsonb,
  matched_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_source_links_provider_not_blank_check
    check (char_length(btrim(provider)) > 0),
  constraint pet_place_source_links_provider_place_id_not_blank_check
    check (char_length(btrim(provider_place_id)) > 0),
  constraint pet_place_source_links_coordinates_pair_check
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    ),
  constraint pet_place_source_links_unique_provider_place
    unique (provider, provider_place_id)
);

comment on table public.pet_place_source_links is
  '외부 원본 provider + provider_place_id와 canonical meta를 연결하는 매핑 테이블';
comment on column public.pet_place_source_links.provider is
  'kakao / google-places / tour-api / public-data';
comment on column public.pet_place_source_links.source_payload is
  '원본 응답 일부를 저장할 수 있는 선택적 jsonb 보조 컬럼';

create table if not exists public.pet_place_external_signals (
  id uuid primary key default gen_random_uuid(),
  pet_place_meta_id uuid not null references public.pet_place_service_meta(id) on delete cascade,
  signal_provider text not null,
  signal_key text not null,
  signal_value_boolean boolean,
  signal_value_text text,
  signal_score integer not null default 0,
  source_note text,
  observed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_external_signals_provider_check
    check (
      signal_provider in (
        'google-places',
        'tour-api',
        'public-data'
      )
    ),
  constraint pet_place_external_signals_key_check
    check (
      signal_key in (
        'allows-dogs',
        'outdoor-seating',
        'good-for-children',
        'official-pet-policy',
        'pet-travel-listing'
      )
    ),
  constraint pet_place_external_signals_value_presence_check
    check (
      signal_value_boolean is not null
      or signal_value_text is not null
    ),
  constraint pet_place_external_signals_score_range_check
    check (signal_score between -10 and 10),
  constraint pet_place_external_signals_unique_key
    unique (pet_place_meta_id, signal_provider, signal_key)
);

comment on table public.pet_place_external_signals is
  'Google Places / 관광공사 / 공공데이터 등 외부 보조 신호 정규화 테이블';
comment on column public.pet_place_external_signals.signal_key is
  'allows-dogs / outdoor-seating / good-for-children / official-pet-policy / pet-travel-listing';

create table if not exists public.pet_place_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_place_meta_id uuid not null references public.pet_place_service_meta(id) on delete cascade,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_bookmarks_unique_user_place
    unique (user_id, pet_place_meta_id)
);

create table if not exists public.pet_place_user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_place_meta_id uuid not null references public.pet_place_service_meta(id) on delete cascade,
  report_status text not null,
  report_text text,
  evidence_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_user_reports_status_check
    check (
      report_status in (
        'pet-friendly',
        'not-pet-friendly',
        'policy-changed',
        'unknown'
      )
    )
);

create table if not exists public.pet_place_verification_logs (
  id uuid primary key default gen_random_uuid(),
  pet_place_meta_id uuid not null references public.pet_place_service_meta(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_verification_status text,
  next_verification_status text not null,
  source_type text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_verification_logs_previous_status_check
    check (
      previous_verification_status is null
      or previous_verification_status in (
        'unknown',
        'keyword-inferred',
        'user-reported',
        'admin-verified',
        'rejected'
      )
    ),
  constraint pet_place_verification_logs_next_status_check
    check (
      next_verification_status in (
        'unknown',
        'keyword-inferred',
        'user-reported',
        'admin-verified',
        'rejected'
      )
    ),
  constraint pet_place_verification_logs_source_type_check
    check (
      source_type in (
        'system-inference',
        'user-report',
        'admin-review'
      )
    )
);

create table if not exists public.pet_place_search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  query_text text,
  source_domain text not null default 'pet-friendly-place',
  anchor_latitude numeric(9, 6),
  anchor_longitude numeric(9, 6),
  result_count integer not null default 0,
  provider_mix text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_search_logs_domain_check
    check (
      source_domain in (
        'pet-friendly-place',
        'pet-travel'
      )
    ),
  constraint pet_place_search_logs_result_count_check
    check (result_count >= 0),
  constraint pet_place_search_logs_anchor_pair_check
    check (
      (anchor_latitude is null and anchor_longitude is null)
      or (anchor_latitude is not null and anchor_longitude is not null)
    ),
  constraint pet_place_search_logs_actor_presence_check
    check (user_id is not null or session_id is not null)
);

alter table public.pet_place_search_logs
  add column if not exists user_id uuid,
  add column if not exists session_id uuid,
  add column if not exists query_text text,
  add column if not exists source_domain text,
  add column if not exists anchor_latitude numeric(9, 6),
  add column if not exists anchor_longitude numeric(9, 6),
  add column if not exists result_count integer,
  add column if not exists provider_mix text[],
  add column if not exists created_at timestamptz;

alter table public.pet_place_search_logs
  alter column source_domain set default 'pet-friendly-place',
  alter column result_count set default 0,
  alter column provider_mix set default '{}'::text[],
  alter column created_at set default timezone('utc', now());

update public.pet_place_search_logs
set
  source_domain = coalesce(nullif(btrim(source_domain), ''), 'pet-friendly-place'),
  result_count = coalesce(result_count, 0),
  provider_mix = coalesce(provider_mix, '{}'::text[]),
  created_at = coalesce(created_at, timezone('utc', now()))
where true;

alter table public.pet_place_search_logs
  alter column source_domain set not null,
  alter column result_count set not null,
  alter column provider_mix set not null,
  alter column created_at set not null;

alter table public.pet_place_search_logs
  drop constraint if exists pet_place_search_logs_domain_check,
  drop constraint if exists pet_place_search_logs_result_count_check,
  drop constraint if exists pet_place_search_logs_anchor_pair_check,
  drop constraint if exists pet_place_search_logs_actor_presence_check;

alter table public.pet_place_search_logs
  add constraint pet_place_search_logs_domain_check
    check (
      source_domain in (
        'pet-friendly-place',
        'pet-travel'
      )
    ),
  add constraint pet_place_search_logs_result_count_check
    check (result_count >= 0),
  add constraint pet_place_search_logs_anchor_pair_check
    check (
      (anchor_latitude is null and anchor_longitude is null)
      or (anchor_latitude is not null and anchor_longitude is not null)
    ),
  add constraint pet_place_search_logs_actor_presence_check
    check (user_id is not null or session_id is not null);

create unique index if not exists idx_pet_place_service_meta_primary_source
  on public.pet_place_service_meta (primary_source_provider, primary_source_place_id)
  where primary_source_provider is not null and primary_source_place_id is not null;

create index if not exists idx_pet_place_service_meta_verification_status
  on public.pet_place_service_meta (verification_status, updated_at desc);

create index if not exists idx_pet_place_service_meta_source_type
  on public.pet_place_service_meta (source_type, updated_at desc);

create index if not exists idx_pet_place_service_meta_coordinates
  on public.pet_place_service_meta (latitude, longitude);

create index if not exists idx_pet_place_source_links_meta_provider
  on public.pet_place_source_links (pet_place_meta_id, provider);

create index if not exists idx_pet_place_source_links_provider_place
  on public.pet_place_source_links (provider, provider_place_id);

create index if not exists idx_pet_place_external_signals_meta_provider
  on public.pet_place_external_signals (pet_place_meta_id, signal_provider, signal_key);

create index if not exists idx_pet_place_bookmarks_user_created
  on public.pet_place_bookmarks (user_id, created_at desc);

create index if not exists idx_pet_place_bookmarks_meta_created
  on public.pet_place_bookmarks (pet_place_meta_id, created_at desc);

create index if not exists idx_pet_place_user_reports_user_created
  on public.pet_place_user_reports (user_id, created_at desc);

create index if not exists idx_pet_place_user_reports_meta_created
  on public.pet_place_user_reports (pet_place_meta_id, created_at desc);

create index if not exists idx_pet_place_verification_logs_meta_created
  on public.pet_place_verification_logs (pet_place_meta_id, created_at desc);

create index if not exists idx_pet_place_search_logs_user_created
  on public.pet_place_search_logs (user_id, created_at desc);

create index if not exists idx_pet_place_search_logs_session_created
  on public.pet_place_search_logs (session_id, created_at desc);

create index if not exists idx_pet_place_search_logs_query
  on public.pet_place_search_logs using gin (to_tsvector('simple', coalesce(query_text, '')));

drop trigger if exists trg_pet_place_service_meta_updated_at on public.pet_place_service_meta;
create trigger trg_pet_place_service_meta_updated_at
before update on public.pet_place_service_meta
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_place_source_links_updated_at on public.pet_place_source_links;
create trigger trg_pet_place_source_links_updated_at
before update on public.pet_place_source_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_place_external_signals_updated_at on public.pet_place_external_signals;
create trigger trg_pet_place_external_signals_updated_at
before update on public.pet_place_external_signals
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_place_bookmarks_updated_at on public.pet_place_bookmarks;
create trigger trg_pet_place_bookmarks_updated_at
before update on public.pet_place_bookmarks
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_place_user_reports_updated_at on public.pet_place_user_reports;
create trigger trg_pet_place_user_reports_updated_at
before update on public.pet_place_user_reports
for each row execute function public.set_updated_at();

create or replace function public.sync_pet_place_meta_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_id uuid;
  v_old_meta_id uuid;
begin
  if tg_op = 'DELETE' then
    v_meta_id := old.pet_place_meta_id;
    v_old_meta_id := null;
  elsif tg_op = 'UPDATE' then
    v_meta_id := new.pet_place_meta_id;
    v_old_meta_id := old.pet_place_meta_id;
  else
    v_meta_id := new.pet_place_meta_id;
    v_old_meta_id := null;
  end if;

  update public.pet_place_service_meta m
  set
    bookmarked_count = (
      select count(*)
      from public.pet_place_bookmarks b
      where b.pet_place_meta_id = v_meta_id
    ),
    user_report_count = (
      select count(*)
      from public.pet_place_user_reports r
      where r.pet_place_meta_id = v_meta_id
    ),
    updated_at = timezone('utc', now())
  where m.id = v_meta_id;

  if v_old_meta_id is not null and v_old_meta_id <> v_meta_id then
    update public.pet_place_service_meta m
    set
      bookmarked_count = (
        select count(*)
        from public.pet_place_bookmarks b
        where b.pet_place_meta_id = v_old_meta_id
      ),
      user_report_count = (
        select count(*)
        from public.pet_place_user_reports r
        where r.pet_place_meta_id = v_old_meta_id
      ),
      updated_at = timezone('utc', now())
    where m.id = v_old_meta_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_pet_place_bookmarks_sync_counters on public.pet_place_bookmarks;
create trigger trg_pet_place_bookmarks_sync_counters
after insert or update of pet_place_meta_id or delete on public.pet_place_bookmarks
for each row execute function public.sync_pet_place_meta_counters();

drop trigger if exists trg_pet_place_user_reports_sync_counters on public.pet_place_user_reports;
create trigger trg_pet_place_user_reports_sync_counters
after insert or update of pet_place_meta_id or delete on public.pet_place_user_reports
for each row execute function public.sync_pet_place_meta_counters();

alter table public.pet_place_service_meta enable row level security;
alter table public.pet_place_source_links enable row level security;
alter table public.pet_place_external_signals enable row level security;
alter table public.pet_place_bookmarks enable row level security;
alter table public.pet_place_user_reports enable row level security;
alter table public.pet_place_verification_logs enable row level security;
alter table public.pet_place_search_logs enable row level security;

drop policy if exists "pet_place_service_meta_read_public" on public.pet_place_service_meta;
create policy "pet_place_service_meta_read_public"
on public.pet_place_service_meta
for select
to anon, authenticated
using (true);

drop policy if exists "pet_place_service_meta_admin_all" on public.pet_place_service_meta;
create policy "pet_place_service_meta_admin_all"
on public.pet_place_service_meta
for all
to authenticated
using (public.is_pet_place_admin())
with check (public.is_pet_place_admin());

drop policy if exists "pet_place_source_links_read_public" on public.pet_place_source_links;
create policy "pet_place_source_links_read_public"
on public.pet_place_source_links
for select
to anon, authenticated
using (true);

drop policy if exists "pet_place_source_links_admin_all" on public.pet_place_source_links;
create policy "pet_place_source_links_admin_all"
on public.pet_place_source_links
for all
to authenticated
using (public.is_pet_place_admin())
with check (public.is_pet_place_admin());

drop policy if exists "pet_place_external_signals_read_public" on public.pet_place_external_signals;
create policy "pet_place_external_signals_read_public"
on public.pet_place_external_signals
for select
to anon, authenticated
using (true);

drop policy if exists "pet_place_external_signals_admin_all" on public.pet_place_external_signals;
create policy "pet_place_external_signals_admin_all"
on public.pet_place_external_signals
for all
to authenticated
using (public.is_pet_place_admin())
with check (public.is_pet_place_admin());

drop policy if exists "pet_place_bookmarks_select_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_select_own"
on public.pet_place_bookmarks
for select
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_bookmarks_insert_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_insert_own"
on public.pet_place_bookmarks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pet_place_bookmarks_update_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_update_own"
on public.pet_place_bookmarks
for update
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin())
with check (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_bookmarks_delete_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_delete_own"
on public.pet_place_bookmarks
for delete
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_user_reports_select_own_or_admin" on public.pet_place_user_reports;
create policy "pet_place_user_reports_select_own_or_admin"
on public.pet_place_user_reports
for select
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_user_reports_insert_own" on public.pet_place_user_reports;
create policy "pet_place_user_reports_insert_own"
on public.pet_place_user_reports
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pet_place_user_reports_update_own_or_admin" on public.pet_place_user_reports;
create policy "pet_place_user_reports_update_own_or_admin"
on public.pet_place_user_reports
for update
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin())
with check (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_user_reports_delete_own_or_admin" on public.pet_place_user_reports;
create policy "pet_place_user_reports_delete_own_or_admin"
on public.pet_place_user_reports
for delete
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_verification_logs_select_admin" on public.pet_place_verification_logs;
create policy "pet_place_verification_logs_select_admin"
on public.pet_place_verification_logs
for select
to authenticated
using (public.is_pet_place_admin());

drop policy if exists "pet_place_verification_logs_insert_admin" on public.pet_place_verification_logs;
create policy "pet_place_verification_logs_insert_admin"
on public.pet_place_verification_logs
for insert
to authenticated
with check (public.is_pet_place_admin());

drop policy if exists "pet_place_search_logs_select_own_or_admin" on public.pet_place_search_logs;
create policy "pet_place_search_logs_select_own_or_admin"
on public.pet_place_search_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_search_logs_insert_authenticated" on public.pet_place_search_logs;
create policy "pet_place_search_logs_insert_authenticated"
on public.pet_place_search_logs
for insert
to authenticated
with check (
  public.is_pet_place_admin()
  or user_id = auth.uid()
  or (user_id is null and session_id is not null)
);

commit;

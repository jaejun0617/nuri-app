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
  provider text not null,
  provider_place_id text not null,
  canonical_name text,
  canonical_category text,
  canonical_address text,
  canonical_road_address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  verification_status text not null default 'unknown',
  source_type text not null default 'system-inference',
  pet_policy_text text,
  operating_status_label text,
  admin_note text,
  user_report_count integer not null default 0,
  bookmarked_count integer not null default 0,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_service_meta_provider_not_blank_check
    check (char_length(btrim(provider)) > 0),
  constraint pet_place_service_meta_provider_place_id_not_blank_check
    check (char_length(btrim(provider_place_id)) > 0),
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
  constraint pet_place_service_meta_counts_non_negative_check
    check (user_report_count >= 0 and bookmarked_count >= 0),
  constraint pet_place_service_meta_coordinates_pair_check
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    ),
  constraint pet_place_service_meta_unique_provider_place
    unique (provider, provider_place_id)
);

comment on table public.pet_place_service_meta is
  '외부 장소 후보에 대한 NURI 서비스 메타(source of truth) 테이블';
comment on column public.pet_place_service_meta.provider is
  'kakao, google-places, tour-api 등 외부 공급자 식별자';
comment on column public.pet_place_service_meta.provider_place_id is
  '외부 공급자 원본 place id';
comment on column public.pet_place_service_meta.verification_status is
  'unknown / keyword-inferred / user-reported / admin-verified / rejected';
comment on column public.pet_place_service_meta.source_type is
  'system-inference / user-report / admin-review';

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

comment on table public.pet_place_bookmarks is
  '사용자별 펫동반 장소 북마크';

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

comment on table public.pet_place_user_reports is
  '사용자 제보 원본 테이블';

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

comment on table public.pet_place_verification_logs is
  '운영 검수 및 상태 변경 이력';

create table if not exists public.pet_place_search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_text text,
  source_domain text not null default 'pet-friendly-place',
  anchor_latitude numeric(9, 6),
  anchor_longitude numeric(9, 6),
  result_count integer not null default 0,
  provider_mix text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  constraint pet_place_search_logs_domain_check
    check (source_domain = 'pet-friendly-place'),
  constraint pet_place_search_logs_result_count_check
    check (result_count >= 0),
  constraint pet_place_search_logs_anchor_pair_check
    check (
      (anchor_latitude is null and anchor_longitude is null)
      or (anchor_latitude is not null and anchor_longitude is not null)
    )
);

comment on table public.pet_place_search_logs is
  '펫동반 장소 검색 로그';

create index if not exists idx_pet_place_service_meta_provider_place
  on public.pet_place_service_meta (provider, provider_place_id);

create index if not exists idx_pet_place_service_meta_verification_status
  on public.pet_place_service_meta (verification_status, updated_at desc);

create index if not exists idx_pet_place_service_meta_source_type
  on public.pet_place_service_meta (source_type, updated_at desc);

create index if not exists idx_pet_place_service_meta_coordinates
  on public.pet_place_service_meta (latitude, longitude);

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

create index if not exists idx_pet_place_verification_logs_actor_created
  on public.pet_place_verification_logs (actor_user_id, created_at desc);

create index if not exists idx_pet_place_search_logs_user_created
  on public.pet_place_search_logs (user_id, created_at desc);

create index if not exists idx_pet_place_search_logs_query
  on public.pet_place_search_logs using gin (to_tsvector('simple', coalesce(query_text, '')));

drop trigger if exists trg_pet_place_service_meta_updated_at on public.pet_place_service_meta;
create trigger trg_pet_place_service_meta_updated_at
before update on public.pet_place_service_meta
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
alter table public.pet_place_bookmarks enable row level security;
alter table public.pet_place_user_reports enable row level security;
alter table public.pet_place_verification_logs enable row level security;
alter table public.pet_place_search_logs enable row level security;

drop policy if exists "pet_place_service_meta_read_authenticated" on public.pet_place_service_meta;
create policy "pet_place_service_meta_read_authenticated"
on public.pet_place_service_meta
for select
to authenticated
using (true);

drop policy if exists "pet_place_service_meta_admin_all" on public.pet_place_service_meta;
create policy "pet_place_service_meta_admin_all"
on public.pet_place_service_meta
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

drop policy if exists "pet_place_bookmarks_delete_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_delete_own"
on public.pet_place_bookmarks
for delete
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin());

drop policy if exists "pet_place_bookmarks_update_own" on public.pet_place_bookmarks;
create policy "pet_place_bookmarks_update_own"
on public.pet_place_bookmarks
for update
to authenticated
using (user_id = auth.uid() or public.is_pet_place_admin())
with check (user_id = auth.uid() or public.is_pet_place_admin());

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

drop policy if exists "pet_place_search_logs_insert_own" on public.pet_place_search_logs;
create policy "pet_place_search_logs_insert_own"
on public.pet_place_search_logs
for insert
to authenticated
with check (user_id = auth.uid());

commit;

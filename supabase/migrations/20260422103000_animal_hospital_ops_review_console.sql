begin;

create or replace function public.is_animal_hospital_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'super_admin')
    );
$$;

alter table public.animal_hospital_verifications
  drop constraint if exists animal_hospital_verifications_status_check;

alter table public.animal_hospital_verifications
  add constraint animal_hospital_verifications_status_check
    check (status in ('pending', 'approved', 'rejected', 'held', 'expired'));

alter table public.animal_hospital_operator_action_log
  drop constraint if exists animal_hospital_operator_action_log_action_check;

alter table public.animal_hospital_operator_action_log
  add constraint animal_hospital_operator_action_log_action_check
    check (
      action_type in (
        'verification_created',
        'verification_updated',
        'verification_approved',
        'verification_rejected',
        'verification_held',
        'verification_expired',
        'conflict_marked',
        'report_triaged',
        'thumbnail_candidate_imported',
        'admin_note'
      )
    );

create table if not exists public.animal_hospital_thumbnail_import_candidates (
  id uuid primary key default gen_random_uuid(),
  canonical_hospital_id text references public.animal_hospitals(id) on delete cascade,
  hospital_source_key text,
  external_image_url text not null,
  original_source_page_url text not null,
  source_type text not null,
  fetched_at timestamptz not null,
  checksum_sha256 text not null,
  import_status text not null default 'pending',
  verification_status text not null default 'pending',
  verification_id uuid references public.animal_hospital_verifications(id) on delete set null,
  rejection_reason text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_thumbnail_candidate_source_type_check
    check (
      source_type in (
        'official-homepage',
        'official-sns',
        'official-introduction'
      )
    ),
  constraint animal_hospital_thumbnail_candidate_import_status_check
    check (import_status in ('pending', 'imported', 'skipped', 'failed')),
  constraint animal_hospital_thumbnail_candidate_verification_status_check
    check (verification_status in ('pending', 'approved', 'rejected', 'held')),
  constraint animal_hospital_thumbnail_candidate_url_check
    check (
      external_image_url ~* '^https?://'
      and original_source_page_url ~* '^https?://'
    ),
  constraint animal_hospital_thumbnail_candidate_checksum_check
    check (checksum_sha256 ~ '^[a-f0-9]{64}$')
);

comment on table public.animal_hospital_thumbnail_import_candidates is
  '동물병원 공식 대표 이미지 후보 import manifest. public은 linked approved thumbnail verification만 소비한다.';

create unique index if not exists idx_animal_hospital_thumbnail_candidates_url
  on public.animal_hospital_thumbnail_import_candidates (external_image_url);

create index if not exists idx_animal_hospital_thumbnail_candidates_hospital
  on public.animal_hospital_thumbnail_import_candidates (canonical_hospital_id, created_at desc);

create index if not exists idx_animal_hospital_thumbnail_candidates_verification
  on public.animal_hospital_thumbnail_import_candidates (verification_status, updated_at desc);

drop trigger if exists trg_animal_hospital_thumbnail_import_candidates_updated_at
  on public.animal_hospital_thumbnail_import_candidates;
create trigger trg_animal_hospital_thumbnail_import_candidates_updated_at
before update on public.animal_hospital_thumbnail_import_candidates
for each row execute function public.set_updated_at();

alter table public.animal_hospital_thumbnail_import_candidates enable row level security;

drop policy if exists "animal_hospital_thumbnail_candidates_admin_all"
  on public.animal_hospital_thumbnail_import_candidates;
create policy "animal_hospital_thumbnail_candidates_admin_all"
on public.animal_hospital_thumbnail_import_candidates
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

create table if not exists public.animal_hospital_runtime_match_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null,
  query text,
  anchor_latitude numeric(9, 6),
  anchor_longitude numeric(9, 6),
  runtime_candidate_count integer not null default 0,
  canonical_result_count integer not null default 0,
  canonical_linked_count integer not null default 0,
  provider_only_count integer not null default 0,
  deferred_count integer not null default 0,
  match_count integer not null default 0,
  provider_only_ratio numeric(8, 4) not null default 0,
  canonical_linked_ratio numeric(8, 4) not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_runtime_match_snapshot_summary_object_check
    check (jsonb_typeof(summary) = 'object')
);

comment on table public.animal_hospital_runtime_match_snapshots is
  '동물병원 runtime provider 후보와 canonical linkage 비중을 실행별로 남기는 운영 snapshot.';

create index if not exists idx_animal_hospital_runtime_match_snapshots_created
  on public.animal_hospital_runtime_match_snapshots (created_at desc);

alter table public.animal_hospital_runtime_match_snapshots enable row level security;

drop policy if exists "animal_hospital_runtime_snapshots_admin_all"
  on public.animal_hospital_runtime_match_snapshots;
create policy "animal_hospital_runtime_snapshots_admin_all"
on public.animal_hospital_runtime_match_snapshots
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

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
  provider_only_candidates integer,
  canonical_linked integer,
  hidden_count bigint,
  inactive_count bigint,
  approved_phone_coverage bigint,
  approved_coordinates_coverage bigint,
  approved_thumbnail_coverage bigint,
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
      count(distinct animal_hospital_id) filter (where field_key = 'thumbnail') as thumbnail_count
    from public.animal_hospital_verifications
    where status = 'approved'
      and (expires_at is null or expires_at > timezone('utc', now()))
  ),
  pending_counts as (
    select
      count(*) filter (where field_key = 'phone') as phone_count,
      count(*) filter (where field_key = 'coordinates') as coordinates_count,
      count(*) filter (where field_key = 'thumbnail') as thumbnail_count
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
    coalesce((select provider_only_count from latest_runtime), 0),
    coalesce((select canonical_linked_count from latest_runtime), 0),
    (select count(*) from public.animal_hospitals where is_hidden = true),
    (select count(*) from public.animal_hospitals where is_active = false),
    coalesce((select phone_count from approved_counts), 0),
    coalesce((select coordinates_count from approved_counts), 0),
    coalesce((select thumbnail_count from approved_counts), 0),
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
    and v_field not in ('phone', 'coordinates', 'thumbnail') then
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
      when v.field_key = 'phone' then jsonb_build_object('phone', h.official_phone)
      when v.field_key = 'coordinates' then jsonb_build_object('latitude', h.latitude, 'longitude', h.longitude)
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
      )
    ) as public_projection
  from public.animal_hospitals h
  where h.id = p_animal_hospital_id;
end;
$$;

grant execute on function public.animal_hospital_ops_detail(text) to authenticated;

create or replace function public.animal_hospital_review_verification(
  p_verification_id uuid,
  p_next_status text,
  p_note text default null
)
returns table (
  id uuid,
  animal_hospital_id text,
  field_key text,
  status text,
  verified_value jsonb,
  verification_source text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  expires_at timestamptz,
  note text,
  evidence jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.animal_hospital_verifications%rowtype;
  v_action text;
begin
  if not public.is_animal_hospital_admin() then
    raise exception 'ANIMAL_HOSPITAL_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if p_next_status not in ('pending', 'approved', 'rejected', 'held') then
    raise exception 'ANIMAL_HOSPITAL_VERIFICATION_STATUS_INVALID'
      using errcode = '22023';
  end if;

  update public.animal_hospital_verifications
  set
    status = p_next_status,
    reviewer_id = case when p_next_status = 'pending' then null else auth.uid() end,
    reviewed_at = case when p_next_status = 'pending' then null else timezone('utc', now()) end,
    note = nullif(btrim(coalesce(p_note, note, '')), ''),
    updated_at = timezone('utc', now())
  where id = p_verification_id
  returning * into v_row;

  if not found then
    raise exception 'ANIMAL_HOSPITAL_VERIFICATION_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_action := case p_next_status
    when 'approved' then 'verification_approved'
    when 'rejected' then 'verification_rejected'
    when 'held' then 'verification_held'
    else 'verification_updated'
  end;

  insert into public.animal_hospital_operator_action_log (
    animal_hospital_id,
    actor_id,
    action_type,
    target_table,
    target_id,
    summary,
    payload
  )
  values (
    v_row.animal_hospital_id,
    auth.uid(),
    v_action,
    'animal_hospital_verifications',
    v_row.id::text,
    case p_next_status
      when 'approved' then '동물병원 검수 후보를 승인했어요.'
      when 'rejected' then '동물병원 검수 후보를 반려했어요.'
      when 'held' then '동물병원 검수 후보를 보류했어요.'
      else '동물병원 검수 후보를 pending 상태로 되돌렸어요.'
    end,
    jsonb_build_object(
      'fieldKey', v_row.field_key,
      'status', v_row.status,
      'note', v_row.note
    )
  );

  return query
  select
    v_row.id,
    v_row.animal_hospital_id,
    v_row.field_key,
    v_row.status,
    v_row.verified_value,
    v_row.verification_source,
    v_row.reviewer_id,
    v_row.reviewed_at,
    v_row.expires_at,
    v_row.note,
    v_row.evidence,
    v_row.created_at,
    v_row.updated_at;
end;
$$;

grant execute on function public.animal_hospital_review_verification(uuid, text, text) to authenticated;

commit;

begin;

alter table public.animal_hospitals
  drop constraint if exists animal_hospitals_coordinate_source_check;

alter table public.animal_hospitals
  add constraint animal_hospitals_coordinate_source_check
    check (
      coordinate_source in (
        'official-wgs84',
        'reviewed',
        'epsg5174-pending',
        'external-fallback',
        'unknown'
      )
    );

alter table public.animal_hospital_source_records
  drop constraint if exists animal_hospital_source_records_coordinate_source_check;

alter table public.animal_hospital_source_records
  add constraint animal_hospital_source_records_coordinate_source_check
    check (
      coordinate_source in (
        'official-wgs84',
        'reviewed',
        'epsg5174-pending',
        'external-fallback',
        'unknown'
      )
    );

create table if not exists public.animal_hospital_verifications (
  id uuid primary key default gen_random_uuid(),
  animal_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  field_key text not null,
  status text not null default 'pending',
  verified_value jsonb not null default '{}'::jsonb,
  verification_source text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  note text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_verifications_field_key_check
    check (
      field_key in (
        'phone',
        'coordinates',
        'operatingHours',
        'open24Hours',
        'nightService',
        'weekendService',
        'exoticAnimalCare',
        'emergencyCare',
        'parking',
        'equipmentSummary',
        'homepageUrl',
        'socialUrl',
        'thumbnail'
      )
    ),
  constraint animal_hospital_verifications_status_check
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  constraint animal_hospital_verifications_source_check
    check (
      verification_source in (
        'official-source',
        'operator-call',
        'operator-visit',
        'provider-crosscheck',
        'user-report',
        'system'
      )
    ),
  constraint animal_hospital_verifications_verified_value_object_check
    check (jsonb_typeof(verified_value) = 'object'),
  constraint animal_hospital_verifications_evidence_object_check
    check (jsonb_typeof(evidence) = 'object')
);

comment on table public.animal_hospital_verifications is
  '동물병원 field-level 검수 근거. public projection은 phone/coordinates approved record만 소비한다.';

create table if not exists public.animal_hospital_user_reports (
  id uuid primary key default gen_random_uuid(),
  animal_hospital_id text references public.animal_hospitals(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  report_type text not null,
  status text not null default 'pending',
  message text,
  reporter_trace_hash text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_user_reports_type_check
    check (
      report_type in (
        'wrong_phone',
        'wrong_address',
        'closed',
        'duplicate',
        'wrong_location',
        'unsafe_sensitive_info',
        'other'
      )
    ),
  constraint animal_hospital_user_reports_status_check
    check (status in ('pending', 'triaged', 'dismissed', 'linked_to_verification')),
  constraint animal_hospital_user_reports_evidence_object_check
    check (jsonb_typeof(evidence) = 'object')
);

comment on table public.animal_hospital_user_reports is
  '사용자 신고 원장. 신고는 trust를 직접 올리지 않고 operator 검수 큐로만 흐른다.';

create table if not exists public.animal_hospital_operator_action_log (
  id bigint generated always as identity primary key,
  animal_hospital_id text references public.animal_hospitals(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  target_table text,
  target_id text,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint animal_hospital_operator_action_log_action_check
    check (
      action_type in (
        'verification_created',
        'verification_updated',
        'verification_approved',
        'verification_rejected',
        'verification_expired',
        'conflict_marked',
        'report_triaged',
        'admin_note'
      )
    ),
  constraint animal_hospital_operator_action_log_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

comment on table public.animal_hospital_operator_action_log is
  '동물병원 검수/신고 처리 operator audit log.';

create index if not exists idx_animal_hospital_verifications_public_lookup
  on public.animal_hospital_verifications (animal_hospital_id, field_key, reviewed_at desc)
  where status = 'approved';

create index if not exists idx_animal_hospital_verifications_queue
  on public.animal_hospital_verifications (status, updated_at desc);

create index if not exists idx_animal_hospital_user_reports_queue
  on public.animal_hospital_user_reports (status, created_at desc);

create index if not exists idx_animal_hospital_user_reports_hospital
  on public.animal_hospital_user_reports (animal_hospital_id, created_at desc);

create index if not exists idx_animal_hospital_operator_action_log_hospital
  on public.animal_hospital_operator_action_log (animal_hospital_id, created_at desc);

drop trigger if exists trg_animal_hospital_verifications_updated_at on public.animal_hospital_verifications;
create trigger trg_animal_hospital_verifications_updated_at
before update on public.animal_hospital_verifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_animal_hospital_user_reports_updated_at on public.animal_hospital_user_reports;
create trigger trg_animal_hospital_user_reports_updated_at
before update on public.animal_hospital_user_reports
for each row execute function public.set_updated_at();

alter table public.animal_hospital_verifications enable row level security;
alter table public.animal_hospital_user_reports enable row level security;
alter table public.animal_hospital_operator_action_log enable row level security;

drop policy if exists "animal_hospital_verifications_read_public_safe" on public.animal_hospital_verifications;
create policy "animal_hospital_verifications_read_public_safe"
on public.animal_hospital_verifications
for select
to anon, authenticated
using (
  status = 'approved'
  and field_key in ('phone', 'coordinates')
  and (expires_at is null or expires_at > timezone('utc', now()))
);

drop policy if exists "animal_hospital_verifications_admin_all" on public.animal_hospital_verifications;
create policy "animal_hospital_verifications_admin_all"
on public.animal_hospital_verifications
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

drop policy if exists "animal_hospital_user_reports_insert_own" on public.animal_hospital_user_reports;
create policy "animal_hospital_user_reports_insert_own"
on public.animal_hospital_user_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "animal_hospital_user_reports_select_own" on public.animal_hospital_user_reports;
create policy "animal_hospital_user_reports_select_own"
on public.animal_hospital_user_reports
for select
to authenticated
using (reporter_id = auth.uid() or public.is_animal_hospital_admin());

drop policy if exists "animal_hospital_user_reports_admin_all" on public.animal_hospital_user_reports;
create policy "animal_hospital_user_reports_admin_all"
on public.animal_hospital_user_reports
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

drop policy if exists "animal_hospital_operator_action_log_admin_all" on public.animal_hospital_operator_action_log;
create policy "animal_hospital_operator_action_log_admin_all"
on public.animal_hospital_operator_action_log
for all
to authenticated
using (public.is_animal_hospital_admin())
with check (public.is_animal_hospital_admin());

create or replace function public.animal_hospital_approved_verifications(hospital_ids text[])
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
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    v.animal_hospital_id,
    v.field_key,
    v.status,
    v.verified_value,
    v.verification_source,
    v.reviewer_id,
    v.reviewed_at,
    v.expires_at,
    v.note,
    v.evidence,
    v.created_at,
    v.updated_at
  from public.animal_hospital_verifications v
  join public.animal_hospitals h on h.id = v.animal_hospital_id
  where v.animal_hospital_id = any(hospital_ids)
    and h.is_active = true
    and h.is_hidden = false
    and v.status = 'approved'
    and v.field_key in ('phone', 'coordinates')
    and (v.expires_at is null or v.expires_at > timezone('utc', now()));
$$;

grant execute on function public.animal_hospital_approved_verifications(text[]) to anon, authenticated;

create or replace function public.animal_hospital_create_user_report(
  p_animal_hospital_id text,
  p_report_type text,
  p_message text default null,
  p_evidence jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ANIMAL_HOSPITAL_REPORT_AUTH_REQUIRED'
      using errcode = '28000';
  end if;

  if p_report_type not in (
    'wrong_phone',
    'wrong_address',
    'closed',
    'duplicate',
    'wrong_location',
    'unsafe_sensitive_info',
    'other'
  ) then
    raise exception 'ANIMAL_HOSPITAL_REPORT_TYPE_INVALID'
      using errcode = '22023';
  end if;

  if p_message is not null and char_length(btrim(p_message)) > 1000 then
    raise exception 'ANIMAL_HOSPITAL_REPORT_MESSAGE_TOO_LONG'
      using errcode = '22001';
  end if;

  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' then
    raise exception 'ANIMAL_HOSPITAL_REPORT_EVIDENCE_INVALID'
      using errcode = '22023';
  end if;

  insert into public.animal_hospital_user_reports (
    animal_hospital_id,
    reporter_id,
    report_type,
    message,
    evidence
  )
  values (
    p_animal_hospital_id,
    auth.uid(),
    p_report_type,
    nullif(btrim(coalesce(p_message, '')), ''),
    p_evidence
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

grant execute on function public.animal_hospital_create_user_report(text, text, text, jsonb) to authenticated;

create or replace function public.animal_hospital_admin_review_queue(p_limit integer default 50)
returns table (
  animal_hospital_id text,
  name text,
  address text,
  has_source_conflict boolean,
  pending_report_count bigint,
  pending_verification_count bigint,
  latest_updated_at timestamptz
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
  with report_counts as (
    select
      r.animal_hospital_id,
      count(*) filter (where r.status = 'pending') as pending_report_count,
      max(r.updated_at) as latest_report_updated_at
    from public.animal_hospital_user_reports r
    group by r.animal_hospital_id
  ),
  verification_counts as (
    select
      v.animal_hospital_id,
      count(*) filter (where v.status = 'pending') as pending_verification_count,
      max(v.updated_at) as latest_verification_updated_at
    from public.animal_hospital_verifications v
    group by v.animal_hospital_id
  )
  select
    h.id as animal_hospital_id,
    h.canonical_name as name,
    h.primary_address as address,
    h.has_source_conflict,
    coalesce(r.pending_report_count, 0) as pending_report_count,
    coalesce(v.pending_verification_count, 0) as pending_verification_count,
    greatest(
      h.updated_at,
      coalesce(r.latest_report_updated_at, h.updated_at),
      coalesce(v.latest_verification_updated_at, h.updated_at)
    ) as latest_updated_at
  from public.animal_hospitals h
  left join report_counts r on r.animal_hospital_id = h.id
  left join verification_counts v on v.animal_hospital_id = h.id
  where h.has_source_conflict = true
    or coalesce(r.pending_report_count, 0) > 0
    or coalesce(v.pending_verification_count, 0) > 0
  order by latest_updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

grant execute on function public.animal_hospital_admin_review_queue(integer) to authenticated;

commit;

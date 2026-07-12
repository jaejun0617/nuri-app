begin;

create or replace function public.is_nuri_ops_admin_v1()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'super_admin')
    );
$$;

create table if not exists public.admin_operation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  actor_label text not null,
  target_type text not null,
  target_id text,
  target_summary text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  reason text,
  operator_note text,
  risk_level text not null default 'low',
  status text not null default 'succeeded',
  request_id uuid not null default gen_random_uuid(),
  metadata_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_operation_audit_action_not_blank
    check (btrim(action_type) <> ''),
  constraint admin_operation_audit_actor_not_blank
    check (btrim(actor_label) <> ''),
  constraint admin_operation_audit_target_type_check
    check (target_type in ('report', 'post', 'comment', 'hospital', 'user', 'pet', 'system')),
  constraint admin_operation_audit_risk_check
    check (risk_level in ('low', 'medium', 'high')),
  constraint admin_operation_audit_status_check
    check (status in ('succeeded', 'failed', 'blocked')),
  constraint admin_operation_audit_before_object_check
    check (jsonb_typeof(before_state) = 'object'),
  constraint admin_operation_audit_after_object_check
    check (jsonb_typeof(after_state) = 'object')
);

comment on table public.admin_operation_audit_logs is
  'NURI external admin console operation audit log. Stores sanitized summaries only; never store passwords, tokens, service-role keys, or raw metadata payloads.';

create table if not exists public.admin_report_review_states (
  report_id uuid primary key references public.reports(id) on delete cascade,
  review_status text not null default 'pending',
  content_review_status text not null default 'normal',
  operator_note text,
  actor_label text not null,
  last_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_report_review_status_check
    check (review_status in ('pending', 'reviewing', 'resolved', 'held')),
  constraint admin_report_content_review_status_check
    check (content_review_status in ('normal', 'needs_review', 'hide_recommended'))
);

create table if not exists public.admin_content_review_states (
  target_type text not null,
  target_id uuid not null,
  review_status text not null default 'normal',
  operator_note text,
  actor_label text not null,
  source_report_id uuid references public.reports(id) on delete set null,
  last_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (target_type, target_id),
  constraint admin_content_review_target_type_check
    check (target_type in ('post', 'comment')),
  constraint admin_content_review_status_check
    check (review_status in ('normal', 'needs_review', 'hide_recommended'))
);

create table if not exists public.admin_hospital_review_states (
  hospital_id text primary key references public.animal_hospitals(id) on delete cascade,
  review_status text not null default 'reviewing',
  operator_note text,
  actor_label text not null,
  public_safe_note text,
  last_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_hospital_review_status_check
    check (review_status in ('reviewing', 'approved', 'rejected', 'held'))
);

create table if not exists public.admin_user_review_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  review_status text not null default 'normal',
  operator_note text,
  actor_label text not null,
  last_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_user_review_status_check
    check (review_status in ('normal', 'review_required', 'restriction_recommended'))
);

create index if not exists idx_admin_operation_audit_created
  on public.admin_operation_audit_logs (created_at desc);
create index if not exists idx_admin_operation_audit_target
  on public.admin_operation_audit_logs (target_type, target_id, created_at desc);
create index if not exists idx_admin_report_review_updated
  on public.admin_report_review_states (review_status, updated_at desc);
create index if not exists idx_admin_content_review_updated
  on public.admin_content_review_states (review_status, updated_at desc);
create index if not exists idx_admin_hospital_review_updated
  on public.admin_hospital_review_states (review_status, updated_at desc);
create index if not exists idx_admin_user_review_updated
  on public.admin_user_review_states (review_status, updated_at desc);

drop trigger if exists trg_admin_report_review_states_updated_at
  on public.admin_report_review_states;
create trigger trg_admin_report_review_states_updated_at
before update on public.admin_report_review_states
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_content_review_states_updated_at
  on public.admin_content_review_states;
create trigger trg_admin_content_review_states_updated_at
before update on public.admin_content_review_states
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_hospital_review_states_updated_at
  on public.admin_hospital_review_states;
create trigger trg_admin_hospital_review_states_updated_at
before update on public.admin_hospital_review_states
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_user_review_states_updated_at
  on public.admin_user_review_states;
create trigger trg_admin_user_review_states_updated_at
before update on public.admin_user_review_states
for each row execute function public.set_updated_at();

alter table public.admin_operation_audit_logs enable row level security;
alter table public.admin_report_review_states enable row level security;
alter table public.admin_content_review_states enable row level security;
alter table public.admin_hospital_review_states enable row level security;
alter table public.admin_user_review_states enable row level security;

drop policy if exists admin_operation_audit_logs_ops_admin_all
  on public.admin_operation_audit_logs;
create policy admin_operation_audit_logs_ops_admin_all
  on public.admin_operation_audit_logs
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_report_review_states_ops_admin_all
  on public.admin_report_review_states;
create policy admin_report_review_states_ops_admin_all
  on public.admin_report_review_states
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_content_review_states_ops_admin_all
  on public.admin_content_review_states;
create policy admin_content_review_states_ops_admin_all
  on public.admin_content_review_states
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_hospital_review_states_ops_admin_all
  on public.admin_hospital_review_states;
create policy admin_hospital_review_states_ops_admin_all
  on public.admin_hospital_review_states
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_user_review_states_ops_admin_all
  on public.admin_user_review_states;
create policy admin_user_review_states_ops_admin_all
  on public.admin_user_review_states
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create or replace function public.admin_write_operation_audit_v1(
  p_action_type text,
  p_actor_label text,
  p_target_type text,
  p_target_id text,
  p_target_summary text,
  p_before_state jsonb default '{}'::jsonb,
  p_after_state jsonb default '{}'::jsonb,
  p_reason text default null,
  p_operator_note text default null,
  p_risk_level text default 'low',
  p_status text default 'succeeded',
  p_metadata_summary text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_action text := nullif(btrim(coalesce(p_action_type, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_target_type text := nullif(btrim(coalesce(p_target_type, '')), '');
  v_target_summary text := nullif(btrim(coalesce(p_target_summary, '')), '');
  v_risk text := coalesce(nullif(btrim(coalesce(p_risk_level, '')), ''), 'low');
  v_status text := coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'succeeded');
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_action is null or v_actor is null or v_target_type is null or v_target_summary is null then
    raise exception 'NURI_OPS_AUDIT_INVALID'
      using errcode = '22023';
  end if;

  if v_target_type not in ('report', 'post', 'comment', 'hospital', 'user', 'pet', 'system') then
    raise exception 'NURI_OPS_AUDIT_TARGET_INVALID'
      using errcode = '22023';
  end if;

  if v_risk not in ('low', 'medium', 'high') or v_status not in ('succeeded', 'failed', 'blocked') then
    raise exception 'NURI_OPS_AUDIT_STATUS_INVALID'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_before_state, '{}'::jsonb)) is distinct from 'object'
    or jsonb_typeof(coalesce(p_after_state, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'NURI_OPS_AUDIT_STATE_INVALID'
      using errcode = '22023';
  end if;

  insert into public.admin_operation_audit_logs (
    action_type,
    actor_label,
    target_type,
    target_id,
    target_summary,
    before_state,
    after_state,
    reason,
    operator_note,
    risk_level,
    status,
    metadata_summary
  )
  values (
    v_action,
    v_actor,
    v_target_type,
    nullif(btrim(coalesce(p_target_id, '')), ''),
    v_target_summary,
    coalesce(p_before_state, '{}'::jsonb),
    coalesce(p_after_state, '{}'::jsonb),
    nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_operator_note, '')), ''),
    v_risk,
    v_status,
    nullif(btrim(coalesce(p_metadata_summary, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_update_report_review_v1(
  p_report_id uuid,
  p_review_status text,
  p_content_review_status text,
  p_operator_note text,
  p_actor_label text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_report public.reports%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_content text := nullif(btrim(coalesce(p_content_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_review not in ('pending', 'reviewing', 'resolved', 'held')
    or v_content not in ('normal', 'needs_review', 'hide_recommended')
    or v_actor is null then
    raise exception 'NURI_REPORT_ACTION_INVALID'
      using errcode = '22023';
  end if;

  select *
    into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    raise exception 'NURI_REPORT_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_audit_id := public.admin_write_operation_audit_v1(
    'report_review_update',
    v_actor,
    'report',
    p_report_id::text,
    '신고 상태 업데이트',
    jsonb_build_object('status', v_report.status),
    jsonb_build_object('reviewStatus', v_review, 'contentReviewStatus', v_content),
    'report_soft_action',
    v_note,
    case when v_content = 'hide_recommended' then 'high' else 'medium' end,
    'succeeded',
    '원본 콘텐츠 삭제 없이 운영 overlay 상태만 기록'
  );

  insert into public.admin_report_review_states (
    report_id,
    review_status,
    content_review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (
    p_report_id,
    v_review,
    v_content,
    v_note,
    v_actor,
    v_audit_id
  )
  on conflict (report_id)
  do update set
    review_status = excluded.review_status,
    content_review_status = excluded.content_review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  if v_report.target_type in ('post', 'comment') then
    insert into public.admin_content_review_states (
      target_type,
      target_id,
      review_status,
      operator_note,
      actor_label,
      source_report_id,
      last_audit_id
    )
    values (
      v_report.target_type,
      v_report.target_id,
      v_content,
      v_note,
      v_actor,
      p_report_id,
      v_audit_id
    )
    on conflict (target_type, target_id)
    do update set
      review_status = excluded.review_status,
      operator_note = excluded.operator_note,
      actor_label = excluded.actor_label,
      source_report_id = excluded.source_report_id,
      last_audit_id = excluded.last_audit_id,
      updated_at = timezone('utc', now());
  end if;

  return v_audit_id;
end;
$$;

create or replace function public.admin_update_content_review_v1(
  p_target_type text,
  p_target_id uuid,
  p_review_status text,
  p_operator_note text,
  p_actor_label text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_target_type text := nullif(btrim(coalesce(p_target_type, '')), '');
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_exists boolean := false;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_target_type not in ('post', 'comment')
    or v_review not in ('normal', 'needs_review', 'hide_recommended')
    or v_actor is null then
    raise exception 'NURI_CONTENT_ACTION_INVALID'
      using errcode = '22023';
  end if;

  if v_target_type = 'post' then
    select exists(select 1 from public.posts where id = p_target_id) into v_exists;
  else
    select exists(select 1 from public.comments where id = p_target_id) into v_exists;
  end if;

  if not v_exists then
    raise exception 'NURI_CONTENT_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_audit_id := public.admin_write_operation_audit_v1(
    'content_review_update',
    v_actor,
    v_target_type,
    p_target_id::text,
    case when v_target_type = 'post' then '게시글 검토 상태 업데이트' else '댓글 검토 상태 업데이트' end,
    '{}'::jsonb,
    jsonb_build_object('reviewStatus', v_review),
    'content_soft_action',
    v_note,
    case when v_review = 'hide_recommended' then 'high' else 'medium' end,
    'succeeded',
    '원본 row 삭제 없이 운영 overlay 상태만 기록'
  );

  insert into public.admin_content_review_states (
    target_type,
    target_id,
    review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (
    v_target_type,
    p_target_id,
    v_review,
    v_note,
    v_actor,
    v_audit_id
  )
  on conflict (target_type, target_id)
  do update set
    review_status = excluded.review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  return v_audit_id;
end;
$$;

create or replace function public.admin_review_hospital_v1(
  p_hospital_id text,
  p_review_status text,
  p_operator_note text,
  p_actor_label text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_hospital public.animal_hospitals%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_review not in ('reviewing', 'approved', 'rejected', 'held') or v_actor is null then
    raise exception 'NURI_HOSPITAL_REVIEW_INVALID'
      using errcode = '22023';
  end if;

  select *
    into v_hospital
  from public.animal_hospitals
  where id = p_hospital_id;

  if not found then
    raise exception 'NURI_HOSPITAL_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_audit_id := public.admin_write_operation_audit_v1(
    'hospital_review_update',
    v_actor,
    'hospital',
    p_hospital_id,
    v_hospital.canonical_name,
    jsonb_build_object(
      'publicTrustStatus', v_hospital.public_trust_status,
      'isActive', v_hospital.is_active,
      'isHidden', v_hospital.is_hidden
    ),
    jsonb_build_object('reviewStatus', v_review),
    'hospital_review_action',
    v_note,
    case when v_review = 'approved' then 'medium' else 'low' end,
    'succeeded',
    'public-safe projection 계약 유지, 민감 public 필드 노출 없음'
  );

  insert into public.admin_hospital_review_states (
    hospital_id,
    review_status,
    operator_note,
    actor_label,
    public_safe_note,
    last_audit_id
  )
  values (
    p_hospital_id,
    v_review,
    v_note,
    v_actor,
    '운영시간·야간·응급·특수동물·주차·장비·홈페이지·SNS public 차단 유지',
    v_audit_id
  )
  on conflict (hospital_id)
  do update set
    review_status = excluded.review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    public_safe_note = excluded.public_safe_note,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  return v_audit_id;
end;
$$;

create or replace function public.admin_update_user_review_v1(
  p_user_id uuid,
  p_review_status text,
  p_operator_note text,
  p_actor_label text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_profile public.profiles%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_review not in ('normal', 'review_required', 'restriction_recommended') or v_actor is null then
    raise exception 'NURI_USER_REVIEW_INVALID'
      using errcode = '22023';
  end if;

  select *
    into v_profile
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'NURI_USER_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_audit_id := public.admin_write_operation_audit_v1(
    'user_review_update',
    v_actor,
    'user',
    p_user_id::text,
    coalesce(v_profile.nickname, '사용자 검토'),
    jsonb_build_object('role', v_profile.role),
    jsonb_build_object('reviewStatus', v_review),
    'user_soft_action',
    v_note,
    case when v_review = 'restriction_recommended' then 'high' else 'medium' end,
    'succeeded',
    '계정 삭제·권한 상승·비밀번호 초기화 없이 운영 검토 flag만 기록'
  );

  insert into public.admin_user_review_states (
    user_id,
    review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (
    p_user_id,
    v_review,
    v_note,
    v_actor,
    v_audit_id
  )
  on conflict (user_id)
  do update set
    review_status = excluded.review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  return v_audit_id;
end;
$$;

revoke all on function public.is_nuri_ops_admin_v1()
  from public, anon, authenticated;
revoke all on function public.admin_write_operation_audit_v1(text, text, text, text, text, jsonb, jsonb, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_update_report_review_v1(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_update_content_review_v1(text, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_review_hospital_v1(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_update_user_review_v1(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.is_nuri_ops_admin_v1()
  to authenticated, service_role;
grant execute on function public.admin_write_operation_audit_v1(text, text, text, text, text, jsonb, jsonb, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_update_report_review_v1(uuid, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_update_content_review_v1(text, uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_review_hospital_v1(text, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_update_user_review_v1(uuid, text, text, text)
  to authenticated, service_role;

comment on function public.admin_update_report_review_v1(uuid, text, text, text, text)
  is 'Admin console soft action for report review state. It writes overlay state and sanitized audit only; it does not hard-delete content.';
comment on function public.admin_update_content_review_v1(text, uuid, text, text, text)
  is 'Admin console soft action for post/comment review state. It records review/hidden recommendation without deleting source content.';
comment on function public.admin_review_hospital_v1(text, text, text, text)
  is 'Admin console hospital review overlay action. It preserves the public-safe hospital projection and records audit.';
comment on function public.admin_update_user_review_v1(uuid, text, text, text)
  is 'Admin console user review role model action. It stores review/restriction recommendation only and does not delete or escalate accounts.';

commit;

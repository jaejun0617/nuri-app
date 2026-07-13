begin;

create table if not exists public.admin_operator_role_assignments (
  actor_label text primary key,
  role_key text not null,
  capabilities text[] not null default '{}',
  is_active boolean not null default true,
  assigned_by text,
  operator_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_role_key_check
    check (role_key in ('viewer', 'operator', 'moderator', 'hospital_reviewer', 'admin', 'super_admin', 'owner')),
  constraint admin_operator_actor_not_blank
    check (btrim(actor_label) <> '')
);

comment on table public.admin_operator_role_assignments is
  'Production transition contract for nuri-web admin operator roles. Stores role/capability summaries only; no passwords, tokens, or session secrets.';

create table if not exists public.admin_action_policies (
  action_type text primary key,
  required_capability text not null,
  risk_level text not null default 'medium',
  approval_required boolean not null default false,
  rollback_supported boolean not null default false,
  is_disabled boolean not null default false,
  disabled_reason text,
  policy_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_action_policy_risk_check
    check (risk_level in ('low', 'medium', 'high')),
  constraint admin_action_policy_not_blank
    check (btrim(action_type) <> '' and btrim(required_capability) <> '')
);

comment on table public.admin_action_policies is
  'Admin action risk, capability, approval, and rollback policy metadata for the nuri-web operations console.';

create table if not exists public.admin_action_approval_requests (
  id uuid primary key default gen_random_uuid(),
  action_type text not null references public.admin_action_policies(action_type),
  target_type text not null,
  target_id text,
  target_summary text not null,
  request_reason text not null,
  operator_note text,
  requested_by text not null,
  requested_role text,
  requested_capabilities text[] not null default '{}',
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  related_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_approval_target_type_check
    check (target_type in ('report', 'post', 'comment', 'hospital', 'user', 'pet', 'notification', 'rollback', 'system')),
  constraint admin_approval_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'executed')),
  constraint admin_approval_text_not_blank
    check (btrim(action_type) <> '' and btrim(target_summary) <> '' and btrim(request_reason) <> '' and btrim(requested_by) <> '')
);

comment on table public.admin_action_approval_requests is
  'Two-person approval queue for risky soft admin operations. It does not execute hard delete or broadcast actions.';

create table if not exists public.admin_rollback_requests (
  id uuid primary key default gen_random_uuid(),
  request_label text not null,
  action_log_ids uuid[] not null default '{}',
  requested_by text not null,
  request_reason text not null,
  risk_level text not null default 'high',
  status text not null default 'pending_approval',
  approval_request_id uuid references public.admin_action_approval_requests(id) on delete set null,
  operator_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_rollback_risk_check
    check (risk_level in ('medium', 'high')),
  constraint admin_rollback_status_check
    check (status in ('pending_approval', 'approved', 'rejected', 'blocked', 'executed')),
  constraint admin_rollback_text_not_blank
    check (btrim(request_label) <> '' and btrim(requested_by) <> '' and btrim(request_reason) <> ''),
  constraint admin_rollback_action_limit_check
    check (array_length(action_log_ids, 1) is null or array_length(action_log_ids, 1) <= 20)
);

comment on table public.admin_rollback_requests is
  'Incident-level rollback request tracker. Actual rollback execution remains disabled until explicit approval and runbook completion.';

create index if not exists idx_admin_approvals_status_created
  on public.admin_action_approval_requests (status, created_at desc);

create index if not exists idx_admin_approvals_target
  on public.admin_action_approval_requests (target_type, target_id);

create index if not exists idx_admin_rollback_status_created
  on public.admin_rollback_requests (status, created_at desc);

drop trigger if exists trg_admin_operator_role_assignments_updated_at
  on public.admin_operator_role_assignments;
create trigger trg_admin_operator_role_assignments_updated_at
before update on public.admin_operator_role_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_action_policies_updated_at
  on public.admin_action_policies;
create trigger trg_admin_action_policies_updated_at
before update on public.admin_action_policies
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_action_approval_requests_updated_at
  on public.admin_action_approval_requests;
create trigger trg_admin_action_approval_requests_updated_at
before update on public.admin_action_approval_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_rollback_requests_updated_at
  on public.admin_rollback_requests;
create trigger trg_admin_rollback_requests_updated_at
before update on public.admin_rollback_requests
for each row execute function public.set_updated_at();

alter table public.admin_operator_role_assignments enable row level security;
alter table public.admin_action_policies enable row level security;
alter table public.admin_action_approval_requests enable row level security;
alter table public.admin_rollback_requests enable row level security;

drop policy if exists admin_operator_roles_ops_admin_all
  on public.admin_operator_role_assignments;
create policy admin_operator_roles_ops_admin_all
  on public.admin_operator_role_assignments
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_action_policies_ops_admin_all
  on public.admin_action_policies;
create policy admin_action_policies_ops_admin_all
  on public.admin_action_policies
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_action_approvals_ops_admin_all
  on public.admin_action_approval_requests;
create policy admin_action_approvals_ops_admin_all
  on public.admin_action_approval_requests
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

drop policy if exists admin_rollback_requests_ops_admin_all
  on public.admin_rollback_requests;
create policy admin_rollback_requests_ops_admin_all
  on public.admin_rollback_requests
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

insert into public.admin_action_policies (
  action_type,
  required_capability,
  risk_level,
  approval_required,
  rollback_supported,
  is_disabled,
  disabled_reason,
  policy_note
)
values
  ('report_review_update', 'reports.review', 'medium', false, true, false, null, '신고 overlay 상태 변경. hard delete 없음.'),
  ('content_review_update', 'content.soft_hide', 'high', true, true, false, null, '콘텐츠 숨김 권고/검토 상태 변경은 2인 승인 대상.'),
  ('hospital_review_update', 'hospitals.review', 'high', true, true, false, null, '병원 승인/반려/보류 확정은 public trust 영향이 있어 2인 승인 대상.'),
  ('user_review_update', 'users.review', 'high', true, true, false, null, '사용자 제한 권고 flag는 2인 승인 대상.'),
  ('operation_undo', 'audit.undo', 'medium', false, false, false, null, '단일 soft action undo. 현재 상태 conflict 시 차단.'),
  ('rollback_request', 'audit.undo', 'high', true, false, false, null, '사고 단위 rollback 요청. 실제 실행은 disabled/runbook 필요.'),
  ('notification_qa_send', 'notifications.send_qa', 'medium', false, false, false, null, 'QA 닉네임 단일 대상 앱 내부 알림. push 아님.'),
  ('notification_segment_send', 'notifications.send_segment_disabled', 'high', true, false, true, '세그먼트 발송은 push/token/수신동의/승인 정책 전까지 비활성입니다.', 'segment/broadcast는 이번 production transition에서 실행하지 않는다.'),
  ('notification_broadcast_send', 'notifications.send_segment_disabled', 'high', true, false, true, '전체 발송은 별도 승인과 수신 제외/rollback 정책 전까지 비활성입니다.', '전체 broadcast 금지.')
on conflict (action_type)
do update set
  required_capability = excluded.required_capability,
  risk_level = excluded.risk_level,
  approval_required = excluded.approval_required,
  rollback_supported = excluded.rollback_supported,
  is_disabled = excluded.is_disabled,
  disabled_reason = excluded.disabled_reason,
  policy_note = excluded.policy_note,
  updated_at = timezone('utc', now());

create or replace function public.admin_get_action_policy_summary_v1()
returns table (
  action_type text,
  required_capability text,
  risk_level text,
  approval_required boolean,
  rollback_supported boolean,
  is_disabled boolean,
  disabled_reason text,
  policy_note text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    p.action_type,
    p.required_capability,
    p.risk_level,
    p.approval_required,
    p.rollback_supported,
    p.is_disabled,
    p.disabled_reason,
    p.policy_note,
    p.updated_at
  from public.admin_action_policies p
  order by p.risk_level desc, p.action_type asc;
end;
$$;

create or replace function public.admin_get_operator_capabilities_v1(
  p_actor_label text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_assignment public.admin_operator_role_assignments%rowtype;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_actor is not null then
    select * into v_assignment
    from public.admin_operator_role_assignments
    where actor_label = v_actor
      and is_active = true;
  end if;

  if found then
    return jsonb_build_object(
      'source', 'db_assignment',
      'actorLabel', v_assignment.actor_label,
      'role', v_assignment.role_key,
      'capabilities', to_jsonb(v_assignment.capabilities),
      'updatedAt', v_assignment.updated_at
    );
  end if;

  return jsonb_build_object(
    'source', 'local_session_fallback',
    'actorLabel', coalesce(v_actor, 'nuri-web-admin'),
    'role', 'admin',
    'capabilities', jsonb_build_array(
      'reports.read',
      'reports.review',
      'content.read',
      'content.soft_hide',
      'hospitals.read',
      'hospitals.review',
      'users.read',
      'users.review',
      'pets.read',
      'audit.read',
      'audit.write',
      'audit.undo',
      'notifications.read',
      'notifications.send_qa',
      'guides.manage',
      'release.read',
      'settings.read',
      'settings.security'
    ),
    'updatedAt', timezone('utc', now())
  );
end;
$$;

create or replace function public.admin_create_action_approval_request_v1(
  p_action_type text,
  p_target_type text,
  p_target_id text,
  p_target_summary text,
  p_request_reason text,
  p_operator_note text default null,
  p_actor_label text default 'nuri-web-admin',
  p_actor_role text default 'admin',
  p_actor_capabilities text[] default '{}'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action text := nullif(btrim(coalesce(p_action_type, '')), '');
  v_target_type text := nullif(btrim(coalesce(p_target_type, '')), '');
  v_target_summary text := nullif(btrim(coalesce(p_target_summary, '')), '');
  v_reason text := nullif(btrim(coalesce(p_request_reason, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_policy public.admin_action_policies%rowtype;
  v_request_id uuid;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  select * into v_policy
  from public.admin_action_policies
  where action_type = v_action;

  if not found or v_policy.is_disabled then
    raise exception 'NURI_APPROVAL_POLICY_BLOCKED'
      using errcode = '42501';
  end if;

  if v_target_type not in ('report', 'post', 'comment', 'hospital', 'user', 'pet', 'notification', 'rollback', 'system')
    or v_target_summary is null
    or v_reason is null
    or v_actor is null then
    raise exception 'NURI_APPROVAL_REQUEST_INVALID'
      using errcode = '22023';
  end if;

  insert into public.admin_action_approval_requests (
    action_type,
    target_type,
    target_id,
    target_summary,
    request_reason,
    operator_note,
    requested_by,
    requested_role,
    requested_capabilities
  )
  values (
    v_action,
    v_target_type,
    nullif(btrim(coalesce(p_target_id, '')), ''),
    v_target_summary,
    v_reason,
    nullif(btrim(coalesce(p_operator_note, '')), ''),
    v_actor,
    nullif(btrim(coalesce(p_actor_role, '')), ''),
    coalesce(p_actor_capabilities, '{}')
  )
  returning id into v_request_id;

  v_audit_id := public.admin_write_operation_audit_v1(
    'approval_request_create',
    v_actor,
    'system',
    v_request_id::text,
    '운영 승인 요청 생성',
    '{}'::jsonb,
    jsonb_build_object(
      'approvalRequestId', v_request_id,
      'actionType', v_action,
      'targetType', v_target_type,
      'targetSummary', v_target_summary,
      'approvalRequired', v_policy.approval_required
    ),
    'approval_queue',
    p_operator_note,
    v_policy.risk_level,
    'succeeded',
    '2인 승인 queue 요청. 원본 데이터 변경 없음.'
  );

  update public.admin_action_approval_requests
  set related_audit_id = v_audit_id
  where id = v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.admin_review_action_approval_request_v1(
  p_request_id uuid,
  p_decision text,
  p_review_note text,
  p_actor_label text default 'nuri-web-admin'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_decision text := nullif(btrim(coalesce(p_decision, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_request public.admin_action_approval_requests%rowtype;
  v_next_status text;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_decision not in ('approved', 'rejected') or v_actor is null then
    raise exception 'NURI_APPROVAL_REVIEW_INVALID'
      using errcode = '22023';
  end if;

  select * into v_request
  from public.admin_action_approval_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'NURI_APPROVAL_NOT_FOUND'
      using errcode = '02000';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'NURI_APPROVAL_ALREADY_REVIEWED'
      using errcode = '22023';
  end if;

  if v_request.requested_by = v_actor then
    raise exception 'NURI_APPROVAL_SELF_REVIEW_FORBIDDEN'
      using errcode = '42501';
  end if;

  v_next_status := v_decision;

  update public.admin_action_approval_requests
  set
    status = v_next_status,
    reviewed_by = v_actor,
    reviewed_at = timezone('utc', now()),
    review_note = nullif(btrim(coalesce(p_review_note, '')), '')
  where id = p_request_id;

  v_audit_id := public.admin_write_operation_audit_v1(
    'approval_request_review',
    v_actor,
    'system',
    p_request_id::text,
    case when v_next_status = 'approved' then '운영 승인 요청 승인' else '운영 승인 요청 반려' end,
    jsonb_build_object(
      'status', v_request.status,
      'requestedBy', v_request.requested_by,
      'actionType', v_request.action_type
    ),
    jsonb_build_object(
      'status', v_next_status,
      'reviewedBy', v_actor,
      'actionType', v_request.action_type
    ),
    'approval_queue',
    p_review_note,
    'high',
    'succeeded',
    '자기 승인 차단 후 승인 queue review 기록'
  );

  return v_audit_id;
end;
$$;

create or replace function public.admin_get_action_approval_queue_v1(
  p_limit integer default 80
)
returns table (
  id uuid,
  action_type text,
  target_type text,
  target_id text,
  target_summary text,
  request_reason text,
  operator_note text,
  requested_by text,
  requested_role text,
  status text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  risk_level text,
  required_capability text,
  approval_required boolean,
  related_audit_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    q.id,
    q.action_type,
    q.target_type,
    q.target_id,
    q.target_summary,
    q.request_reason,
    q.operator_note,
    q.requested_by,
    q.requested_role,
    q.status,
    q.reviewed_by,
    q.reviewed_at,
    q.review_note,
    p.risk_level,
    p.required_capability,
    p.approval_required,
    q.related_audit_id,
    q.created_at,
    q.updated_at
  from public.admin_action_approval_requests q
  join public.admin_action_policies p
    on p.action_type = q.action_type
  order by
    case q.status when 'pending' then 0 else 1 end,
    q.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

create or replace function public.admin_create_rollback_request_v1(
  p_action_log_ids uuid[],
  p_request_label text,
  p_request_reason text,
  p_operator_note text default null,
  p_actor_label text default 'nuri-web-admin'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_label text := nullif(btrim(coalesce(p_request_label, '')), '');
  v_reason text := nullif(btrim(coalesce(p_request_reason, '')), '');
  v_ids uuid[] := coalesce(p_action_log_ids, '{}');
  v_existing_count integer;
  v_request_id uuid;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_actor is null or v_label is null or v_reason is null
    or array_length(v_ids, 1) is null
    or array_length(v_ids, 1) > 20 then
    raise exception 'NURI_ROLLBACK_REQUEST_INVALID'
      using errcode = '22023';
  end if;

  select count(*) into v_existing_count
  from public.admin_operation_audit_logs
  where id = any(v_ids);

  if v_existing_count <> array_length(v_ids, 1) then
    raise exception 'NURI_ROLLBACK_ACTION_NOT_FOUND'
      using errcode = '02000';
  end if;

  insert into public.admin_rollback_requests (
    request_label,
    action_log_ids,
    requested_by,
    request_reason,
    operator_note
  )
  values (
    v_label,
    v_ids,
    v_actor,
    v_reason,
    nullif(btrim(coalesce(p_operator_note, '')), '')
  )
  returning id into v_request_id;

  v_audit_id := public.admin_write_operation_audit_v1(
    'rollback_request_create',
    v_actor,
    'system',
    v_request_id::text,
    '운영 rollback 요청 생성',
    '{}'::jsonb,
    jsonb_build_object(
      'rollbackRequestId', v_request_id,
      'actionCount', array_length(v_ids, 1),
      'status', 'pending_approval'
    ),
    'rollback_request',
    p_operator_note,
    'high',
    'succeeded',
    '실제 rollback 실행 없음. 승인과 runbook 확인 필요.'
  );

  return v_request_id;
end;
$$;

create or replace function public.admin_get_rollback_requests_v1(
  p_limit integer default 80
)
returns table (
  id uuid,
  request_label text,
  action_count integer,
  requested_by text,
  request_reason text,
  risk_level text,
  status text,
  approval_request_id uuid,
  operator_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.request_label,
    coalesce(array_length(r.action_log_ids, 1), 0),
    r.requested_by,
    r.request_reason,
    r.risk_level,
    r.status,
    r.approval_request_id,
    r.operator_note,
    r.created_at,
    r.updated_at
  from public.admin_rollback_requests r
  order by
    case r.status when 'pending_approval' then 0 else 1 end,
    r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

create or replace function public.admin_get_operations_dashboard_summary_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_summary jsonb;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', timezone('utc', now()),
    'counts', jsonb_build_object(
      'totalUsers', (select count(*) from public.profiles),
      'todayUsers', (select count(*) from public.profiles where created_at >= date_trunc('day', timezone('utc', now()))),
      'totalPets', (select count(*) from public.pets),
      'recentPosts', (select count(*) from public.posts where created_at >= timezone('utc', now()) - interval '7 days'),
      'pendingReports', (select count(*) from public.reports where coalesce(status, 'open') in ('open', 'pending')),
      'contentReviewPending', (select count(*) from public.admin_content_review_states where review_status in ('needs_review', 'hide_recommended')),
      'hospitalReviewPending', (select count(*) from public.admin_hospital_review_states where review_status in ('reviewing', 'held')),
      'approvedHospitals', (select count(*) from public.admin_hospital_review_states where review_status = 'approved'),
      'notificationAudits', (select count(*) from public.admin_notification_audit_logs where created_at >= timezone('utc', now()) - interval '7 days'),
      'recentAuditActions', (select count(*) from public.admin_operation_audit_logs where created_at >= timezone('utc', now()) - interval '7 days'),
      'approvalPending', (select count(*) from public.admin_action_approval_requests where status = 'pending'),
      'approvalReviewed', (select count(*) from public.admin_action_approval_requests where status in ('approved', 'rejected') and updated_at >= timezone('utc', now()) - interval '7 days'),
      'undoAvailable', (select count(*) from public.admin_operation_undo_links where undo_status = 'available'),
      'rollbackPending', (select count(*) from public.admin_rollback_requests where status = 'pending_approval'),
      'highRiskPolicies', (select count(*) from public.admin_action_policies where risk_level = 'high'),
      'disabledPolicies', (select count(*) from public.admin_action_policies where is_disabled = true)
    ),
    'reviewQueues', jsonb_build_object(
      'reports', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_report_review_states group by review_status) s),
      'content', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_content_review_states group by review_status) s),
      'hospitals', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_hospital_review_states group by review_status) s),
      'users', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_user_review_states group by review_status) s),
      'approvals', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) from (select status, count(*) total from public.admin_action_approval_requests group by status) s),
      'rollback', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) from (select status, count(*) total from public.admin_rollback_requests group by status) s),
      'undo', (select coalesce(jsonb_object_agg(undo_status, total), '{}'::jsonb) from (select undo_status, count(*) total from public.admin_operation_undo_links group by undo_status) s)
    )
  ) into v_summary;

  return v_summary;
end;
$$;

revoke all on table public.admin_operator_role_assignments from public, anon, authenticated;
revoke all on table public.admin_action_policies from public, anon, authenticated;
revoke all on table public.admin_action_approval_requests from public, anon, authenticated;
revoke all on table public.admin_rollback_requests from public, anon, authenticated;

grant select, insert, update on table public.admin_operator_role_assignments to authenticated;
grant select, insert, update on table public.admin_action_policies to authenticated;
grant select, insert, update on table public.admin_action_approval_requests to authenticated;
grant select, insert, update on table public.admin_rollback_requests to authenticated;

revoke all on function public.admin_get_action_policy_summary_v1() from public, anon, authenticated;
revoke all on function public.admin_get_operator_capabilities_v1(text) from public, anon, authenticated;
revoke all on function public.admin_create_action_approval_request_v1(text, text, text, text, text, text, text, text, text[]) from public, anon, authenticated;
revoke all on function public.admin_review_action_approval_request_v1(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_get_action_approval_queue_v1(integer) from public, anon, authenticated;
revoke all on function public.admin_create_rollback_request_v1(uuid[], text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_get_rollback_requests_v1(integer) from public, anon, authenticated;

grant execute on function public.admin_get_action_policy_summary_v1() to authenticated, service_role;
grant execute on function public.admin_get_operator_capabilities_v1(text) to authenticated, service_role;
grant execute on function public.admin_create_action_approval_request_v1(text, text, text, text, text, text, text, text, text[]) to authenticated, service_role;
grant execute on function public.admin_review_action_approval_request_v1(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.admin_get_action_approval_queue_v1(integer) to authenticated, service_role;
grant execute on function public.admin_create_rollback_request_v1(uuid[], text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_get_rollback_requests_v1(integer) to authenticated, service_role;

comment on function public.admin_create_action_approval_request_v1(text, text, text, text, text, text, text, text, text[])
  is 'Create a two-person approval request for high-risk soft admin actions. Does not execute destructive actions.';

comment on function public.admin_review_action_approval_request_v1(uuid, text, text, text)
  is 'Review an admin approval request. Self-review is blocked.';

comment on function public.admin_create_rollback_request_v1(uuid[], text, text, text, text)
  is 'Create incident-level rollback request. It records intent only; actual rollback remains disabled until runbook approval.';

commit;

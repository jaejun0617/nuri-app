begin;

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
  ('operator_invite', 'operators.invite', 'high', true, false, false, null, '운영자 초대는 production auth와 audit를 거친다.'),
  ('operator_deactivate', 'operators.lifecycle', 'high', true, true, false, null, '운영자 계정 비활성은 auth_version 증가와 감사 로그를 남긴다.'),
  ('operator_reactivate', 'operators.lifecycle', 'high', true, false, false, null, '운영자 계정 복구는 2인 승인과 감사 로그가 필요하다.'),
  ('operator_role_change', 'operators.role_request', 'high', true, true, false, null, '운영자 role/capability 변경은 자기 승인 없이 실행한다.'),
  ('operator_mfa_reset', 'operators.recovery', 'high', true, false, false, null, 'MFA 복구는 emergency runbook과 감사 로그가 필요하다.'),
  ('content_review_restore', 'content.soft_hide', 'high', true, true, false, null, 'soft hide 해제도 public 노출에 영향을 주므로 승인 대상이다.'),
  ('hospital_soft_merge_request', 'hospitals.merge', 'high', true, true, false, null, '병원 중복 후보 soft merge 요청. 원본 hard merge 없음.'),
  ('rollback_request', 'rollback.request', 'high', true, false, false, null, '사고 단위 rollback 요청. 실행은 별도 approval/capability 필요.'),
  ('approval_execute', 'approvals.execute', 'high', false, true, false, null, '승인 완료된 action payload를 idempotency 기반으로 실행한다.'),
  ('rollback_batch_execute', 'rollback.execute', 'high', true, false, false, null, '승인된 rollback batch만 conflict-safe로 실행한다.'),
  ('notification_token_revoke', 'notifications.tokens', 'medium', false, false, false, null, '사용자 opt-out/logout token 폐기. 실제 push 발송 아님.'),
  ('notification_segment_preview', 'notifications.segment_preview', 'medium', false, false, false, null, '세그먼트 대상 수만 preview. broadcast 발송 없음.')
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

create table if not exists public.admin_operator_invitations (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null,
  requested_role text not null,
  requested_capabilities text[] not null default '{}',
  invited_by text not null,
  invite_token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  approval_request_id uuid references public.admin_action_approval_requests(id) on delete set null,
  operator_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_invitation_username_check
    check (btrim(username) <> ''),
  constraint admin_operator_invitation_role_check
    check (requested_role in ('viewer', 'operator', 'moderator', 'hospital_reviewer', 'admin', 'super_admin', 'owner')),
  constraint admin_operator_invitation_token_check
    check (btrim(invite_token_hash) <> '')
);

create table if not exists public.admin_operator_security_events (
  id uuid primary key default gen_random_uuid(),
  operator_account_id uuid references public.admin_operator_accounts(id) on delete set null,
  actor_label text not null,
  event_type text not null,
  status text not null default 'succeeded',
  metadata_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_security_event_status_check
    check (status in ('succeeded', 'failed', 'blocked')),
  constraint admin_operator_security_event_text_check
    check (btrim(actor_label) <> '' and btrim(event_type) <> '')
);

create table if not exists public.admin_operator_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  operator_account_id uuid not null references public.admin_operator_accounts(id) on delete cascade,
  factor_type text not null default 'totp',
  secret_ciphertext text not null,
  secret_nonce text not null,
  enabled_at timestamptz,
  disabled_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_mfa_factor_type_check
    check (factor_type = 'totp'),
  constraint admin_operator_mfa_secret_check
    check (btrim(secret_ciphertext) <> '' and btrim(secret_nonce) <> '')
);

create table if not exists public.admin_operator_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  operator_account_id uuid not null references public.admin_operator_accounts(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_operator_recovery_code_hash_check
    check (btrim(code_hash) <> '')
);

create table if not exists public.admin_action_approval_execution_payloads (
  approval_request_id uuid primary key references public.admin_action_approval_requests(id) on delete cascade,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  execution_payload jsonb not null default '{}'::jsonb,
  required_capability text not null,
  risk_level text not null default 'high',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_approval_payload_state_object_check
    check (
      jsonb_typeof(before_state) = 'object'
      and jsonb_typeof(after_state) = 'object'
      and jsonb_typeof(execution_payload) = 'object'
    ),
  constraint admin_approval_payload_risk_check
    check (risk_level in ('low', 'medium', 'high'))
);

create table if not exists public.admin_action_approval_executions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null unique references public.admin_action_approval_requests(id) on delete cascade,
  execution_status text not null default 'execution_pending',
  idempotency_key text not null unique,
  executed_by text,
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  result_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  retry_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_approval_execution_status_check
    check (execution_status in ('execution_pending', 'executing', 'executed', 'failed', 'blocked')),
  constraint admin_approval_execution_key_check
    check (btrim(idempotency_key) <> '')
);

create table if not exists public.admin_rollback_batch_executions (
  id uuid primary key default gen_random_uuid(),
  rollback_request_id uuid not null unique references public.admin_rollback_requests(id) on delete cascade,
  execution_status text not null default 'execution_pending',
  idempotency_key text not null unique,
  executed_by text,
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  result_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_rollback_batch_execution_status_check
    check (execution_status in ('execution_pending', 'executing', 'executed', 'failed', 'blocked')),
  constraint admin_rollback_batch_execution_key_check
    check (btrim(idempotency_key) <> '')
);

create table if not exists public.admin_rollback_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_execution_id uuid not null references public.admin_rollback_batch_executions(id) on delete cascade,
  audit_log_id uuid not null references public.admin_operation_audit_logs(id) on delete cascade,
  item_status text not null default 'pending',
  undo_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_rollback_batch_item_status_check
    check (item_status in ('pending', 'undone', 'conflict', 'failed', 'blocked')),
  unique (batch_execution_id, audit_log_id)
);

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_opt_in boolean not null default false,
  categories jsonb not null default '{}'::jsonb,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_notification_preferences_categories_object_check
    check (jsonb_typeof(categories) = 'object')
);

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null,
  provider text not null,
  token_fingerprint text,
  token_ciphertext text,
  token_status text not null default 'active',
  opt_in boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_push_tokens_platform_check
    check (platform in ('android', 'ios', 'web', 'unknown')),
  constraint user_push_tokens_provider_check
    check (provider in ('fcm', 'expo', 'apns', 'disabled', 'unknown')),
  constraint user_push_tokens_status_check
    check (token_status in ('active', 'revoked', 'expired', 'invalid', 'provider_unavailable')),
  constraint user_push_tokens_device_check
    check (btrim(device_id) <> ''),
  unique (user_id, device_id, provider)
);

create table if not exists public.admin_hospital_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  canonical_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  candidate_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  similarity_score numeric(5, 4) not null default 0,
  status text not null default 'pending',
  reason text,
  created_by text,
  approval_request_id uuid references public.admin_action_approval_requests(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_hospital_duplicate_status_check
    check (status in ('pending', 'approved', 'rejected', 'held', 'merged_soft')),
  constraint admin_hospital_duplicate_not_self_check
    check (canonical_hospital_id <> candidate_hospital_id),
  unique (canonical_hospital_id, candidate_hospital_id)
);

create table if not exists public.admin_hospital_soft_merge_relations (
  id uuid primary key default gen_random_uuid(),
  canonical_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  merged_hospital_id text not null references public.animal_hospitals(id) on delete cascade,
  merge_status text not null default 'soft_linked',
  operator_note text,
  last_audit_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_hospital_soft_merge_status_check
    check (merge_status in ('soft_linked', 'unlinked', 'blocked')),
  constraint admin_hospital_soft_merge_not_self_check
    check (canonical_hospital_id <> merged_hospital_id),
  unique (canonical_hospital_id, merged_hospital_id)
);

create table if not exists public.admin_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info',
  source text not null default 'nuri-web',
  target_summary text not null,
  status text not null default 'open',
  metadata_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint admin_monitoring_event_severity_check
    check (severity in ('info', 'warning', 'critical')),
  constraint admin_monitoring_event_status_check
    check (status in ('open', 'resolved', 'ignored')),
  constraint admin_monitoring_event_text_check
    check (btrim(event_type) <> '' and btrim(target_summary) <> '')
);

create index if not exists idx_admin_operator_invitations_username
  on public.admin_operator_invitations (username, created_at desc);
create index if not exists idx_admin_security_events_created
  on public.admin_operator_security_events (created_at desc);
create index if not exists idx_admin_mfa_operator
  on public.admin_operator_mfa_factors (operator_account_id, enabled_at desc);
create index if not exists idx_admin_recovery_operator
  on public.admin_operator_recovery_codes (operator_account_id, used_at);
create index if not exists idx_admin_approval_executions_status
  on public.admin_action_approval_executions (execution_status, updated_at desc);
create index if not exists idx_admin_rollback_batch_executions_status
  on public.admin_rollback_batch_executions (execution_status, updated_at desc);
create index if not exists idx_notification_preferences_opt_in
  on public.user_notification_preferences (push_opt_in, updated_at desc);
create index if not exists idx_user_push_tokens_user_status
  on public.user_push_tokens (user_id, token_status, updated_at desc);
create index if not exists idx_user_push_tokens_fingerprint
  on public.user_push_tokens (token_fingerprint)
  where token_fingerprint is not null;
create index if not exists idx_hospital_duplicate_candidates_status
  on public.admin_hospital_duplicate_candidates (status, updated_at desc);
create index if not exists idx_admin_monitoring_events_status
  on public.admin_monitoring_events (status, severity, created_at desc);

drop trigger if exists trg_admin_operator_invitations_updated_at on public.admin_operator_invitations;
create trigger trg_admin_operator_invitations_updated_at
before update on public.admin_operator_invitations
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_operator_mfa_factors_updated_at on public.admin_operator_mfa_factors;
create trigger trg_admin_operator_mfa_factors_updated_at
before update on public.admin_operator_mfa_factors
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_approval_payloads_updated_at on public.admin_action_approval_execution_payloads;
create trigger trg_admin_approval_payloads_updated_at
before update on public.admin_action_approval_execution_payloads
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_approval_executions_updated_at on public.admin_action_approval_executions;
create trigger trg_admin_approval_executions_updated_at
before update on public.admin_action_approval_executions
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_rollback_batch_executions_updated_at on public.admin_rollback_batch_executions;
create trigger trg_admin_rollback_batch_executions_updated_at
before update on public.admin_rollback_batch_executions
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_rollback_batch_items_updated_at on public.admin_rollback_batch_items;
create trigger trg_admin_rollback_batch_items_updated_at
before update on public.admin_rollback_batch_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger trg_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_hospital_duplicate_candidates_updated_at on public.admin_hospital_duplicate_candidates;
create trigger trg_admin_hospital_duplicate_candidates_updated_at
before update on public.admin_hospital_duplicate_candidates
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_hospital_soft_merge_relations_updated_at on public.admin_hospital_soft_merge_relations;
create trigger trg_admin_hospital_soft_merge_relations_updated_at
before update on public.admin_hospital_soft_merge_relations
for each row execute function public.set_updated_at();

alter table public.admin_operator_invitations enable row level security;
alter table public.admin_operator_security_events enable row level security;
alter table public.admin_operator_mfa_factors enable row level security;
alter table public.admin_operator_recovery_codes enable row level security;
alter table public.admin_action_approval_execution_payloads enable row level security;
alter table public.admin_action_approval_executions enable row level security;
alter table public.admin_rollback_batch_executions enable row level security;
alter table public.admin_rollback_batch_items enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.user_push_tokens enable row level security;
alter table public.admin_hospital_duplicate_candidates enable row level security;
alter table public.admin_hospital_soft_merge_relations enable row level security;
alter table public.admin_monitoring_events enable row level security;

create policy admin_operator_invitations_ops_admin_all
  on public.admin_operator_invitations
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_operator_security_events_ops_admin_all
  on public.admin_operator_security_events
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_operator_mfa_factors_service_only
  on public.admin_operator_mfa_factors
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_operator_recovery_codes_service_only
  on public.admin_operator_recovery_codes
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_approval_payloads_ops_admin_all
  on public.admin_action_approval_execution_payloads
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_approval_executions_ops_admin_all
  on public.admin_action_approval_executions
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_rollback_batch_executions_ops_admin_all
  on public.admin_rollback_batch_executions
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_rollback_batch_items_ops_admin_all
  on public.admin_rollback_batch_items
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy user_notification_preferences_owner_all
  on public.user_notification_preferences
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_notification_preferences_ops_admin_read
  on public.user_notification_preferences
  for select
  to authenticated
  using (public.is_nuri_ops_admin_v1());

create policy user_push_tokens_owner_all
  on public.user_push_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy user_push_tokens_ops_admin_read
  on public.user_push_tokens
  for select
  to authenticated
  using (public.is_nuri_ops_admin_v1());

create policy admin_hospital_duplicate_candidates_ops_admin_all
  on public.admin_hospital_duplicate_candidates
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_hospital_soft_merge_relations_ops_admin_all
  on public.admin_hospital_soft_merge_relations
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create policy admin_monitoring_events_ops_admin_all
  on public.admin_monitoring_events
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create or replace function public.admin_create_action_approval_request_v2(
  p_action_type text,
  p_target_type text,
  p_target_id text,
  p_target_summary text,
  p_request_reason text,
  p_operator_note text default null,
  p_actor_label text default 'nuri-web-admin',
  p_actor_role text default 'admin',
  p_actor_capabilities text[] default '{}',
  p_before_state jsonb default '{}'::jsonb,
  p_after_state jsonb default '{}'::jsonb,
  p_execution_payload jsonb default '{}'::jsonb
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
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_before_state, '{}'::jsonb)) is distinct from 'object'
    or jsonb_typeof(coalesce(p_after_state, '{}'::jsonb)) is distinct from 'object'
    or jsonb_typeof(coalesce(p_execution_payload, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'NURI_APPROVAL_PAYLOAD_INVALID' using errcode = '22023';
  end if;

  select * into v_policy
  from public.admin_action_policies
  where action_type = v_action;

  if not found or v_policy.is_disabled then
    raise exception 'NURI_APPROVAL_POLICY_BLOCKED' using errcode = '42501';
  end if;

  if v_target_type not in ('report', 'post', 'comment', 'hospital', 'user', 'pet', 'notification', 'rollback', 'system')
    or v_target_summary is null
    or v_reason is null
    or v_actor is null then
    raise exception 'NURI_APPROVAL_REQUEST_INVALID' using errcode = '22023';
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
    requested_capabilities,
    status
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
    coalesce(p_actor_capabilities, '{}'),
    'pending'
  )
  returning id into v_request_id;

  insert into public.admin_action_approval_execution_payloads (
    approval_request_id,
    before_state,
    after_state,
    execution_payload,
    required_capability,
    risk_level
  )
  values (
    v_request_id,
    coalesce(p_before_state, '{}'::jsonb),
    coalesce(p_after_state, '{}'::jsonb),
    coalesce(p_execution_payload, '{}'::jsonb),
    v_policy.required_capability,
    v_policy.risk_level
  );

  insert into public.admin_action_approval_executions (
    approval_request_id,
    execution_status,
    idempotency_key
  )
  values (
    v_request_id,
    'execution_pending',
    gen_random_uuid()::text
  );

  v_audit_id := public.admin_write_operation_audit_v1(
    'approval_request_create',
    v_actor,
    v_target_type,
    nullif(btrim(coalesce(p_target_id, '')), ''),
    v_target_summary,
    '{}'::jsonb,
    jsonb_build_object('approvalRequestId', v_request_id, 'actionType', v_action),
    v_reason,
    p_operator_note,
    v_policy.risk_level,
    'succeeded',
    '승인 요청 payload는 sanitized before/after/action payload만 저장'
  );

  update public.admin_action_approval_requests
  set related_audit_id = v_audit_id
  where id = v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.admin_get_action_approval_queue_v2(
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
  requested_capabilities text[],
  status text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  related_audit_id uuid,
  risk_level text,
  required_capability text,
  approval_required boolean,
  execution_status text,
  execution_failure_reason text,
  result_audit_id uuid,
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
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
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
    q.requested_capabilities,
    q.status,
    q.reviewed_by,
    q.reviewed_at,
    q.review_note,
    q.related_audit_id,
    coalesce(payload.risk_level, policy.risk_level, 'high') as risk_level,
    coalesce(payload.required_capability, policy.required_capability, '권한 미정') as required_capability,
    coalesce(policy.approval_required, true) as approval_required,
    coalesce(exec.execution_status, 'not_ready') as execution_status,
    exec.failure_reason as execution_failure_reason,
    exec.result_audit_id,
    q.created_at,
    q.updated_at
  from public.admin_action_approval_requests q
  left join public.admin_action_policies policy on policy.action_type = q.action_type
  left join public.admin_action_approval_execution_payloads payload on payload.approval_request_id = q.id
  left join public.admin_action_approval_executions exec on exec.approval_request_id = q.id
  order by
    case q.status
      when 'pending' then 0
      when 'approved' then 1
      when 'executed' then 2
      else 3
    end,
    q.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

create or replace function public.admin_execute_approved_action_v1(
  p_request_id uuid,
  p_actor_label text,
  p_operator_note text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request public.admin_action_approval_requests%rowtype;
  v_payload public.admin_action_approval_execution_payloads%rowtype;
  v_execution public.admin_action_approval_executions%rowtype;
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_key text := coalesce(nullif(btrim(coalesce(p_idempotency_key, '')), ''), gen_random_uuid()::text);
  v_action_audit_id uuid;
  v_result_audit_id uuid;
  v_target_uuid uuid;
  v_review_status text;
  v_content_review_status text;
  v_current_status text;
  v_next_status text;
  v_expected_status text;
  v_role text;
  v_capabilities text[];
  v_source_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_request
  from public.admin_action_approval_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'NURI_APPROVAL_NOT_FOUND' using errcode = '02000';
  end if;

  if v_actor is null then
    raise exception 'NURI_APPROVAL_EXECUTOR_INVALID' using errcode = '22023';
  end if;

  if v_request.requested_by = v_actor then
    raise exception 'NURI_APPROVAL_SELF_EXECUTE_FORBIDDEN' using errcode = '42501';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'NURI_APPROVAL_NOT_APPROVED' using errcode = '22023';
  end if;

  select * into v_payload
  from public.admin_action_approval_execution_payloads
  where approval_request_id = p_request_id;

  if not found then
    raise exception 'NURI_APPROVAL_PAYLOAD_MISSING' using errcode = '22023';
  end if;

  select * into v_execution
  from public.admin_action_approval_executions
  where approval_request_id = p_request_id
  for update;

  if found and v_execution.execution_status = 'executed' then
    return v_execution.result_audit_id;
  end if;

  insert into public.admin_action_approval_executions (
    approval_request_id,
    execution_status,
    idempotency_key,
    executed_by,
    started_at
  )
  values (p_request_id, 'executing', v_key, v_actor, timezone('utc', now()))
  on conflict (approval_request_id)
  do update set
    execution_status = 'executing',
    idempotency_key = excluded.idempotency_key,
    executed_by = excluded.executed_by,
    started_at = timezone('utc', now()),
    failure_reason = null,
    retry_count = public.admin_action_approval_executions.retry_count + 1
  returning * into v_execution;

  v_target_uuid := nullif(v_request.target_id, '')::uuid;

  if v_request.action_type = 'report_review_update' then
    v_review_status := coalesce(v_payload.after_state->>'reviewStatus', 'reviewing');
    v_content_review_status := coalesce(v_payload.after_state->>'contentReviewStatus', 'needs_review');
    v_action_audit_id := public.admin_update_report_review_v2(
      v_target_uuid,
      v_review_status,
      v_content_review_status,
      coalesce(p_operator_note, v_request.operator_note),
      v_actor
    );
  elsif v_request.action_type in ('content_review_update', 'content_review_restore') then
    v_review_status := coalesce(v_payload.after_state->>'reviewStatus', 'needs_review');
    v_expected_status := nullif(v_payload.before_state->>'sourceStatus', '');
    v_next_status := case when v_review_status = 'hide_recommended' then 'hidden' else 'active' end;

    if v_request.target_type = 'post' then
      select status into v_current_status from public.posts where id = v_target_uuid for update;
      if not found then
        raise exception 'NURI_CONTENT_NOT_FOUND' using errcode = '02000';
      end if;
      if v_expected_status is not null and v_current_status <> v_expected_status then
        raise exception 'NURI_APPROVAL_SOURCE_CONFLICT' using errcode = '40001';
      end if;
      update public.posts
      set status = v_next_status,
          updated_at = timezone('utc', now())
      where id = v_target_uuid;
    elsif v_request.target_type = 'comment' then
      select status into v_current_status from public.comments where id = v_target_uuid for update;
      if not found then
        raise exception 'NURI_CONTENT_NOT_FOUND' using errcode = '02000';
      end if;
      if v_expected_status is not null and v_current_status <> v_expected_status then
        raise exception 'NURI_APPROVAL_SOURCE_CONFLICT' using errcode = '40001';
      end if;
      update public.comments
      set status = v_next_status,
          updated_at = timezone('utc', now())
      where id = v_target_uuid;
    else
      raise exception 'NURI_APPROVAL_TARGET_INVALID' using errcode = '22023';
    end if;

    v_source_audit_id := public.admin_write_operation_audit_v1(
      'content_visibility_update',
      v_actor,
      v_request.target_type,
      v_request.target_id,
      case when v_request.target_type = 'post' then '게시글 public visibility soft update' else '댓글 public visibility soft update' end,
      jsonb_build_object('sourceStatus', v_current_status),
      jsonb_build_object('sourceStatus', v_next_status),
      'approved_content_visibility_update',
      coalesce(p_operator_note, v_request.operator_note),
      'high',
      'succeeded',
      '원본 삭제 없이 public read-path status만 soft update'
    );

    insert into public.admin_operation_undo_links (audit_log_id, undo_status, actor_label)
    values (v_source_audit_id, 'available', v_actor)
    on conflict (audit_log_id) do nothing;

    v_action_audit_id := public.admin_update_content_review_v2(
      v_request.target_type,
      v_target_uuid,
      v_review_status,
      coalesce(p_operator_note, v_request.operator_note),
      v_actor
    );
  elsif v_request.action_type = 'hospital_review_update' then
    v_review_status := coalesce(v_payload.after_state->>'reviewStatus', 'held');
    v_action_audit_id := public.admin_review_hospital_v2(
      v_request.target_id,
      v_review_status,
      coalesce(p_operator_note, v_request.operator_note),
      v_actor
    );
  elsif v_request.action_type = 'user_review_update' then
    v_review_status := coalesce(v_payload.after_state->>'reviewStatus', 'review_required');
    v_action_audit_id := public.admin_update_user_review_v2(
      v_target_uuid,
      v_review_status,
      coalesce(p_operator_note, v_request.operator_note),
      v_actor
    );
  elsif v_request.action_type = 'operator_role_change' then
    v_role := nullif(v_payload.after_state->>'role', '');
    if v_role not in ('viewer', 'operator', 'moderator', 'hospital_reviewer', 'admin', 'super_admin', 'owner') then
      raise exception 'NURI_OPERATOR_ROLE_INVALID' using errcode = '22023';
    end if;
    select array_agg(capability.value) into v_capabilities
    from jsonb_array_elements_text(coalesce(v_payload.after_state->'capabilities', '[]'::jsonb)) as capability(value);
    update public.admin_operator_accounts
    set role = v_role,
        capabilities = coalesce(v_capabilities, '{}'),
        auth_version = auth_version + 1,
        updated_at = timezone('utc', now())
    where id = v_target_uuid;
    if not found then
      raise exception 'NURI_OPERATOR_NOT_FOUND' using errcode = '02000';
    end if;
    v_action_audit_id := public.admin_write_operation_audit_v1(
      'operator_role_change',
      v_actor,
      'system',
      v_request.target_id,
      v_request.target_summary,
      v_payload.before_state,
      v_payload.after_state,
      v_request.request_reason,
      coalesce(p_operator_note, v_request.operator_note),
      'high',
      'succeeded',
      '운영자 권한 변경, auth_version 증가'
    );
  elsif v_request.action_type = 'operator_deactivate' then
    update public.admin_operator_accounts
    set disabled_at = timezone('utc', now()),
        auth_version = auth_version + 1,
        updated_at = timezone('utc', now())
    where id = v_target_uuid;
    if not found then
      raise exception 'NURI_OPERATOR_NOT_FOUND' using errcode = '02000';
    end if;
    v_action_audit_id := public.admin_write_operation_audit_v1(
      'operator_deactivate',
      v_actor,
      'system',
      v_request.target_id,
      v_request.target_summary,
      v_payload.before_state,
      jsonb_build_object('disabled', true),
      v_request.request_reason,
      coalesce(p_operator_note, v_request.operator_note),
      'high',
      'succeeded',
      '운영자 계정 비활성, auth_version 증가'
    );
  elsif v_request.action_type = 'operator_reactivate' then
    update public.admin_operator_accounts
    set disabled_at = null,
        auth_version = auth_version + 1,
        updated_at = timezone('utc', now())
    where id = v_target_uuid;
    if not found then
      raise exception 'NURI_OPERATOR_NOT_FOUND' using errcode = '02000';
    end if;
    v_action_audit_id := public.admin_write_operation_audit_v1(
      'operator_reactivate',
      v_actor,
      'system',
      v_request.target_id,
      v_request.target_summary,
      v_payload.before_state,
      jsonb_build_object('disabled', false),
      v_request.request_reason,
      coalesce(p_operator_note, v_request.operator_note),
      'high',
      'succeeded',
      '운영자 계정 복구, auth_version 증가'
    );
  else
    raise exception 'NURI_APPROVAL_EXECUTION_UNSUPPORTED' using errcode = '22023';
  end if;

  v_result_audit_id := public.admin_write_operation_audit_v1(
    'approval_execute',
    v_actor,
    v_request.target_type,
    v_request.target_id,
    v_request.target_summary,
    jsonb_build_object('approvalStatus', v_request.status),
    jsonb_build_object('resultAuditId', v_action_audit_id, 'approvalRequestId', p_request_id),
    'approved_action_execution',
    coalesce(p_operator_note, v_request.operator_note),
    v_payload.risk_level,
    'succeeded',
    '승인 완료 조치 실행 및 결과 audit 연결'
  );

  update public.admin_action_approval_executions
  set execution_status = 'executed',
      completed_at = timezone('utc', now()),
      result_audit_id = v_result_audit_id,
      failure_reason = null
  where approval_request_id = p_request_id;

  update public.admin_action_approval_requests
  set status = 'executed',
      related_audit_id = v_result_audit_id
  where id = p_request_id;

  return v_result_audit_id;
exception
  when others then
    update public.admin_action_approval_executions
    set execution_status = 'failed',
        completed_at = timezone('utc', now()),
        failure_reason = left(sqlerrm, 240)
    where approval_request_id = p_request_id;
    raise;
end;
$$;

create or replace function public.admin_execute_rollback_batch_v1(
  p_rollback_request_id uuid,
  p_actor_label text,
  p_operator_note text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request public.admin_rollback_requests%rowtype;
  v_approval public.admin_action_approval_requests%rowtype;
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_key text := coalesce(nullif(btrim(coalesce(p_idempotency_key, '')), ''), gen_random_uuid()::text);
  v_batch_id uuid;
  v_action_id uuid;
  v_undo_id uuid;
  v_audit_id uuid;
  v_conflict_count integer := 0;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_request
  from public.admin_rollback_requests
  where id = p_rollback_request_id
  for update;

  if not found then
    raise exception 'NURI_ROLLBACK_NOT_FOUND' using errcode = '02000';
  end if;

  if v_actor is null then
    raise exception 'NURI_ROLLBACK_ACTOR_INVALID' using errcode = '22023';
  end if;

  select * into v_approval
  from public.admin_action_approval_requests
  where id = v_request.approval_request_id;

  if not found or v_approval.status not in ('approved', 'executed') then
    raise exception 'NURI_ROLLBACK_APPROVAL_REQUIRED' using errcode = '42501';
  end if;

  if v_request.requested_by = v_actor then
    raise exception 'NURI_ROLLBACK_SELF_EXECUTE_FORBIDDEN' using errcode = '42501';
  end if;

  if array_length(v_request.action_log_ids, 1) is null or array_length(v_request.action_log_ids, 1) = 0 then
    raise exception 'NURI_ROLLBACK_EMPTY' using errcode = '22023';
  end if;

  if array_length(v_request.action_log_ids, 1) > 20 then
    raise exception 'NURI_ROLLBACK_TOO_LARGE' using errcode = '22023';
  end if;

  select count(*) into v_conflict_count
  from unnest(v_request.action_log_ids) as action_id
  left join public.admin_operation_undo_links undo on undo.audit_log_id = action_id
  where coalesce(undo.undo_status, 'blocked') <> 'available';

  if v_conflict_count > 0 then
    update public.admin_rollback_requests
    set status = 'blocked'
    where id = p_rollback_request_id;
    raise exception 'NURI_ROLLBACK_CONFLICT' using errcode = '40001';
  end if;

  insert into public.admin_rollback_batch_executions (
    rollback_request_id,
    execution_status,
    idempotency_key,
    executed_by,
    started_at
  )
  values (p_rollback_request_id, 'executing', v_key, v_actor, timezone('utc', now()))
  on conflict (rollback_request_id)
  do update set
    execution_status = 'executing',
    idempotency_key = excluded.idempotency_key,
    executed_by = excluded.executed_by,
    started_at = timezone('utc', now()),
    failure_reason = null
  returning id into v_batch_id;

  foreach v_action_id in array v_request.action_log_ids loop
    insert into public.admin_rollback_batch_items (batch_execution_id, audit_log_id, item_status)
    values (v_batch_id, v_action_id, 'pending')
    on conflict (batch_execution_id, audit_log_id) do nothing;

    v_undo_id := public.admin_undo_operation_action_v2(
      v_action_id,
      coalesce(p_operator_note, v_request.operator_note),
      v_actor
    );

    update public.admin_rollback_batch_items
    set item_status = 'undone',
        undo_audit_id = v_undo_id
    where batch_execution_id = v_batch_id
      and audit_log_id = v_action_id;
  end loop;

  v_audit_id := public.admin_write_operation_audit_v1(
    'rollback_batch_execute',
    v_actor,
    'system',
    p_rollback_request_id::text,
    v_request.request_label,
    jsonb_build_object('actionCount', array_length(v_request.action_log_ids, 1)),
    jsonb_build_object('rollbackRequestId', p_rollback_request_id, 'batchExecutionId', v_batch_id),
    'rollback_batch_execute',
    coalesce(p_operator_note, v_request.operator_note),
    'high',
    'succeeded',
    'all-or-nothing rollback batch executed through conflict-safe undo'
  );

  update public.admin_rollback_batch_executions
  set execution_status = 'executed',
      completed_at = timezone('utc', now()),
      result_audit_id = v_audit_id
  where id = v_batch_id;

  update public.admin_rollback_requests
  set status = 'executed'
  where id = p_rollback_request_id;

  return v_audit_id;
exception
  when others then
    update public.admin_rollback_batch_executions
    set execution_status = 'failed',
        completed_at = timezone('utc', now()),
        failure_reason = left(sqlerrm, 240)
    where rollback_request_id = p_rollback_request_id;
    raise;
end;
$$;

create or replace function public.admin_undo_operation_action_v2(
  p_audit_log_id uuid,
  p_operator_note text default null,
  p_actor_label text default 'admin'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_log public.admin_operation_audit_logs%rowtype;
  v_link public.admin_operation_undo_links%rowtype;
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_expected_status text;
  v_restore_status text;
  v_current_status text;
  v_target_uuid uuid;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_actor is null then
    raise exception 'NURI_OPS_UNDO_ACTOR_INVALID' using errcode = '22023';
  end if;

  select * into v_log
  from public.admin_operation_audit_logs
  where id = p_audit_log_id;

  if not found then
    raise exception 'NURI_OPS_UNDO_NOT_FOUND' using errcode = '02000';
  end if;

  if v_log.action_type <> 'content_visibility_update' then
    return public.admin_undo_operation_action_v1(p_audit_log_id, p_operator_note, p_actor_label);
  end if;

  select * into v_link
  from public.admin_operation_undo_links
  where audit_log_id = p_audit_log_id;

  if v_log.status <> 'succeeded'
    or v_log.target_type not in ('post', 'comment')
    or not (v_log.before_state ? 'sourceStatus' and v_log.after_state ? 'sourceStatus') then
    raise exception 'NURI_OPS_UNDO_NOT_ALLOWED' using errcode = '22023';
  end if;

  if v_link.undo_status = 'undone' then
    raise exception 'NURI_OPS_UNDO_ALREADY_DONE' using errcode = '22023';
  end if;

  v_expected_status := nullif(v_log.after_state ->> 'sourceStatus', '');
  v_restore_status := nullif(v_log.before_state ->> 'sourceStatus', '');
  v_target_uuid := v_log.target_id::uuid;

  if v_log.target_type = 'post' then
    select status into v_current_status
    from public.posts
    where id = v_target_uuid
    for update;
  else
    select status into v_current_status
    from public.comments
    where id = v_target_uuid
    for update;
  end if;

  if not found then
    raise exception 'NURI_OPS_UNDO_NOT_FOUND' using errcode = '02000';
  end if;

  if coalesce(v_current_status, '') <> coalesce(v_expected_status, '') then
    insert into public.admin_operation_undo_links (audit_log_id, undo_status, undo_reason, actor_label)
    values (p_audit_log_id, 'conflict', 'current source status differs from audited after_state', v_actor)
    on conflict (audit_log_id)
    do update set undo_status = 'conflict', undo_reason = excluded.undo_reason, actor_label = excluded.actor_label;
    raise exception 'NURI_OPS_UNDO_CONFLICT' using errcode = '40001';
  end if;

  if v_log.target_type = 'post' then
    update public.posts
    set status = v_restore_status,
        updated_at = timezone('utc', now())
    where id = v_target_uuid;
  else
    update public.comments
    set status = v_restore_status,
        updated_at = timezone('utc', now())
    where id = v_target_uuid;
  end if;

  v_audit_id := public.admin_write_operation_audit_v1(
    'operation_undo',
    v_actor,
    v_log.target_type,
    v_log.target_id,
    '콘텐츠 public visibility soft update 되돌리기',
    jsonb_build_object('sourceStatus', v_current_status),
    jsonb_build_object('sourceStatus', v_restore_status),
    'undo_content_visibility_update',
    v_note,
    'medium',
    'succeeded',
    'hard delete 없이 source status만 audited before_state로 복구'
  );

  insert into public.admin_operation_undo_links (
    audit_log_id,
    undo_audit_log_id,
    undo_status,
    undo_reason,
    actor_label
  )
  values (p_audit_log_id, v_audit_id, 'undone', v_note, v_actor)
  on conflict (audit_log_id)
  do update set
    undo_audit_log_id = excluded.undo_audit_log_id,
    undo_status = 'undone',
    undo_reason = excluded.undo_reason,
    actor_label = excluded.actor_label,
    updated_at = timezone('utc', now());

  return v_audit_id;
end;
$$;

create or replace function public.set_user_notification_opt_in_v1(
  p_push_opt_in boolean,
  p_categories jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_categories jsonb := coalesce(p_categories, '{}'::jsonb);
begin
  if v_user_id is null then
    raise exception 'NURI_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(v_categories) is distinct from 'object' then
    raise exception 'NURI_NOTIFICATION_CATEGORIES_INVALID' using errcode = '22023';
  end if;

  insert into public.user_notification_preferences (
    user_id,
    push_opt_in,
    categories,
    opted_in_at,
    opted_out_at
  )
  values (
    v_user_id,
    coalesce(p_push_opt_in, false),
    v_categories,
    case when coalesce(p_push_opt_in, false) then timezone('utc', now()) else null end,
    case when coalesce(p_push_opt_in, false) then null else timezone('utc', now()) end
  )
  on conflict (user_id)
  do update set
    push_opt_in = excluded.push_opt_in,
    categories = excluded.categories,
    opted_in_at = case when excluded.push_opt_in then coalesce(public.user_notification_preferences.opted_in_at, timezone('utc', now())) else public.user_notification_preferences.opted_in_at end,
    opted_out_at = case when excluded.push_opt_in then null else timezone('utc', now()) end,
    updated_at = timezone('utc', now());

  if not coalesce(p_push_opt_in, false) then
    update public.user_push_tokens
    set token_status = 'revoked',
        opt_in = false,
        revoked_at = timezone('utc', now()),
        revoke_reason = 'user_opt_out'
    where user_id = v_user_id
      and token_status = 'active';
  end if;

  return (
    select jsonb_build_object(
      'userId', user_id,
      'pushOptIn', push_opt_in,
      'categories', categories,
      'updatedAt', updated_at
    )
    from public.user_notification_preferences
    where user_id = v_user_id
  );
end;
$$;

create or replace function public.upsert_user_push_token_v1(
  p_device_id text,
  p_platform text,
  p_provider text,
  p_token_fingerprint text default null,
  p_token_ciphertext text default null,
  p_opt_in boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_device text := nullif(btrim(coalesce(p_device_id, '')), '');
  v_platform text := coalesce(nullif(btrim(coalesce(p_platform, '')), ''), 'unknown');
  v_provider text := coalesce(nullif(btrim(coalesce(p_provider, '')), ''), 'unknown');
  v_status text := case when p_token_fingerprint is null and p_token_ciphertext is null then 'provider_unavailable' else 'active' end;
begin
  if v_user_id is null then
    raise exception 'NURI_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_device is null then
    raise exception 'NURI_PUSH_DEVICE_INVALID' using errcode = '22023';
  end if;

  insert into public.user_notification_preferences (
    user_id,
    push_opt_in,
    categories,
    opted_in_at,
    opted_out_at
  )
  values (
    v_user_id,
    coalesce(p_opt_in, true),
    '{}'::jsonb,
    case when coalesce(p_opt_in, true) then timezone('utc', now()) else null end,
    case when coalesce(p_opt_in, true) then null else timezone('utc', now()) end
  )
  on conflict (user_id)
  do update set
    push_opt_in = excluded.push_opt_in,
    opted_in_at = case when excluded.push_opt_in then coalesce(public.user_notification_preferences.opted_in_at, timezone('utc', now())) else public.user_notification_preferences.opted_in_at end,
    opted_out_at = case when excluded.push_opt_in then null else timezone('utc', now()) end,
    updated_at = timezone('utc', now());

  insert into public.user_push_tokens (
    user_id,
    device_id,
    platform,
    provider,
    token_fingerprint,
    token_ciphertext,
    token_status,
    opt_in,
    last_seen_at,
    revoked_at,
    revoke_reason
  )
  values (
    v_user_id,
    v_device,
    v_platform,
    v_provider,
    nullif(btrim(coalesce(p_token_fingerprint, '')), ''),
    nullif(btrim(coalesce(p_token_ciphertext, '')), ''),
    v_status,
    coalesce(p_opt_in, true),
    timezone('utc', now()),
    case when coalesce(p_opt_in, true) then null else timezone('utc', now()) end,
    case when coalesce(p_opt_in, true) then null else 'user_opt_out' end
  )
  on conflict (user_id, device_id, provider)
  do update set
    platform = excluded.platform,
    token_fingerprint = excluded.token_fingerprint,
    token_ciphertext = excluded.token_ciphertext,
    token_status = excluded.token_status,
    opt_in = excluded.opt_in,
    last_seen_at = timezone('utc', now()),
    revoked_at = excluded.revoked_at,
    revoke_reason = excluded.revoke_reason,
    updated_at = timezone('utc', now());

  return jsonb_build_object('registered', true, 'status', v_status, 'provider', v_provider);
end;
$$;

create or replace function public.revoke_user_push_token_v1(
  p_device_id text default null,
  p_provider text default null,
  p_reason text default 'user_logout'
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'NURI_AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.user_push_tokens
  set token_status = 'revoked',
      opt_in = false,
      revoked_at = timezone('utc', now()),
      revoke_reason = left(coalesce(nullif(btrim(p_reason), ''), 'user_logout'), 80)
  where user_id = v_user_id
    and (p_device_id is null or device_id = p_device_id)
    and (p_provider is null or provider = p_provider)
    and token_status <> 'revoked';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_get_notification_token_lifecycle_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_active integer;
  v_revoked integer;
  v_opt_in integer;
  v_provider_unavailable integer;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select count(*) into v_active from public.user_push_tokens where token_status = 'active';
  select count(*) into v_revoked from public.user_push_tokens where token_status = 'revoked';
  select count(*) into v_opt_in from public.user_notification_preferences where push_opt_in = true;
  select count(*) into v_provider_unavailable from public.user_push_tokens where token_status = 'provider_unavailable';

  return jsonb_build_object(
    'activeTokens', v_active,
    'revokedTokens', v_revoked,
    'optInUsers', v_opt_in,
    'providerUnavailable', v_provider_unavailable,
    'broadcastDisabled', true,
    'pushActualDisabled', true,
    'generatedAt', timezone('utc', now())
  );
end;
$$;

create or replace function public.admin_get_operator_accounts_v1()
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  capabilities text[],
  must_change_password boolean,
  auth_version integer,
  locked_until timestamptz,
  disabled_at timestamptz,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  mfa_enabled boolean,
  recovery_code_count integer,
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
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    account.id,
    account.username,
    account.display_name,
    account.role,
    account.capabilities,
    account.must_change_password,
    account.auth_version,
    account.locked_until,
    account.disabled_at,
    account.last_login_at,
    account.password_changed_at,
    exists (
      select 1 from public.admin_operator_mfa_factors mfa
      where mfa.operator_account_id = account.id
        and mfa.enabled_at is not null
        and mfa.disabled_at is null
    ) as mfa_enabled,
    (
      select count(*)::integer from public.admin_operator_recovery_codes code
      where code.operator_account_id = account.id
        and code.used_at is null
    ) as recovery_code_count,
    account.created_at,
    account.updated_at
  from public.admin_operator_accounts account
  order by account.created_at desc;
end;
$$;

create or replace function public.admin_record_operator_security_event_v1(
  p_operator_account_id uuid,
  p_actor_label text,
  p_event_type text,
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
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_event text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_status text := coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'succeeded');
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_actor is null or v_event is null or v_status not in ('succeeded', 'failed', 'blocked') then
    raise exception 'NURI_OPERATOR_SECURITY_EVENT_INVALID' using errcode = '22023';
  end if;

  insert into public.admin_operator_security_events (
    operator_account_id,
    actor_label,
    event_type,
    status,
    metadata_summary
  )
  values (
    p_operator_account_id,
    v_actor,
    v_event,
    v_status,
    nullif(btrim(coalesce(p_metadata_summary, '')), '')
  )
  returning id into v_id;

  perform public.admin_write_operation_audit_v1(
    'operator_security_event',
    v_actor,
    'system',
    p_operator_account_id::text,
    v_event,
    '{}'::jsonb,
    jsonb_build_object('eventId', v_id, 'status', v_status),
    'operator_security_event',
    null,
    case when v_status = 'blocked' then 'high' else 'medium' end,
    v_status,
    '운영자 보안 이벤트, 민감정보 저장 없음'
  );

  return v_id;
end;
$$;

create or replace function public.admin_get_monitoring_summary_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'openEvents', (select count(*) from public.admin_monitoring_events where status = 'open'),
    'criticalEvents', (select count(*) from public.admin_monitoring_events where status = 'open' and severity = 'critical'),
    'failedActions7d', (
      select count(*) from public.admin_operation_audit_logs
      where created_at >= timezone('utc', now()) - interval '7 days'
        and status in ('failed', 'blocked')
    ),
    'approvalPending', (select count(*) from public.admin_action_approval_requests where status = 'pending'),
    'executionFailed', (select count(*) from public.admin_action_approval_executions where execution_status = 'failed'),
    'rollbackFailed', (select count(*) from public.admin_rollback_batch_executions where execution_status = 'failed'),
    'generatedAt', timezone('utc', now())
  );
end;
$$;

create or replace function public.admin_create_hospital_soft_merge_request_v1(
  p_canonical_hospital_id text,
  p_candidate_hospital_id text,
  p_similarity_score numeric,
  p_reason text,
  p_actor_label text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_actor is null or p_canonical_hospital_id = p_candidate_hospital_id then
    raise exception 'NURI_HOSPITAL_MERGE_REQUEST_INVALID' using errcode = '22023';
  end if;

  insert into public.admin_hospital_duplicate_candidates (
    canonical_hospital_id,
    candidate_hospital_id,
    similarity_score,
    status,
    reason,
    created_by
  )
  values (
    p_canonical_hospital_id,
    p_candidate_hospital_id,
    greatest(0, least(coalesce(p_similarity_score, 0), 1)),
    'pending',
    nullif(btrim(coalesce(p_reason, '')), ''),
    v_actor
  )
  on conflict (canonical_hospital_id, candidate_hospital_id)
  do update set
    similarity_score = excluded.similarity_score,
    status = 'pending',
    reason = excluded.reason,
    created_by = excluded.created_by,
    updated_at = timezone('utc', now())
  returning id into v_id;

  perform public.admin_write_operation_audit_v1(
    'hospital_soft_merge_request',
    v_actor,
    'hospital',
    p_canonical_hospital_id,
    '동물병원 중복 soft merge 요청',
    '{}'::jsonb,
    jsonb_build_object('candidateHospitalId', p_candidate_hospital_id, 'duplicateCandidateId', v_id),
    'hospital_duplicate_review',
    p_reason,
    'high',
    'succeeded',
    '원본 hard merge 없이 중복 후보만 기록'
  );

  return v_id;
end;
$$;

grant execute on function public.admin_create_action_approval_request_v2(text, text, text, text, text, text, text, text, text[], jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.admin_get_action_approval_queue_v2(integer) to authenticated, service_role;
grant execute on function public.admin_execute_approved_action_v1(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.admin_execute_rollback_batch_v1(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.admin_undo_operation_action_v2(uuid, text, text) to authenticated, service_role;
grant execute on function public.set_user_notification_opt_in_v1(boolean, jsonb) to authenticated;
grant execute on function public.upsert_user_push_token_v1(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.revoke_user_push_token_v1(text, text, text) to authenticated;
grant execute on function public.admin_get_notification_token_lifecycle_v1() to authenticated, service_role;
grant execute on function public.admin_get_operator_accounts_v1() to authenticated, service_role;
grant execute on function public.admin_record_operator_security_event_v1(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_get_monitoring_summary_v1() to authenticated, service_role;
grant execute on function public.admin_create_hospital_soft_merge_request_v1(text, text, numeric, text, text) to authenticated, service_role;

commit;

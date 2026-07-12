begin;

create table if not exists public.admin_operation_undo_links (
  audit_log_id uuid primary key references public.admin_operation_audit_logs(id) on delete cascade,
  undo_audit_log_id uuid references public.admin_operation_audit_logs(id) on delete set null,
  undo_status text not null default 'available',
  undo_reason text,
  actor_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_operation_undo_status_check
    check (undo_status in ('available', 'undone', 'conflict', 'blocked'))
);

comment on table public.admin_operation_undo_links is
  'Undo state for soft admin operation audit rows. It never restores hard-deleted data and never stores secrets or raw metadata.';

create index if not exists idx_admin_operation_undo_links_status
  on public.admin_operation_undo_links (undo_status, updated_at desc);

drop trigger if exists trg_admin_operation_undo_links_updated_at
  on public.admin_operation_undo_links;
create trigger trg_admin_operation_undo_links_updated_at
before update on public.admin_operation_undo_links
for each row execute function public.set_updated_at();

alter table public.admin_operation_undo_links enable row level security;

drop policy if exists admin_operation_undo_links_ops_admin_all
  on public.admin_operation_undo_links;
create policy admin_operation_undo_links_ops_admin_all
  on public.admin_operation_undo_links
  for all
  to authenticated
  using (public.is_nuri_ops_admin_v1())
  with check (public.is_nuri_ops_admin_v1());

create or replace function public.admin_update_report_review_v2(
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
  v_existing public.admin_report_review_states%rowtype;
  v_existing_content public.admin_content_review_states%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_content text := nullif(btrim(coalesce(p_content_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_before jsonb;
  v_after jsonb;
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

  select * into v_report
  from public.reports
  where id = p_report_id;

  if not found then
    raise exception 'NURI_REPORT_NOT_FOUND'
      using errcode = '02000';
  end if;

  select * into v_existing
  from public.admin_report_review_states
  where report_id = p_report_id;

  if v_report.target_type in ('post', 'comment') then
    select * into v_existing_content
    from public.admin_content_review_states
    where target_type = v_report.target_type
      and target_id = v_report.target_id;
  end if;

  v_before := jsonb_build_object(
    'reviewStatus', coalesce(v_existing.review_status, 'pending'),
    'contentReviewStatus', coalesce(v_existing.content_review_status, coalesce(v_existing_content.review_status, 'normal')),
    'operatorNote', v_existing.operator_note,
    'targetType', v_report.target_type,
    'targetId', v_report.target_id
  );
  v_after := jsonb_build_object(
    'reviewStatus', v_review,
    'contentReviewStatus', v_content,
    'operatorNote', v_note,
    'targetType', v_report.target_type,
    'targetId', v_report.target_id
  );

  v_audit_id := public.admin_write_operation_audit_v1(
    'report_review_update',
    v_actor,
    'report',
    p_report_id::text,
    '신고 상태 업데이트',
    v_before,
    v_after,
    'report_soft_action',
    v_note,
    case when v_content = 'hide_recommended' then 'high' else 'medium' end,
    'succeeded',
    '복구 가능한 before/after overlay 상태 기록'
  );

  insert into public.admin_report_review_states (
    report_id,
    review_status,
    content_review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (p_report_id, v_review, v_content, v_note, v_actor, v_audit_id)
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
    values (v_report.target_type, v_report.target_id, v_content, v_note, v_actor, p_report_id, v_audit_id)
    on conflict (target_type, target_id)
    do update set
      review_status = excluded.review_status,
      operator_note = excluded.operator_note,
      actor_label = excluded.actor_label,
      source_report_id = excluded.source_report_id,
      last_audit_id = excluded.last_audit_id,
      updated_at = timezone('utc', now());
  end if;

  insert into public.admin_operation_undo_links (audit_log_id, undo_status, actor_label)
  values (v_audit_id, 'available', v_actor)
  on conflict (audit_log_id) do nothing;

  return v_audit_id;
end;
$$;

create or replace function public.admin_update_content_review_v2(
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
  v_existing public.admin_content_review_states%rowtype;
  v_before jsonb;
  v_after jsonb;
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

  select * into v_existing
  from public.admin_content_review_states
  where target_type = v_target_type
    and target_id = p_target_id;

  v_before := jsonb_build_object(
    'reviewStatus', coalesce(v_existing.review_status, 'normal'),
    'operatorNote', v_existing.operator_note
  );
  v_after := jsonb_build_object(
    'reviewStatus', v_review,
    'operatorNote', v_note
  );

  v_audit_id := public.admin_write_operation_audit_v1(
    'content_review_update',
    v_actor,
    v_target_type,
    p_target_id::text,
    case when v_target_type = 'post' then '게시글 검토 상태 업데이트' else '댓글 검토 상태 업데이트' end,
    v_before,
    v_after,
    'content_soft_action',
    v_note,
    case when v_review = 'hide_recommended' then 'high' else 'medium' end,
    'succeeded',
    '복구 가능한 before/after overlay 상태 기록'
  );

  insert into public.admin_content_review_states (
    target_type,
    target_id,
    review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (v_target_type, p_target_id, v_review, v_note, v_actor, v_audit_id)
  on conflict (target_type, target_id)
  do update set
    review_status = excluded.review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  insert into public.admin_operation_undo_links (audit_log_id, undo_status, actor_label)
  values (v_audit_id, 'available', v_actor)
  on conflict (audit_log_id) do nothing;

  return v_audit_id;
end;
$$;

create or replace function public.admin_review_hospital_v2(
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
  v_existing public.admin_hospital_review_states%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_before jsonb;
  v_after jsonb;
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

  select * into v_hospital
  from public.animal_hospitals
  where id = p_hospital_id;

  if not found then
    raise exception 'NURI_HOSPITAL_NOT_FOUND'
      using errcode = '02000';
  end if;

  select * into v_existing
  from public.admin_hospital_review_states
  where hospital_id = p_hospital_id;

  v_before := jsonb_build_object(
    'reviewStatus', coalesce(v_existing.review_status, 'reviewing'),
    'operatorNote', v_existing.operator_note
  );
  v_after := jsonb_build_object(
    'reviewStatus', v_review,
    'operatorNote', v_note
  );

  v_audit_id := public.admin_write_operation_audit_v1(
    'hospital_review_update',
    v_actor,
    'hospital',
    p_hospital_id,
    v_hospital.canonical_name,
    v_before,
    v_after,
    'hospital_review_action',
    v_note,
    case when v_review = 'approved' then 'medium' else 'low' end,
    'succeeded',
    '복구 가능한 before/after overlay 상태 기록, public-safe projection 계약 유지'
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

  insert into public.admin_operation_undo_links (audit_log_id, undo_status, actor_label)
  values (v_audit_id, 'available', v_actor)
  on conflict (audit_log_id) do nothing;

  return v_audit_id;
end;
$$;

create or replace function public.admin_update_user_review_v2(
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
  v_existing public.admin_user_review_states%rowtype;
  v_review text := nullif(btrim(coalesce(p_review_status, '')), '');
  v_note text := nullif(btrim(coalesce(p_operator_note, '')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_before jsonb;
  v_after jsonb;
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

  select * into v_profile
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'NURI_USER_NOT_FOUND'
      using errcode = '02000';
  end if;

  select * into v_existing
  from public.admin_user_review_states
  where user_id = p_user_id;

  v_before := jsonb_build_object(
    'reviewStatus', coalesce(v_existing.review_status, 'normal'),
    'operatorNote', v_existing.operator_note
  );
  v_after := jsonb_build_object(
    'reviewStatus', v_review,
    'operatorNote', v_note
  );

  v_audit_id := public.admin_write_operation_audit_v1(
    'user_review_update',
    v_actor,
    'user',
    p_user_id::text,
    coalesce(v_profile.nickname, '사용자 검토'),
    v_before,
    v_after,
    'user_soft_action',
    v_note,
    case when v_review = 'restriction_recommended' then 'high' else 'medium' end,
    'succeeded',
    '복구 가능한 before/after overlay 상태 기록, 계정 삭제·권한 상승 없음'
  );

  insert into public.admin_user_review_states (
    user_id,
    review_status,
    operator_note,
    actor_label,
    last_audit_id
  )
  values (p_user_id, v_review, v_note, v_actor, v_audit_id)
  on conflict (user_id)
  do update set
    review_status = excluded.review_status,
    operator_note = excluded.operator_note,
    actor_label = excluded.actor_label,
    last_audit_id = excluded.last_audit_id,
    updated_at = timezone('utc', now());

  insert into public.admin_operation_undo_links (audit_log_id, undo_status, actor_label)
  values (v_audit_id, 'available', v_actor)
  on conflict (audit_log_id) do nothing;

  return v_audit_id;
end;
$$;

create or replace function public.admin_get_operation_action_history_v1(
  p_target_type text default null,
  p_target_id text default null,
  p_limit integer default 80
)
returns table (
  id uuid,
  action_type text,
  actor_label text,
  target_type text,
  target_id text,
  target_summary text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  operator_note text,
  risk_level text,
  status text,
  metadata_summary text,
  created_at timestamptz,
  undo_status text,
  undo_audit_log_id uuid,
  undoable boolean,
  undo_disabled_reason text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    l.id,
    l.action_type,
    l.actor_label,
    l.target_type,
    l.target_id,
    l.target_summary,
    l.before_state,
    l.after_state,
    l.reason,
    l.operator_note,
    l.risk_level,
    l.status,
    l.metadata_summary,
    l.created_at,
    coalesce(u.undo_status, 'available') as undo_status,
    u.undo_audit_log_id,
    (
      l.status = 'succeeded'
      and l.action_type in (
        'report_review_update',
        'content_review_update',
        'hospital_review_update',
        'user_review_update'
      )
      and coalesce(u.undo_status, 'available') = 'available'
      and l.before_state ? 'reviewStatus'
      and l.after_state ? 'reviewStatus'
    ) as undoable,
    case
      when l.status <> 'succeeded' then '성공한 soft action만 되돌릴 수 있습니다.'
      when l.action_type not in (
        'report_review_update',
        'content_review_update',
        'hospital_review_update',
        'user_review_update'
      ) then '이 action은 되돌리기 대상이 아닙니다.'
      when coalesce(u.undo_status, 'available') = 'undone' then '이미 되돌린 action입니다.'
      when coalesce(u.undo_status, 'available') = 'conflict' then '현재 상태가 달라져 자동 복구를 차단했습니다.'
      when not (l.before_state ? 'reviewStatus' and l.after_state ? 'reviewStatus') then '이전 감사 로그는 복구 기준 상태가 부족합니다.'
      else null
    end as undo_disabled_reason
  from public.admin_operation_audit_logs l
  left join public.admin_operation_undo_links u
    on u.audit_log_id = l.id
  where public.is_nuri_ops_admin_v1()
    and (p_target_type is null or l.target_type = p_target_type)
    and (p_target_id is null or l.target_id = p_target_id)
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
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
      'recentAuditActions', (select count(*) from public.admin_operation_audit_logs where created_at >= timezone('utc', now()) - interval '7 days')
    ),
    'reviewQueues', jsonb_build_object(
      'reports', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_report_review_states group by review_status) s),
      'content', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_content_review_states group by review_status) s),
      'hospitals', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_hospital_review_states group by review_status) s),
      'users', (select coalesce(jsonb_object_agg(review_status, total), '{}'::jsonb) from (select review_status, count(*) total from public.admin_user_review_states group by review_status) s)
    )
  ) into v_summary;

  return v_summary;
end;
$$;

create or replace function public.admin_send_qa_user_notification_ops_v1(
  p_target_nickname text,
  p_title text,
  p_body text,
  p_type text default 'notice',
  p_actor_label text default 'nuri-web-admin',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_target_key text := lower(nullif(btrim(coalesce(p_target_nickname, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_type text := nullif(btrim(coalesce(p_type, 'notice')), '');
  v_actor text := nullif(btrim(coalesce(p_actor_label, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_actor_user_id uuid;
  v_target_user_id uuid;
  v_target_count integer;
  v_campaign_id uuid;
  v_notification_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NURI_OPS_SERVER_REQUIRED'
      using errcode = '42501';
  end if;

  if v_target_key is null
    or v_target_key not in (
      'adminqa',
      'adminqa3',
      'adminqa4',
      'adminqa5',
      'adminqa6',
      'adminqa7',
      'adminqa8'
    ) then
    raise exception 'NURI_NOTIFICATION_TARGET_INVALID'
      using errcode = '22023';
  end if;

  if v_title is null or v_body is null or v_actor is null then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if v_type not in ('notice', 'account', 'service', 'event') then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) is distinct from 'object' then
    raise exception 'NURI_NOTIFICATION_INVALID'
      using errcode = '22023';
  end if;

  select p.user_id
    into v_actor_user_id
  from public.profiles p
  where p.role in ('admin', 'super_admin')
  order by p.created_at asc
  limit 1;

  if v_actor_user_id is null then
    raise exception 'NURI_NOTIFICATION_ADMIN_ACTOR_REQUIRED'
      using errcode = '42501';
  end if;

  select count(*)::integer
    into v_target_count
  from public.profiles p
  where lower(p.nickname::text) = v_target_key
    and not exists (
      select 1
      from public.account_deletion_requests r
      where r.user_id = p.user_id
        and r.status in (
          'requested',
          'pending_grace_period',
          'in_progress',
          'db_deleted',
          'cleanup_pending',
          'completed_with_cleanup_pending',
          'unknown_pending_confirmation'
        )
        and r.cancelled_at is null
        and r.db_deleted_at is null
    );

  if coalesce(v_target_count, 0) <> 1 then
    raise exception 'NURI_NOTIFICATION_TARGET_INVALID'
      using errcode = '22023';
  end if;

  select p.user_id
    into v_target_user_id
  from public.profiles p
  where lower(p.nickname::text) = v_target_key
    and not exists (
      select 1
      from public.account_deletion_requests r
      where r.user_id = p.user_id
        and r.status in (
          'requested',
          'pending_grace_period',
          'in_progress',
          'db_deleted',
          'cleanup_pending',
          'completed_with_cleanup_pending',
          'unknown_pending_confirmation'
        )
        and r.cancelled_at is null
        and r.db_deleted_at is null
    )
  limit 1;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    type,
    metadata
  )
  values (
    v_target_user_id,
    v_title,
    v_body,
    v_type,
    v_metadata || jsonb_build_object(
      'adminConsole',
      true,
      'targetNickname',
      v_target_key,
      'scope',
      'qa_single_user',
      'opsConsole',
      true
    )
  )
  returning id into v_notification_id;

  insert into public.admin_notification_campaigns (
    created_by,
    target_user_id,
    title,
    body,
    notification_type,
    metadata,
    send_status,
    notification_id,
    sent_at
  )
  values (
    v_actor_user_id,
    v_target_user_id,
    v_title,
    v_body,
    v_type,
    v_metadata || jsonb_build_object('opsActorLabel', v_actor, 'scope', 'qa_single_user'),
    'sent',
    v_notification_id,
    timezone('utc', now())
  )
  returning id into v_campaign_id;

  insert into public.admin_notification_audit_logs (
    actor_user_id,
    action,
    campaign_id,
    target_user_id,
    notification_id,
    details
  )
  values (
    v_actor_user_id,
    'qa_user_notification',
    v_campaign_id,
    v_target_user_id,
    v_notification_id,
    jsonb_build_object(
      'type',
      v_type,
      'opsActorLabel',
      v_actor,
      'scope',
      'qa_single_user'
    )
  );

  return v_notification_id;
end;
$$;

create or replace function public.admin_undo_operation_action_v1(
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
  v_expected_review text;
  v_restore_review text;
  v_expected_content text;
  v_restore_content text;
  v_target_uuid uuid;
  v_current_review text;
  v_current_content text;
  v_current_note text;
  v_audit_id uuid;
begin
  if not public.is_nuri_ops_admin_v1() then
    raise exception 'NURI_OPS_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if v_actor is null then
    raise exception 'NURI_OPS_UNDO_ACTOR_INVALID'
      using errcode = '22023';
  end if;

  select * into v_log
  from public.admin_operation_audit_logs
  where id = p_audit_log_id;

  if not found then
    raise exception 'NURI_OPS_UNDO_NOT_FOUND'
      using errcode = '02000';
  end if;

  select * into v_link
  from public.admin_operation_undo_links
  where audit_log_id = p_audit_log_id;

  if v_log.status <> 'succeeded'
    or v_log.action_type not in (
      'report_review_update',
      'content_review_update',
      'hospital_review_update',
      'user_review_update'
    )
    or not (v_log.before_state ? 'reviewStatus' and v_log.after_state ? 'reviewStatus') then
    raise exception 'NURI_OPS_UNDO_NOT_ALLOWED'
      using errcode = '22023';
  end if;

  if v_link.undo_status = 'undone' then
    raise exception 'NURI_OPS_UNDO_ALREADY_DONE'
      using errcode = '22023';
  end if;

  v_expected_review := nullif(v_log.after_state ->> 'reviewStatus', '');
  v_restore_review := nullif(v_log.before_state ->> 'reviewStatus', '');
  v_expected_content := nullif(v_log.after_state ->> 'contentReviewStatus', '');
  v_restore_content := nullif(v_log.before_state ->> 'contentReviewStatus', '');

  if v_log.action_type = 'report_review_update' then
    v_target_uuid := v_log.target_id::uuid;
    select review_status, content_review_status, operator_note
      into v_current_review, v_current_content, v_current_note
    from public.admin_report_review_states
    where report_id = v_target_uuid;

    if coalesce(v_current_review, 'pending') <> coalesce(v_expected_review, 'pending')
      or coalesce(v_current_content, 'normal') <> coalesce(v_expected_content, 'normal') then
      insert into public.admin_operation_undo_links (audit_log_id, undo_status, undo_reason, actor_label)
      values (p_audit_log_id, 'conflict', 'current state differs from audited after_state', v_actor)
      on conflict (audit_log_id)
      do update set undo_status = 'conflict', undo_reason = excluded.undo_reason, actor_label = excluded.actor_label;
      raise exception 'NURI_OPS_UNDO_CONFLICT'
        using errcode = '40001';
    end if;

    v_audit_id := public.admin_write_operation_audit_v1(
      'operation_undo',
      v_actor,
      'report',
      v_log.target_id,
      v_log.target_summary,
      jsonb_build_object('reviewStatus', v_current_review, 'contentReviewStatus', v_current_content, 'operatorNote', v_current_note),
      jsonb_build_object('reviewStatus', coalesce(v_restore_review, 'pending'), 'contentReviewStatus', coalesce(v_restore_content, 'normal'), 'operatorNote', nullif(v_log.before_state ->> 'operatorNote', '')),
      'undo_soft_action',
      v_note,
      v_log.risk_level,
      'succeeded',
      'soft action undo, hard delete 없음'
    );

    update public.admin_report_review_states
       set review_status = coalesce(v_restore_review, 'pending'),
           content_review_status = coalesce(v_restore_content, 'normal'),
           operator_note = nullif(v_log.before_state ->> 'operatorNote', ''),
           actor_label = v_actor,
           last_audit_id = v_audit_id,
           updated_at = timezone('utc', now())
     where report_id = v_target_uuid;

    if (v_log.after_state ->> 'targetType') in ('post', 'comment')
      and nullif(v_log.after_state ->> 'targetId', '') is not null then
      update public.admin_content_review_states
         set review_status = coalesce(v_restore_content, 'normal'),
             operator_note = nullif(v_log.before_state ->> 'operatorNote', ''),
             actor_label = v_actor,
             last_audit_id = v_audit_id,
             updated_at = timezone('utc', now())
       where target_type = v_log.after_state ->> 'targetType'
         and target_id = (v_log.after_state ->> 'targetId')::uuid;
    end if;
  elsif v_log.action_type = 'content_review_update' then
    v_target_uuid := v_log.target_id::uuid;
    select review_status, operator_note
      into v_current_review, v_current_note
    from public.admin_content_review_states
    where target_type = v_log.target_type
      and target_id = v_target_uuid;

    if coalesce(v_current_review, 'normal') <> coalesce(v_expected_review, 'normal') then
      insert into public.admin_operation_undo_links (audit_log_id, undo_status, undo_reason, actor_label)
      values (p_audit_log_id, 'conflict', 'current state differs from audited after_state', v_actor)
      on conflict (audit_log_id)
      do update set undo_status = 'conflict', undo_reason = excluded.undo_reason, actor_label = excluded.actor_label;
      raise exception 'NURI_OPS_UNDO_CONFLICT'
        using errcode = '40001';
    end if;

    v_audit_id := public.admin_write_operation_audit_v1(
      'operation_undo',
      v_actor,
      v_log.target_type,
      v_log.target_id,
      v_log.target_summary,
      jsonb_build_object('reviewStatus', v_current_review, 'operatorNote', v_current_note),
      jsonb_build_object('reviewStatus', coalesce(v_restore_review, 'normal'), 'operatorNote', nullif(v_log.before_state ->> 'operatorNote', '')),
      'undo_soft_action',
      v_note,
      v_log.risk_level,
      'succeeded',
      'soft action undo, hard delete 없음'
    );

    update public.admin_content_review_states
       set review_status = coalesce(v_restore_review, 'normal'),
           operator_note = nullif(v_log.before_state ->> 'operatorNote', ''),
           actor_label = v_actor,
           last_audit_id = v_audit_id,
           updated_at = timezone('utc', now())
     where target_type = v_log.target_type
       and target_id = v_target_uuid;
  elsif v_log.action_type = 'hospital_review_update' then
    select review_status, operator_note
      into v_current_review, v_current_note
    from public.admin_hospital_review_states
    where hospital_id = v_log.target_id;

    if coalesce(v_current_review, 'reviewing') <> coalesce(v_expected_review, 'reviewing') then
      insert into public.admin_operation_undo_links (audit_log_id, undo_status, undo_reason, actor_label)
      values (p_audit_log_id, 'conflict', 'current state differs from audited after_state', v_actor)
      on conflict (audit_log_id)
      do update set undo_status = 'conflict', undo_reason = excluded.undo_reason, actor_label = excluded.actor_label;
      raise exception 'NURI_OPS_UNDO_CONFLICT'
        using errcode = '40001';
    end if;

    v_audit_id := public.admin_write_operation_audit_v1(
      'operation_undo',
      v_actor,
      'hospital',
      v_log.target_id,
      v_log.target_summary,
      jsonb_build_object('reviewStatus', v_current_review, 'operatorNote', v_current_note),
      jsonb_build_object('reviewStatus', coalesce(v_restore_review, 'reviewing'), 'operatorNote', nullif(v_log.before_state ->> 'operatorNote', '')),
      'undo_soft_action',
      v_note,
      v_log.risk_level,
      'succeeded',
      'soft action undo, public-safe projection 유지'
    );

    update public.admin_hospital_review_states
       set review_status = coalesce(v_restore_review, 'reviewing'),
           operator_note = nullif(v_log.before_state ->> 'operatorNote', ''),
           actor_label = v_actor,
           last_audit_id = v_audit_id,
           updated_at = timezone('utc', now())
     where hospital_id = v_log.target_id;
  elsif v_log.action_type = 'user_review_update' then
    v_target_uuid := v_log.target_id::uuid;
    select review_status, operator_note
      into v_current_review, v_current_note
    from public.admin_user_review_states
    where user_id = v_target_uuid;

    if coalesce(v_current_review, 'normal') <> coalesce(v_expected_review, 'normal') then
      insert into public.admin_operation_undo_links (audit_log_id, undo_status, undo_reason, actor_label)
      values (p_audit_log_id, 'conflict', 'current state differs from audited after_state', v_actor)
      on conflict (audit_log_id)
      do update set undo_status = 'conflict', undo_reason = excluded.undo_reason, actor_label = excluded.actor_label;
      raise exception 'NURI_OPS_UNDO_CONFLICT'
        using errcode = '40001';
    end if;

    v_audit_id := public.admin_write_operation_audit_v1(
      'operation_undo',
      v_actor,
      'user',
      v_log.target_id,
      v_log.target_summary,
      jsonb_build_object('reviewStatus', v_current_review, 'operatorNote', v_current_note),
      jsonb_build_object('reviewStatus', coalesce(v_restore_review, 'normal'), 'operatorNote', nullif(v_log.before_state ->> 'operatorNote', '')),
      'undo_soft_action',
      v_note,
      v_log.risk_level,
      'succeeded',
      'soft action undo, 계정 삭제·권한 상승 없음'
    );

    update public.admin_user_review_states
       set review_status = coalesce(v_restore_review, 'normal'),
           operator_note = nullif(v_log.before_state ->> 'operatorNote', ''),
           actor_label = v_actor,
           last_audit_id = v_audit_id,
           updated_at = timezone('utc', now())
     where user_id = v_target_uuid;
  end if;

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
    actor_label = excluded.actor_label;

  return v_audit_id;
end;
$$;

revoke all on table public.admin_operation_undo_links from public, anon, authenticated;
grant select, insert, update on table public.admin_operation_undo_links to authenticated, service_role;

revoke all on function public.admin_update_report_review_v2(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_update_content_review_v2(text, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_review_hospital_v2(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_update_user_review_v2(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_get_operation_action_history_v1(text, text, integer)
  from public, anon, authenticated;
revoke all on function public.admin_get_operations_dashboard_summary_v1()
  from public, anon, authenticated;
revoke all on function public.admin_send_qa_user_notification_ops_v1(text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.admin_undo_operation_action_v1(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.admin_update_report_review_v2(uuid, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_update_content_review_v2(text, uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_review_hospital_v2(text, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_update_user_review_v2(uuid, text, text, text)
  to authenticated, service_role;
grant execute on function public.admin_get_operation_action_history_v1(text, text, integer)
  to authenticated, service_role;
grant execute on function public.admin_get_operations_dashboard_summary_v1()
  to authenticated, service_role;
grant execute on function public.admin_send_qa_user_notification_ops_v1(text, text, text, text, text, jsonb)
  to service_role;
grant execute on function public.admin_undo_operation_action_v1(uuid, text, text)
  to authenticated, service_role;

comment on function public.admin_get_operation_action_history_v1(text, text, integer)
  is 'Admin-only operation action history read model with sanitized before/after summaries and undo status.';
comment on function public.admin_undo_operation_action_v1(uuid, text, text)
  is 'Admin-only conflict-safe undo for soft operation overlay actions. It never restores hard-deleted data.';
comment on function public.admin_get_operations_dashboard_summary_v1()
  is 'Admin-only read-only operations dashboard summary with queue counts and no raw PII.';
comment on function public.admin_send_qa_user_notification_ops_v1(text, text, text, text, text, jsonb)
  is 'Server-only nuri-web ops console QA notification sender. It is limited to QA nicknames and does not enable broadcast or push.';

commit;

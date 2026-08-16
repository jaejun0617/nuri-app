begin;

-- NURI-09 community backend contract.
-- This migration is additive. It does not rewrite or delete existing content.

do $$
begin
  if to_regclass('public.posts') is null then
    raise exception 'community_posts_base_missing'
      using errcode = '42P01',
        detail = json_build_object(
          'app_code', 'community_posts_base_missing',
          'reason', 'The repository migration chain does not contain the remote posts baseline.'
        )::text;
  end if;
end
$$;

alter table public.posts
  add column if not exists is_notice boolean not null default false,
  add column if not exists notice_published_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_notice_published_at_consistency_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_notice_published_at_consistency_check
      check (
        (is_notice = true and notice_published_at is not null)
        or (is_notice = false and notice_published_at is null)
      );
  end if;
end
$$;

comment on column public.posts.is_notice is
  'Server-controlled community notice marker. Direct client writes are blocked by RLS and a BEFORE trigger.';

comment on column public.posts.notice_published_at is
  'UTC timestamp of the latest notice publication. It is server-controlled and null when unpublished.';

create index if not exists idx_posts_active_public_popular
  on public.posts (
    like_count desc,
    comment_count desc,
    created_at desc,
    id desc
  )
  where visibility = 'public'
    and status = 'active'
    and deleted_at is null
    and like_count >= 10;

create index if not exists idx_posts_active_public_notice
  on public.posts (
    notice_published_at desc,
    created_at desc,
    id desc
  )
  where visibility = 'public'
    and status = 'active'
    and deleted_at is null
    and is_notice = true;

-- The existing operator catalog is nuri-web oriented. This seed adds one narrow
-- capability to the fixed adminQA actor label without granting admin/super_admin.
-- It is permission metadata only; no auth account, post, like, or notice row is created.
insert into public.admin_operator_role_assignments (
  actor_label,
  role_key,
  capabilities,
  is_active,
  assigned_by,
  operator_note
)
values (
  'adminQA',
  'operator',
  array['community_notice_operator']::text[],
  true,
  'NURI-09',
  'Community notice capability only. No global admin or super_admin privilege.'
)
on conflict (actor_label)
do update set
  capabilities = (
    select array(
      select distinct capability
      from unnest(
        public.admin_operator_role_assignments.capabilities
        || excluded.capabilities
      ) as capability
      order by capability
    )
  ),
  updated_at = timezone('utc', now());

insert into public.admin_action_policies (
  action_type,
  required_capability,
  risk_level,
  approval_required,
  rollback_supported,
  is_disabled,
  policy_note
)
values
  ('community_notice_create', 'community_notice_operator', 'medium', false, true, false, 'Create a community notice through the operator RPC.'),
  ('community_notice_update', 'community_notice_operator', 'medium', false, true, false, 'Update notice content through the operator RPC.'),
  ('community_notice_publish', 'community_notice_operator', 'medium', false, true, false, 'Publish or republish a notice through the operator RPC.'),
  ('community_notice_unpublish', 'community_notice_operator', 'medium', false, true, false, 'Remove the notice marker without deleting the post.'),
  ('community_notice_hide', 'community_notice_operator', 'high', false, true, false, 'Hide a notice without deleting the source row.')
on conflict (action_type)
do update set
  required_capability = excluded.required_capability,
  risk_level = excluded.risk_level,
  approval_required = excluded.approval_required,
  rollback_supported = excluded.rollback_supported,
  is_disabled = excluded.is_disabled,
  policy_note = excluded.policy_note,
  updated_at = timezone('utc', now());

create or replace function public.is_community_notice_operator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.is_nuri_ops_admin_v1()
    or exists (
      select 1
      from public.profiles p
      join public.admin_operator_role_assignments a
        on lower(a.actor_label) = lower(p.nickname)
      where p.user_id = auth.uid()
        and a.is_active = true
        and 'community_notice_operator' = any(a.capabilities)
    );
$$;

revoke all on function public.is_community_notice_operator() from public, anon, authenticated;
grant execute on function public.is_community_notice_operator() to service_role;

create or replace function public.raise_community_notice_error(
  p_app_code text,
  p_sqlstate text default 'P0001',
  p_hint text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  raise exception using
    errcode = p_sqlstate,
    message = p_app_code,
    detail = json_build_object('app_code', p_app_code)::text,
    hint = p_hint;
end;
$$;

revoke all on function public.raise_community_notice_error(text, text, text)
  from public, anon, authenticated;

-- Public post writes may continue to use the normal post policies, but the
-- notice columns must remain server-controlled even if a caller adds them to
-- an otherwise valid payload.
create or replace function public.guard_community_notice_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  notice_fields_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    notice_fields_changed := coalesce(new.is_notice, false)
      or new.notice_published_at is not null;
  else
    notice_fields_changed := new.is_notice is distinct from old.is_notice
      or new.notice_published_at is distinct from old.notice_published_at;
  end if;

  if not notice_fields_changed then
    return new;
  end if;

  if not public.is_community_notice_operator() then
    perform public.raise_community_notice_error(
      'community_notice_write_forbidden',
      '42501',
      'Use the approved community notice operator contract.'
    );
  end if;

  if new.is_notice then
    new.notice_published_at := coalesce(
      new.notice_published_at,
      timezone('utc', now())
    );
  else
    new.notice_published_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_community_notice_fields() from public, anon, authenticated;

drop trigger if exists trg_guard_community_notice_insert on public.posts;
create trigger trg_guard_community_notice_insert
before insert on public.posts
for each row execute function public.guard_community_notice_fields();

drop trigger if exists trg_guard_community_notice_update on public.posts;
create trigger trg_guard_community_notice_update
before update of is_notice, notice_published_at on public.posts
for each row execute function public.guard_community_notice_fields();

-- Replace the permissive post write policies with policies that keep notice
-- fields out of the ordinary client write path. The operator RPC is SECURITY
-- DEFINER and therefore does not depend on these broad policies.
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own
on public.posts
for insert
to public
with check (
  auth.uid() = user_id
  and (
    public.is_community_admin()
    or (is_notice = false and notice_published_at is null)
  )
);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts
for update
to public
using (auth.uid() = user_id or public.is_community_admin())
with check (
  public.is_community_admin()
  or (
    auth.uid() = user_id
    and is_notice = false
    and notice_published_at is null
  )
);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
on public.posts
for delete
to public
using (
  public.is_community_admin()
  or (auth.uid() = user_id and is_notice = false)
);

-- The old public status helper was a SECURITY DEFINER data-mutation surface.
-- Keep its signature for the existing admin moderation RPC, but move the actual
-- mutation into an ungranted internal helper used by the moderation refresh path.
create or replace function public._set_community_target_status_internal(
  p_target_type text,
  p_target_id uuid,
  p_after_status text,
  p_action_type text,
  p_reason_code text default null,
  p_source_report_id uuid default null,
  p_memo text default null,
  p_actor_id uuid default null,
  p_queue_status text default null,
  p_decision text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_before_status text := null;
  v_trimmed_memo text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  if p_target_type not in ('post', 'comment') then
    perform public.raise_community_notice_error(
      'community_moderation_target_invalid',
      '22023'
    );
  end if;

  if p_target_type = 'post' then
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted', 'banned') then
      perform public.raise_community_notice_error(
        'community_moderation_post_status_invalid',
        '22023'
      );
    end if;

    select status into v_before_status
    from public.posts
    where id = p_target_id;

    if v_before_status is null then
      perform public.raise_community_notice_error(
        'community_moderation_post_not_found',
        '02000'
      );
    end if;

    update public.posts
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      moderated_at = v_now,
      moderated_by = p_actor_id,
      operator_memo = coalesce(v_trimmed_memo, operator_memo)
    where id = p_target_id;
  else
    if p_after_status not in ('active', 'hidden', 'auto_hidden', 'deleted') then
      perform public.raise_community_notice_error(
        'community_moderation_comment_status_invalid',
        '22023'
      );
    end if;

    select status into v_before_status
    from public.comments
    where id = p_target_id;

    if v_before_status is null then
      perform public.raise_community_notice_error(
        'community_moderation_comment_not_found',
        '02000'
      );
    end if;

    update public.comments
    set
      status = p_after_status,
      deleted_at = case
        when p_after_status = 'deleted' then coalesce(deleted_at, v_now)
        else null
      end,
      updated_at = v_now
    where id = p_target_id;
  end if;

  insert into public.community_moderation_actions (
    action_type,
    actor_id,
    target_type,
    target_id,
    before_status,
    after_status,
    source_report_id,
    reason_code,
    memo
  )
  values (
    p_action_type,
    p_actor_id,
    p_target_type,
    p_target_id,
    v_before_status,
    p_after_status,
    p_source_report_id,
    p_reason_code,
    v_trimmed_memo
  );

  update public.community_moderation_queue
  set
    content_status_snapshot = p_after_status,
    queue_status = coalesce(p_queue_status, queue_status),
    decision = coalesce(p_decision, decision),
    decision_reason = coalesce(p_reason_code, decision_reason),
    operator_memo = coalesce(v_trimmed_memo, operator_memo),
    resolved_at = case
      when coalesce(p_queue_status, queue_status) = 'resolved' or p_decision is not null
        then coalesce(resolved_at, v_now)
      else resolved_at
    end,
    updated_at = v_now
  where target_type = p_target_type
    and target_id = p_target_id;

  return v_before_status;
end;
$$;

revoke all on function public._set_community_target_status_internal(text, uuid, text, text, text, uuid, text, uuid, text, text)
  from public, anon, authenticated;

create or replace function public.set_community_target_status(
  p_target_type text,
  p_target_id uuid,
  p_after_status text,
  p_action_type text,
  p_reason_code text default null,
  p_source_report_id uuid default null,
  p_memo text default null,
  p_actor_id uuid default null,
  p_queue_status text default null,
  p_decision text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_community_admin() then
    perform public.raise_community_notice_error(
      'community_moderation_operator_required',
      '42501'
    );
  end if;

  return public._set_community_target_status_internal(
    p_target_type,
    p_target_id,
    p_after_status,
    p_action_type,
    p_reason_code,
    p_source_report_id,
    p_memo,
    auth.uid(),
    p_queue_status,
    p_decision
  );
end;
$$;

revoke all on function public.set_community_target_status(text, uuid, text, text, text, uuid, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_community_target_status(text, uuid, text, text, text, uuid, text, uuid, text, text)
  to service_role;

-- Keep report-triggered automatic moderation working without reopening the
-- public status helper. Only the internal helper is used for threshold actions.
create or replace function public.refresh_community_moderation_queue(
  p_target_type text,
  p_target_id uuid,
  p_source_report_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_current_status text := null;
  v_report_count integer := 0;
  v_unique_reporter_count integer := 0;
  v_latest_reported_at timestamptz := null;
  v_has_personal_info boolean := false;
  v_has_hate boolean := false;
  v_priority integer := 0;
begin
  if p_target_type = 'post' then
    select status into v_current_status
    from public.posts
    where id = p_target_id;
  elsif p_target_type = 'comment' then
    select status into v_current_status
    from public.comments
    where id = p_target_id;
  else
    return;
  end if;

  if v_current_status is null then
    return;
  end if;

  select
    count(*),
    count(distinct reporter_id),
    max(created_at),
    coalesce(bool_or(reason_category = 'personal_info'), false),
    coalesce(bool_or(reason_category = 'hate'), false)
  into
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    v_has_personal_info,
    v_has_hate
  from public.reports
  where target_type = p_target_type
    and target_id = p_target_id
    and public.is_active_community_report_status(status);

  if v_report_count = 0 then
    update public.community_moderation_queue
    set
      report_count = 0,
      unique_reporter_count = 0,
      latest_reported_at = null,
      content_status_snapshot = v_current_status,
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
    return;
  end if;

  v_priority := (
    case
      when v_has_personal_info or v_has_hate then 400
      when v_current_status = 'auto_hidden' then 300
      else 100
    end
  ) + least(v_unique_reporter_count, 99);

  insert into public.community_moderation_queue (
    target_type,
    target_id,
    content_status_snapshot,
    report_count,
    unique_reporter_count,
    latest_reported_at,
    queue_status,
    priority
  )
  values (
    p_target_type,
    p_target_id,
    v_current_status,
    v_report_count,
    v_unique_reporter_count,
    v_latest_reported_at,
    'open',
    v_priority
  )
  on conflict (target_type, target_id) do update
  set
    content_status_snapshot = excluded.content_status_snapshot,
    report_count = excluded.report_count,
    unique_reporter_count = excluded.unique_reporter_count,
    latest_reported_at = excluded.latest_reported_at,
    queue_status = case
      when public.community_moderation_queue.queue_status = 'resolved' then 'open'
      else public.community_moderation_queue.queue_status
    end,
    decision = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision
    end,
    decision_reason = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.decision_reason
    end,
    resolved_at = case
      when public.community_moderation_queue.queue_status = 'resolved' then null
      else public.community_moderation_queue.resolved_at
    end,
    priority = excluded.priority,
    updated_at = v_now;

  if p_target_type = 'post'
     and v_unique_reporter_count >= 3
     and v_current_status = 'active'
  then
    perform public._set_community_target_status_internal(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  elsif p_target_type = 'comment'
     and v_unique_reporter_count >= 2
     and v_current_status = 'active'
  then
    perform public._set_community_target_status_internal(
      p_target_type,
      p_target_id,
      'auto_hidden',
      'auto_hide',
      'auto_hide_threshold',
      p_source_report_id,
      '신고 누적 기준으로 자동 숨김 처리됐어요.',
      null,
      'open',
      null
    );

    update public.community_moderation_queue
    set
      content_status_snapshot = 'auto_hidden',
      priority = greatest(priority, 300 + least(v_unique_reporter_count, 99)),
      updated_at = v_now
    where target_type = p_target_type
      and target_id = p_target_id;
  end if;
end;
$$;

-- refresh is still callable by the existing report-trigger path. It cannot call
-- the public status helper anymore; only its deterministic threshold path can
-- mutate content status.
grant execute on function public.refresh_community_moderation_queue(text, uuid, uuid) to authenticated, anon, service_role;

create or replace function public.apply_community_moderation_action(
  p_target_type text,
  p_target_id uuid,
  p_after_status text,
  p_reason_code text default null,
  p_source_report_id uuid default null,
  p_operator_memo text default null,
  p_queue_status text default 'resolved',
  p_report_status text default null,
  p_decision text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_next_report_status text := coalesce(
    p_report_status,
    case
      when p_after_status = 'active' then 'resolved_no_action'
      else 'resolved_actioned'
    end
  );
begin
  if not public.is_community_admin() then
    perform public.raise_community_notice_error(
      'community_moderation_operator_required',
      '42501'
    );
  end if;

  perform public.set_community_target_status(
    p_target_type,
    p_target_id,
    p_after_status,
    case
      when p_after_status = 'active' then 'restore'
      else 'manual_moderation'
    end,
    p_reason_code,
    p_source_report_id,
    p_operator_memo,
    auth.uid(),
    p_queue_status,
    coalesce(
      p_decision,
      case
        when p_after_status = 'active' then 'restored'
        else p_after_status
      end
    )
  );

  if p_source_report_id is not null then
    update public.reports
    set
      status = v_next_report_status,
      resolved_by = auth.uid(),
      resolved_at = v_now,
      operator_memo = coalesce(nullif(btrim(coalesce(p_operator_memo, '')), ''), operator_memo)
    where id = p_source_report_id;
  end if;
end;
$$;

revoke all on function public.apply_community_moderation_action(text, uuid, text, text, uuid, text, text, text, text)
  from public, anon;
grant execute on function public.apply_community_moderation_action(text, uuid, text, text, uuid, text, text, text, text)
  to authenticated, service_role;

create or replace function public.community_notice_mutate_v1(
  p_action text,
  p_post_id uuid default null,
  p_title text default null,
  p_content text default null,
  p_category text default null
)
returns table (
  post_id uuid,
  action_type text,
  status text,
  is_notice boolean,
  notice_published_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action text := lower(nullif(btrim(coalesce(p_action, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
  v_post public.posts%rowtype;
  v_actor_label text;
  v_before_state jsonb := '{}'::jsonb;
  v_after_state jsonb := '{}'::jsonb;
  v_audit_id uuid;
begin
  if not public.is_community_notice_operator() then
    perform public.raise_community_notice_error(
      'community_notice_operator_required',
      '42501'
    );
  end if;

  if v_action not in (
    'create',
    'update',
    'publish',
    'unpublish',
    'hide'
  ) then
    perform public.raise_community_notice_error(
      'community_notice_action_invalid',
      '22023'
    );
  end if;

  if v_category is not null and v_category not in ('free', 'question', 'info', 'daily') then
    perform public.raise_community_notice_error(
      'community_notice_category_invalid',
      '22023'
    );
  end if;

  if v_action = 'create' then
    if v_title is null then
      perform public.raise_community_notice_error(
        'community_notice_title_required',
        '22023'
      );
    end if;
    if v_content is null then
      perform public.raise_community_notice_error(
        'community_notice_content_required',
        '22023'
      );
    end if;

    insert into public.posts (
      user_id,
      visibility,
      title,
      content,
      category,
      status,
      is_notice,
      notice_published_at
    )
    values (
      auth.uid(),
      'public',
      v_title,
      v_content,
      v_category,
      'active',
      true,
      timezone('utc', now())
    )
    returning * into v_post;

    v_after_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );
  else
    if p_post_id is null then
      perform public.raise_community_notice_error(
        'community_notice_post_required',
        '22023'
      );
    end if;

    select * into v_post
    from public.posts
    where id = p_post_id
    for update;

    if not found then
      perform public.raise_community_notice_error(
        'community_notice_post_not_found',
        '02000'
      );
    end if;

    if v_post.deleted_at is not null or v_post.status in ('deleted', 'banned') then
      perform public.raise_community_notice_error(
        'community_notice_post_invalid_state',
        '22023'
      );
    end if;

    v_before_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );

    if v_action = 'update' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error(
          'community_notice_post_not_published',
          '22023'
        );
      end if;
      if p_title is not null and v_title is null then
        perform public.raise_community_notice_error(
          'community_notice_title_required',
          '22023'
        );
      end if;
      if p_content is not null and v_content is null then
        perform public.raise_community_notice_error(
          'community_notice_content_required',
          '22023'
        );
      end if;

      update public.posts
      set
        title = coalesce(v_title, title),
        content = coalesce(v_content, content),
        category = case when p_category is null then category else v_category end
      where id = p_post_id
      returning * into v_post;
    elsif v_action = 'publish' then
      update public.posts
      set
        visibility = 'public',
        status = 'active',
        deleted_at = null,
        is_notice = true,
        notice_published_at = coalesce(notice_published_at, timezone('utc', now()))
      where id = p_post_id
      returning * into v_post;
    elsif v_action = 'unpublish' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error(
          'community_notice_post_not_published',
          '22023'
        );
      end if;

      update public.posts
      set
        is_notice = false,
        notice_published_at = null
      where id = p_post_id
      returning * into v_post;
    elsif v_action = 'hide' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error(
          'community_notice_post_not_published',
          '22023'
        );
      end if;

      update public.posts
      set
        status = 'hidden',
        moderated_at = timezone('utc', now()),
        moderated_by = auth.uid(),
        operator_memo = coalesce(operator_memo, 'community_notice_hide')
      where id = p_post_id
      returning * into v_post;
    end if;

    v_after_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );
  end if;

  select coalesce(nullif(btrim(p.nickname), ''), 'community_notice_operator')
  into v_actor_label
  from public.profiles p
  where p.user_id = auth.uid();
  v_actor_label := coalesce(v_actor_label, 'community_notice_operator');

  insert into public.admin_operation_audit_logs (
    action_type,
    actor_label,
    target_type,
    target_id,
    target_summary,
    before_state,
    after_state,
    reason,
    risk_level,
    status,
    metadata_summary
  )
  values (
    'community_notice_' || v_action,
    v_actor_label,
    'post',
    v_post.id::text,
    'Community notice post',
    v_before_state,
    v_after_state,
    'community_notice_operator',
    case when v_action = 'hide' then 'high' else 'medium' end,
    'succeeded',
    'Capability-guarded NURI-09 notice mutation.'
  )
  returning id into v_audit_id;

  return query
  select
    v_post.id,
    'community_notice_' || v_action,
    v_post.status,
    v_post.is_notice,
    v_post.notice_published_at;
end;
$$;

revoke all on function public.community_notice_mutate_v1(text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.community_notice_mutate_v1(text, uuid, text, text, text)
  to authenticated, service_role;

create or replace function public.community_post_public_projection(p_post public.posts)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'id', p_post.id,
    'user_id', p_post.user_id,
    'pet_id', p_post.pet_id,
    'visibility', p_post.visibility,
    'content', p_post.content,
    'image_url', p_post.image_url,
    'status', p_post.status,
    'category', p_post.category,
    'like_count', p_post.like_count,
    'comment_count', p_post.comment_count,
    'view_count', p_post.view_count,
    'deleted_at', p_post.deleted_at,
    'created_at', p_post.created_at,
    'updated_at', p_post.updated_at,
    'title', p_post.title,
    'image_urls', p_post.image_urls,
    'author_snapshot_nickname', p_post.author_snapshot_nickname,
    'author_snapshot_avatar_url', p_post.author_snapshot_avatar_url,
    'pet_snapshot_name', p_post.pet_snapshot_name,
    'pet_snapshot_species', p_post.pet_snapshot_species,
    'pet_snapshot_breed', p_post.pet_snapshot_breed,
    'pet_snapshot_age_label', p_post.pet_snapshot_age_label,
    'pet_snapshot_avatar_path', p_post.pet_snapshot_avatar_path,
    'show_pet_age', p_post.show_pet_age,
    'is_notice', p_post.is_notice,
    'notice_published_at', p_post.notice_published_at
  );
$$;

revoke all on function public.community_post_public_projection(public.posts) from public, anon, authenticated;

create or replace function public.community_list_posts_v1(
  p_filter text default 'all',
  p_limit integer default 30,
  p_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_filter text := lower(nullif(btrim(coalesce(p_filter, 'all')), ''));
  v_limit integer := coalesce(p_limit, 30);
  v_cursor_filter text;
  v_cursor_limit integer;
  v_cursor_id uuid;
  v_cursor_created_at timestamptz;
  v_cursor_notice_published_at timestamptz;
  v_cursor_like_count integer;
  v_cursor_comment_count integer;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_next_cursor jsonb := null;
begin
  if v_filter not in ('all', 'popular', 'notice') then
    perform public.raise_community_notice_error('community_filter_invalid', '22023');
  end if;

  if v_limit not in (30, 50, 100, 150, 200) then
    perform public.raise_community_notice_error('community_page_size_invalid', '22023');
  end if;

  if p_cursor is not null then
    if jsonb_typeof(p_cursor) <> 'object' then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    begin
      v_cursor_filter := p_cursor->>'filter';
      v_cursor_limit := (p_cursor->>'pageSize')::integer;
      v_cursor_id := (p_cursor->>'id')::uuid;
      v_cursor_created_at := (p_cursor->>'createdAt')::timestamptz;

      if v_filter <> v_cursor_filter or v_limit <> v_cursor_limit then
        perform public.raise_community_notice_error('community_cursor_invalid', '22023');
      end if;

      if v_filter = 'popular' then
        v_cursor_like_count := (p_cursor->>'likeCount')::integer;
        v_cursor_comment_count := (p_cursor->>'commentCount')::integer;
      elsif v_filter = 'notice' then
        v_cursor_notice_published_at := (p_cursor->>'noticePublishedAt')::timestamptz;
      end if;
    exception when others then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end;
  end if;

  if v_filter = 'all' then
    with page as (
      select p as row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
        and not exists (
          select 1
          from auth.users u
          where u.id = p.user_id
            and (
              u.deleted_at is not null
              or (u.banned_until is not null and u.banned_until > timezone('utc', now()))
            )
        )
        and (
          p_cursor is null
          or p.created_at < v_cursor_created_at
          or (p.created_at = v_cursor_created_at and p.id < v_cursor_id)
        )
      order by p.created_at desc, p.id desc
      limit v_limit + 1
    )
    select
      coalesce((
        select jsonb_agg(public.community_post_public_projection(visible.row) order by visible.row.created_at desc, visible.row.id desc)
        from (select row from page limit v_limit) visible
      ), '[]'::jsonb),
      (select count(*) > v_limit from page),
      (select jsonb_build_object(
        'filter', 'all',
        'pageSize', v_limit,
        'createdAt', last_row.row.created_at,
        'id', last_row.row.id
      ) from (select row from page offset greatest(v_limit - 1, 0) limit 1) last_row)
    into v_items, v_has_more, v_next_cursor;
  elsif v_filter = 'popular' then
    with page as (
      select p as row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
        and p.like_count >= 10
        and not exists (
          select 1
          from auth.users u
          where u.id = p.user_id
            and (
              u.deleted_at is not null
              or (u.banned_until is not null and u.banned_until > timezone('utc', now()))
            )
        )
        and (
          p_cursor is null
          or p.like_count < v_cursor_like_count
          or (p.like_count = v_cursor_like_count and p.comment_count < v_cursor_comment_count)
          or (p.like_count = v_cursor_like_count and p.comment_count = v_cursor_comment_count and p.created_at < v_cursor_created_at)
          or (p.like_count = v_cursor_like_count and p.comment_count = v_cursor_comment_count and p.created_at = v_cursor_created_at and p.id < v_cursor_id)
        )
      order by p.like_count desc, p.comment_count desc, p.created_at desc, p.id desc
      limit v_limit + 1
    )
    select
      coalesce((
        select jsonb_agg(public.community_post_public_projection(visible.row) order by visible.row.like_count desc, visible.row.comment_count desc, visible.row.created_at desc, visible.row.id desc)
        from (select row from page limit v_limit) visible
      ), '[]'::jsonb),
      (select count(*) > v_limit from page),
      (select jsonb_build_object(
        'filter', 'popular',
        'pageSize', v_limit,
        'likeCount', last_row.row.like_count,
        'commentCount', last_row.row.comment_count,
        'createdAt', last_row.row.created_at,
        'id', last_row.row.id
      ) from (select row from page offset greatest(v_limit - 1, 0) limit 1) last_row)
    into v_items, v_has_more, v_next_cursor;
  else
    with page as (
      select p as row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
        and p.is_notice = true
        and not exists (
          select 1
          from auth.users u
          where u.id = p.user_id
            and (
              u.deleted_at is not null
              or (u.banned_until is not null and u.banned_until > timezone('utc', now()))
            )
        )
        and (
          p_cursor is null
          or p.notice_published_at < v_cursor_notice_published_at
          or (p.notice_published_at = v_cursor_notice_published_at and p.created_at < v_cursor_created_at)
          or (p.notice_published_at = v_cursor_notice_published_at and p.created_at = v_cursor_created_at and p.id < v_cursor_id)
        )
      order by p.notice_published_at desc, p.created_at desc, p.id desc
      limit v_limit + 1
    )
    select
      coalesce((
        select jsonb_agg(public.community_post_public_projection(visible.row) order by visible.row.notice_published_at desc, visible.row.created_at desc, visible.row.id desc)
        from (select row from page limit v_limit) visible
      ), '[]'::jsonb),
      (select count(*) > v_limit from page),
      (select jsonb_build_object(
        'filter', 'notice',
        'pageSize', v_limit,
        'noticePublishedAt', last_row.row.notice_published_at,
        'createdAt', last_row.row.created_at,
        'id', last_row.row.id
      ) from (select row from page offset greatest(v_limit - 1, 0) limit 1) last_row)
    into v_items, v_has_more, v_next_cursor;
  end if;

  if not v_has_more then
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_items,
    'hasMore', v_has_more,
    'nextCursor', v_next_cursor,
    'pageSize', v_limit,
    'filter', v_filter
  );
end;
$$;

revoke all on function public.community_list_posts_v1(text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.community_list_posts_v1(text, integer, jsonb)
  to anon, authenticated, service_role;

comment on function public.community_list_posts_v1(text, integer, jsonb)
  is 'Public community list contract. Enforces all/popular/notice filters, active public non-deleted visibility, author account status, keyset cursors, and page sizes 30/50/100/150/200.';

comment on function public.community_notice_mutate_v1(text, uuid, text, text, text)
  is 'Capability-guarded community notice create/update/publish/unpublish/hide RPC. Writes sanitized admin operation audit rows.';

commit;

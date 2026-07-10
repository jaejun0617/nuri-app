begin;

create or replace function public.admin_send_qa_user_notification_v1(
  p_target_nickname text,
  p_title text,
  p_body text,
  p_type text default 'notice',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_key text := lower(nullif(btrim(coalesce(p_target_nickname, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_type text := nullif(btrim(coalesce(p_type, 'notice')), '');
  v_target_user_id uuid;
  v_target_count integer;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_actor_id is null or not public.is_nuri_notification_admin_v1() then
    raise exception 'NURI_ADMIN_REQUIRED'
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

  if v_title is null or v_body is null then
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

  return public.admin_send_user_notification_v1(
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
      'qa_single_user'
    )
  );
end;
$$;

create or replace function public.admin_notification_audit_feed_v1(
  p_limit integer default 20
)
returns table (
  created_at timestamptz,
  action text,
  target_label text,
  notification_title text,
  notification_type text,
  send_status text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  if auth.uid() is null or not public.is_nuri_notification_admin_v1() then
    raise exception 'NURI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  return query
  select
    l.created_at,
    l.action,
    case
      when lower(coalesce(p.nickname::text, '')) in (
        'adminqa',
        'adminqa3',
        'adminqa4',
        'adminqa5',
        'adminqa6',
        'adminqa7',
        'adminqa8'
      )
        then p.nickname::text
      when l.target_user_id is null
        then 'QA 대상'
      else '관리 대상'
    end as target_label,
    coalesce(c.title, '') as notification_title,
    coalesce(c.notification_type, '') as notification_type,
    coalesce(c.send_status, '') as send_status
  from public.admin_notification_audit_logs l
  left join public.admin_notification_campaigns c
    on c.id = l.campaign_id
  left join public.profiles p
    on p.user_id = l.target_user_id
  order by l.created_at desc
  limit v_limit;
end;
$$;

comment on function public.admin_send_qa_user_notification_v1(text, text, text, text, jsonb)
  is 'Admin-only QA-target notification sender for the separated admin console. Uses account_deletion_requests, not a profiles.deleted_at assumption, for pending-deletion exclusion.';

commit;

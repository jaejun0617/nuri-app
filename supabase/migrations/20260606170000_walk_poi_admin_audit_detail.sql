begin;

set local search_path = public, extensions;

-- V1.1 walk POI admin audit detail:
-- - Adds an admin-only drill-down endpoint for the app admin UI.
-- - Does not expose source raw payload, provider token, or secret values.
-- - Public read path and existing summary RPC remain unchanged.

create or replace function public.walk_poi_admin_audit_detail_v1(
  p_audit_log_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_detail jsonb;
begin
  if not public.is_walk_poi_admin() then
    raise exception 'WALK_POI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', l.id,
    'walkPoiId', l.walk_poi_id,
    'sourceRecordId', l.source_record_id,
    'name', w.canonical_name,
    'actionType', l.action_type,
    'note', l.note,
    'createdAt', l.created_at,
    'actorId', l.actor_id,
    'beforeState', jsonb_build_object(
      'reviewStatus', l.before_state ->> 'reviewStatus',
      'visibilityStatus', l.before_state ->> 'visibilityStatus',
      'lifecycleStatus', l.before_state ->> 'lifecycleStatus'
    ),
    'afterState', jsonb_build_object(
      'reviewStatus', l.after_state ->> 'reviewStatus',
      'visibilityStatus', l.after_state ->> 'visibilityStatus',
      'lifecycleStatus', l.after_state ->> 'lifecycleStatus'
    )
  )
  into v_detail
  from public.walk_poi_audit_logs l
  left join public.walk_pois w on w.id = l.walk_poi_id
  where l.id = p_audit_log_id;

  if v_detail is null then
    raise exception 'WALK_POI_AUDIT_LOG_NOT_FOUND'
      using errcode = '02000';
  end if;

  return v_detail;
end;
$$;

comment on function public.walk_poi_admin_audit_detail_v1(bigint)
  is 'Admin-only safe audit log detail for V1.1 walk POI review UI. Excludes raw source payloads and provider secrets.';

revoke all on function public.walk_poi_admin_audit_detail_v1(bigint) from public;
grant execute on function public.walk_poi_admin_audit_detail_v1(bigint)
  to authenticated, service_role;

commit;

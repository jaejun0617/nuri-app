begin;
revoke execute on function public.bump_community_reporter_rate_limit(uuid) from public, anon, authenticated;
revoke execute on function public.bump_community_reporter_rejected_abuse(uuid) from public, anon, authenticated;
grant execute on function public.bump_community_reporter_rate_limit(uuid) to service_role;
grant execute on function public.bump_community_reporter_rejected_abuse(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.guard_community_report_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_id uuid := auth.uid();
  recent_10m_count integer := 0;
  recent_1d_count integer := 0;
  target_owner_id uuid := null;
  target_status text := null;
  target_deleted_at timestamptz := null;
begin
  perform public.assert_community_actor_is_active();
  perform pg_advisory_xact_lock(hashtextextended('community-report:' || actor_id::text, 0));
  new.created_at := now();
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  new.operator_memo := null;

  if actor_id is null or new.reporter_id is distinct from actor_id then
    raise exception '본인 계정으로만 신고할 수 있어요.';
  end if;

  if new.target_type = 'post' then
    select p.user_id, p.status, p.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.posts p
    where p.id = new.target_id;
  elsif new.target_type = 'comment' then
    select c.user_id, c.status, c.deleted_at
    into target_owner_id, target_status, target_deleted_at
    from public.comments c
    where c.id = new.target_id;
  else
    raise exception '지원하지 않는 신고 대상입니다.';
  end if;

  if target_owner_id is null then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if target_owner_id = actor_id then
    raise exception '본인이 작성한 글이나 댓글은 신고할 수 없어요.';
  end if;

  if target_deleted_at is not null or target_status <> 'active' then
    raise exception '신고 대상이 이미 삭제되었거나 존재하지 않아요.';
  end if;

  if exists (
    select 1
    from public.reports r
    where r.reporter_id = actor_id
      and r.target_type = new.target_type
      and r.target_id = new.target_id
  ) then
    return new;
  end if;

  select count(*)
  into recent_10m_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '10 minutes';

  select count(*)
  into recent_1d_count
  from public.reports r
  where r.reporter_id = actor_id
    and r.created_at >= timezone('utc', now()) - interval '1 day';

  if recent_10m_count >= 5 or recent_1d_count >= 20 then
    raise exception using errcode = 'PGR01', message = '신고는 10분에 5건, 하루에 20건까지 접수할 수 있어요. 잠시 후 다시 시도해 주세요.';
  end if;

  new.status := coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'open');
  new.reason := btrim(coalesce(new.reason, ''));
  return new;
end;
$function$;

-- Catch the rejected insert in a subtransaction so the trusted trace can commit.
create or replace function public.community_submit_report_v1(
  p_target_type text, p_target_id uuid, p_reason_category text, p_reason text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception using errcode = '42501', message = 'not_authenticated'; end if;
  perform public.assert_community_actor_is_active();
  begin
    insert into public.reports(reporter_id,target_type,target_id,reason_category,reason,status)
    values(v_actor,p_target_type,p_target_id,p_reason_category,btrim(p_reason),'open');
  exception
    when unique_violation then return jsonb_build_object('status','duplicate');
    when sqlstate 'PGR01' then
      perform public.bump_community_reporter_rate_limit(v_actor);
      return jsonb_build_object('status','rate_limited','code','COMMUNITY_REPORT_RATE_LIMITED');
  end;
  return jsonb_build_object('status','created');
end;
$$;
revoke all on function public.community_submit_report_v1(text,uuid,text,text) from public, anon, service_role;
grant execute on function public.community_submit_report_v1(text,uuid,text,text) to authenticated;
commit;

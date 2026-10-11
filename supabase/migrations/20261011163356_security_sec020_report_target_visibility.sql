begin;

CREATE OR REPLACE FUNCTION public.guard_community_report_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := auth.uid();
  recent_10m_count integer := 0;
  recent_1d_count integer := 0;
  target_owner_id uuid := null;
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

  -- Use the same public-post eligibility as discussion reads, not the
  -- SECURITY DEFINER owner's unrestricted SELECT visibility.
  if new.target_type = 'post' then
    select p.user_id into target_owner_id
    from public.posts p
    where p.id = new.target_id
      and private.community_parent_post_visible_to_current_user(p.id);
  elsif new.target_type = 'comment' then
    select c.user_id into target_owner_id
    from public.comments c
    where c.id = new.target_id
      and c.status = 'active' and c.deleted_at is null
      and private.community_parent_post_visible_to_current_user(c.post_id)
      and (c.parent_comment_id is null or exists (
        select 1 from public.comments parent
        where parent.id = c.parent_comment_id and parent.post_id = c.post_id
          and parent.parent_comment_id is null
          and parent.status = 'active' and parent.deleted_at is null
      ))
      and not exists (
        select 1 from public.community_user_blocks b
        where (b.blocker_user_id = actor_id and b.blocked_user_id = c.user_id)
           or (b.blocker_user_id = c.user_id and b.blocked_user_id = actor_id)
      );
  end if;

  -- Do not disclose whether a UUID exists, is private, hidden, or deleted.
  if target_owner_id is null then
    raise exception using errcode = 'PGR02',
      message = '현재 신고할 수 없는 대상이에요.',
      detail = '{"app_code":"community_report_target_unavailable"}';
  end if;
  if target_owner_id = actor_id then
    raise exception '본인이 작성한 글이나 댓글은 신고할 수 없어요.';
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

commit;

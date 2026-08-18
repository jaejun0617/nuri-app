begin;

-- NURI-09 / COMMUNITY-DETAIL-001_COMMENT_DELETE_PERMISSION:
-- Keep the direct comments table RLS contract unchanged. A soft-deleted row
-- must disappear from the SELECT policy immediately, so owner deletion is
-- exposed through a minimal, owner-bound RPC instead of a representation-
-- returning UPDATE that collides with the protected read policy.
create or replace function public.community_soft_delete_comment_v1(
  p_comment_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or p_comment_id is null then
    raise exception using
      errcode = '42501',
      message = 'community_comment_delete_forbidden';
  end if;

  update public.comments as c
  set
    status = 'deleted',
    deleted_at = coalesce(c.deleted_at, timezone('utc', now()))
  where c.id = p_comment_id
    and c.user_id = v_actor_id
    and c.status = 'active'
    and c.deleted_at is null
    and private.community_parent_post_visible_to_current_user(c.post_id);

  if not found then
    raise exception using
      errcode = '42501',
      message = 'community_comment_delete_forbidden';
  end if;

  return true;
end;
$function$;

revoke all on function public.community_soft_delete_comment_v1(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.community_soft_delete_comment_v1(uuid)
  to authenticated;

commit;

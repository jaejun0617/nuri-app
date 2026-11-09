begin;

-- The privileged projection accepts comment IDs, never user IDs. Repeat the
-- visibility checks here because a role with private schema access can call it.
create function private.community_visible_comment_author_nicknames_v1(p_comment_ids uuid[])
returns table(comment_id uuid, nickname text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, pg_catalog.btrim(profile.nickname)
  from public.comments c
  join public.profiles profile on profile.user_id = c.user_id
  join auth.users author on author.id = c.user_id
  where pg_catalog.cardinality(p_comment_ids) between 1 and 100
    and c.id = any(p_comment_ids)
    and c.status = 'active' and c.deleted_at is null
    and private.community_parent_post_visible_to_current_user(c.post_id)
    and (c.parent_comment_id is null or exists (
      select 1 from public.comments root
      where root.id = c.parent_comment_id and root.post_id = c.post_id
        and root.parent_comment_id is null and root.status = 'active'
        and root.deleted_at is null
    ))
    and profile.nickname_confirmed is true
    and pg_catalog.btrim(profile.nickname) <> ''
    and author.deleted_at is null
    and (author.banned_until is null or author.banned_until <= pg_catalog.now())
    and (auth.uid() is null or not exists (
      select 1 from public.community_user_blocks b
      where (b.blocker_user_id = auth.uid() and b.blocked_user_id = c.user_id)
         or (b.blocker_user_id = c.user_id and b.blocked_user_id = auth.uid())
    ));
$$;

-- Keep the public entry point subject to the caller's current comments RLS.
create function public.community_get_comment_author_nicknames_v1(p_comment_ids uuid[])
returns table(comment_id uuid, nickname text)
language sql stable security invoker
set search_path = ''
as $$
  select projection.comment_id, projection.nickname
  from private.community_visible_comment_author_nicknames_v1(array(
    select c.id from public.comments c
    where pg_catalog.cardinality(p_comment_ids) between 1 and 100
      and c.id = any(p_comment_ids)
  )) projection;
$$;

revoke all on function private.community_visible_comment_author_nicknames_v1(uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.community_get_comment_author_nicknames_v1(uuid[])
  from public, anon, authenticated, service_role;
grant execute on function private.community_visible_comment_author_nicknames_v1(uuid[])
  to anon, authenticated;
grant execute on function public.community_get_comment_author_nicknames_v1(uuid[])
  to anon, authenticated;

commit;

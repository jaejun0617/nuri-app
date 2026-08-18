begin;

-- NURI-09 / COMMUNITY-DETAIL-001_COMMENT_VISIBILITY:
-- Keep the existing client-callable comments table path, but make its SELECT
-- policy inherit the protected parent-post visibility contract. The helper is
-- internal to policy evaluation; callers cannot execute it directly.
create or replace function public.community_parent_post_visible_to_current_user(
  p_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $function$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.visibility = 'public'
      and p.status = 'active'
      and p.deleted_at is null
      and (
        auth.uid() is null
        or not exists (
          select 1
          from public.community_user_blocks viewer_blocks
          where viewer_blocks.blocker_user_id = auth.uid()
            and viewer_blocks.blocked_user_id = p.user_id
        )
      )
      and (
        auth.uid() is null
        or not exists (
          select 1
          from public.community_user_blocks author_blocks
          where author_blocks.blocker_user_id = p.user_id
            and author_blocks.blocked_user_id = auth.uid()
        )
      )
      and not exists (
        select 1
        from auth.users u
        where u.id = p.user_id
          and (
            u.deleted_at is not null
            or (
              u.banned_until is not null
              and u.banned_until > timezone('utc', now())
            )
          )
      )
  );
$function$;

revoke all on function public.community_parent_post_visible_to_current_user(uuid)
  from public, anon, authenticated, service_role;

drop policy comments_select_by_post_visibility on public.comments;

create policy comments_select_by_post_visibility
  on public.comments
  for select
  to public
  using (
    status = 'active'
    and deleted_at is null
    and public.community_parent_post_visible_to_current_user(post_id)
  );

commit;

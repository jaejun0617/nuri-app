begin;

-- The first parent-visibility migration correctly removed the public helper's
-- direct EXECUTE grant, but a public-schema RLS policy still needs an
-- invocable function while it evaluates a client query. Keep the helper out
-- of PostgREST's public schema and grant only the roles that need to evaluate
-- the comments SELECT policy.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to anon, authenticated;

create or replace function private.community_parent_post_visible_to_current_user(
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

revoke all on function private.community_parent_post_visible_to_current_user(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.community_parent_post_visible_to_current_user(uuid)
  to anon, authenticated;

drop policy comments_select_by_post_visibility on public.comments;

create policy comments_select_by_post_visibility
  on public.comments
  for select
  to public
  using (
    status = 'active'
    and deleted_at is null
    and private.community_parent_post_visible_to_current_user(post_id)
  );

commit;

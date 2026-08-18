begin;

-- Corrective additive follow-up for COMMUNITY-DETAIL-001.
-- The first deployment used a composite-row assignment that Supabase lint
-- rejects for the posts record variable. Keep the public contract unchanged
-- and assign the table columns explicitly.
create or replace function public.community_get_post_detail_v1(
  p_post_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_post public.posts;
begin
  select p.*
    into v_post
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
  limit 1;

  if v_post.id is null then
    return jsonb_build_object('item', null::jsonb);
  end if;

  return jsonb_build_object(
    'item', public.community_post_public_projection(v_post)
  );
end;
$function$;

revoke all on function public.community_get_post_detail_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.community_get_post_detail_v1(uuid)
  to anon, authenticated, service_role;

commit;

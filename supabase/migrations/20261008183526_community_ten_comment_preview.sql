begin;

-- v1 stays unchanged for installed clients expecting at most three root rows.
-- The new preview counts every rendered root/reply, under the existing RLS.
create or replace function public.community_get_comment_summary_v2(p_post_id uuid)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public
as $$
declare v_result jsonb;
begin
  if not private.community_parent_post_visible_to_current_user(p_post_id) then
    raise exception using errcode = '42501', message = 'community_comments_unavailable';
  end if;
  with visible as materialized (
    select id, post_id, user_id, parent_comment_id, reply_to_comment_id,
      reply_target_user_id, depth, like_count, content, status, deleted_at,
      created_at, updated_at
    from public.comments c where post_id = p_post_id and status = 'active' and deleted_at is null
      and (c.parent_comment_id is null or exists (
        select 1 from public.comments parent where parent.id = c.parent_comment_id
          and parent.post_id = p_post_id and parent.parent_comment_id is null
          and parent.status = 'active' and parent.deleted_at is null
      ))
  ), preview as (
    select c.*, root.created_at as root_created_at, root.id as root_id
    from visible c join visible root on root.id = coalesce(c.parent_comment_id, c.id)
    where root.parent_comment_id is null
    order by root.created_at, root.id, (c.parent_comment_id is not null), c.created_at, c.id
    limit 10
  )
  select jsonb_build_object(
    'total_count', (select count(*) from visible),
    'revision', (select md5(coalesce(string_agg(id::text, ',' order by id), '')) from visible),
    'comments', coalesce((select jsonb_agg(
      (to_jsonb(p) - 'root_created_at' - 'root_id') || jsonb_build_object(
        'reply_count', case when p.parent_comment_id is null then
          (select count(*) from visible r where r.parent_comment_id = p.id)::integer
          else 0 end)
      order by root_created_at, root_id, (parent_comment_id is not null), created_at, id
    ) from preview p), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.community_get_comment_summary_v2(uuid) from public;
grant execute on function public.community_get_comment_summary_v2(uuid) to anon, authenticated, service_role;

commit;

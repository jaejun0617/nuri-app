begin;

-- These reads run as the caller. Existing comments RLS, parent visibility,
-- moderation and write RPCs remain the only authorization/mutation owners.
create function public.community_get_comment_summary_v1(p_post_id uuid)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public
as $function$
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
        select 1 from public.comments parent where parent.id=c.parent_comment_id
          and parent.post_id=p_post_id and parent.parent_comment_id is null
          and parent.status='active' and parent.deleted_at is null
      ))
  ), roots as (
    select c.*, (select count(*) from visible r where r.parent_comment_id = c.id)::integer as reply_count
    from visible c where c.parent_comment_id is null
    order by c.created_at, c.id limit 3
  )
  select jsonb_build_object(
    'total_count', (select count(*) from visible),
    'revision', (select md5(coalesce(string_agg(id::text, ',' order by id), '')) from visible),
    'roots', coalesce((select jsonb_agg(to_jsonb(r) order by created_at, id) from roots r), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

create function public.community_get_comment_threads_v1(
  p_post_id uuid, p_sort text default 'registered', p_cursor jsonb default null,
  p_anchor_id uuid default null
)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_result jsonb;
  v_direction text := coalesce(p_cursor->>'direction', 'after');
begin
  if not private.community_parent_post_visible_to_current_user(p_post_id) then
    raise exception using errcode = '42501', message = 'community_comments_unavailable';
  end if;
  if p_sort not in ('registered', 'latest', 'replies') or p_sort is null then
    raise exception using errcode = '22023', message = 'community_comment_cursor_invalid';
  end if;
  if p_cursor is not null and (
    jsonb_typeof(p_cursor) <> 'object' or p_cursor->>'version' is distinct from '1'
    or p_cursor->>'post_id' is distinct from p_post_id::text
    or p_cursor->>'sort' is distinct from p_sort or p_cursor->>'scope' is distinct from 'threads'
    or v_direction not in ('before', 'after') or p_cursor->>'id' is null
    or p_cursor->>'revision' is null or p_anchor_id is not null
  ) then
    raise exception using errcode = '22023', message = 'community_comment_cursor_invalid';
  end if;
  with visible as materialized (
    select id, post_id, user_id, parent_comment_id, reply_to_comment_id,
      reply_target_user_id, depth, like_count, content, status, deleted_at,
      created_at, updated_at
    from public.comments c where post_id = p_post_id and status = 'active' and deleted_at is null
      and (c.parent_comment_id is null or exists (
        select 1 from public.comments parent where parent.id=c.parent_comment_id
          and parent.post_id=p_post_id and parent.parent_comment_id is null
          and parent.status='active' and parent.deleted_at is null
      ))
  ), snapshot as (
    select md5(coalesce(string_agg(id::text, ',' order by id), '')) as revision from visible
  ), roots as (
    select c.*, (select count(*) from visible r where r.parent_comment_id = c.id)::integer as reply_count
    from visible c where c.parent_comment_id is null
  ), ordered as (
    select r.*, row_number() over (order by
      case when p_sort = 'replies' then reply_count end desc,
      case when p_sort = 'latest' then created_at end desc,
      case when p_sort <> 'latest' then created_at end asc,
      case when p_sort = 'latest' then id end desc,
      case when p_sort <> 'latest' then id end asc
    ) as position from roots r
  ), anchor as (
    select coalesce(parent_comment_id, id) as root_id from visible where id = p_anchor_id
  ), boundary as (
    select
      (select position from ordered where id::text = p_cursor->>'id') as cursor_position,
      (select position from ordered where id = (select root_id from anchor)) as anchor_position
  ), page as materialized (
    select r.* from ordered r cross join boundary b
    where case
      when p_cursor is not null and v_direction = 'before' then r.position < b.cursor_position
      when p_cursor is not null then r.position > b.cursor_position
      when b.anchor_position is not null then r.position > ((b.anchor_position - 1) / 10) * 10
      else true end
    order by case when p_cursor is not null and v_direction = 'before' then -r.position else r.position end
    limit 10
  ), first_replies as (
    select r.* from page p cross join lateral (
      select v.*, 0::integer as reply_count from visible v where v.parent_comment_id = p.id
      order by v.created_at, v.id limit 5
    ) r
  ), edges as (
    select min(position) as first_position, max(position) as last_position from page
  )
  select jsonb_build_object(
    'revision', s.revision,
    'cursor_valid', p_cursor is null or (p_cursor->>'revision' = s.revision and b.cursor_position is not null),
    'anchor_found', p_anchor_id is null or b.anchor_position is not null,
    'roots', coalesce((select jsonb_agg(to_jsonb(p) - 'position' order by position) from page p), '[]'::jsonb),
    'replies', coalesce((select jsonb_agg(to_jsonb(r) order by created_at, id) from first_replies r), '[]'::jsonb),
    'reply_pages', coalesce((select jsonb_agg(jsonb_build_object(
      'root_id', p.id, 'total_count', p.reply_count,
      'next_cursor', case when p.reply_count > 5 then jsonb_build_object(
        'version', 1, 'post_id', p_post_id, 'scope', 'replies', 'root_id', p.id,
        'revision', (select md5(coalesce(string_agg(v.id::text, ',' order by v.id), '')) from visible v where v.parent_comment_id=p.id),
        'id', (select r.id from first_replies r where r.parent_comment_id=p.id order by r.created_at desc, r.id desc limit 1),
        'direction', 'after'
      ) else null end
    )) from page p), '[]'::jsonb),
    'previous_cursor', case when exists(select 1 from ordered where position < e.first_position) then jsonb_build_object(
      'version', 1, 'post_id', p_post_id, 'scope', 'threads', 'sort', p_sort,
      'revision', s.revision, 'id', (select id from page where position=e.first_position), 'direction', 'before'
    ) else null end,
    'next_cursor', case when exists(select 1 from ordered where position > e.last_position) then jsonb_build_object(
      'version', 1, 'post_id', p_post_id, 'scope', 'threads', 'sort', p_sort,
      'revision', s.revision, 'id', (select id from page where position=e.last_position), 'direction', 'after'
    ) else null end
  ) into v_result from snapshot s cross join boundary b cross join edges e;
  if not (v_result->>'cursor_valid')::boolean then
    raise exception using errcode = 'PT409', message = 'community_comment_cursor_stale';
  end if;
  return v_result - 'cursor_valid';
end;
$function$;

create function public.community_get_comment_replies_v1(
  p_post_id uuid, p_root_id uuid, p_cursor jsonb default null, p_anchor_id uuid default null
)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_result jsonb;
  v_direction text := coalesce(p_cursor->>'direction', 'after');
begin
  if not private.community_parent_post_visible_to_current_user(p_post_id)
    or not exists(select 1 from public.comments where id=p_root_id and post_id=p_post_id
      and parent_comment_id is null and status='active' and deleted_at is null) then
    raise exception using errcode = '42501', message = 'community_comments_unavailable';
  end if;
  if p_cursor is not null and (
    jsonb_typeof(p_cursor) <> 'object' or p_cursor->>'version' is distinct from '1'
    or p_cursor->>'post_id' is distinct from p_post_id::text
    or p_cursor->>'scope' is distinct from 'replies' or p_cursor->>'root_id' is distinct from p_root_id::text
    or v_direction not in ('before', 'after') or p_cursor->>'id' is null
    or p_cursor->>'revision' is null or p_anchor_id is not null
  ) then
    raise exception using errcode = '22023', message = 'community_comment_cursor_invalid';
  end if;
  with visible as materialized (
    select id, post_id, user_id, parent_comment_id, reply_to_comment_id,
      reply_target_user_id, depth, like_count, content, status, deleted_at,
      created_at, updated_at, 0::integer as reply_count
    from public.comments where post_id=p_post_id and parent_comment_id=p_root_id
      and status='active' and deleted_at is null
  ), snapshot as (
    select count(*) as total_count, md5(coalesce(string_agg(id::text, ',' order by id), '')) as revision from visible
  ), ordered as (
    select v.*, row_number() over(order by created_at, id) as position from visible v
  ), boundary as (
    select (select position from ordered where id::text=p_cursor->>'id') as cursor_position,
      (select position from ordered where id=p_anchor_id) as anchor_position
  ), page as materialized (
    select r.* from ordered r cross join boundary b
    where case
      when p_cursor is not null and v_direction='before' then r.position < b.cursor_position
      when p_cursor is not null then r.position > b.cursor_position
      when b.anchor_position is not null then r.position > ((b.anchor_position-1)/20)*20
      else true end
    order by case when p_cursor is not null and v_direction='before' then -r.position else r.position end limit 20
  ), edges as (
    select min(position) as first_position, max(position) as last_position from page
  )
  select jsonb_build_object(
    'root_id', p_root_id, 'revision', s.revision, 'total_count', s.total_count,
    'cursor_valid', p_cursor is null or (p_cursor->>'revision'=s.revision and b.cursor_position is not null),
    'anchor_found', p_anchor_id is null or b.anchor_position is not null,
    'comments', coalesce((select jsonb_agg(to_jsonb(p)-'position' order by position) from page p),'[]'::jsonb),
    'previous_cursor', case when exists(select 1 from ordered where position < e.first_position) then jsonb_build_object(
      'version',1,'post_id',p_post_id,'scope','replies','root_id',p_root_id,'revision',s.revision,
      'id',(select id from page where position=e.first_position),'direction','before'
    ) else null end,
    'next_cursor', case when exists(select 1 from ordered where position > e.last_position) then jsonb_build_object(
      'version',1,'post_id',p_post_id,'scope','replies','root_id',p_root_id,'revision',s.revision,
      'id',(select id from page where position=e.last_position),'direction','after'
    ) else null end
  ) into v_result from snapshot s cross join boundary b cross join edges e;
  if not (v_result->>'cursor_valid')::boolean then
    raise exception using errcode='PT409',message='community_comment_cursor_stale';
  end if;
  return v_result-'cursor_valid';
end;
$function$;

revoke all on function public.community_get_comment_summary_v1(uuid) from public;
revoke all on function public.community_get_comment_threads_v1(uuid,text,jsonb,uuid) from public;
revoke all on function public.community_get_comment_replies_v1(uuid,uuid,jsonb,uuid) from public;
grant execute on function public.community_get_comment_summary_v1(uuid) to anon, authenticated;
grant execute on function public.community_get_comment_threads_v1(uuid,text,jsonb,uuid) to anon, authenticated;
grant execute on function public.community_get_comment_replies_v1(uuid,uuid,jsonb,uuid) to anon, authenticated;

commit;

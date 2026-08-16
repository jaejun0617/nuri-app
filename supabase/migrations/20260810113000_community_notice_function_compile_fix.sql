begin;

-- Correct two function-body issues found by linked Supabase schema lint.
-- The original migrations remain immutable; this migration is corrective and additive.

create or replace function public.community_notice_mutate_v1(
  p_action text,
  p_post_id uuid default null,
  p_title text default null,
  p_content text default null,
  p_category text default null
)
returns table (
  post_id uuid,
  action_type text,
  status text,
  is_notice boolean,
  notice_published_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action text := lower(nullif(btrim(coalesce(p_action, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_content text := nullif(btrim(coalesce(p_content, '')), '');
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
  v_post public.posts%rowtype;
  v_actor_label text;
  v_before_state jsonb := '{}'::jsonb;
  v_after_state jsonb := '{}'::jsonb;
begin
  if not public.is_community_notice_operator() then
    perform public.raise_community_notice_error('community_notice_operator_required', '42501');
  end if;

  if v_action not in ('create', 'update', 'publish', 'unpublish', 'hide') then
    perform public.raise_community_notice_error('community_notice_action_invalid', '22023');
  end if;

  if v_category is not null and v_category not in ('free', 'question', 'info', 'daily') then
    perform public.raise_community_notice_error('community_notice_category_invalid', '22023');
  end if;

  if v_action = 'create' then
    if v_title is null then
      perform public.raise_community_notice_error('community_notice_title_required', '22023');
    end if;
    if v_content is null then
      perform public.raise_community_notice_error('community_notice_content_required', '22023');
    end if;

    insert into public.posts (
      user_id,
      visibility,
      title,
      content,
      category,
      status,
      is_notice,
      notice_published_at
    )
    values (
      auth.uid(),
      'public',
      v_title,
      v_content,
      v_category,
      'active',
      true,
      timezone('utc', now())
    )
    returning * into v_post;

    v_after_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );
  else
    if p_post_id is null then
      perform public.raise_community_notice_error('community_notice_post_required', '22023');
    end if;

    select * into v_post
    from public.posts
    where id = p_post_id
    for update;

    if not found then
      perform public.raise_community_notice_error('community_notice_post_not_found', '02000');
    end if;

    if v_post.deleted_at is not null or v_post.status in ('deleted', 'banned') then
      perform public.raise_community_notice_error('community_notice_post_invalid_state', '22023');
    end if;

    v_before_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );

    if v_action = 'update' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error('community_notice_post_not_published', '22023');
      end if;
      if p_title is not null and v_title is null then
        perform public.raise_community_notice_error('community_notice_title_required', '22023');
      end if;
      if p_content is not null and v_content is null then
        perform public.raise_community_notice_error('community_notice_content_required', '22023');
      end if;

      update public.posts as target
      set
        title = coalesce(v_title, target.title),
        content = coalesce(v_content, target.content),
        category = case when p_category is null then target.category else v_category end
      where target.id = p_post_id
      returning target.* into v_post;
    elsif v_action = 'publish' then
      update public.posts as target
      set
        visibility = 'public',
        status = 'active',
        deleted_at = null,
        is_notice = true,
        notice_published_at = coalesce(target.notice_published_at, timezone('utc', now()))
      where target.id = p_post_id
      returning target.* into v_post;
    elsif v_action = 'unpublish' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error('community_notice_post_not_published', '22023');
      end if;

      update public.posts as target
      set
        is_notice = false,
        notice_published_at = null
      where target.id = p_post_id
      returning target.* into v_post;
    elsif v_action = 'hide' then
      if not v_post.is_notice then
        perform public.raise_community_notice_error('community_notice_post_not_published', '22023');
      end if;

      update public.posts as target
      set
        status = 'hidden',
        moderated_at = timezone('utc', now()),
        moderated_by = auth.uid(),
        operator_memo = coalesce(target.operator_memo, 'community_notice_hide')
      where target.id = p_post_id
      returning target.* into v_post;
    end if;

    v_after_state := jsonb_build_object(
      'status', v_post.status,
      'isNotice', v_post.is_notice,
      'noticePublishedAt', v_post.notice_published_at
    );
  end if;

  select coalesce(nullif(btrim(p.nickname), ''), 'community_notice_operator')
  into v_actor_label
  from public.profiles p
  where p.user_id = auth.uid();
  v_actor_label := coalesce(v_actor_label, 'community_notice_operator');

  insert into public.admin_operation_audit_logs (
    action_type,
    actor_label,
    target_type,
    target_id,
    target_summary,
    before_state,
    after_state,
    reason,
    risk_level,
    status,
    metadata_summary
  )
  values (
    'community_notice_' || v_action,
    v_actor_label,
    'post',
    v_post.id::text,
    'Community notice post',
    v_before_state,
    v_after_state,
    'community_notice_operator',
    case when v_action = 'hide' then 'high' else 'medium' end,
    'succeeded',
    'Capability-guarded NURI-09 notice mutation.'
  );

  return query
  select
    v_post.id,
    'community_notice_' || v_action,
    v_post.status,
    v_post.is_notice,
    v_post.notice_published_at;
end;
$$;

revoke all on function public.community_notice_mutate_v1(text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.community_notice_mutate_v1(text, uuid, text, text, text)
  to authenticated, service_role;

create or replace function public.community_list_posts_v1(
  p_filter text default 'all',
  p_limit integer default 30,
  p_cursor jsonb default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_filter text := lower(nullif(btrim(coalesce(p_filter, 'all')), ''));
  v_limit integer := coalesce(p_limit, 30);
  v_cursor_filter text;
  v_cursor_limit integer;
  v_cursor_id uuid;
  v_cursor_created_at timestamptz;
  v_cursor_notice_published_at timestamptz;
  v_cursor_like_count integer;
  v_cursor_comment_count integer;
  v_filter_sql text := '';
  v_cursor_sql text;
  v_order_sql text;
  v_projection_order_sql text;
  v_next_cursor_sql text;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_next_cursor jsonb := null;
begin
  if v_filter not in ('all', 'popular', 'notice') then
    perform public.raise_community_notice_error('community_filter_invalid', '22023');
  end if;

  if v_limit not in (30, 50, 100, 150, 200) then
    perform public.raise_community_notice_error('community_page_size_invalid', '22023');
  end if;

  if p_cursor is not null then
    if jsonb_typeof(p_cursor) <> 'object' then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    begin
      v_cursor_filter := p_cursor->>'filter';
      v_cursor_limit := (p_cursor->>'pageSize')::integer;
      v_cursor_id := (p_cursor->>'id')::uuid;
      v_cursor_created_at := (p_cursor->>'createdAt')::timestamptz;

      if v_filter <> v_cursor_filter or v_limit <> v_cursor_limit then
        perform public.raise_community_notice_error('community_cursor_invalid', '22023');
      end if;

      if v_filter = 'popular' then
        v_cursor_like_count := (p_cursor->>'likeCount')::integer;
        v_cursor_comment_count := (p_cursor->>'commentCount')::integer;
      elsif v_filter = 'notice' then
        v_cursor_notice_published_at := (p_cursor->>'noticePublishedAt')::timestamptz;
      end if;
    exception when others then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end;
  end if;

  if v_filter = 'popular' then
    v_filter_sql := 'and p.like_count >= 10';
    v_cursor_sql := 'and ($2 is null or p.like_count < ($2->>''likeCount'')::integer or (p.like_count = ($2->>''likeCount'')::integer and p.comment_count < ($2->>''commentCount'')::integer) or (p.like_count = ($2->>''likeCount'')::integer and p.comment_count = ($2->>''commentCount'')::integer and p.created_at < ($2->>''createdAt'')::timestamptz) or (p.like_count = ($2->>''likeCount'')::integer and p.comment_count = ($2->>''commentCount'')::integer and p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';
    v_order_sql := 'p.like_count desc, p.comment_count desc, p.created_at desc, p.id desc';
    v_projection_order_sql := 'visible.post_row.like_count desc, visible.post_row.comment_count desc, visible.post_row.created_at desc, visible.post_row.id desc';
    v_next_cursor_sql := 'jsonb_build_object(''filter'', ''popular'', ''pageSize'', $1, ''likeCount'', last_visible.post_row.like_count, ''commentCount'', last_visible.post_row.comment_count, ''createdAt'', last_visible.post_row.created_at, ''id'', last_visible.post_row.id)';
  elsif v_filter = 'notice' then
    v_filter_sql := 'and p.is_notice = true';
    v_cursor_sql := 'and ($2 is null or p.notice_published_at < ($2->>''noticePublishedAt'')::timestamptz or (p.notice_published_at = ($2->>''noticePublishedAt'')::timestamptz and p.created_at < ($2->>''createdAt'')::timestamptz) or (p.notice_published_at = ($2->>''noticePublishedAt'')::timestamptz and p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';
    v_order_sql := 'p.notice_published_at desc, p.created_at desc, p.id desc';
    v_projection_order_sql := 'visible.post_row.notice_published_at desc, visible.post_row.created_at desc, visible.post_row.id desc';
    v_next_cursor_sql := 'jsonb_build_object(''filter'', ''notice'', ''pageSize'', $1, ''noticePublishedAt'', last_visible.post_row.notice_published_at, ''createdAt'', last_visible.post_row.created_at, ''id'', last_visible.post_row.id)';
  else
    v_cursor_sql := 'and ($2 is null or p.created_at < ($2->>''createdAt'')::timestamptz or (p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';
    v_order_sql := 'p.created_at desc, p.id desc';
    v_projection_order_sql := 'visible.post_row.created_at desc, visible.post_row.id desc';
    v_next_cursor_sql := 'jsonb_build_object(''filter'', ''all'', ''pageSize'', $1, ''createdAt'', last_visible.post_row.created_at, ''id'', last_visible.post_row.id)';
  end if;

  execute format($query$
    with page as (
      select p as post_row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
        %s
        and not exists (
          select 1
          from auth.users u
          where u.id = p.user_id
            and (
              u.deleted_at is not null
              or (u.banned_until is not null and u.banned_until > timezone('utc', now()))
            )
        )
        %s
      order by %s
      limit ($1 + 1)
    ),
    visible as (
      select post_row from page limit $1
    ),
    last_visible as (
      select post_row from page offset greatest($1 - 1, 0) limit 1
    )
    select
      coalesce((
        select jsonb_agg(public.community_post_public_projection(visible.post_row) order by %s)
        from visible
      ), '[]'::jsonb),
      (select count(*) > $1 from page),
      (select %s from last_visible)
  $query$, v_filter_sql, v_cursor_sql, v_order_sql, v_projection_order_sql, v_next_cursor_sql)
  using v_limit, p_cursor
  into v_items, v_has_more, v_next_cursor;

  if not v_has_more then
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_items,
    'hasMore', v_has_more,
    'nextCursor', v_next_cursor,
    'pageSize', v_limit,
    'filter', v_filter
  );
end;
$$;

revoke all on function public.community_list_posts_v1(text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.community_list_posts_v1(text, integer, jsonb)
  to anon, authenticated, service_role;

commit;

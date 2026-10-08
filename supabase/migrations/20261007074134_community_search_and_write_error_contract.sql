-- PO-approved read-only search; preserve normal list, RLS and moderation contracts.
create or replace function public.community_search_posts_v1(
  p_filter text,
  p_query text,
  p_category text default 'all',
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
  v_query text := btrim(coalesce(p_query, ''));
  v_cursor jsonb := null;
  v_filter text := lower(nullif(btrim(coalesce(p_filter, 'all')), ''));
  v_category text := lower(nullif(btrim(coalesce(p_category, 'all')), ''));
  v_limit integer := coalesce(p_limit, 30);
  v_cursor_version integer;
  v_cursor_filter text;
  v_cursor_category text;
  v_cursor_limit integer;
  v_cursor_id uuid;
  v_cursor_created_at timestamptz;
  v_cursor_is_notice boolean;
  v_cursor_notice_published_at timestamptz;
  v_cursor_like_count integer;
  v_cursor_parse_failed boolean := false;
  v_filter_sql text := '';
  v_cursor_sql text;
  v_order_sql text;
  v_projection_order_sql text;
  v_next_cursor_sql text;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_next_cursor jsonb := null;
begin
  if v_query = '' or char_length(v_query) > 100 then
    perform public.raise_community_notice_error('community_search_query_invalid', '22023');
  end if;
  -- Search cursors bind the literal query without changing the existing v4 position contract.
  if p_cursor is not null then
    if jsonb_typeof(p_cursor) <> 'object'
      or p_cursor->>'query' is distinct from v_query
      or jsonb_typeof(p_cursor->'position') is distinct from 'object' then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;
    v_cursor := p_cursor->'position';
  end if;

  if v_filter not in ('all', 'popular', 'notice') then
    perform public.raise_community_notice_error('community_filter_invalid', '22023');
  end if;

  if v_category not in ('all', 'question', 'info', 'daily', 'free') then
    perform public.raise_community_notice_error('community_category_invalid', '22023');
  end if;

  if v_filter = 'notice' and v_category <> 'all' then
    perform public.raise_community_notice_error(
      'community_notice_category_unsupported',
      '22023'
    );
  end if;

  if v_limit not in (30, 50, 100, 150, 200) then
    perform public.raise_community_notice_error('community_page_size_invalid', '22023');
  end if;

  if v_cursor is not null then
    if jsonb_typeof(v_cursor) <> 'object' then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    if not (v_cursor ? 'version') then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    begin
      v_cursor_version := (v_cursor->>'version')::integer;
    exception when others then
      v_cursor_parse_failed := true;
    end;

    if v_cursor_parse_failed or v_cursor_version is distinct from 4 then
      perform public.raise_community_notice_error(
        'community_cursor_version_unsupported',
        '22023'
      );
    end if;

    if not (v_cursor ? 'filter')
      or not (v_cursor ? 'category')
      or not (v_cursor ? 'pageSize')
      or not (v_cursor ? 'createdAt')
      or not (v_cursor ? 'id')
      or (v_filter = 'all' and (
        not (v_cursor ? 'isNotice')
        or not (v_cursor ? 'noticePublishedAt')
      ))
      or (v_filter = 'popular' and (
        not (v_cursor ? 'likeCount')
        or exists (
          select 1
          from jsonb_object_keys(v_cursor) as cursor_key(key_name)
          where key_name not in (
            'version',
            'filter',
            'category',
            'pageSize',
            'likeCount',
            'createdAt',
            'id'
          )
        )
      ))
      or (v_filter = 'notice' and not (v_cursor ? 'noticePublishedAt')) then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    v_cursor_parse_failed := false;
    begin
      v_cursor_filter := v_cursor->>'filter';
      v_cursor_category := v_cursor->>'category';
      v_cursor_limit := (v_cursor->>'pageSize')::integer;
      v_cursor_id := (v_cursor->>'id')::uuid;
      v_cursor_created_at := (v_cursor->>'createdAt')::timestamptz;

      if v_filter = 'all' then
        v_cursor_is_notice := (v_cursor->>'isNotice')::boolean;
        v_cursor_notice_published_at :=
          (v_cursor->>'noticePublishedAt')::timestamptz;
      elsif v_filter = 'popular' then
        v_cursor_like_count := (v_cursor->>'likeCount')::integer;
      elsif v_filter = 'notice' then
        v_cursor_notice_published_at :=
          (v_cursor->>'noticePublishedAt')::timestamptz;
      end if;
    exception when others then
      v_cursor_parse_failed := true;
    end;

    if v_cursor_parse_failed
      or v_cursor_filter is null
      or v_cursor_category is null
      or v_cursor_limit is null
      or v_cursor_id is null
      or v_cursor_created_at is null
      or v_cursor_category not in ('all', 'question', 'info', 'daily', 'free')
      or (v_filter = 'all' and v_cursor_is_notice is null)
      or (v_filter = 'popular' and v_cursor_like_count is null)
      or (v_filter = 'notice' and v_cursor_notice_published_at is null) then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    if v_filter <> v_cursor_filter
      or v_category <> v_cursor_category
      or v_limit <> v_cursor_limit then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;
  end if;

  if v_filter = 'popular' then
    v_filter_sql := 'and p.like_count >= 10';
    v_cursor_sql := 'and ($2 is null or p.like_count < ($2->>''likeCount'')::integer or (p.like_count = ($2->>''likeCount'')::integer and p.created_at < ($2->>''createdAt'')::timestamptz) or (p.like_count = ($2->>''likeCount'')::integer and p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';
    v_order_sql := 'p.like_count desc, p.created_at desc, p.id desc';
    v_projection_order_sql := '(visible.post_row).like_count desc, (visible.post_row).created_at desc, (visible.post_row).id desc';
    v_next_cursor_sql := 'jsonb_build_object(''version'', 4, ''filter'', ''popular'', ''category'', $3, ''pageSize'', $1, ''likeCount'', (last_visible.post_row).like_count, ''createdAt'', (last_visible.post_row).created_at, ''id'', (last_visible.post_row).id)';
  elsif v_filter = 'notice' then
    v_filter_sql := 'and p.is_notice = true';
    v_cursor_sql := 'and ($2 is null or p.notice_published_at < ($2->>''noticePublishedAt'')::timestamptz or (p.notice_published_at = ($2->>''noticePublishedAt'')::timestamptz and p.created_at < ($2->>''createdAt'')::timestamptz) or (p.notice_published_at = ($2->>''noticePublishedAt'')::timestamptz and p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';
    v_order_sql := 'p.notice_published_at desc nulls last, p.created_at desc, p.id desc';
    v_projection_order_sql := '(visible.post_row).notice_published_at desc nulls last, (visible.post_row).created_at desc, (visible.post_row).id desc';
    v_next_cursor_sql := 'jsonb_build_object(''version'', 4, ''filter'', ''notice'', ''category'', $3, ''pageSize'', $1, ''noticePublishedAt'', (last_visible.post_row).notice_published_at, ''createdAt'', (last_visible.post_row).created_at, ''id'', (last_visible.post_row).id)';
  else
    v_cursor_sql := 'and ($2 is null or p.is_notice < ($2->>''isNotice'')::boolean or (p.is_notice = ($2->>''isNotice'')::boolean and ((($2->>''noticePublishedAt'') is not null and p.notice_published_at is null) or (($2->>''noticePublishedAt'') is not null and p.notice_published_at is not null and p.notice_published_at < ($2->>''noticePublishedAt'')::timestamptz) or (((p.notice_published_at = ($2->>''noticePublishedAt'')::timestamptz) or (($2->>''noticePublishedAt'') is null and p.notice_published_at is null)) and (p.created_at < ($2->>''createdAt'')::timestamptz or (p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))))))';
    v_order_sql := 'p.is_notice desc, p.notice_published_at desc nulls last, p.created_at desc, p.id desc';
    v_projection_order_sql := '(visible.post_row).is_notice desc, (visible.post_row).notice_published_at desc nulls last, (visible.post_row).created_at desc, (visible.post_row).id desc';
    v_next_cursor_sql := 'jsonb_build_object(''version'', 4, ''filter'', ''all'', ''category'', $3, ''pageSize'', $1, ''isNotice'', (last_visible.post_row).is_notice, ''noticePublishedAt'', (last_visible.post_row).notice_published_at, ''createdAt'', (last_visible.post_row).created_at, ''id'', (last_visible.post_row).id)';
  end if;

  if v_category <> 'all' then
    v_filter_sql := v_filter_sql || ' and p.category = $3';
  end if;

  execute format($query$
    with page as (
      select p as post_row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
        and (
          strpos(lower(coalesce(p.title, '')), lower($4)) > 0
          or strpos(lower(coalesce(p.content, '')), lower($4)) > 0
        )
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
  using v_limit, v_cursor, v_category, v_query
  into v_items, v_has_more, v_next_cursor;

  if not v_has_more then
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_items,
    'hasMore', v_has_more,
    'nextCursor', case when v_next_cursor is null then null else jsonb_build_object('query', v_query, 'position', v_next_cursor) end,
    'query', v_query,
    'pageSize', v_limit,
    'filter', v_filter,
    'category', v_category,
    'cursorVersion', 4
  );
end;
$$;

revoke all on function public.community_search_posts_v1(text, text, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.community_search_posts_v1(text, text, text, integer, jsonb)
  to anon, authenticated, service_role;


-- Null HINT must not replace the original stable write error with SQLSTATE 22004.
create or replace function public.raise_community_write_error(
  p_app_code text,
  p_message text,
  p_target_type text default null,
  p_target_field text default null,
  p_match_source text default null,
  p_hint text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = p_message,
    detail = json_build_object(
      'app_code', p_app_code,
      'target_type', p_target_type,
      'target_field', p_target_field,
      'match_source', p_match_source
    )::text,
    hint = coalesce(p_hint, '');
end;
$$;

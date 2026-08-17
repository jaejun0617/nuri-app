begin;

-- NURI-09: keep the cursor identity equal to the requested Home scope.
-- For category=all, the cursor must retain 'all' rather than the last row's
-- concrete category; otherwise the next page is rejected as mixed-scope.

create or replace function public.community_home_highlights_v1(
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
  v_category text := lower(nullif(btrim(coalesce(p_category, 'all')), ''));
  v_limit integer := coalesce(p_limit, 30);
  v_cursor_version integer;
  v_cursor_category text;
  v_cursor_limit integer;
  v_cursor_id uuid;
  v_cursor_created_at timestamptz;
  v_cursor_like_count integer;
  v_cursor_parse_failed boolean := false;
  v_filter_sql text := '';
  v_cursor_sql text;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_next_cursor jsonb := null;
begin
  if v_category not in ('all', 'question', 'info', 'daily', 'free') then
    perform public.raise_community_notice_error('community_category_invalid', '22023');
  end if;

  if v_limit not in (30, 50, 100, 150, 200) then
    perform public.raise_community_notice_error('community_page_size_invalid', '22023');
  end if;

  if p_cursor is not null then
    if jsonb_typeof(p_cursor) <> 'object' then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    if not (p_cursor ? 'version') then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    begin
      v_cursor_version := (p_cursor->>'version')::integer;
    exception when others then
      v_cursor_parse_failed := true;
    end;

    if v_cursor_parse_failed or v_cursor_version is distinct from 1 then
      perform public.raise_community_notice_error(
        'community_cursor_version_unsupported',
        '22023'
      );
    end if;

    if not (p_cursor ? 'category')
      or not (p_cursor ? 'pageSize')
      or not (p_cursor ? 'likeCount')
      or not (p_cursor ? 'createdAt')
      or not (p_cursor ? 'id')
      or exists (
        select 1
        from jsonb_object_keys(p_cursor) as cursor_key(key_name)
        where key_name not in (
          'version',
          'category',
          'pageSize',
          'likeCount',
          'createdAt',
          'id'
        )
      ) then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    v_cursor_parse_failed := false;
    begin
      v_cursor_category := p_cursor->>'category';
      v_cursor_limit := (p_cursor->>'pageSize')::integer;
      v_cursor_like_count := (p_cursor->>'likeCount')::integer;
      v_cursor_created_at := (p_cursor->>'createdAt')::timestamptz;
      v_cursor_id := (p_cursor->>'id')::uuid;
    exception when others then
      v_cursor_parse_failed := true;
    end;

    if v_cursor_parse_failed
      or v_cursor_category is null
      or v_cursor_limit is null
      or v_cursor_like_count is null
      or v_cursor_created_at is null
      or v_cursor_id is null
      or v_cursor_category not in ('all', 'question', 'info', 'daily', 'free') then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;

    if v_category <> v_cursor_category
      or v_limit <> v_cursor_limit then
      perform public.raise_community_notice_error('community_cursor_invalid', '22023');
    end if;
  end if;

  v_cursor_sql := 'and ($2 is null or p.like_count < ($2->>''likeCount'')::integer or (p.like_count = ($2->>''likeCount'')::integer and p.created_at < ($2->>''createdAt'')::timestamptz) or (p.like_count = ($2->>''likeCount'')::integer and p.created_at = ($2->>''createdAt'')::timestamptz and p.id < ($2->>''id'')::uuid))';

  if v_category <> 'all' then
    v_filter_sql := 'and p.category = $3';
  end if;

  execute format($query$
    with page as (
      select p as post_row
      from public.posts p
      where p.visibility = 'public'
        and p.status = 'active'
        and p.deleted_at is null
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
        %s
      order by p.like_count desc, p.created_at desc, p.id desc
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
        select jsonb_agg(
          public.community_post_public_projection(visible.post_row)
          order by
            (visible.post_row).like_count desc,
            (visible.post_row).created_at desc,
            (visible.post_row).id desc
        )
        from visible
      ), '[]'::jsonb),
      (select count(*) > $1 from page),
      (
        select jsonb_build_object(
          'version', 1,
          'category', $3,
          'pageSize', $1,
          'likeCount', (last_visible.post_row).like_count,
          'createdAt', (last_visible.post_row).created_at,
          'id', (last_visible.post_row).id
        )
        from last_visible
      )
  $query$, v_filter_sql, v_cursor_sql)
  using v_limit, p_cursor, v_category
  into v_items, v_has_more, v_next_cursor;

  if not v_has_more then
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'scope', 'home_highlights',
    'items', v_items,
    'hasMore', v_has_more,
    'nextCursor', v_next_cursor,
    'pageSize', v_limit,
    'category', v_category,
    'cursorVersion', 1
  );
end;
$$;

revoke all on function public.community_home_highlights_v1(text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.community_home_highlights_v1(text, integer, jsonb)
  to anon, authenticated, service_role;

commit;

do $$
declare
  v_function_oid oid;
  v_definition text;
  v_security_definer boolean;
  v_config text;
  v_result jsonb;
  v_projection_mismatches integer;
  v_message text;
  v_filter text;
  v_category text;
  v_limit integer;
begin
  select p.oid, p.prosecdef, coalesce(array_to_string(p.proconfig, ';'), ''), pg_get_functiondef(p.oid)
  into v_function_oid, v_security_definer, v_config, v_definition
  from pg_proc p
  where p.oid = 'public.community_list_posts_v3(text,text,integer,jsonb)'::regprocedure;

  if v_definition is null then
    raise exception 'community_popular_v4_rpc_missing';
  end if;

  if v_function_oid is null
    or not v_security_definer
    or v_config not like '%search_path=public, pg_catalog%'
    or v_definition not like '%cursorVersion'', 4%'
    or v_definition not like '%p.like_count >= 10%'
    or v_definition not like '%p.like_count desc, p.created_at desc, p.id desc%'
    or v_definition not like '%limit ($1 + 1)%'
    or v_definition not like '%hasMore%'
    or v_definition not like '%nextCursor%'
    or v_definition like '%p.comment_count desc%'
    or v_definition like '%commentCount%' then
    raise exception 'community_popular_v4_definition_mismatch';
  end if;

  if not has_function_privilege(
    'anon',
    'public.community_list_posts_v3(text,text,integer,jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.community_list_posts_v3(text,text,integer,jsonb)',
    'execute'
  ) then
    raise exception 'community_popular_v4_public_execute_missing';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.community_list_posts_v1(text,integer,jsonb)'::regprocedure
  ) or not exists (
    select 1
    from pg_proc
    where oid = 'public.community_list_posts_v2(text,text,integer,jsonb)'::regprocedure
  ) then
    raise exception 'community_popular_v4_legacy_rpc_removed';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'posts'
      and indexname = 'idx_posts_active_public_popular_v4'
      and lower(indexdef) like '%like_count desc%'
      and lower(indexdef) like '%created_at desc%'
      and lower(indexdef) like '%id desc%'
      and lower(indexdef) like '%like_count >= 10%'
  ) or not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'posts'
      and indexname = 'idx_posts_active_public_category_popular_v4'
      and lower(indexdef) like '%category%'
      and lower(indexdef) like '%like_count desc%'
      and lower(indexdef) like '%created_at desc%'
      and lower(indexdef) like '%id desc%'
      and lower(indexdef) like '%like_count >= 10%'
  ) then
    raise exception 'community_popular_v4_index_missing';
  end if;

  foreach v_filter in array array['all', 'popular'] loop
    foreach v_category in array array['all', 'question', 'info', 'daily', 'free'] loop
      foreach v_limit in array array[30, 50, 100, 150, 200] loop
        v_result := public.community_list_posts_v3(
          v_filter,
          v_category,
          v_limit,
          null::jsonb
        );

        if (v_result->>'cursorVersion')::integer <> 4
          or v_result->>'filter' <> v_filter
          or v_result->>'category' <> v_category
          or (v_result->>'pageSize')::integer <> v_limit
          or jsonb_typeof(v_result->'items') <> 'array'
          or jsonb_typeof(v_result->'hasMore') <> 'boolean' then
          raise exception 'community_popular_v4_response_contract_mismatch:%:%:%',
            v_filter,
            v_category,
            v_limit;
        end if;
      end loop;
    end loop;
  end loop;

  v_result := public.community_list_posts_v3('notice', 'all', 30, null::jsonb);
  if (v_result->>'cursorVersion')::integer <> 4
    or v_result->>'filter' <> 'notice'
    or v_result->>'category' <> 'all' then
    raise exception 'community_popular_v4_notice_response_mismatch';
  end if;

  begin
    perform public.community_list_posts_v3('all', 'tip', 30, null::jsonb);
    raise exception 'community_popular_v4_invalid_category_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_category_invalid' then
      raise exception 'community_popular_v4_invalid_category_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v3('notice', 'info', 30, null::jsonb);
    raise exception 'community_popular_v4_notice_category_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_notice_category_unsupported' then
      raise exception 'community_popular_v4_notice_category_error:%', v_message;
    end if;
  end;

  -- Cursor identity must reject filter, category, and page-size mixing.
  begin
    perform public.community_list_posts_v3(
      'popular',
      'info',
      30,
      jsonb_build_object(
        'version', 4,
        'filter', 'popular',
        'category', 'question',
        'pageSize', 30,
        'likeCount', 10,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_popular_v4_category_cursor_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_popular_v4_category_cursor_mix_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v3(
      'all',
      'all',
      30,
      jsonb_build_object(
        'version', 4,
        'filter', 'popular',
        'category', 'all',
        'pageSize', 30,
        'likeCount', 10,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_popular_v4_filter_cursor_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_popular_v4_filter_cursor_mix_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v3(
      'popular',
      'all',
      50,
      jsonb_build_object(
        'version', 4,
        'filter', 'popular',
        'category', 'all',
        'pageSize', 30,
        'likeCount', 10,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_popular_v4_page_size_cursor_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_popular_v4_page_size_cursor_mix_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v3(
      'popular',
      'all',
      30,
      jsonb_build_object(
        'version', 4,
        'filter', 'popular',
        'category', 'all',
        'pageSize', 30,
        'likeCount', 10,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001',
        'commentCount', 0
      )
    );
    raise exception 'community_popular_v4_comment_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_popular_v4_comment_cursor_error:%', v_message;
    end if;
  end;

  -- v2/v3 and pre-versioned cursors must not be accepted by v3.
  foreach v_limit in array array[3, 2, 99] loop
    begin
      perform public.community_list_posts_v3(
        'popular',
        'all',
        30,
        jsonb_build_object(
          'version', v_limit,
          'filter', 'popular',
          'category', 'all',
          'pageSize', 30,
          'likeCount', 10,
          'createdAt', '2026-08-17T00:00:00Z',
          'id', '00000000-0000-0000-0000-000000000001'
        )
      );
      raise exception 'community_popular_v4_unsupported_cursor_accepted:%', v_limit;
    exception when others then
      get stacked diagnostics v_message = message_text;
      if v_message <> 'community_cursor_version_unsupported' then
        raise exception 'community_popular_v4_unsupported_cursor_error:%:%', v_limit, v_message;
      end if;
    end;
  end loop;

  begin
    perform public.community_list_posts_v3(
      'popular',
      'all',
      30,
      jsonb_build_object(
        'filter', 'popular',
        'category', 'all',
        'pageSize', 30,
        'likeCount', 10,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_popular_v4_legacy_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_popular_v4_legacy_cursor_error:%', v_message;
    end if;
  end;

  -- The live read-only projection must not disagree with posts.like_count.
  select count(*)::integer
  into v_projection_mismatches
  from jsonb_array_elements(
    coalesce(
      public.community_list_posts_v3('popular', 'all', 30, null::jsonb)->'items',
      '[]'::jsonb
    )
  ) item
  join public.posts p on p.id = (item->>'id')::uuid
  where p.like_count <> (item->>'like_count')::integer;

  if v_projection_mismatches <> 0 then
    raise exception 'community_popular_v4_like_projection_mismatch:%',
      v_projection_mismatches;
  end if;

  if exists (
    select 1
    from public.posts p
    left join public.likes l on l.post_id = p.id
    where p.visibility = 'public'
      and p.status = 'active'
      and p.deleted_at is null
    group by p.id, p.like_count
    having p.like_count <> count(l.id)::integer
  ) then
    raise exception 'community_popular_v4_like_count_mismatch';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.visibility = 'public'
      and p.status = 'active'
      and p.deleted_at is null
      and p.like_count >= 10
  ) then
    raise notice 'community_popular_v4_live_threshold_rows_unavailable';
  end if;
end;
$$;

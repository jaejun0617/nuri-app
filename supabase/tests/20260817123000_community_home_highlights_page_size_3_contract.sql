do $$
declare
  v_function_oid oid;
  v_definition text;
  v_security_definer boolean;
  v_config text;
  v_result jsonb;
  v_next_result jsonb;
  v_default_result jsonb;
  v_cursor jsonb;
  v_first_last jsonb;
  v_second_first jsonb;
  v_message text;
  v_category text;
  v_limit integer;
  v_item_count integer;
  v_active_count integer;
  v_overlap integer;
  v_projection_mismatches integer;
begin
  select p.oid, p.prosecdef, coalesce(array_to_string(p.proconfig, ';'), ''), pg_get_functiondef(p.oid)
  into v_function_oid, v_security_definer, v_config, v_definition
  from pg_proc p
  where p.oid = 'public.community_home_highlights_v1(text,integer,jsonb)'::regprocedure;

  if v_function_oid is null then
    raise exception 'community_home_highlights_rpc_missing';
  end if;

  if lower(v_definition) not like '%p_limit integer default 3%'
    or not v_security_definer
    or v_config not like '%search_path=public, pg_catalog%'
    or lower(v_definition) not like '%like_count desc, p.created_at desc, p.id desc%'
    or lower(v_definition) not like '%limit ($1 + 1)%'
    or lower(v_definition) not like '%hasmore%'
    or lower(v_definition) not like '%nextcursor%'
    or lower(v_definition) not like '%cursorversion'', 1%'
    or lower(v_definition) like '%p.like_count >= 10%'
    or lower(v_definition) like '%p.comment_count desc%'
    or lower(v_definition) like '%p.is_notice = true%'
    or lower(v_definition) like '%p.is_notice = false%' then
    raise exception 'community_home_highlights_page_size_3_definition_mismatch';
  end if;

  if not has_function_privilege(
    'anon',
    'public.community_home_highlights_v1(text,integer,jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.community_home_highlights_v1(text,integer,jsonb)',
    'execute'
  ) then
    raise exception 'community_home_highlights_public_execute_missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'posts'
      and indexname = 'idx_posts_active_public_home_highlights_v1'
      and lower(indexdef) like '%like_count desc%'
      and lower(indexdef) like '%created_at desc%'
      and lower(indexdef) like '%id desc%'
      and lower(indexdef) not like '%like_count >= 10%'
  ) or not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'posts'
      and indexname = 'idx_posts_active_public_category_home_highlights_v1'
      and lower(indexdef) like '%category%'
      and lower(indexdef) like '%like_count desc%'
      and lower(indexdef) like '%created_at desc%'
      and lower(indexdef) like '%id desc%'
      and lower(indexdef) not like '%like_count >= 10%'
  ) then
    raise exception 'community_home_highlights_index_missing';
  end if;

  -- Existing Community popular ranking remains thresholded and unchanged.
  if not exists (
    select 1
    from pg_proc p
    where p.oid = 'public.community_list_posts_v3(text,text,integer,jsonb)'::regprocedure
      and pg_get_functiondef(p.oid) like '%p.like_count >= 10%'
  ) then
    raise exception 'community_popular_v3_threshold_contract_missing';
  end if;

  -- Omitting p_limit must use the approved Home default of 3.
  v_default_result := public.community_home_highlights_v1();
  if (v_default_result->>'pageSize')::integer <> 3
    or jsonb_typeof(v_default_result->'items') <> 'array'
    or jsonb_typeof(v_default_result->'hasMore') <> 'boolean' then
    raise exception 'community_home_highlights_default_page_size_mismatch';
  end if;

  -- The approved compact page must return at most three rows and preserve the
  -- cursor identity even when the live dataset spans multiple pages.
  v_result := public.community_home_highlights_v1('all', 3, null::jsonb);
  select jsonb_array_length(v_result->'items') into v_item_count;
  if v_result->>'scope' <> 'home_highlights'
    or v_result->>'category' <> 'all'
    or (v_result->>'pageSize')::integer <> 3
    or (v_result->>'cursorVersion')::integer <> 1
    or v_item_count > 3 then
    raise exception 'community_home_highlights_limit_3_response_mismatch';
  end if;

  select count(*)::integer
  into v_active_count
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
    );

  if v_active_count > 3 then
    if (v_result->>'hasMore')::boolean is distinct from true
      or v_result->'nextCursor' is null
      or (v_result->'nextCursor'->>'pageSize')::integer <> 3
      or v_result->'nextCursor'->>'category' <> 'all' then
      raise exception 'community_home_highlights_limit_3_cursor_mismatch';
    end if;

    v_next_result := public.community_home_highlights_v1(
      'all',
      3,
      v_result->'nextCursor'
    );

    select count(*)::integer
    into v_overlap
    from jsonb_array_elements(v_result->'items') first_item
    join jsonb_array_elements(v_next_result->'items') second_item
      on first_item->>'id' = second_item->>'id';

    if v_next_result->>'category' <> 'all'
      or (v_next_result->>'pageSize')::integer <> 3
      or (v_next_result->>'cursorVersion')::integer <> 1
      or v_overlap <> 0 then
      raise exception 'community_home_highlights_limit_3_cursor_page_mismatch';
    end if;

    select ordered.item
    into v_first_last
    from jsonb_array_elements(v_result->'items') with ordinality ordered(item, position)
    order by ordered.position desc
    limit 1;

    select ordered.item
    into v_second_first
    from jsonb_array_elements(v_next_result->'items') with ordinality ordered(item, position)
    order by ordered.position asc
    limit 1;

    if not (
      (v_first_last->>'like_count')::integer > (v_second_first->>'like_count')::integer
      or (
        (v_first_last->>'like_count')::integer = (v_second_first->>'like_count')::integer
        and (v_first_last->>'created_at')::timestamptz > (v_second_first->>'created_at')::timestamptz
      )
      or (
        (v_first_last->>'like_count')::integer = (v_second_first->>'like_count')::integer
        and (v_first_last->>'created_at')::timestamptz = (v_second_first->>'created_at')::timestamptz
        and (v_first_last->>'id')::uuid > (v_second_first->>'id')::uuid
      )
    ) then
      raise exception 'community_home_highlights_limit_3_order_mismatch';
    end if;
  end if;

  -- Existing page sizes remain accepted and retain their requested identity.
  foreach v_limit in array array[30, 50, 100, 150, 200] loop
    v_result := public.community_home_highlights_v1('all', v_limit, null::jsonb);
    if (v_result->>'pageSize')::integer <> v_limit
      or jsonb_typeof(v_result->'items') <> 'array'
      or jsonb_array_length(v_result->'items') > v_limit
      or jsonb_typeof(v_result->'hasMore') <> 'boolean' then
      raise exception 'community_home_highlights_existing_page_size_regression:%', v_limit;
    end if;
  end loop;

  foreach v_limit in array array[2, 4, 29, 201] loop
    begin
      perform public.community_home_highlights_v1('all', v_limit, null::jsonb);
      raise exception 'community_home_highlights_invalid_page_size_accepted:%', v_limit;
    exception when others then
      get stacked diagnostics v_message = message_text;
      if v_message <> 'community_page_size_invalid' then
        raise exception 'community_home_highlights_invalid_page_size_error:%:%', v_limit, v_message;
      end if;
    end;
  end loop;

  -- Category is part of cursor identity and cannot be mixed between scopes.
  begin
    perform public.community_home_highlights_v1(
      'info',
      3,
      jsonb_build_object(
        'version', 1,
        'category', 'question',
        'pageSize', 3,
        'likeCount', 0,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_home_highlights_category_cursor_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_home_highlights_category_cursor_mix_error:%', v_message;
    end if;
  end;

  -- A cursor created for page size 3 cannot be replayed for another size.
  begin
    perform public.community_home_highlights_v1(
      'all',
      30,
      jsonb_build_object(
        'version', 1,
        'category', 'all',
        'pageSize', 3,
        'likeCount', 0,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_home_highlights_page_size_cursor_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_home_highlights_page_size_cursor_mix_error:%', v_message;
    end if;
  end;

  -- A legacy or unsupported cursor version must not silently alter the page.
  begin
    perform public.community_home_highlights_v1(
      'all',
      3,
      jsonb_build_object(
        'version', 2,
        'category', 'all',
        'pageSize', 3,
        'likeCount', 0,
        'createdAt', '2026-08-17T00:00:00Z',
        'id', '00000000-0000-0000-0000-000000000001'
      )
    );
    raise exception 'community_home_highlights_unsupported_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_version_unsupported' then
      raise exception 'community_home_highlights_unsupported_cursor_error:%', v_message;
    end if;
  end;

  -- Read-only projection and stored counter consistency checks.
  select count(*)::integer
  into v_projection_mismatches
  from jsonb_array_elements(
    coalesce(public.community_home_highlights_v1('all', 3, null::jsonb)->'items', '[]'::jsonb)
  ) item
  join public.posts p on p.id = (item->>'id')::uuid
  where p.like_count <> (item->>'like_count')::integer;

  if v_projection_mismatches <> 0 then
    raise exception 'community_home_highlights_like_projection_mismatch:%', v_projection_mismatches;
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
    raise exception 'community_home_highlights_like_count_mismatch';
  end if;
end;
$$;

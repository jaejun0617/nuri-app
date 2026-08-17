-- NURI-09 category-aware list/cursor contract test.
-- Read-only: no account, post, like, notice, moderation, or production data
-- mutation is performed. UUIDs below are generated only inside in-memory JSON
-- cursor fixtures.

do $$
declare
  v_definition text;
  v_index_definition text;
  v_message text;
  v_result jsonb;
  v_filter text;
  v_category text;
  v_limit integer;
begin
  select pg_get_functiondef('public.community_list_posts_v2(text,text,integer,jsonb)'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'community_category_list_rpc_missing';
  end if;

  if v_definition not like '%SECURITY DEFINER%'
    or v_definition not like '%search_path TO ''public'', ''pg_catalog''%' then
    raise exception 'community_category_list_security_contract_missing';
  end if;

  if v_definition not like '%community_category_invalid%'
    or v_definition not like '%community_notice_category_unsupported%' then
    raise exception 'community_category_allowlist_contract_missing';
  end if;

  if v_definition not like '%p.category = $3%'
    or v_definition not like '%p.like_count >= 10%'
    or v_definition not like '%p.is_notice desc, p.notice_published_at desc nulls last, p.created_at desc, p.id desc%'
    or v_definition not like '%p.like_count desc, p.comment_count desc, p.created_at desc, p.id desc%' then
    raise exception 'community_category_query_contract_missing';
  end if;

  if position('limit (' in v_definition) = 0
    or position('hasMore' in v_definition) = 0
    or position('nextCursor' in v_definition) = 0
    or position('category' in v_definition) = 0
    or position('version' in v_definition) = 0 then
    raise exception 'community_category_cursor_contract_missing';
  end if;

  if v_definition not like '%community_cursor_invalid%'
    or v_definition not like '%community_cursor_version_unsupported%' then
    raise exception 'community_category_cursor_error_contract_missing';
  end if;

  if not has_function_privilege(
    'anon',
    'public.community_list_posts_v2(text, text, integer, jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.community_list_posts_v2(text, text, integer, jsonb)',
    'execute'
  ) then
    raise exception 'community_category_list_public_execute_missing';
  end if;

  select indexdef
  into v_index_definition
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'posts'
    and indexname = 'idx_posts_active_public_category_all_notice_first';

  if v_index_definition is null
    or v_index_definition not like '%category, is_notice DESC, notice_published_at DESC NULLS LAST, created_at DESC, id DESC%'
    or v_index_definition not like '%visibility = ''public''%'
    or v_index_definition not like '%status = ''active''%'
    or v_index_definition not like '%deleted_at IS NULL%' then
    raise exception 'community_category_index_contract_missing';
  end if;

  foreach v_filter in array array['all', 'popular'] loop
    foreach v_category in array array['all', 'question', 'info', 'daily', 'free'] loop
      foreach v_limit in array array[30, 50, 100, 150, 200] loop
        select public.community_list_posts_v2(
          v_filter,
          v_category,
          v_limit,
          null::jsonb
        )
        into v_result;

        if (v_result->>'cursorVersion')::integer <> 3
          or v_result->>'filter' <> v_filter
          or v_result->>'category' <> v_category
          or (v_result->>'pageSize')::integer <> v_limit
          or jsonb_typeof(v_result->'items') <> 'array'
          or jsonb_typeof(v_result->'hasMore') <> 'boolean' then
          raise exception 'community_category_list_response_mismatch:%:%:%', v_filter, v_category, v_limit;
        end if;

        if v_result->>'nextCursor' is not null
          and jsonb_typeof(v_result->'nextCursor') <> 'object' then
          raise exception 'community_category_next_cursor_shape_invalid';
        end if;
      end loop;
    end loop;
  end loop;

  select public.community_list_posts_v2('notice', 'all', 30, null::jsonb)
  into v_result;
  if (v_result->>'cursorVersion')::integer <> 3
    or v_result->>'filter' <> 'notice'
    or v_result->>'category' <> 'all' then
    raise exception 'community_category_notice_all_response_mismatch';
  end if;

  begin
    perform public.community_list_posts_v2('all', 'tip', 30, null::jsonb);
    raise exception 'community_category_invalid_value_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_category_invalid' then
      raise exception 'community_category_invalid_value_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v2('notice', 'info', 30, null::jsonb);
    raise exception 'community_category_notice_non_all_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_notice_category_unsupported' then
      raise exception 'community_category_notice_non_all_error:%', v_message;
    end if;
  end;

  -- A cursor produced for category=question cannot be reused for category=info.
  begin
    perform public.community_list_posts_v2(
      'all',
      'info',
      30,
      jsonb_build_object(
        'version', 3,
        'filter', 'all',
        'category', 'question',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_cursor_category_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_category_cursor_category_mix_error:%', v_message;
    end if;
  end;

  -- Filter and page-size mixing must remain rejected.
  begin
    perform public.community_list_posts_v2(
      'popular',
      'all',
      30,
      jsonb_build_object(
        'version', 3,
        'filter', 'all',
        'category', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_cursor_filter_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_category_cursor_filter_mix_error:%', v_message;
    end if;
  end;

  -- A pre-versioned cursor has no category/version identity and is invalid.
  begin
    perform public.community_list_posts_v2(
      'all',
      'all',
      30,
      jsonb_build_object(
        'filter', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_legacy_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_category_legacy_cursor_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v2(
      'all',
      'all',
      50,
      jsonb_build_object(
        'version', 3,
        'filter', 'all',
        'category', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_cursor_page_size_mix_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_category_cursor_page_size_mix_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v2(
      'all',
      'all',
      30,
      jsonb_build_object(
        'version', 2,
        'filter', 'all',
        'category', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_v2_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_version_unsupported' then
      raise exception 'community_category_v2_cursor_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v2(
      'all',
      'all',
      30,
      jsonb_build_object(
        'version', 99,
        'filter', 'all',
        'category', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_category_unsupported_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_version_unsupported' then
      raise exception 'community_category_unsupported_cursor_error:%', v_message;
    end if;
  end;
end
$$;

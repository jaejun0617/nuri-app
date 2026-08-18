do $$
declare
  v_function_oid oid;
  v_definition text;
  v_result jsonb;
  v_required_projection_keys constant text[] := array[
    'id',
    'user_id',
    'pet_id',
    'visibility',
    'title',
    'content',
    'image_url',
    'image_urls',
    'status',
    'category',
    'like_count',
    'comment_count',
    'view_count',
    'is_notice',
    'notice_published_at',
    'deleted_at',
    'created_at',
    'updated_at'
  ];
  v_projection_key text;
begin
  select p.oid, pg_get_functiondef(p.oid)
    into v_function_oid, v_definition
  from pg_proc p
  where p.oid = 'public.community_get_post_detail_v1(uuid)'::regprocedure;

  if v_function_oid is null then
    raise exception 'community_detail_function_missing';
  end if;

  if not exists (
    select 1
    from information_schema.routines r
    where r.routine_schema = 'public'
      and r.routine_name = 'community_get_post_detail_v1'
      and r.data_type = 'jsonb'
  ) then
    raise exception 'community_detail_return_contract_mismatch';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_function_oid
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_catalog']::text[]
      and p.proargnames = array['p_post_id']::text[]
  ) then
    raise exception 'community_detail_security_contract_mismatch';
  end if;

  if has_function_privilege(
    'public',
    'public.community_get_post_detail_v1(uuid)',
    'execute'
  ) then
    raise exception 'community_detail_public_execute_granted';
  end if;

  if not has_function_privilege(
    'anon',
    'public.community_get_post_detail_v1(uuid)',
    'execute'
  )
  or not has_function_privilege(
    'authenticated',
    'public.community_get_post_detail_v1(uuid)',
    'execute'
  ) then
    raise exception 'community_detail_required_execute_missing';
  end if;

  if lower(v_definition) not like '%auth.uid()%' then
    raise exception 'community_detail_auth_uid_missing';
  end if;

  if lower(v_definition) like '%p_viewer_id%' then
    raise exception 'community_detail_spoofable_viewer_parameter';
  end if;

  if lower(v_definition) not like '%public.community_user_blocks viewer_blocks%'
    or lower(v_definition) not like '%public.community_user_blocks author_blocks%' then
    raise exception 'community_detail_mutual_block_predicate_missing';
  end if;

  if lower(v_definition) not like '%p.visibility = ''public''%'
    or lower(v_definition) not like '%p.status = ''active''%'
    or lower(v_definition) not like '%p.deleted_at is null%' then
    raise exception 'community_detail_post_visibility_predicate_missing';
  end if;

  if lower(v_definition) not like '%from auth.users u%'
    or lower(v_definition) not like '%u.deleted_at is not null%'
    or lower(v_definition) not like '%u.banned_until%' then
    raise exception 'community_detail_author_visibility_predicate_missing';
  end if;

  if lower(v_definition) not like '%select p.*%'
    or lower(v_definition) not like '%into v_post%' then
    raise exception 'community_detail_post_projection_assignment_invalid';
  end if;

  if lower(v_definition) not like '%public.community_post_public_projection(v_post)%'
    or lower(v_definition) not like '%jsonb_build_object(''item'', null::jsonb)%' then
    raise exception 'community_detail_projection_or_unavailable_contract_missing';
  end if;

  if lower(v_definition) like '%blocked_by_user%'
    or lower(v_definition) like '%you_blocked_author%'
    or lower(v_definition) like '%block_reason%' then
    raise exception 'community_detail_block_reason_leak';
  end if;

  foreach v_projection_key in array v_required_projection_keys loop
    if not exists (
      select 1
      from pg_proc p
      where p.oid = 'public.community_post_public_projection(public.posts)'::regprocedure
        and lower(pg_get_functiondef(p.oid)) like '%' || quote_literal(v_projection_key) || '%'
    ) then
      raise exception 'community_detail_projection_key_missing:%', v_projection_key;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.community_user_blocks'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'community_detail_block_rls_disabled';
  end if;

  -- Read-only unavailable smoke: a non-existent post must not reveal a reason.
  v_result := public.community_get_post_detail_v1(
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  if v_result ? 'reason'
    or v_result ? 'error'
    or not (v_result ? 'item')
    or jsonb_typeof(v_result->'item') <> 'null' then
    raise exception 'community_detail_unavailable_response_mismatch';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = 'public.community_home_highlights_v1(text,integer,jsonb)'::regprocedure
      and lower(pg_get_functiondef(p.oid)) like '%public.community_user_blocks viewer_blocks%'
      and lower(pg_get_functiondef(p.oid)) like '%public.community_user_blocks author_blocks%'
  )
  or not exists (
    select 1
    from pg_proc p
    where p.oid = 'public.community_list_posts_v3(text,text,integer,jsonb)'::regprocedure
      and lower(pg_get_functiondef(p.oid)) like '%public.community_user_blocks viewer_blocks%'
      and lower(pg_get_functiondef(p.oid)) like '%public.community_user_blocks author_blocks%'
  ) then
    raise exception 'community_feed_block_regression';
  end if;
end;
$$;

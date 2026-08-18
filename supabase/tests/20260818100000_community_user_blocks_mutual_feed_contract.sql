do $$
declare
  v_block_table oid;
  v_home_oid oid;
  v_list_oid oid;
  v_home_definition text;
  v_list_definition text;
  v_helper_count integer;
  v_policy_count integer;
  v_result jsonb;
begin
  select 'public.community_user_blocks'::regclass into v_block_table;

  if v_block_table is null then
    raise exception 'community_user_blocks_table_missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_user_blocks'
      and column_name = 'blocker_user_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_user_blocks'
      and column_name = 'blocked_user_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_user_blocks'
      and column_name = 'created_at'
      and data_type = 'timestamp with time zone'
      and is_nullable = 'NO'
  ) then
    raise exception 'community_user_blocks_columns_mismatch';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = v_block_table
      and contype = 'p'
      and pg_get_constraintdef(oid) like '%PRIMARY KEY (blocker_user_id, blocked_user_id)%'
  ) then
    raise exception 'community_user_blocks_identity_constraint_missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = v_block_table
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%blocker_user_id <> blocked_user_id%'
  ) then
    raise exception 'community_user_blocks_self_constraint_missing';
  end if;

  if (
    select count(*)
    from pg_constraint
    where conrelid = v_block_table
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and confdeltype = 'c'
  ) <> 2 then
    raise exception 'community_user_blocks_auth_fks_mismatch';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'community_user_blocks'
      and indexname = 'community_user_blocks_blocked_blocker_idx'
      and lower(indexdef) like '%(blocked_user_id, blocker_user_id)%'
  ) then
    raise exception 'community_user_blocks_reverse_index_missing';
  end if;

  if not (
    select c.relrowsecurity
    from pg_class c
    where c.oid = v_block_table
  ) then
    raise exception 'community_user_blocks_rls_disabled';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'community_user_blocks';

  if v_policy_count <> 3 then
    raise exception 'community_user_blocks_policy_count_mismatch:%', v_policy_count;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'community_user_blocks'
      and policyname = 'community_user_blocks_select_own_outgoing'
      and cmd = 'SELECT'
      and qual like '%blocker_user_id%'
      and qual like '%auth.uid%'
      and qual not like '%blocked_user_id%auth.uid%'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'community_user_blocks'
      and policyname = 'community_user_blocks_insert_own_outgoing'
      and cmd = 'INSERT'
      and with_check like '%blocker_user_id%'
      and with_check like '%blocked_user_id%'
      and with_check like '%auth.uid%'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'community_user_blocks'
      and policyname = 'community_user_blocks_delete_own_outgoing'
      and cmd = 'DELETE'
      and qual like '%blocker_user_id%'
      and qual like '%auth.uid%'
  ) then
    raise exception 'community_user_blocks_policy_definition_mismatch';
  end if;

  if has_table_privilege('anon', 'public.community_user_blocks', 'select')
    or has_table_privilege('anon', 'public.community_user_blocks', 'insert')
    or has_table_privilege('anon', 'public.community_user_blocks', 'delete')
    or has_table_privilege('authenticated', 'public.community_user_blocks', 'update') then
    raise exception 'community_user_blocks_table_privilege_mismatch';
  end if;

  if not has_table_privilege('authenticated', 'public.community_user_blocks', 'select')
    or not has_table_privilege('authenticated', 'public.community_user_blocks', 'insert')
    or not has_table_privilege('authenticated', 'public.community_user_blocks', 'delete') then
    raise exception 'community_user_blocks_authenticated_privilege_missing';
  end if;

  select p.oid, pg_get_functiondef(p.oid)
  into v_home_oid, v_home_definition
  from pg_proc p
  where p.oid = 'public.community_home_highlights_v1(text,integer,jsonb)'::regprocedure;

  select p.oid, pg_get_functiondef(p.oid)
  into v_list_oid, v_list_definition
  from pg_proc p
  where p.oid = 'public.community_list_posts_v3(text,text,integer,jsonb)'::regprocedure;

  if v_home_oid is null or v_list_oid is null then
    raise exception 'community_feed_rpc_missing';
  end if;

  if v_home_definition not like '%public.community_user_blocks viewer_blocks%'
    or v_home_definition not like '%public.community_user_blocks author_blocks%'
    or v_list_definition not like '%public.community_user_blocks viewer_blocks%'
    or v_list_definition not like '%public.community_user_blocks author_blocks%' then
    raise exception 'community_feed_mutual_block_predicate_missing';
  end if;

  if lower(v_home_definition) not like '%p_limit integer default 3%'
    or lower(v_home_definition) not like '%order by p.like_count desc, p.created_at desc, p.id desc%'
    or lower(v_home_definition) like '%p.like_count >= 10%'
    or v_home_definition not like '%cursorVersion'', 1%' then
    raise exception 'community_home_contract_regression';
  end if;

  if v_list_definition not like '%p.like_count >= 10%'
    or v_list_definition not like '%cursorVersion'', 4%'
    or v_list_definition not like '%limit ($1 + 1)%' then
    raise exception 'community_list_contract_regression';
  end if;

  if not (
    select p.prosecdef
    from pg_proc p
    where p.oid = v_home_oid
  ) or not (
    select p.prosecdef
    from pg_proc p
    where p.oid = v_list_oid
  ) then
    raise exception 'community_feed_security_definer_missing';
  end if;

  if (
    select coalesce(array_to_string(p.proconfig, ';'), '')
    from pg_proc p
    where p.oid = v_home_oid
  ) not like '%search_path=public, pg_catalog%'
  or (
    select coalesce(array_to_string(p.proconfig, ';'), '')
    from pg_proc p
    where p.oid = v_list_oid
  ) not like '%search_path=public, pg_catalog%' then
    raise exception 'community_feed_search_path_missing';
  end if;

  if not has_function_privilege('anon', v_home_oid, 'execute')
    or not has_function_privilege('authenticated', v_home_oid, 'execute')
    or not has_function_privilege('anon', v_list_oid, 'execute')
    or not has_function_privilege('authenticated', v_list_oid, 'execute') then
    raise exception 'community_feed_execute_grant_missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.posts'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'community_posts_rls_regression';
  end if;

  -- Read-only anonymous contract smoke. auth.uid() is null for this catalog
  -- session, so the existing public visibility path must remain callable.
  v_result := public.community_home_highlights_v1('all', 3, null::jsonb);
  if v_result->>'scope' <> 'home_highlights'
    or (v_result->>'pageSize')::integer <> 3
    or jsonb_typeof(v_result->'items') <> 'array' then
    raise exception 'community_home_anonymous_contract_regression';
  end if;

  v_result := public.community_list_posts_v3('all', 'all', 30, null::jsonb);
  if (v_result->>'cursorVersion')::integer <> 4
    or (v_result->>'pageSize')::integer <> 30
    or jsonb_typeof(v_result->'items') <> 'array' then
    raise exception 'community_list_anonymous_contract_regression';
  end if;

  -- No direct helper or incoming relation surface is introduced.
  select count(*)
  into v_helper_count
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname = 'community_user_visible_to_viewer';

  if v_helper_count <> 0 then
    raise exception 'unexpected_block_visibility_helper_surface';
  end if;
end;
$$;

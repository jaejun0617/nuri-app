do $$
declare
  v_helper_oid oid;
  v_helper_definition text;
  v_select_policy_qual text;
  v_public_helper_oid oid;
  v_public_post_id uuid;
  v_helper_result boolean;
  v_policy_count integer;
begin
  if to_regnamespace('private') is null then
    raise exception 'community_private_schema_missing';
  end if;

  if has_schema_privilege('public', 'private', 'USAGE')
    or has_schema_privilege('service_role', 'private', 'USAGE')
    or not has_schema_privilege('anon', 'private', 'USAGE')
    or not has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'community_private_schema_privilege_mismatch';
  end if;

  select p.oid, pg_get_functiondef(p.oid)
    into v_helper_oid, v_helper_definition
  from pg_proc p
  where p.oid =
    'private.community_parent_post_visible_to_current_user(uuid)'::regprocedure;

  if v_helper_oid is null then
    raise exception 'community_private_parent_visibility_helper_missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_helper_oid
      and p.prorettype = 'boolean'::regtype
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_catalog']::text[]
      and p.proargnames = array['p_post_id']::text[]
  ) then
    raise exception 'community_private_parent_visibility_helper_security_mismatch';
  end if;

  if has_function_privilege(
    'public',
    'private.community_parent_post_visible_to_current_user(uuid)',
    'execute'
  )
  or not has_function_privilege(
    'anon',
    'private.community_parent_post_visible_to_current_user(uuid)',
    'execute'
  )
  or not has_function_privilege(
    'authenticated',
    'private.community_parent_post_visible_to_current_user(uuid)',
    'execute'
  )
  or has_function_privilege(
    'service_role',
    'private.community_parent_post_visible_to_current_user(uuid)',
    'execute'
  ) then
    raise exception 'community_private_parent_visibility_helper_privilege_mismatch';
  end if;

  select p.oid
    into v_public_helper_oid
  from pg_proc p
  where p.oid =
    'public.community_parent_post_visible_to_current_user(uuid)'::regprocedure;

  if v_public_helper_oid is null
    or has_function_privilege(
      'public',
      'public.community_parent_post_visible_to_current_user(uuid)',
      'execute'
    )
    or has_function_privilege(
      'anon',
      'public.community_parent_post_visible_to_current_user(uuid)',
      'execute'
    )
    or has_function_privilege(
      'authenticated',
      'public.community_parent_post_visible_to_current_user(uuid)',
      'execute'
    )
    or has_function_privilege(
      'service_role',
      'public.community_parent_post_visible_to_current_user(uuid)',
      'execute'
    ) then
    raise exception 'community_public_parent_visibility_helper_exposure_changed';
  end if;

  if lower(v_helper_definition) not like '%auth.uid()%'
    or lower(v_helper_definition) like '%p_viewer_id%' then
    raise exception 'community_parent_visibility_identity_contract_mismatch';
  end if;

  if lower(v_helper_definition) not like '%p.visibility = ''public''%'
    or lower(v_helper_definition) not like '%p.status = ''active''%'
    or lower(v_helper_definition) not like '%p.deleted_at is null%'
    or lower(v_helper_definition) not like '%from auth.users u%'
    or lower(v_helper_definition) not like '%u.deleted_at is not null%'
    or lower(v_helper_definition) not like '%u.banned_until%' then
    raise exception 'community_parent_visibility_post_predicate_missing';
  end if;

  if lower(v_helper_definition) not like '%public.community_user_blocks viewer_blocks%'
    or lower(v_helper_definition) not like '%public.community_user_blocks author_blocks%' then
    raise exception 'community_parent_visibility_mutual_block_missing';
  end if;

  select count(*)
    into v_policy_count
  from pg_policy
  where polrelid = 'public.comments'::regclass;

  if v_policy_count <> 4 then
    raise exception 'community_comments_policy_count_changed:%', v_policy_count;
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into v_select_policy_qual
  from pg_policy pol
  where pol.polrelid = 'public.comments'::regclass
    and pol.polname = 'comments_select_by_post_visibility'
    and pol.polcmd = 'r';

  if v_select_policy_qual is null
    or lower(v_select_policy_qual) not like '%private.community_parent_post_visible_to_current_user%'
    or lower(v_select_policy_qual) not like '%status = ''active''%'
    or lower(v_select_policy_qual) not like '%deleted_at is null%'
    or lower(v_select_policy_qual) like '%public.community_parent_post_visible_to_current_user%' then
    raise exception 'community_comments_select_policy_mismatch';
  end if;

  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_insert_own'
      and polcmd = 'a'
      and lower(pg_get_expr(polwithcheck, polrelid)) like '%can_insert_community_comment%'
  )
  or not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_update_own'
      and polcmd = 'w'
      and lower(pg_get_expr(polqual, polrelid)) like '%is_community_admin()%'
      and lower(pg_get_expr(polwithcheck, polrelid)) like '%is_community_admin()%'
  )
  or not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_delete_own'
      and polcmd = 'd'
      and lower(pg_get_expr(polqual, polrelid)) like '%is_community_admin()%'
  ) then
    raise exception 'community_comments_write_policy_changed';
  end if;

  if not has_table_privilege('anon', 'public.comments', 'select')
    or not has_table_privilege('authenticated', 'public.comments', 'select')
    or not has_table_privilege('anon', 'public.comments', 'insert')
    or not has_table_privilege('authenticated', 'public.comments', 'insert')
    or not has_table_privilege('anon', 'public.comments', 'update')
    or not has_table_privilege('authenticated', 'public.comments', 'update')
    or not has_table_privilege('anon', 'public.comments', 'delete')
    or not has_table_privilege('authenticated', 'public.comments', 'delete') then
    raise exception 'community_comments_table_grant_changed';
  end if;

  if has_table_privilege('public', 'public.comments', 'select') then
    raise exception 'community_comments_public_grant_changed';
  end if;

  v_helper_result := private.community_parent_post_visible_to_current_user(
    '00000000-0000-0000-0000-000000000000'::uuid
  );
  if v_helper_result then
    raise exception 'community_parent_visibility_nonexistent_post_visible';
  end if;

  select p.id
    into v_public_post_id
  from public.posts p
  where p.visibility = 'public'
    and p.status = 'active'
    and p.deleted_at is null
  order by p.created_at desc, p.id desc
  limit 1;

  if v_public_post_id is not null
    and not private.community_parent_post_visible_to_current_user(v_public_post_id) then
    raise exception 'community_parent_visibility_public_post_hidden';
  end if;
end;
$$;

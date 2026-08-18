do $$
declare
  v_function_oid oid;
  v_definition text;
  v_select_policy text;
  v_update_policy text;
  v_insert_policy text;
  v_delete_policy text;
begin
  select p.oid, pg_get_functiondef(p.oid)
    into v_function_oid, v_definition
  from pg_proc p
  where p.oid =
    'public.community_soft_delete_comment_v1(uuid)'::regprocedure;

  if v_function_oid is null then
    raise exception 'community_comment_soft_delete_rpc_missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_function_oid
      and p.prorettype = 'boolean'::regtype
      and p.prosecdef
      and p.provolatile = 'v'
      and p.proconfig @> array['search_path=public, pg_catalog']::text[]
      and p.proargnames = array['p_comment_id']::text[]
  ) then
    raise exception 'community_comment_soft_delete_rpc_security_mismatch';
  end if;

  if has_function_privilege(
    'public',
    'public.community_soft_delete_comment_v1(uuid)',
    'execute'
  )
  or has_function_privilege(
    'anon',
    'public.community_soft_delete_comment_v1(uuid)',
    'execute'
  )
  or has_function_privilege(
    'service_role',
    'public.community_soft_delete_comment_v1(uuid)',
    'execute'
  )
  or not has_function_privilege(
    'authenticated',
    'public.community_soft_delete_comment_v1(uuid)',
    'execute'
  ) then
    raise exception 'community_comment_soft_delete_rpc_grant_mismatch';
  end if;

  if lower(v_definition) not like '%auth.uid()%'
    or lower(v_definition) like '%p_user_id%'
    or lower(v_definition) not like '%c.user_id = v_actor_id%'
    or lower(v_definition) not like '%c.status = ''active''%'
    or lower(v_definition) not like '%c.deleted_at is null%'
    or lower(v_definition) not like '%private.community_parent_post_visible_to_current_user%'
    or lower(v_definition) not like '%status = ''deleted''%'
    or lower(v_definition) not like '%deleted_at = coalesce%'
    or lower(v_definition) not like '%errcode = ''42501''%' then
    raise exception 'community_comment_soft_delete_rpc_body_mismatch';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.comments'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'community_comments_rls_disabled';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into v_select_policy
  from pg_policy pol
  where pol.polrelid = 'public.comments'::regclass
    and pol.polname = 'comments_select_by_post_visibility'
    and pol.polcmd = 'r';

  if v_select_policy is null
    or lower(v_select_policy) not like '%status = ''active''%'
    or lower(v_select_policy) not like '%deleted_at is null%'
    or lower(v_select_policy) not like '%private.community_parent_post_visible_to_current_user%'
  then
    raise exception 'community_comments_select_visibility_regressed';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into v_update_policy
  from pg_policy pol
  where pol.polrelid = 'public.comments'::regclass
    and pol.polname = 'comments_update_own'
    and pol.polcmd = 'w';

  if v_update_policy is null
    or lower(v_update_policy) not like '%auth.uid() = user_id%'
    or lower(v_update_policy) not like '%is_community_admin()%'
  then
    raise exception 'community_comments_write_policy_regressed';
  end if;

  select pg_get_expr(pol.polwithcheck, pol.polrelid)
    into v_insert_policy
  from pg_policy pol
  where pol.polrelid = 'public.comments'::regclass
    and pol.polname = 'comments_insert_own'
    and pol.polcmd = 'a';

  if v_insert_policy is null
    or lower(v_insert_policy) not like '%auth.uid() = user_id%'
  then
    raise exception 'community_comments_insert_policy_regressed';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into v_delete_policy
  from pg_policy pol
  where pol.polrelid = 'public.comments'::regclass
    and pol.polname = 'comments_delete_own'
    and pol.polcmd = 'd';

  if v_delete_policy is null
    or lower(v_delete_policy) not like '%auth.uid() = user_id%'
    or lower(v_delete_policy) not like '%is_community_admin()%'
  then
    raise exception 'community_comments_delete_policy_regressed';
  end if;

  if not has_table_privilege('authenticated', 'public.comments', 'update')
    or not has_table_privilege('authenticated', 'public.comments', 'select')
  then
    raise exception 'community_comments_authenticated_privilege_regressed';
  end if;
end;
$$;

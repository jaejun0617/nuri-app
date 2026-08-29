do $$
declare
  v_trigger_oid oid;
  v_trigger_definition text;
  v_rpc_oid oid;
  v_rpc_definition text;
  v_reply_to_function_definition text;
  v_policy_count integer;
  v_column_count integer;
begin
  select count(*)
    into v_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'comments'
    and column_name in ('reply_to_comment_id', 'reply_target_user_id')
    and udt_name = 'uuid'
    and is_nullable = 'YES';

  if v_column_count <> 2 then
    raise exception 'community_thread_reply_target_columns_mismatch';
  end if;

  select p.oid, pg_get_functiondef(p.oid)
    into v_trigger_oid, v_reply_to_function_definition
  from pg_proc p
  where p.oid =
    'public.enforce_community_comment_reply_target()'::regprocedure;

  if v_trigger_oid is null then
    raise exception 'community_thread_reply_target_trigger_function_missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_trigger_oid
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_catalog']::text[]
  ) then
    raise exception 'community_thread_reply_target_trigger_security_mismatch';
  end if;

  if has_function_privilege(
    'public',
    'public.enforce_community_comment_reply_target()',
    'execute'
  )
  or has_function_privilege(
    'anon',
    'public.enforce_community_comment_reply_target()',
    'execute'
  )
  or has_function_privilege(
    'authenticated',
    'public.enforce_community_comment_reply_target()',
    'execute'
  )
  or has_function_privilege(
    'service_role',
    'public.enforce_community_comment_reply_target()',
    'execute'
  ) then
    raise exception 'community_thread_reply_target_trigger_exposure';
  end if;

  if lower(v_reply_to_function_definition) not like '%new.reply_to_comment_id is null%'
    or lower(v_reply_to_function_definition) not like '%new.parent_comment_id is null%'
    or lower(v_reply_to_function_definition) not like '%new.reply_to_comment_id := null%'
    or lower(v_reply_to_function_definition) not like '%new.reply_target_user_id := null%'
    or lower(v_reply_to_function_definition) not like '%v_target.user_id%'
    or lower(v_reply_to_function_definition) not like '%coalesce(v_target.parent_comment_id, v_target.id)%'
    or lower(v_reply_to_function_definition) like '%coalesce(new.reply_to_comment_id, new.parent_comment_id)%' then
    raise exception 'community_thread_reply_target_semantics_mismatch';
  end if;

  select t.oid, pg_get_triggerdef(t.oid)
    into v_trigger_oid, v_trigger_definition
  from pg_trigger t
  where t.tgrelid = 'public.comments'::regclass
    and t.tgname = 'trg_community_comment_reply_target_integrity'
    and not t.tgisinternal;

  if v_trigger_oid is null
    or lower(v_trigger_definition) not like '%before%'
    or lower(v_trigger_definition) not like '%insert%'
    or lower(v_trigger_definition) not like '%update%'
    or lower(v_trigger_definition) not like '%reply_to_comment_id%'
    or lower(v_trigger_definition) not like '%reply_target_user_id%' then
    raise exception 'community_thread_reply_target_trigger_mismatch';
  end if;

  select p.oid, pg_get_functiondef(p.oid)
    into v_rpc_oid, v_rpc_definition
  from pg_proc p
  where p.oid =
    'public.community_create_comment_v1(uuid,text,uuid,uuid)'::regprocedure;

  if v_rpc_oid is null then
    raise exception 'community_thread_reply_create_rpc_missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_rpc_oid
      and p.prorettype = 'jsonb'::regtype
      and p.prosecdef
      and p.proconfig @> array['search_path=public, pg_catalog']::text[]
      and p.proargnames = array[
        'p_post_id',
        'p_content',
        'p_parent_comment_id',
        'p_reply_to_comment_id'
      ]::text[]
  ) then
    raise exception 'community_thread_reply_create_rpc_security_mismatch';
  end if;

  if lower(v_rpc_definition) not like '%p_parent_comment_id%'
    or lower(v_rpc_definition) not like '%p_reply_to_comment_id%'
    or lower(v_rpc_definition) not like '%reply_to_comment_id%'
    or lower(v_rpc_definition) not like '%reply_target_user_id%'
    or lower(v_rpc_definition) not like '%v_actor_id%' then
    raise exception 'community_thread_reply_create_rpc_projection_mismatch';
  end if;

  if has_function_privilege(
    'public',
    'public.community_create_comment_v1(uuid,text,uuid,uuid)',
    'execute'
  )
  or has_function_privilege(
    'anon',
    'public.community_create_comment_v1(uuid,text,uuid,uuid)',
    'execute'
  )
  or has_function_privilege(
    'service_role',
    'public.community_create_comment_v1(uuid,text,uuid,uuid)',
    'execute'
  )
  or not has_function_privilege(
    'authenticated',
    'public.community_create_comment_v1(uuid,text,uuid,uuid)',
    'execute'
  ) then
    raise exception 'community_thread_reply_create_rpc_grant_mismatch';
  end if;

  select count(*)
    into v_policy_count
  from pg_policy
  where polrelid = 'public.comments'::regclass;

  if v_policy_count <> 4 then
    raise exception 'community_comments_policy_count_changed:%', v_policy_count;
  end if;

  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_select_by_post_visibility'
      and polcmd = 'r'
      and lower(pg_get_expr(polqual, polrelid))
        like '%private.community_parent_post_visible_to_current_user%'
  ) then
    raise exception 'community_comments_select_policy_regressed';
  end if;

  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_insert_own'
      and polcmd = 'a'
      and lower(pg_get_expr(polwithcheck, polrelid))
        like '%can_insert_community_comment%'
  ) then
    raise exception 'community_comments_insert_policy_regressed';
  end if;

  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_update_own'
      and polcmd = 'w'
      and lower(pg_get_expr(polqual, polrelid)) like '%auth.uid() = user_id%'
      and lower(pg_get_expr(polwithcheck, polrelid)) like '%auth.uid() = user_id%'
  ) then
    raise exception 'community_comments_update_policy_regressed';
  end if;

  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.comments'::regclass
      and polname = 'comments_delete_own'
      and polcmd = 'd'
      and lower(pg_get_expr(polqual, polrelid)) like '%auth.uid() = user_id%'
  ) then
    raise exception 'community_comments_delete_policy_regressed';
  end if;
end;
$$;

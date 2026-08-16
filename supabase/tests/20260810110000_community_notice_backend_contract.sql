-- NURI-09 backend contract assertions.
-- This file performs catalog/permission checks only. It creates no account,
-- post, like, notice, or moderation row. Identity checks run in rolled-back
-- transactions and never print UUIDs or JWT material.

do $$
declare
  v_policy_count integer;
begin
  if has_function_privilege(
    'anon',
    'public.set_community_target_status(text, uuid, text, text, text, uuid, text, uuid, text, text)',
    'execute'
  ) then
    raise exception 'community_notice_test_set_status_anon_execute_still_granted';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.set_community_target_status(text, uuid, text, text, text, uuid, text, uuid, text, text)',
    'execute'
  ) then
    raise exception 'community_notice_test_set_status_authenticated_execute_still_granted';
  end if;

  if has_function_privilege(
    'anon',
    'public.refresh_community_moderation_queue(text, uuid, uuid)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.refresh_community_moderation_queue(text, uuid, uuid)',
    'execute'
  ) then
    raise exception 'community_notice_test_refresh_direct_execute_still_granted';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.community_notice_mutate_v1(text, uuid, text, text, text)',
    'execute'
  ) then
    raise exception 'community_notice_test_notice_rpc_authenticated_execute_missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.community_notice_mutate_v1(text, uuid, text, text, text)',
    'execute'
  ) then
    raise exception 'community_notice_test_notice_rpc_anon_execute_still_granted';
  end if;

  select count(*)
  into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'posts'
    and policyname in ('posts_insert_own', 'posts_update_own', 'posts_delete_own')
    and (
      coalesce(qual, '') like '%is_notice%'
      or coalesce(with_check, '') like '%is_notice%'
    );

  if v_policy_count <> 3 then
    raise exception 'community_notice_test_posts_notice_rls_contract_missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.posts'::regclass
      and tgname = 'trg_guard_community_notice_insert'
      and not tgisinternal
  ) then
    raise exception 'community_notice_test_notice_insert_trigger_missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.posts'::regclass
      and tgname = 'trg_guard_community_notice_update'
      and not tgisinternal
  ) then
    raise exception 'community_notice_test_notice_update_trigger_missing';
  end if;

  if not exists (
    select 1
    from pg_class
    where relname = 'idx_posts_active_public_popular'
      and relnamespace = 'public'::regnamespace
  ) then
    raise exception 'community_notice_test_popular_index_missing';
  end if;

  if not exists (
    select 1
    from pg_class
    where relname = 'idx_posts_active_public_notice'
      and relnamespace = 'public'::regnamespace
  ) then
    raise exception 'community_notice_test_notice_index_missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'is_notice'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'notice_published_at'
      and is_nullable = 'YES'
  ) then
    raise exception 'community_notice_test_notice_columns_missing';
  end if;

  if not exists (
    select 1
    from public.admin_operator_role_assignments
    where lower(actor_label) = 'adminqa'
      and is_active = true
      and 'community_notice_operator' = any(capabilities)
  ) then
    raise exception 'community_notice_test_adminqa_capability_missing';
  end if;

  if not exists (
    select 1
    from public.community_notice_operator_bindings b
    join public.admin_operator_role_assignments a
      on a.actor_label = b.actor_label
    where b.actor_label = 'adminQA'
      and b.capability = 'community_notice_operator'
      and b.is_active = true
      and a.is_active = true
      and 'community_notice_operator' = any(a.capabilities)
  ) then
    raise exception 'community_notice_test_adminqa_identity_binding_missing';
  end if;

  if not exists (
    select 1
    from public.admin_action_policies
    where action_type = 'community_notice_create'
      and required_capability = 'community_notice_operator'
      and is_disabled = false
  ) then
    raise exception 'community_notice_test_action_policy_missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'community_list_posts_v1'
      and pg_get_function_identity_arguments(p.oid) = 'p_filter text, p_limit integer, p_cursor jsonb'
  ) then
    raise exception 'community_notice_test_list_rpc_missing';
  end if;
end
$$;

-- Positive capability contract: the fixed adminQA profile reaches RPC
-- validation, but this transaction is rolled back before any mutation.
begin;
do $$
declare
  v_user_id uuid;
begin
  select p.user_id
  into v_user_id
  from public.profiles p
  where lower(p.nickname) = 'adminqa'
  limit 1;
  if v_user_id is null then
    raise exception 'community_notice_test_adminqa_profile_missing';
  end if;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'authenticated', 'sub', v_user_id)::text,
    true
  );
end
$$;
set local role authenticated;

do $$
declare
  v_message text;
begin
  begin
    perform public.community_notice_mutate_v1('invalid_action');
    raise exception 'community_notice_test_adminqa_rpc_guard_not_reached';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_notice_action_invalid' then
      raise exception 'community_notice_test_adminqa_capability_failed:%', v_message;
    end if;
  end;
end
$$;
rollback;

-- Read contract validation: all approved page sizes are accepted, invalid
-- limits are rejected, and a cursor cannot cross filters.
do $$
declare
  v_message text;
  v_limit integer;
begin
  foreach v_limit in array array[30, 50, 100, 150, 200] loop
    perform public.community_list_posts_v1('notice', v_limit, null::jsonb);
  end loop;

  begin
    perform public.community_list_posts_v1('all', 20, null::jsonb);
    raise exception 'community_list_test_invalid_limit_not_rejected';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_page_size_invalid' then
      raise exception 'community_list_test_invalid_limit_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v1(
      'popular',
      30,
      jsonb_build_object(
        'filter', 'all',
        'pageSize', 30,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_list_test_filter_cursor_not_rejected';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_list_test_cursor_error:%', v_message;
    end if;
  end;
end
$$;

-- Negative permission contract: an existing ordinary profile cannot call the
-- revoked status helper and cannot pass the notice RPC capability guard.
begin;
do $$
declare
  v_user_id uuid;
begin
  select p.user_id
  into v_user_id
  from public.profiles p
  where p.role = 'user'
    and lower(coalesce(p.nickname, '')) <> 'adminqa'
  limit 1;
  if v_user_id is null then
    raise exception 'community_notice_test_ordinary_profile_missing';
  end if;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('role', 'authenticated', 'sub', v_user_id)::text,
    true
  );
end
$$;
set local role authenticated;

do $$
declare
  v_sqlstate text;
  v_message text;
begin
  begin
    perform public.set_community_target_status(
      'post',
      gen_random_uuid(),
      'hidden',
      'manual_moderation'
    );
    raise exception 'community_notice_test_non_operator_status_call_succeeded';
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate,
      v_message = message_text;
    if v_sqlstate <> '42501' then
      raise exception 'community_notice_test_non_operator_status_error:%:%', v_sqlstate, v_message;
    end if;
  end;

  begin
    perform public.community_notice_mutate_v1('invalid_action');
    raise exception 'community_notice_test_non_operator_notice_call_succeeded';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_notice_operator_required' then
      raise exception 'community_notice_test_non_operator_notice_error:%', v_message;
    end if;
  end;
end
$$;
rollback;

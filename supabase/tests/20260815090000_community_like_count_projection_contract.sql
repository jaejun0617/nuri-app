-- NURI-09 like_count projection contract test.
--
-- This test is catalog/read-only by design. It performs no INSERT, UPDATE,
-- DELETE, account operation, cleanup, or production repair. Runtime mutation
-- cases requiring controlled users are reported separately when no approved
-- fixture is available.

do $$
declare
  v_trigger_definition text;
  v_trigger_function_oid oid;
  v_trigger_security_definer boolean;
  v_trigger_config text;
  v_repair_security_definer boolean;
  v_list_definition text;
  v_projection_definition text;
  v_popular_index text;
  v_mismatch_posts bigint;
begin
  select pg_get_triggerdef(t.oid), t.tgfoid
  into v_trigger_definition, v_trigger_function_oid
  from pg_trigger t
  where t.tgrelid = 'public.likes'::regclass
    and not t.tgisinternal
    and t.tgname = 'trg_sync_post_like_count';

  if v_trigger_definition is null then
    raise exception 'community_like_contract_trigger_missing';
  end if;

  if v_trigger_definition not like '%AFTER INSERT OR DELETE ON public.likes%' then
    raise exception 'community_like_contract_trigger_event_mismatch';
  end if;

  select p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '')
  into v_trigger_security_definer, v_trigger_config
  from pg_proc p
  where p.oid = v_trigger_function_oid;

  if v_trigger_security_definer is distinct from true then
    raise exception 'community_like_contract_trigger_not_security_definer';
  end if;

  if v_trigger_config not like '%search_path=public, pg_catalog%' then
    raise exception 'community_like_contract_trigger_search_path_missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.sync_post_like_count()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.sync_post_like_count()',
    'execute'
  ) then
    raise exception 'community_like_contract_trigger_direct_execute_open';
  end if;

  if not has_function_privilege(
    'postgres',
    'public.sync_post_like_count()',
    'execute'
  ) then
    raise exception 'community_like_contract_trigger_owner_execute_missing';
  end if;

  select p.prosecdef
  into v_repair_security_definer
  from pg_proc p
  where p.oid = 'public.repair_post_counts(uuid)'::regprocedure;

  if v_repair_security_definer is distinct from false then
    raise exception 'community_like_contract_repair_security_changed';
  end if;

  if has_function_privilege(
    'anon',
    'public.repair_post_counts(uuid)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.repair_post_counts(uuid)',
    'execute'
  ) then
    raise exception 'community_like_contract_repair_direct_execute_open';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.likes'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (post_id, user_id)'
  ) then
    raise exception 'community_like_contract_unique_constraint_missing';
  end if;

  select pg_get_functiondef('public.community_list_posts_v1(text,integer,jsonb)'::regprocedure)
  into v_list_definition;

  if v_list_definition is null
    or v_list_definition not like '%p.like_count >= 10%'
    or v_list_definition not like '%p.like_count desc, p.comment_count desc%' then
    raise exception 'community_like_contract_popular_query_mismatch';
  end if;

  select pg_get_functiondef('public.community_post_public_projection(public.posts)'::regprocedure)
  into v_projection_definition;

  if v_projection_definition is null
    or v_projection_definition not like '%''like_count'', p_post.like_count%' then
    raise exception 'community_like_contract_projection_source_mismatch';
  end if;

  select indexdef
  into v_popular_index
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'posts'
    and indexname = 'idx_posts_active_public_popular';

  if v_popular_index is null
    or lower(v_popular_index) not like '%like_count desc%'
    or lower(v_popular_index) not like '%comment_count desc%'
    or lower(v_popular_index) not like '%like_count >= 10%' then
    raise exception 'community_like_contract_popular_index_missing';
  end if;

  -- Current live aggregate check. It must not repair the data. If no controlled
  -- rows exist, the threshold cases remain runtime-unverified by design.
  with per_post as (
    select
      p.id,
      p.like_count,
      count(l.id)::integer as like_rows
    from public.posts p
    left join public.likes l on l.post_id = p.id
    group by p.id, p.like_count
  )
  select count(*) filter (where like_count <> like_rows)
  into v_mismatch_posts
  from per_post;

  if v_mismatch_posts <> 0 then
    raise exception 'community_like_contract_live_mismatch:%', v_mismatch_posts;
  end if;
end
$$;

-- Runtime cases intentionally not executed here because they require
-- authenticated controlled mutation fixtures:
-- non-owner insert/delete, duplicate insert, cancel/re-register,
-- concurrent distinct-user inserts, and 9/10/11 popular threshold rows for
-- question/daily/info/notice. NURI-09/NURI-12 must run those only after the
-- approved controlled-QA fixture and session gates are available.

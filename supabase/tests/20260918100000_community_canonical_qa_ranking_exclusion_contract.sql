-- NURI-09 canonical QA ranking exclusion contract.
-- Catalog/read-only assertions only. No account, content, ledger, ranking
-- fixture, deletion request, or production data mutation is performed.
-- This contract is intended for the canonical linked NURI environment, where
-- the three approved auth.users identities exist. A fresh local environment
-- without those identities may legitimately seed zero registry rows through
-- the replay-safe migration; that local state is not evidence for the live
-- three-row assertion below.

do $$
declare
  v_definition text;
  v_helper_definition text;
  v_security_definer boolean;
  v_config text;
  v_excluded_count integer;
  v_status_list_count integer;
begin
  if to_regclass('public.nuri_public_ranking_exclusions') is null then
    raise exception 'nuri_ranking_exclusion_registry_missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.nuri_public_ranking_exclusions'::regclass
      and c.relrowsecurity
  ) then
    raise exception 'nuri_ranking_exclusion_registry_rls_missing';
  end if;

  select count(*)
    into v_excluded_count
  from public.nuri_public_ranking_exclusions
  where classification = 'canonical_qa'
    and exclude_from_public_ranking;

  if v_excluded_count <> 3
    or (
      select count(*)
      from public.nuri_public_ranking_exclusions e
      where e.user_id in (
        'b8ae4ccd-cf29-4fd5-8eb9-7e6e03c45a38'::uuid,
        '663967ed-b561-4ea9-97e1-b8eaebe00707'::uuid,
        '0017f0e6-e36c-41a0-9ca4-61687a164111'::uuid
      )
        and e.classification = 'canonical_qa'
        and e.exclude_from_public_ranking
    ) <> 3 then
    raise exception 'nuri_ranking_exclusion_registry_seed_mismatch';
  end if;

  if exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
    where c.oid = 'public.nuri_public_ranking_exclusions'::regclass
      and (
        a.grantee = 0
        or a.grantee in (
          'anon'::regrole,
          'authenticated'::regrole,
          'service_role'::regrole
        )
      )
      and a.privilege_type in (
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
  ) then
    raise exception 'nuri_ranking_exclusion_registry_direct_read_open';
  end if;

  select pg_get_functiondef(p.oid)
    into v_helper_definition
  from pg_proc p
  where p.oid =
    'public.is_nuri_public_ranking_excluded_user_v1(uuid)'::regprocedure;

  if v_helper_definition is null
    or lower(v_helper_definition) not like '%security definer%'
    or lower(v_helper_definition) not like '%search_path to ''public'', ''pg_catalog''%' then
    raise exception 'nuri_ranking_exclusion_helper_security_mismatch';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.oid =
      'public.is_nuri_public_ranking_excluded_user_v1(uuid)'::regprocedure
      and (
        a.grantee = 0
        or a.grantee in (
          'anon'::regrole,
          'authenticated'::regrole,
          'service_role'::regrole
        )
      )
      and a.privilege_type = 'EXECUTE'
  ) then
    raise exception 'nuri_ranking_exclusion_helper_direct_execute_open';
  end if;

  select p.prosecdef, coalesce(array_to_string(p.proconfig, ';'), ''), pg_get_functiondef(p.oid)
    into v_security_definer, v_config, v_definition
  from pg_proc p
  where p.oid = 'public.get_activity_ranking_v1(text,integer,boolean)'::regprocedure;

  if not v_security_definer
    or lower(v_config) not like '%search_path=public, pg_catalog%'
    or lower(v_definition) not like '%is_nuri_public_ranking_excluded_user_v1%'
    or lower(v_definition) not like '%p_include_qa_fixture boolean default false%'
    or lower(v_definition) not like '%row_source text%' then
    raise exception 'nuri_ranking_function_security_or_shape_mismatch';
  end if;

  -- Preserve the existing deletion status contract. In particular, the
  -- normal 7-day pending_grace_period state is not added to this list.
  select count(*)
    into v_status_list_count
  from unnest(array[
    'requested',
    'in_progress',
    'db_deleted',
    'cleanup_pending',
    'completed',
    'completed_with_cleanup_pending',
    'unknown_pending_confirmation'
  ]) as expected(status)
  where lower(v_definition) like ('%' || quote_literal(expected.status) || '%');

  if v_status_list_count <> 7
    or lower(v_definition) like '%pending_grace_period%' then
    raise exception 'nuri_ranking_deletion_status_contract_changed';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_activity_ranking_v1(text,integer,boolean)',
    'execute'
  )
  or has_function_privilege(
    'anon',
    'public.get_activity_ranking_v1(text,integer,boolean)',
    'execute'
  ) then
    raise exception 'nuri_ranking_function_grant_contract_mismatch';
  end if;
end;
$$;

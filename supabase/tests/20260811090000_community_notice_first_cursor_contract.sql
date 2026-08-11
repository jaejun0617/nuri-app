-- NURI-09 ordering/cursor contract assertions.
-- This test performs catalog/read checks only. It creates no account, post,
-- like, notice, or moderation row and never prints UUIDs or token material.

do $$
declare
  v_definition text;
  v_index_definition text;
  v_message text;
  v_result jsonb;
  v_notice_count integer;
  v_normal_count integer;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'community_list_posts_v1'
    and pg_get_function_identity_arguments(p.oid) = 'p_filter text, p_limit integer, p_cursor jsonb';

  if v_definition is null then
    raise exception 'community_cursor_test_list_rpc_missing';
  end if;

  if v_definition not like '%p.is_notice desc, p.notice_published_at desc nulls last, p.created_at desc, p.id desc%' then
    raise exception 'community_cursor_test_all_order_missing';
  end if;

  if v_definition not like '%version%'
    or v_definition not like '%''isNotice''%'
    or v_definition not like '%''noticePublishedAt''%' then
    raise exception 'community_cursor_test_v2_payload_missing';
  end if;

  if v_definition not like '%community_cursor_version_unsupported%' then
    raise exception 'community_cursor_test_stale_cursor_guard_missing';
  end if;

  select indexdef
  into v_index_definition
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'posts'
    and indexname = 'idx_posts_active_public_all_notice_first';

  if v_index_definition is null
    or v_index_definition not like '%is_notice DESC, notice_published_at DESC NULLS LAST, created_at DESC, id DESC%'
    or v_index_definition not like '%visibility = ''public''%'
    or v_index_definition not like '%status = ''active''%'
    or v_index_definition not like '%deleted_at IS NULL%' then
    raise exception 'community_cursor_test_all_index_missing';
  end if;

  if not has_function_privilege(
    'anon',
    'public.community_list_posts_v1(text, integer, jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.community_list_posts_v1(text, integer, jsonb)',
    'execute'
  ) then
    raise exception 'community_cursor_test_public_read_execute_missing';
  end if;

  foreach v_result in array array[
    public.community_list_posts_v1('all', 30, null::jsonb),
    public.community_list_posts_v1('all', 50, null::jsonb),
    public.community_list_posts_v1('all', 100, null::jsonb),
    public.community_list_posts_v1('all', 150, null::jsonb),
    public.community_list_posts_v1('all', 200, null::jsonb),
    public.community_list_posts_v1('popular', 30, null::jsonb),
    public.community_list_posts_v1('notice', 30, null::jsonb)
  ] loop
    if (v_result->>'cursorVersion')::integer <> 2 then
      raise exception 'community_cursor_test_response_version_missing';
    end if;
  end loop;

  begin
    perform public.community_list_posts_v1(
      'all',
      30,
      jsonb_build_object(
        'filter', 'all',
        'pageSize', 30,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_cursor_test_v1_cursor_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_invalid' then
      raise exception 'community_cursor_test_v1_cursor_error:%', v_message;
    end if;
  end;

  begin
    perform public.community_list_posts_v1(
      'all',
      30,
      jsonb_build_object(
        'version', 1,
        'filter', 'all',
        'pageSize', 30,
        'isNotice', false,
        'noticePublishedAt', null,
        'createdAt', timezone('utc', now()),
        'id', gen_random_uuid()
      )
    );
    raise exception 'community_cursor_test_explicit_old_version_accepted';
  exception when others then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'community_cursor_version_unsupported' then
      raise exception 'community_cursor_test_explicit_old_version_error:%', v_message;
    end if;
  end;

  -- Row-level ordering/boundary assertions run only when an existing controlled
  -- fixture contains both a notice and a normal public post. This keeps the
  -- contract test read-only on production content, where no fixture is created.
  select count(*) filter (where is_notice), count(*) filter (where not is_notice)
  into v_notice_count, v_normal_count
  from public.posts
  where visibility = 'public'
    and status = 'active'
    and deleted_at is null;

  if v_notice_count > 0 and v_normal_count > 0 then
    select public.community_list_posts_v1('all', 200, null::jsonb)
    into v_result;

    if exists (
      select 1
      from jsonb_array_elements(v_result->'items') with ordinality as item(value, position)
      where position = 1
        and coalesce((value->>'is_notice')::boolean, false) = false
    ) then
      raise exception 'community_cursor_test_notice_not_first';
    end if;
  end if;
end
$$;

-- Pure in-memory keyset fixtures cover the notice/normal boundary without
-- inserting production rows. The predicate must match DESC NULLS LAST and
-- continue through created_at/id tie-breakers.
do $keyset$
declare
  v_after_notice_ids text[];
  v_after_normal_ids text[];
begin
  with sample(is_notice, notice_published_at, created_at, id) as (
    values
      (true, '2026-08-05 12:00:00+00'::timestamptz, '2026-08-05 12:00:00+00'::timestamptz, '1'),
      (true, '2026-08-05 11:00:00+00'::timestamptz, '2026-08-05 11:00:00+00'::timestamptz, '2'),
      (false, null::timestamptz, '2026-08-05 10:00:00+00'::timestamptz, '3'),
      (false, null::timestamptz, '2026-08-05 09:00:00+00'::timestamptz, '4')
  ), cursor_row as (
    select * from sample where id = '2'
  )
  select array_agg(s.id order by s.created_at desc, s.id desc)
  into v_after_notice_ids
  from sample s
  cross join cursor_row c
  where s.is_notice < c.is_notice
    or (s.is_notice = c.is_notice and (
      (c.notice_published_at is not null and s.notice_published_at is null)
      or (c.notice_published_at is not null and s.notice_published_at is not null and s.notice_published_at < c.notice_published_at)
      or ((s.notice_published_at = c.notice_published_at or (c.notice_published_at is null and s.notice_published_at is null)) and (s.created_at < c.created_at or (s.created_at = c.created_at and s.id < c.id)))
    ));

  if v_after_notice_ids is distinct from array['3', '4']::text[] then
    raise exception 'community_cursor_test_notice_boundary_mismatch';
  end if;

  with sample(is_notice, notice_published_at, created_at, id) as (
    values
      (true, '2026-08-05 12:00:00+00'::timestamptz, '2026-08-05 12:00:00+00'::timestamptz, '1'),
      (true, '2026-08-05 11:00:00+00'::timestamptz, '2026-08-05 11:00:00+00'::timestamptz, '2'),
      (false, null::timestamptz, '2026-08-05 10:00:00+00'::timestamptz, '3'),
      (false, null::timestamptz, '2026-08-05 09:00:00+00'::timestamptz, '4')
  ), cursor_row as (
    select * from sample where id = '3'
  )
  select array_agg(s.id order by s.created_at desc, s.id desc)
  into v_after_normal_ids
  from sample s
  cross join cursor_row c
  where s.is_notice < c.is_notice
    or (s.is_notice = c.is_notice and (
      (c.notice_published_at is not null and s.notice_published_at is null)
      or (c.notice_published_at is not null and s.notice_published_at is not null and s.notice_published_at < c.notice_published_at)
      or ((s.notice_published_at = c.notice_published_at or (c.notice_published_at is null and s.notice_published_at is null)) and (s.created_at < c.created_at or (s.created_at = c.created_at and s.id < c.id)))
    ));

  if v_after_normal_ids is distinct from array['4']::text[] then
    raise exception 'community_cursor_test_normal_tiebreak_mismatch';
  end if;
end
$keyset$;

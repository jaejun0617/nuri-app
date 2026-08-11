begin;

-- Keep the established error for cursors produced before cursor versioning,
-- while retaining a distinct error for an explicitly unsupported version.
do $$
declare
  v_definition text;
  v_old text := $old$
    if not (p_cursor ? 'version') then
      perform public.raise_community_notice_error(
        'community_cursor_version_unsupported',
        '22023'
      );
    end if;
$old$;
  v_new text := $new$
    if not (p_cursor ? 'version') then
      perform public.raise_community_notice_error(
        'community_cursor_invalid',
        '22023'
      );
    end if;
$new$;
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'community_list_posts_v1'
    and pg_get_function_identity_arguments(p.oid) = 'p_filter text, p_limit integer, p_cursor jsonb';

  if v_definition is null then
    raise exception 'community_list_cursor_function_missing'
      using errcode = '42883';
  end if;

  if position(v_old in v_definition) = 0 then
    raise exception 'community_cursor_legacy_guard_not_found'
      using errcode = '42704';
  end if;

  execute replace(v_definition, v_old, v_new);
end
$$;

commit;

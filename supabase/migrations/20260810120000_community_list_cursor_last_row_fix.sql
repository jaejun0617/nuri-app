begin;

do $$
declare
  v_definition text;
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

  -- The earlier replacement matched the "visible.post_row" suffix inside
  -- "last_visible.post_row". Restore the intended last_visible qualifier.
  v_definition := replace(v_definition, 'last_(visible.post_row)', '(last_visible.post_row)');

  execute v_definition;
end
$$;

commit;

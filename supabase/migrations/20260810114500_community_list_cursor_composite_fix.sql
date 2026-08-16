begin;

-- Fix composite-field qualification inside the dynamic keyset query. The
-- function body itself is preserved; only PostgreSQL's required parentheses
-- around composite column dereference are corrected.
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

  v_definition := replace(v_definition, 'visible.post_row.like_count', '(visible.post_row).like_count');
  v_definition := replace(v_definition, 'visible.post_row.comment_count', '(visible.post_row).comment_count');
  v_definition := replace(v_definition, 'visible.post_row.notice_published_at', '(visible.post_row).notice_published_at');
  v_definition := replace(v_definition, 'visible.post_row.created_at', '(visible.post_row).created_at');
  v_definition := replace(v_definition, 'visible.post_row.id', '(visible.post_row).id');
  v_definition := replace(v_definition, 'last_visible.post_row.like_count', '(last_visible.post_row).like_count');
  v_definition := replace(v_definition, 'last_visible.post_row.comment_count', '(last_visible.post_row).comment_count');
  v_definition := replace(v_definition, 'last_visible.post_row.notice_published_at', '(last_visible.post_row).notice_published_at');
  v_definition := replace(v_definition, 'last_visible.post_row.created_at', '(last_visible.post_row).created_at');
  v_definition := replace(v_definition, 'last_visible.post_row.id', '(last_visible.post_row).id');

  execute v_definition;
end
$$;

commit;

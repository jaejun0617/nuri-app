begin;

-- PostgreSQL rejects a NULL RAISE USING option. Keep stable error codes while
-- omitting the optional hint when no hint was supplied by the caller.
create or replace function public.raise_community_notice_error(
  p_app_code text,
  p_sqlstate text default 'P0001',
  p_hint text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_hint is null then
    raise exception using
      errcode = p_sqlstate,
      message = p_app_code,
      detail = json_build_object('app_code', p_app_code)::text;
  else
    raise exception using
      errcode = p_sqlstate,
      message = p_app_code,
      detail = json_build_object('app_code', p_app_code)::text,
      hint = p_hint;
  end if;
end;
$$;

revoke all on function public.raise_community_notice_error(text, text, text)
  from public, anon, authenticated;

commit;

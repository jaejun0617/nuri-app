begin;

-- Remote migration identity: 20261025095926.

-- Account preference invalidation uses existing RLS; no new client grants.
do $$
begin
 if not (select relrowsecurity from pg_class where oid='public.user_notification_preferences'::regclass) then
  raise exception 'NURI_NOTIFICATION_PREFERENCES_RLS_REQUIRED';
 end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notification_preferences'
 ) then
  alter publication supabase_realtime add table public.user_notification_preferences;
 end if;
end;$$;

commit;

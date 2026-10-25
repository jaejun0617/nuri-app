begin;
-- Preserve the existing deletion APIs, including republished announcement versions.
create function notification_private.dismiss_v3(p_id uuid,p_source text,p_all boolean default false) returns integer
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); cutoff timestamptz:=statement_timestamp();
begin
 if not p_all and (p_id is null or p_source is null or p_source not in ('user','announcement')) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_SOURCE_INVALID';end if;
 with targets as materialized(select * from notification_private.inbox_v3(actor) n where n.available_at<=cutoff
  and (p_all or (n.notification_id=p_id and n.notification_source=p_source))),
 users as (update public.user_notifications n set dismissed_at=cutoff from targets t where t.notification_source='user'
  and n.id=t.notification_id and n.user_id=actor returning n.id)
 insert into public.user_notification_dismissals(user_id,announcement_id,dismissed_at,dismissed_version)
 select actor,t.notification_id,cutoff,(t.payload->>'publishVersion')::integer from targets t where t.notification_source='announcement'
 on conflict(user_id,announcement_id) do update set dismissed_at=excluded.dismissed_at,dismissed_version=excluded.dismissed_version;
 return (select count(*)::integer from notification_private.inbox_v3(actor) n where n.read_at is null);
end;$$;
create or replace function public.dismiss_user_notification_v1(p_notification_id uuid,p_notification_source text default 'user') returns integer
language sql security invoker set search_path='' as $$select notification_private.dismiss_v3(p_notification_id,p_notification_source,false);$$;
create or replace function public.dismiss_all_user_notifications_v1() returns integer
language sql security invoker set search_path='' as $$select notification_private.dismiss_v3(null,null,true);$$;
revoke all on function notification_private.dismiss_v3(uuid,text,boolean),public.dismiss_user_notification_v1(uuid,text),public.dismiss_all_user_notifications_v1() from public,anon;
grant execute on function notification_private.dismiss_v3(uuid,text,boolean),public.dismiss_user_notification_v1(uuid,text),public.dismiss_all_user_notifications_v1() to authenticated;
commit;

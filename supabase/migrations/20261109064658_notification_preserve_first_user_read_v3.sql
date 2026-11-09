create or replace function notification_private.mark_read_v3(p_id uuid, p_source text, p_all boolean default false)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare actor uuid:=notification_private.actor_v3(); cutoff timestamptz:=statement_timestamp();
begin
 -- Materialize the visible set once. An event committed after this snapshot is
 -- never accidentally consumed by the second write in mark-all.
 with targets as materialized(select * from notification_private.inbox_v3(actor) n where n.read_at is null and n.available_at<=cutoff
  and (p_all or (n.notification_id=p_id and n.notification_source=p_source))),
 -- Recheck the updated row after a concurrent reader releases its lock.
 users as (update public.user_notifications n set read_at=cutoff from targets t where t.notification_source='user'
   and n.id=t.notification_id and n.user_id=actor and n.read_at is null returning n.id)
 insert into public.user_notification_reads(user_id,announcement_id,read_at,read_version)
 select actor,t.notification_id,cutoff,(t.payload->>'publishVersion')::integer from targets t where t.notification_source='announcement'
 on conflict(user_id,announcement_id) do update set read_at=excluded.read_at,read_version=excluded.read_version;
 return (select count(*)::integer from notification_private.inbox_v3(actor) n where n.read_at is null);
end;$function$;

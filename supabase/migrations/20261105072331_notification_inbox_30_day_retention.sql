begin;

-- Inbox lifetime is independent of push delivery TTL. Scheduled notices start
-- aging when they become available, not when their rows were prepared.
create or replace function notification_private.inbox_v3(p_user uuid) returns table(
 notification_id uuid,notification_source text,title text,body text,type text,read_at timestamptz,
 created_at timestamptz,available_at timestamptz,event_type text,schema_version integer,category text,target jsonb,payload jsonb)
language sql stable security definer set search_path='' as $$
 select n.id,'user',case when access.ok then n.title else '지금은 확인할 수 없는 알림이에요' end,
  case when access.ok then n.body else '삭제되었거나 접근할 수 없는 대상이에요.' end,n.type,n.read_at,n.created_at,n.available_at,
  n.event_type,n.schema_version,n.category,case when access.ok then n.target else '{"kind":"unavailable"}'::jsonb end,
  case when access.ok then n.payload else '{}'::jsonb end
 from public.user_notifications n
 cross join lateral (select notification_private.target_available_v3(p_user,n.target,n.actor_user_id) as ok) access
 where n.user_id=p_user and n.dismissed_at is null and n.available_at<=statement_timestamp()
  and n.available_at>statement_timestamp()-interval '720 hours'
 union all
 select a.id,'announcement',a.title,a.body,a.type,
  case when r.read_version>=a.publish_version then r.read_at end,greatest(a.starts_at,a.published_at,a.created_at),greatest(a.starts_at,a.published_at,a.created_at),
  coalesce(a.payload->>'eventType','news.published'),1,'news','{"kind":"notification_detail"}'::jsonb,
  a.payload||jsonb_build_object('publishVersion',a.publish_version)
 from public.announcements a left join public.user_notification_reads r on r.announcement_id=a.id and r.user_id=p_user
 where a.is_active and a.target_scope='all' and greatest(a.starts_at,a.published_at,a.created_at)<=statement_timestamp()
  and greatest(a.starts_at,a.published_at,a.created_at)>statement_timestamp()-interval '720 hours'
  and (a.expires_at is null or a.expires_at>statement_timestamp())
  and not exists(select 1 from public.user_notification_dismissals d where d.user_id=p_user and d.announcement_id=a.id and d.dismissed_version>=a.publish_version);
$$;

create index user_notifications_retention_v3 on public.user_notifications(available_at,id);

-- Bounded maintenance; business records and the administrator's publication
-- originals are not inbox copies and must remain untouched.
create function notification_private.purge_expired_inbox_v3() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz:=statement_timestamp()-interval '720 hours';
 notifications integer; reads integer; dismissals integer;
begin
 with expired as (
  select id from public.user_notifications where available_at<=cutoff
  order by available_at,id limit 1000 for update skip locked
 ), removed as (
  delete from public.user_notifications n using expired e where n.id=e.id returning n.id
 ) select count(*)::integer into notifications from removed;

 with expired as (
  select r.user_id,r.announcement_id from public.user_notification_reads r
  join public.announcements a on a.id=r.announcement_id
  where greatest(a.starts_at,a.published_at,a.created_at)<=cutoff
  order by r.announcement_id,r.user_id limit 1000 for update of r skip locked
 ), removed as (
  delete from public.user_notification_reads r using expired e
  where r.user_id=e.user_id and r.announcement_id=e.announcement_id returning r.user_id
 ) select count(*)::integer into reads from removed;

 with expired as (
  select d.user_id,d.announcement_id from public.user_notification_dismissals d
  join public.announcements a on a.id=d.announcement_id
  where greatest(a.starts_at,a.published_at,a.created_at)<=cutoff
  order by d.announcement_id,d.user_id limit 1000 for update of d skip locked
 ), removed as (
  delete from public.user_notification_dismissals d using expired e
  where d.user_id=e.user_id and d.announcement_id=e.announcement_id returning d.user_id
 ) select count(*)::integer into dismissals from removed;
 return jsonb_build_object('notifications',notifications,'reads',reads,'dismissals',dismissals);
end;$$;
revoke all on function notification_private.purge_expired_inbox_v3() from public,anon,authenticated;
grant execute on function notification_private.purge_expired_inbox_v3() to service_role;

-- Visibility ends at the exact deadline; physical cleanup follows in batches.
select cron.schedule('nuri-notification-retention-v3','*/5 * * * *',
 'select notification_private.purge_expired_inbox_v3();');

commit;

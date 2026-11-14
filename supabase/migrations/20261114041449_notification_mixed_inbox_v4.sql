begin;

-- Explicit opt-in; legacy clients and the OS delivery worker remain on v3.
alter table support_private.runtime add column mixed_inbox_enabled boolean not null default false;

create table notification_private.reply_inbox_state_v4 (
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references support_private.reply_deliveries(event_id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  primary key(recipient_id,event_id)
);
alter table notification_private.reply_inbox_state_v4 enable row level security;
revoke all on notification_private.reply_inbox_state_v4 from public,anon,authenticated,service_role;
create index reply_inbox_state_v4_event on notification_private.reply_inbox_state_v4(event_id);
create index reply_outbox_v4_recipient on support_private.outbox(recipient_id,id)
  where state='delivered' and channel='inapp';

create function notification_private.mixed_actor_v4() returns uuid
language plpgsql stable set search_path='' as $$
declare actor uuid:=notification_private.actor_v3();
begin
  if not exists(select from auth.sessions where user_id=actor and id::text=auth.jwt()->>'session_id') then
    raise insufficient_privilege using message='NURI_NOTIFICATION_AUTH_REQUIRED';
  end if;
  return actor;
end $$;

create function notification_private.mixed_rows_v4(p_actor uuid) returns table(
  notification_id uuid,notification_source text,title text,body text,type text,read_at timestamptz,
  created_at timestamptz,available_at timestamptz,event_type text,schema_version integer,category text,
  target jsonb,payload jsonb,is_read boolean,visible_until timestamptz
) language sql stable set search_path='' as $$
  select n.*,n.read_at is not null,
    least(n.available_at+interval '720 hours',a.expires_at)
  from notification_private.inbox_v3(p_actor) n
  left join public.announcements a on n.notification_source='announcement' and a.id=n.notification_id
  union all
  select o.id,'support_reply','문의에 답변이 도착했어요','남긴 문의의 답변을 확인해주세요.',
    'notice',s.read_at,o.created_at,d.delivered_at,'support.reply',1,'news',
    jsonb_build_object('kind','support_ticket','ticketId',t.id,'messageSeq',m.seq),'{}'::jsonb,
    s.read_at is not null or m.seq<=coalesce(r.seq,0),d.delivered_at+interval '720 hours'
  from support_private.runtime f
  join support_private.outbox o on o.recipient_id=p_actor and o.state='delivered' and o.channel='inapp'
  join support_private.reply_deliveries d on d.event_id=o.id
  join support_private.tickets t on t.id=o.ticket_id and t.owner_id=p_actor
  join support_private.messages m on m.ticket_id=t.id and m.seq=o.message_seq and m.author_kind='staff'
  left join support_private.ticket_reads r on r.ticket_id=t.id and r.actor_id=p_actor
  left join notification_private.reply_inbox_state_v4 s on s.recipient_id=p_actor and s.event_id=o.id
  where f.singleton and f.support_enabled and f.mixed_inbox_enabled
    and s.dismissed_at is null and d.delivered_at<=statement_timestamp()
    and d.delivered_at>statement_timestamp()-interval '720 hours';
$$;

create function notification_private.mixed_snapshot_v4(p_limit integer,p_snapshot timestamptz,
  p_at timestamptz,p_id uuid,p_source text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=notification_private.mixed_actor_v4(); result jsonb;
  cutoff timestamptz:=coalesce(p_snapshot,statement_timestamp());
begin
  if p_limit is null or p_limit not between 0 and 50
    or not isfinite(cutoff) or cutoff>statement_timestamp()
    or not ((p_at is null and p_id is null and p_source is null and p_snapshot is null)
      or (p_limit>0 and p_at is not null and isfinite(p_at) and p_at<=cutoff
        and p_id is not null and p_source is not null and p_snapshot is not null
        and p_source in ('user','announcement','support_reply'))) then
    raise invalid_parameter_value using message='NURI_NOTIFICATION_CURSOR_INVALID';
  end if;
  with rows as materialized (select * from notification_private.mixed_rows_v4(actor)),
  page as materialized (
    select * from rows n where p_limit>0 and n.available_at<=cutoff
      and (p_at is null or (n.available_at,n.notification_id,n.notification_source)<(p_at,p_id,p_source))
    order by n.available_at desc,n.notification_id desc,n.notification_source desc limit p_limit+1
  ), visible as (
    select * from page order by available_at desc,notification_id desc,notification_source desc limit p_limit
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(v)-'visible_until'-'target' order by
      available_at desc,notification_id desc,notification_source desc) from visible v),'[]'::jsonb),
    'hasMore',(select count(*)>p_limit from page),'snapshotAt',cutoff,
    'timeZone',coalesce((select p.time_zone from public.user_notification_preferences p
      join pg_timezone_names z on z.name=p.time_zone where p.user_id=actor),'Asia/Seoul'),
    'unreadCount',(select count(*) from rows where not is_read),
    'badge',(select jsonb_build_object('count',count(*),
      'observedAt',floor(extract(epoch from statement_timestamp())*1000)::bigint,
      'validUntil',case when count(*)>0 then ceil(extract(epoch from min(visible_until))*1000)::bigint end)
      from rows where not is_read)
  ) into result;
  return result;
end $$;

create function notification_private.mixed_target_v4(p_id uuid,p_source text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=notification_private.mixed_actor_v4(); result jsonb;
begin
  select to_jsonb(n)-'visible_until' into result from notification_private.mixed_rows_v4(actor) n
    where n.notification_id=p_id and n.notification_source=p_source;
  if result is null then raise sqlstate 'PT404' using message='NURI_NOTIFICATION_UNAVAILABLE'; end if;
  return result;
end $$;

create function notification_private.mixed_command_v4(p_operation text,p_id uuid,p_source text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.mixed_actor_v4(); cutoff timestamptz:=statement_timestamp();
begin
  if p_operation is null or p_operation not in ('read','hide')
    or not ((p_id is null and p_source is null) or (p_id is not null and p_source is not null
      and p_source in ('user','announcement','support_reply'))) then
    raise invalid_parameter_value using message='NURI_NOTIFICATION_COMMAND_INVALID';
  end if;
  -- Every write uses the same MVCC target set. No later source query can absorb new arrivals.
  with targets as materialized (
    select * from notification_private.mixed_rows_v4(actor) n where n.available_at<=cutoff
      and (p_id is null or (n.notification_id=p_id and n.notification_source=p_source))
      and (p_operation='hide' or not n.is_read)
  ), users as (
    update public.user_notifications n set
      read_at=case when p_operation='read' then coalesce(n.read_at,cutoff) else n.read_at end,
      dismissed_at=case when p_operation='hide' then coalesce(n.dismissed_at,cutoff) else null end
    from targets t where t.notification_source='user' and n.id=t.notification_id
      and n.user_id=actor and n.dismissed_at is null returning n.id
  ), announcement_reads as (
    insert into public.user_notification_reads as r(user_id,announcement_id,read_at,read_version)
      select actor,notification_id,cutoff,(payload->>'publishVersion')::integer from targets
        where notification_source='announcement' and p_operation='read'
      on conflict(user_id,announcement_id) do update set read_at=excluded.read_at,read_version=excluded.read_version
        where r.read_version<excluded.read_version returning announcement_id
  ), announcement_hides as (
    insert into public.user_notification_dismissals as s(user_id,announcement_id,dismissed_at,dismissed_version)
      select actor,notification_id,cutoff,(payload->>'publishVersion')::integer from targets
        where notification_source='announcement' and p_operation='hide'
      on conflict(user_id,announcement_id) do update set dismissed_at=excluded.dismissed_at,dismissed_version=excluded.dismissed_version
        where s.dismissed_version<excluded.dismissed_version returning announcement_id
  )
  insert into notification_private.reply_inbox_state_v4 as s(recipient_id,event_id,read_at,dismissed_at)
    select actor,notification_id,case when p_operation='read' then cutoff end,
      case when p_operation='hide' then cutoff end from targets where notification_source='support_reply'
    on conflict(recipient_id,event_id) do update set read_at=coalesce(s.read_at,excluded.read_at),
      dismissed_at=coalesce(s.dismissed_at,excluded.dismissed_at);
end $$;

create function notification_private.mixed_ack_reply_v4(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.mixed_actor_v4(); resolved jsonb;
  target_ticket uuid; target_seq integer;
begin
  resolved:=notification_private.mixed_target_v4(p_id,'support_reply')->'target';
  target_ticket:=(resolved->>'ticketId')::uuid;
  target_seq:=(resolved->>'messageSeq')::integer;
  update support_private.ticket_reads r set seq=greatest(r.seq,target_seq)
    where r.ticket_id=target_ticket and r.actor_id=actor and r.served_seq>=target_seq;
  if not found then raise invalid_parameter_value using message='SUPPORT_CURSOR_STALE'; end if;
end $$;

create function public.get_notification_inbox_v4(p_limit integer default 30,p_snapshot timestamptz default null,
  p_at timestamptz default null,p_id uuid default null,p_source text default null) returns jsonb
language sql stable security invoker set search_path='' as $$
  select notification_private.mixed_snapshot_v4(p_limit,p_snapshot,p_at,p_id,p_source)
$$;
create function public.get_notification_target_v4(p_id uuid,p_source text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select notification_private.mixed_target_v4(p_id,p_source)
$$;
create function public.command_notification_inbox_v4(p_operation text,p_id uuid default null,p_source text default null) returns void
language sql security invoker set search_path='' as $$
  select notification_private.mixed_command_v4(p_operation,p_id,p_source)
$$;
create function public.acknowledge_notification_reply_v4(p_id uuid) returns void
language sql security invoker set search_path='' as $$
  select notification_private.mixed_ack_reply_v4(p_id)
$$;

revoke all on function notification_private.mixed_rows_v4(uuid),notification_private.mixed_actor_v4()
  from public,anon,authenticated,service_role;
revoke all on function notification_private.mixed_snapshot_v4(integer,timestamptz,timestamptz,uuid,text),
  notification_private.mixed_target_v4(uuid,text),notification_private.mixed_command_v4(text,uuid,text),
  notification_private.mixed_ack_reply_v4(uuid),public.get_notification_inbox_v4(integer,timestamptz,timestamptz,uuid,text),
  public.get_notification_target_v4(uuid,text),public.command_notification_inbox_v4(text,uuid,text),
  public.acknowledge_notification_reply_v4(uuid) from public,anon,authenticated,service_role;
grant execute on function notification_private.mixed_snapshot_v4(integer,timestamptz,timestamptz,uuid,text),
  notification_private.mixed_target_v4(uuid,text),notification_private.mixed_command_v4(text,uuid,text),
  notification_private.mixed_ack_reply_v4(uuid),public.get_notification_inbox_v4(integer,timestamptz,timestamptz,uuid,text),
  public.get_notification_target_v4(uuid,text),public.command_notification_inbox_v4(text,uuid,text),
  public.acknowledge_notification_reply_v4(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

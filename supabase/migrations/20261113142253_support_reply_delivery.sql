begin;
-- Historical pull inbox rows remain readable; only new replies use delivery.
-- No backfill, legacy notification tables, external transport or scheduler.
alter table support_private.runtime add column reply_delivery_started_at timestamptz not null default clock_timestamp();
alter table support_private.outbox add column lease_id uuid;
alter table support_private.outbox add column last_error text check(last_error in ('delivery_failed','attempts_exhausted','target_unavailable'));
create table support_private.reply_deliveries (
  event_id uuid primary key references support_private.outbox(id) on delete cascade,
  delivered_at timestamptz not null default clock_timestamp()
);
alter table support_private.reply_deliveries enable row level security;
revoke all on support_private.reply_deliveries from public,anon,authenticated,service_role;
create index support_reply_pending on support_private.outbox(created_at,id) where state in ('pending','leased');

create function public.support_reply_claim_v1(p_lease uuid,p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_start timestamptz; v_ids jsonb;
begin
  if p_lease is null or p_limit is null or p_limit not between 1 and 50 then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  select reply_delivery_started_at into v_start from support_private.runtime where singleton and support_enabled;
  if not found then raise sqlstate '55000' using message='SUPPORT_UNAVAILABLE'; end if;
  update support_private.outbox set state='failed',last_error='attempts_exhausted'
    where created_at>=v_start and state='leased' and attempts>=5 and lease_until<=clock_timestamp();
  with selected as (
    select id from support_private.outbox where created_at>=v_start and state in ('pending','leased') and attempts<5
      and (lease_until is null or lease_until<=clock_timestamp())
    order by created_at,id for update skip locked limit p_limit
  ), claimed as (
    update support_private.outbox o set state='leased',lease_id=p_lease,
      lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1
    from selected where o.id=selected.id returning o.id
  ) select coalesce(jsonb_agg(id),'[]'::jsonb) into v_ids from claimed;
  return v_ids;
end $$;

create function public.support_reply_deliver_v1(p_event uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_row support_private.outbox;
begin
  if p_event is null or p_lease is null then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  select * into v_row from support_private.outbox where id=p_event for update;
  if not found then return false; end if;
  if v_row.lease_id is distinct from p_lease then raise sqlstate 'PT409' using message='SUPPORT_LEASE_CONFLICT'; end if;
  if v_row.state='delivered' then return true; end if;
  if v_row.state<>'leased' or v_row.lease_until<=clock_timestamp() then
    raise sqlstate 'PT409' using message='SUPPORT_LEASE_CONFLICT';
  end if;
  if not exists(select from support_private.runtime where singleton and support_enabled) then
    raise sqlstate '55000' using message='SUPPORT_UNAVAILABLE';
  end if;
  -- The current owner and retained public reply, not an old cached recipient, authorize delivery.
  perform 1 from support_private.tickets t join auth.users u on u.id=t.owner_id
    join support_private.messages m on m.ticket_id=t.id and m.seq=v_row.message_seq and m.author_kind='staff'
    where t.id=v_row.ticket_id and t.owner_id=v_row.recipient_id and v_row.channel='inapp'
    for share of t,u,m;
  if not found then
    update support_private.outbox set state='failed',last_error='target_unavailable',lease_until=null where id=p_event;
    return false;
  end if;
  insert into support_private.reply_deliveries(event_id) values(p_event) on conflict(event_id) do nothing;
  update support_private.outbox set state='delivered',lease_until=null,last_error=null where id=p_event;
  return true;
end $$;

create function public.support_reply_fail_v1(p_event uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update support_private.outbox set state=case when attempts>=5 then 'failed' else 'pending' end,
    last_error='delivery_failed',lease_until=clock_timestamp()+make_interval(secs=>least(60,attempts*2))
    where id=p_event and lease_id=p_lease and state='leased';
  return found;
end $$;

create function public.support_reply_inbox_v2(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_items jsonb;
begin
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc),'[]') into v_items from (
    select o.id,o.ticket_id,o.message_seq,o.created_at,(o.message_seq>coalesce(r.seq,0)) as unread
    from support_private.outbox o join support_private.tickets t on t.id=o.ticket_id and t.owner_id=v_actor
    join support_private.runtime runtime on runtime.singleton
    left join support_private.ticket_reads r on r.ticket_id=o.ticket_id and r.actor_id=v_actor
    where o.recipient_id=v_actor and o.channel='inapp'
      and (o.created_at<runtime.reply_delivery_started_at or exists(select from support_private.reply_deliveries d where d.event_id=o.id))
      and (p_before is null or (o.created_at,o.id)<(p_before,p_before_id))
    order by o.created_at desc,o.id desc limit p_limit
  ) t;
  return jsonb_build_object('items',v_items);
end $$;
revoke all on function public.support_reply_claim_v1(uuid,integer),public.support_reply_deliver_v1(uuid,uuid),
  public.support_reply_fail_v1(uuid,uuid),public.support_reply_inbox_v2(timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.support_reply_claim_v1(uuid,integer),public.support_reply_deliver_v1(uuid,uuid),public.support_reply_fail_v1(uuid,uuid) to service_role;
grant execute on function public.support_reply_inbox_v2(timestamptz,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;

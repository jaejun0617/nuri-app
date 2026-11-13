begin;
-- A source adapter for the common inbox. No legacy inbox writes, broadcast,
-- scheduler, backfill, or OS transport. Read acknowledgment remains ticket-owned.
create function support_private.reply_inbox_rows(p_actor uuid) returns table(
  id uuid, created_at timestamptz, ticket_id uuid, message_seq integer, is_read boolean
) language sql stable security definer set search_path='' as $$
  select o.id,o.created_at,o.ticket_id,o.message_seq,o.message_seq<=coalesce(r.seq,0)
  from support_private.outbox o
  join support_private.tickets t on t.id=o.ticket_id and t.owner_id=p_actor
  join support_private.messages m on m.ticket_id=t.id and m.seq=o.message_seq and m.author_kind='staff'
  join support_private.reply_deliveries d on d.event_id=o.id
  left join support_private.ticket_reads r on r.ticket_id=t.id and r.actor_id=p_actor
  where o.recipient_id=p_actor and o.channel='inapp' and o.state='delivered';
$$;
revoke all on function support_private.reply_inbox_rows(uuid) from public,anon,authenticated,service_role;

create function public.support_notification_page_v1(
  p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  with page as materialized (
    select * from support_private.reply_inbox_rows(v_actor)
    where p_before is null or (created_at,id)<(p_before,p_before_id)
    order by created_at desc,id desc limit p_limit+1
  ), visible as (select * from page order by created_at desc,id desc limit p_limit)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',id,'source','support_reply','createdAt',created_at,'isRead',is_read,
    'target',jsonb_build_object('kind','support_ticket','ticketId',ticket_id,'messageSeq',message_seq)
  ) order by created_at desc,id desc) from visible),'[]'::jsonb),
    'hasMore',(select count(*)>p_limit from page),
    'unreadCount',(select count(*) from support_private.reply_inbox_rows(v_actor) where not is_read),
    'timeZone','Asia/Seoul') into v_result;
  return v_result;
end $$;

create function public.support_notification_target_v1(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_result jsonb;
begin
  select jsonb_build_object('kind','support_ticket','ticketId',ticket_id,'messageSeq',message_seq)
    into v_result from support_private.reply_inbox_rows(v_actor) where id=p_id;
  if v_result is null then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  return v_result;
end $$;
revoke all on function public.support_notification_page_v1(timestamptz,uuid,integer),
  public.support_notification_target_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.support_notification_page_v1(timestamptz,uuid,integer),
  public.support_notification_target_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

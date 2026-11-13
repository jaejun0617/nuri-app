begin;
create function public.support_staff_members_v1() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor();
begin
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='support.manage') then
    raise insufficient_privilege using message='SUPPORT_FORBIDDEN';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',user_id) order by user_id)
    from support_private.capabilities where capability='support.manage'),'[]');
end $$;

create function public.support_ticket_transfer_v1(p_key uuid,p_ticket uuid,p_revision integer,p_seen_user_seq integer,p_assignee uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=support_private.ticket_actor(); v_ticket support_private.tickets;
  v_prior support_private.request_results; v_input jsonb:=jsonb_build_array(p_ticket,p_revision,p_seen_user_seq,p_assignee); v_result jsonb;
begin
  if p_key is null or p_ticket is null or p_assignee is null or p_assignee=v_actor then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='support.manage') then
    raise insufficient_privilege using message='SUPPORT_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':ticket.transfer:'||p_key::text,0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='ticket.transfer' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  select * into v_ticket from support_private.tickets where id=p_ticket for update;
  if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  if v_ticket.revision is distinct from p_revision or v_ticket.last_user_seq is distinct from p_seen_user_seq
    or v_ticket.state<>'open' then raise sqlstate 'PT409' using message='SUPPORT_REVISION_CONFLICT'; end if;
  if v_ticket.assignee_id is distinct from v_actor then raise sqlstate 'PT409' using message='SUPPORT_NOT_ASSIGNED'; end if;
  -- Lock the capability used by the command; simultaneous revocation cannot race the assignment.
  perform 1 from support_private.capabilities where user_id=p_assignee and capability='support.manage' for share;
  if not found then raise sqlstate 'PT409' using message='SUPPORT_CLAIM_CONFLICT'; end if;
  update support_private.tickets set assignee_id=p_assignee,revision=revision+1,updated_at=clock_timestamp()
    where id=p_ticket returning * into v_ticket;
  v_result:=jsonb_build_object('id',p_ticket,'revision',v_ticket.revision);
  insert into support_private.request_results(actor_id,operation,request_key,input,result) values(v_actor,'ticket.transfer',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision) values(v_actor,'ticket.transfer',p_ticket,v_ticket.revision);
  return v_result;
end $$;
revoke all on function public.support_staff_members_v1(),public.support_ticket_transfer_v1(uuid,uuid,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.support_staff_members_v1(),public.support_ticket_transfer_v1(uuid,uuid,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;

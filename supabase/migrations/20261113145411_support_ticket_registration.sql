begin;
-- Legacy conversations keep their original content and nullable title.
alter table support_private.tickets add column title text
  check(title is null or (title=btrim(title) and char_length(title) between 1 and 80));

create function public.support_ticket_create_v2(p_key uuid,p_title text,p_category text,p_body text,
  p_draft uuid default null,p_photos uuid[] default '{}'::uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_prior support_private.request_results;
  v_input jsonb:=jsonb_build_object('title',p_title,'category',p_category,'body',p_body,'draft',p_draft,'photos',p_photos);
  v_result jsonb; v_internal_key uuid;
begin
  if p_key is null or p_title is null or char_length(btrim(p_title)) not between 1 and 80
    or p_photos is null or cardinality(p_photos)>3 then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':ticket-create:'||p_key::text,0));
  select * into v_prior from support_private.request_results
    where actor_id=v_actor and operation='ticket-create' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    if not exists(select from support_private.tickets where id=(v_prior.result->>'id')::uuid and owner_id=v_actor) then
      raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND';
    end if;
    return v_prior.result;
  end if;
  -- Reuse the authenticated message/photo contract in this transaction, not a second client write.
  v_internal_key:=gen_random_uuid();
  if cardinality(p_photos)>0 then
    v_result:=support_private.ticket_photo_message(v_internal_key,null,p_category,p_body,p_draft,p_photos);
  else
    v_result:=support_private.ticket_command(v_internal_key,'message',null,null,null,p_body,p_category,null);
  end if;
  update support_private.tickets set title=btrim(p_title) where id=(v_result->>'id')::uuid and owner_id=v_actor;
  insert into support_private.request_results(actor_id,operation,request_key,input,result)
    values(v_actor,'ticket-create',p_key,v_input,v_result);
  return v_result;
end $$;

create function public.support_ticket_list_v2(p_management boolean default false,p_before timestamptz default null,
  p_before_id uuid default null,p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb; v_items jsonb;
begin
  if p_management is null then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  v_result:=case when p_management then support_private.staff_ticket_list(p_before,p_before_id,p_limit)
    else support_private.mobile_my_tickets(p_before,p_before_id,p_limit) end;
  -- Enrich only IDs already authorized by the existing list contract.
  select coalesce(jsonb_agg(r.value||jsonb_build_object('title',t.title) order by r.ordinality),'[]'::jsonb)
    into v_items from jsonb_array_elements(v_result->'items') with ordinality r
    join support_private.tickets t on t.id=(r.value->>'id')::uuid;
  return jsonb_build_object('items',v_items);
end $$;

create function public.support_ticket_read_v2(p_ticket uuid,p_after integer default 0,p_limit integer default 50,
  p_ack integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb; v_title text;
begin
  v_result:=support_private.ticket_read_photos(p_ticket,p_after,p_limit,p_ack);
  select title into v_title from support_private.tickets where id=(v_result->>'id')::uuid;
  return v_result||jsonb_build_object('title',v_title);
end $$;

revoke all on function public.support_ticket_create_v2(uuid,text,text,text,uuid,uuid[]),
  public.support_ticket_list_v2(boolean,timestamptz,uuid,integer),
  public.support_ticket_read_v2(uuid,integer,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.support_ticket_create_v2(uuid,text,text,text,uuid,uuid[]),
  public.support_ticket_list_v2(boolean,timestamptz,uuid,integer),
  public.support_ticket_read_v2(uuid,integer,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;

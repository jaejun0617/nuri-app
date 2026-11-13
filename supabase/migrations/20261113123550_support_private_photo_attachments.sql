begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('support-ticket-photos','support-ticket-photos',false,5242880,array['image/jpeg']);

-- Restrictive policies also protect this bucket from unrelated permissive policies.
create policy support_photos_no_client_objects on storage.objects as restrictive
  for all to anon,authenticated
  using (bucket_id <> 'support-ticket-photos')
  with check (bucket_id <> 'support-ticket-photos');

create table support_private.ticket_photos (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  draft_id uuid not null,
  draft_ticket_id uuid references support_private.tickets(id) on delete cascade,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer not null check (width between 1 and 2048),
  height integer not null check (height between 1 and 2048),
  ready boolean not null default false,
  expires_at timestamptz not null default (clock_timestamp() + interval '24 hours'),
  message_id uuid references support_private.messages(id) on delete cascade
);
create index ticket_photos_pending on support_private.ticket_photos(owner_id,draft_id)
  where message_id is null;
create index ticket_photos_message on support_private.ticket_photos(message_id)
  where message_id is not null;
alter table support_private.ticket_photos enable row level security;
revoke all on support_private.ticket_photos from public,anon,authenticated;

alter table support_private.messages drop constraint messages_body_check;
alter table support_private.messages add constraint messages_body_check
  check ((author_kind='user' and body='') or char_length(btrim(body)) between 1 and 5000);

create function support_private.photo_prepare(p_id uuid,p_draft uuid,p_ticket uuid,p_sha text,p_bytes integer,p_width integer,p_height integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid := support_private.ticket_actor();
  v_session uuid := (auth.jwt()->>'session_id')::uuid;
  v_photo support_private.ticket_photos;
begin
  if p_id is null or p_draft is null or p_sha is null or p_sha !~ '^[0-9a-f]{64}$'
    or p_bytes is null or p_bytes not between 1 and 5242880
    or p_width is null or p_width not between 1 and 2048
    or p_height is null or p_height not between 1 and 2048 then
    raise invalid_parameter_value using message='SUPPORT_PHOTO_INVALID';
  end if;
  if p_ticket is not null and not exists(
    select from support_private.tickets where id=p_ticket and owner_id=v_actor
  ) then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':support-photo-reserve',0));
  select * into v_photo from support_private.ticket_photos where id=p_id for update;
  if found then
    if v_photo.owner_id<>v_actor or v_photo.session_id<>v_session or v_photo.draft_id<>p_draft
      or v_photo.draft_ticket_id is distinct from p_ticket or v_photo.sha256<>p_sha
      or v_photo.byte_size<>p_bytes or v_photo.width<>p_width or v_photo.height<>p_height then
      raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT';
    end if;
    if v_photo.message_id is null and v_photo.expires_at <= clock_timestamp() then
      raise sqlstate 'PT410' using message='SUPPORT_PHOTO_EXPIRED';
    end if;
    return v_photo.ready;
  end if;
  if (select count(*) from support_private.ticket_photos
      where owner_id=v_actor and message_id is null and expires_at>clock_timestamp())>=30 then
    raise sqlstate 'PT429' using message='SUPPORT_PHOTO_QUOTA';
  end if;
  insert into support_private.ticket_photos(id,owner_id,session_id,draft_id,draft_ticket_id,sha256,byte_size,width,height)
    values(p_id,v_actor,v_session,p_draft,p_ticket,p_sha,p_bytes,p_width,p_height);
  return false;
end $$;

create function public.support_ticket_photo_prepare_v1(p_id uuid,p_draft uuid,p_ticket uuid,p_sha text,p_bytes integer,p_width integer,p_height integer)
returns boolean language sql security invoker set search_path='' as $$
  select support_private.photo_prepare(p_id,p_draft,p_ticket,p_sha,p_bytes,p_width,p_height);
$$;

-- Only the validator can mark ready, and only after the real private object exists.
create function support_private.photo_ready(p_id uuid,p_sha text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update support_private.ticket_photos p set ready=true
    where p.id=p_id and p.sha256=p_sha and p.expires_at>clock_timestamp()
      and exists(select from storage.objects o where o.bucket_id='support-ticket-photos'
        and o.name=p.id::text||'.jpg' and (o.metadata->>'size')::integer=p.byte_size);
  return found;
end $$;
create function public.support_ticket_photo_ready_v1(p_id uuid,p_sha text)
returns boolean language sql security invoker set search_path='' as $$
  select support_private.photo_ready(p_id,p_sha);
$$;

create function support_private.photo_access(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_result jsonb;
begin
  select jsonb_build_object('sha256',p.sha256,'byteSize',p.byte_size) into v_result
    from support_private.ticket_photos p
    join support_private.messages m on m.id=p.message_id
    join support_private.tickets t on t.id=m.ticket_id
    where p.id=p_id and p.ready and (
      t.owner_id=v_actor or exists(select from support_private.capabilities
        where user_id=v_actor and capability='support.manage')
    );
  if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  return v_result;
end $$;
create function public.support_ticket_photo_access_v1(p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select support_private.photo_access(p_id);
$$;

revoke all on function support_private.photo_prepare(uuid,uuid,uuid,text,integer,integer,integer),
  support_private.photo_ready(uuid,text),support_private.photo_access(uuid),
  public.support_ticket_photo_prepare_v1(uuid,uuid,uuid,text,integer,integer,integer),
  public.support_ticket_photo_ready_v1(uuid,text),public.support_ticket_photo_access_v1(uuid)
from public,anon,authenticated,service_role;
grant execute on function support_private.photo_prepare(uuid,uuid,uuid,text,integer,integer,integer),
  support_private.photo_access(uuid),
  public.support_ticket_photo_prepare_v1(uuid,uuid,uuid,text,integer,integer,integer),
  public.support_ticket_photo_access_v1(uuid) to authenticated;
grant execute on function support_private.photo_ready(uuid,text),
  public.support_ticket_photo_ready_v1(uuid,text) to service_role;
grant usage on schema support_private to service_role;

create function support_private.ticket_photo_message(p_key uuid,p_ticket uuid,p_category text,p_body text,p_draft uuid,p_photos uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=support_private.ticket_actor();
  v_session uuid:=(auth.jwt()->>'session_id')::uuid;
  v_ticket support_private.tickets;
  v_prior support_private.request_results;
  v_input jsonb:=jsonb_build_array(p_ticket,p_category,p_body,p_draft,p_photos);
  v_body text:=btrim(coalesce(p_body,''));
  v_message uuid;
  v_result jsonb;
  v_now timestamptz:=clock_timestamp();
begin
  if p_key is null or p_draft is null or p_photos is null
    or cardinality(p_photos) not between 1 and 3 or char_length(v_body)>2000
    or (select count(distinct id) from unnest(p_photos) id)<>cardinality(p_photos)
    or (p_ticket is null and (p_category is null or p_category not in ('usage','bug','account','other')))
    or (p_ticket is not null and p_category is not null) then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  if p_ticket is not null and not exists(
    select from support_private.tickets where id=p_ticket and owner_id=v_actor
  ) then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  -- The original result takes precedence over a consumed attachment on a retry.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':ticket:'||p_key::text,0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='ticket' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_ticket is not null then
    select * into v_ticket from support_private.tickets where id=p_ticket and owner_id=v_actor for update;
    if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  end if;
  if (select count(*) from (
    select id from support_private.ticket_photos where id=any(p_photos) and owner_id=v_actor
      and session_id=v_session and draft_id=p_draft and draft_ticket_id is not distinct from p_ticket
      and ready and message_id is null and expires_at>clock_timestamp() order by id for update
  ) locked)<>cardinality(p_photos) then
    raise invalid_parameter_value using message='SUPPORT_PHOTO_NOT_READY';
  end if;
  if p_ticket is null then
    insert into support_private.tickets(owner_id,category) values(v_actor,p_category) returning * into v_ticket;
  end if;
  -- Same owner-message transition as ticket_command; no staff/outbox change.
  update support_private.tickets set
    pending_since=case when state='open' and next_actor='staff' then pending_since else v_now end,
    state='open',next_actor='staff',close_reason=null,message_seq=message_seq+1,last_user_seq=message_seq+1,
    assignee_id=case when exists(select from support_private.capabilities where user_id=assignee_id and capability='support.manage') then assignee_id else null end,
    revision=revision+1,updated_at=v_now where id=v_ticket.id returning * into v_ticket;
  insert into support_private.messages(ticket_id,seq,author_id,author_kind,kind,body)
    values(v_ticket.id,v_ticket.message_seq,v_actor,'user','message',v_body) returning id into v_message;
  update support_private.ticket_photos set message_id=v_message where id=any(p_photos);
  v_result:=jsonb_build_object('id',v_ticket.id,'revision',v_ticket.revision,'messageId',v_message,
    'messageSeq',v_ticket.message_seq,'createdAt',v_ticket.created_at);
  insert into support_private.request_results(actor_id,operation,request_key,input,result)
    values(v_actor,'ticket',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision)
    values(v_actor,'ticket.message',v_ticket.id,v_ticket.revision);
  return v_result;
end $$;
create function public.support_ticket_photo_message_v1(p_key uuid,p_ticket uuid,p_category text,p_body text,p_draft uuid,p_photos uuid[])
returns jsonb language sql security invoker set search_path='' as $$
  select support_private.ticket_photo_message(p_key,p_ticket,p_category,p_body,p_draft,p_photos);
$$;

create function support_private.ticket_read_photos(p_ticket uuid,p_after integer,p_limit integer,p_ack integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_thread jsonb; v_messages jsonb;
begin
  v_thread:=support_private.ticket_read(p_ticket,p_after,p_limit,p_ack);
  select coalesce(jsonb_agg(m.value||jsonb_build_object('photos',coalesce((
    select jsonb_agg(jsonb_build_object('id',p.id,'width',p.width,'height',p.height) order by p.id)
    from support_private.ticket_photos p where p.message_id=(m.value->>'id')::uuid and p.ready
  ),'[]'::jsonb)) order by m.ordinality),'[]'::jsonb)
    into v_messages from jsonb_array_elements(v_thread->'messages') with ordinality m;
  return jsonb_set(v_thread,'{messages}',v_messages);
end $$;
create function public.support_ticket_read_photos_v1(p_ticket uuid,p_after integer default 0,p_limit integer default 50,p_ack integer default null)
returns jsonb language sql security invoker set search_path='' as $$
  select support_private.ticket_read_photos(p_ticket,p_after,p_limit,p_ack);
$$;

revoke all on function support_private.ticket_photo_message(uuid,uuid,text,text,uuid,uuid[]),
  public.support_ticket_photo_message_v1(uuid,uuid,text,text,uuid,uuid[]),
  support_private.ticket_read_photos(uuid,integer,integer,integer),
  public.support_ticket_read_photos_v1(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function support_private.ticket_photo_message(uuid,uuid,text,text,uuid,uuid[]),
  public.support_ticket_photo_message_v1(uuid,uuid,text,text,uuid,uuid[]),
  support_private.ticket_read_photos(uuid,integer,integer,integer),
  public.support_ticket_read_photos_v1(uuid,integer,integer,integer) to authenticated;

commit;

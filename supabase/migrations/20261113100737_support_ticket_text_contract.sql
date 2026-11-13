-- NURI-15 text reception foundation. Attachments and delivery workers remain disabled.
-- No existing inbox, announcements, payment or outbound transport is touched.
begin;
alter table support_private.runtime add column support_enabled boolean not null default false;
create table support_private.tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null check(category in ('usage','bug','account','other')),
  state text not null default 'open' check(state in ('open','closed')),
  next_actor text not null default 'staff' check(next_actor in ('staff','user','none')),
  assignee_id uuid references auth.users(id) on delete set null,
  revision integer not null default 1 check(revision>0),
  message_seq integer not null default 0 check(message_seq>=0),
  last_user_seq integer not null default 0 check(last_user_seq>=0),
  close_reason text,
  pending_since timestamptz default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check(state<>'closed' or next_actor='none')
);
create index tickets_owner_updated on support_private.tickets(owner_id,updated_at desc,id);
create index tickets_staff_pending on support_private.tickets(next_actor,pending_since,id) where state='open';
create table support_private.messages (
  ticket_id uuid not null references support_private.tickets(id) on delete cascade,
  seq integer not null check(seq>0),
  id uuid not null unique default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  author_kind text not null check(author_kind in ('user','staff')),
  kind text not null check(kind in ('message','answer','information')),
  body text not null check(char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default clock_timestamp(),
  primary key(ticket_id,seq),
  check(author_kind<>'user' or char_length(body)<=2000)
);
create table support_private.ticket_reads (
  ticket_id uuid not null references support_private.tickets(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null default 0 check(seq>=0),
  served_seq integer not null default 0 check(served_seq>=seq),
  primary key(ticket_id,actor_id)
);
create table support_private.outbox (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_private.tickets(id) on delete cascade,
  message_seq integer not null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel='inapp'),
  state text not null default 'pending' check(state in ('pending','leased','delivered','failed')),
  attempts integer not null default 0 check(attempts>=0),
  lease_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique(ticket_id,message_seq,recipient_id,channel),
  foreign key(ticket_id,message_seq) references support_private.messages(ticket_id,seq) on delete cascade
);
alter table support_private.tickets enable row level security;
alter table support_private.messages enable row level security;
alter table support_private.ticket_reads enable row level security;
alter table support_private.outbox enable row level security;
revoke all on support_private.tickets,support_private.messages,support_private.ticket_reads,support_private.outbox from public,anon,authenticated;

create function support_private.ticket_actor() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not exists(select from auth.sessions where user_id=v_actor and id::text=auth.jwt()->>'session_id') then
    raise exception using errcode='42501',message='SUPPORT_AUTH_REQUIRED';
  end if;
  if not exists(select from support_private.runtime where singleton and support_enabled) then
    raise exception using errcode='55000',message='SUPPORT_UNAVAILABLE';
  end if;
  return v_actor;
end $$;

create function support_private.ticket_command(p_key uuid,p_operation text,p_ticket uuid,p_revision integer,p_seen_user_seq integer,p_body text,p_category text,p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=support_private.ticket_actor(); v_staff boolean;
  v_ticket support_private.tickets; v_prior support_private.request_results;
  v_input jsonb:=jsonb_build_object('operation',p_operation,'ticket',p_ticket,'revision',p_revision,'seen',p_seen_user_seq,'body',p_body,'category',p_category,'kind',p_kind);
  v_body text:=btrim(p_body); v_message uuid; v_result jsonb; v_now timestamptz:=clock_timestamp();
begin
  if p_key is null or p_operation is null or p_operation not in ('message','claim','reply','close','reopen','release') then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  v_staff:=exists(select from support_private.capabilities where user_id=v_actor and capability='support.manage');
  if p_ticket is not null then
    select * into v_ticket from support_private.tickets where id=p_ticket;
    if not found or (v_ticket.owner_id<>v_actor and not v_staff) then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
  elsif p_operation<>'message' or p_revision is not null then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  if p_operation in ('reply','claim','release') and not v_staff then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  if p_operation='message' and p_ticket is not null and v_ticket.owner_id<>v_actor then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  -- Serialize the logical request before business revision checks: retry success stays success.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':ticket:'||p_key::text,0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='ticket' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise exception using errcode='23505',message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_ticket is not null then
    select * into v_ticket from support_private.tickets where id=p_ticket for update;
    if not found then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
    if p_operation<>'message' and p_revision is distinct from v_ticket.revision then
      raise exception using errcode='40001',message='SUPPORT_REVISION_CONFLICT';
    end if;
  end if;
  if p_operation='message' then
    if v_body is null or char_length(v_body) not between 1 and 2000 or p_kind is not null or p_seen_user_seq is not null
      or (p_ticket is null and (p_category is null or p_category not in ('usage','bug','account','other')))
      or (p_ticket is not null and p_category is not null) then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    if p_ticket is null then
      insert into support_private.tickets(owner_id,category) values(v_actor,p_category) returning * into v_ticket;
    end if;
    update support_private.tickets set
      pending_since=case when state='open' and next_actor='staff' then pending_since else v_now end,
      state='open',next_actor='staff',close_reason=null,message_seq=message_seq+1,last_user_seq=message_seq+1,
      assignee_id=case when exists(select from support_private.capabilities where user_id=assignee_id and capability='support.manage') then assignee_id else null end,
      revision=revision+1,updated_at=v_now where id=v_ticket.id returning * into v_ticket;
    insert into support_private.messages(ticket_id,seq,author_id,author_kind,kind,body)
      values(v_ticket.id,v_ticket.message_seq,v_actor,'user','message',v_body) returning id into v_message;
  elsif p_operation='claim' then
    if v_ticket.state='closed' or (v_ticket.assignee_id is not null and v_ticket.assignee_id<>v_actor
      and exists(select from support_private.capabilities where user_id=v_ticket.assignee_id and capability='support.manage')) then
      raise exception using errcode='40001',message='SUPPORT_CLAIM_CONFLICT';
    end if;
    update support_private.tickets set assignee_id=v_actor,revision=revision+1,updated_at=v_now where id=p_ticket returning * into v_ticket;
  elsif p_operation='reply' then
    if v_ticket.state<>'open' or v_ticket.assignee_id is distinct from v_actor then raise exception using errcode='42501',message='SUPPORT_NOT_ASSIGNED'; end if;
    if p_seen_user_seq is distinct from v_ticket.last_user_seq then raise exception using errcode='40001',message='SUPPORT_MESSAGE_CONFLICT'; end if;
    if v_body is null or char_length(v_body) not between 1 and 5000 or p_kind is null or p_kind not in ('answer','information') then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    update support_private.tickets set next_actor=case when p_kind='information' then 'user' else 'none' end,
      pending_since=null,message_seq=message_seq+1,revision=revision+1,updated_at=v_now where id=p_ticket returning * into v_ticket;
    insert into support_private.messages(ticket_id,seq,author_id,author_kind,kind,body)
      values(p_ticket,v_ticket.message_seq,v_actor,'staff',p_kind,v_body) returning id into v_message;
    -- Durable intent only. No transport or success result is manufactured here.
    insert into support_private.outbox(ticket_id,message_seq,recipient_id,channel)
      values(p_ticket,v_ticket.message_seq,v_ticket.owner_id,'inapp');
  elsif p_operation='release' then
    if v_ticket.assignee_id is distinct from v_actor then raise exception using errcode='42501',message='SUPPORT_NOT_ASSIGNED'; end if;
    update support_private.tickets set assignee_id=null,revision=revision+1,updated_at=v_now where id=p_ticket returning * into v_ticket;
  elsif p_operation='close' then
    if v_ticket.owner_id<>v_actor and v_ticket.assignee_id is distinct from v_actor then raise exception using errcode='42501',message='SUPPORT_NOT_ASSIGNED'; end if;
    if v_body is null or char_length(v_body) not between 1 and 500 then raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT'; end if;
    update support_private.tickets set state='closed',next_actor='none',close_reason=v_body,pending_since=null,revision=revision+1,updated_at=v_now where id=p_ticket returning * into v_ticket;
  else
    if v_ticket.state<>'closed' then raise exception using errcode='40001',message='SUPPORT_REVISION_CONFLICT'; end if;
    update support_private.tickets set state='open',next_actor='staff',close_reason=null,pending_since=v_now,revision=revision+1,updated_at=v_now where id=p_ticket returning * into v_ticket;
  end if;
  v_result:=jsonb_build_object('id',v_ticket.id,'revision',v_ticket.revision,'state',v_ticket.state,'nextActor',v_ticket.next_actor,'messageId',v_message,'messageSeq',v_ticket.message_seq,'lastUserSeq',v_ticket.last_user_seq,'createdAt',v_ticket.created_at);
  insert into support_private.request_results(actor_id,operation,request_key,input,result) values(v_actor,'ticket',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision) values(v_actor,'ticket.'||p_operation,v_ticket.id,v_ticket.revision);
  return v_result;
end $$;

create function support_private.ticket_read(p_ticket uuid,p_after integer,p_limit integer,p_ack integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_ticket support_private.tickets; v_staff boolean; v_messages jsonb; v_read integer; v_served integer;
begin
  v_staff:=exists(select from support_private.capabilities where user_id=v_actor and capability='support.manage');
  select * into v_ticket from support_private.tickets where id=p_ticket;
  if not found or (v_ticket.owner_id<>v_actor and not v_staff) then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
  if p_after is null or p_after<0 or p_limit is null or p_limit not between 1 and 100
    or (p_ack is not null and (p_ack<0 or p_ack>v_ticket.message_seq)) then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  -- Acknowledgment is separate from fetching and cannot exceed an earlier returned page.
  insert into support_private.ticket_reads(ticket_id,actor_id) values(p_ticket,v_actor) on conflict do nothing;
  select served_seq into v_served from support_private.ticket_reads where ticket_id=p_ticket and actor_id=v_actor for update;
  if p_ack is not null then
    if p_ack>v_served then raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT'; end if;
    update support_private.ticket_reads set seq=greatest(seq,p_ack) where ticket_id=p_ticket and actor_id=v_actor;
  end if;
  select seq into v_read from support_private.ticket_reads where ticket_id=p_ticket and actor_id=v_actor;
  select coalesce(jsonb_agg(to_jsonb(m)),'[]') into v_messages from (
    select id,seq,author_kind,kind,body,created_at from support_private.messages where ticket_id=p_ticket and seq>p_after order by seq limit p_limit
  ) m;
  select coalesce(max((item->>'seq')::integer),0) into v_served from jsonb_array_elements(v_messages) item;
  update support_private.ticket_reads set served_seq=greatest(served_seq,v_served) where ticket_id=p_ticket and actor_id=v_actor;
  return jsonb_build_object('id',v_ticket.id,'category',v_ticket.category,'revision',v_ticket.revision,'state',v_ticket.state,'nextActor',v_ticket.next_actor,
    'messageSeq',v_ticket.message_seq,'lastUserSeq',v_ticket.last_user_seq,'readSeq',coalesce(v_read,0),'messages',v_messages,'createdAt',v_ticket.created_at,'updatedAt',v_ticket.updated_at,
    'closeReason',v_ticket.close_reason,'assignment',case when v_staff then jsonb_build_object('assigneeId',v_ticket.assignee_id) else null end);
end $$;

create function public.support_ticket_command_v1(p_key uuid,p_operation text,p_ticket uuid default null,p_revision integer default null,p_seen_user_seq integer default null,p_body text default null,p_category text default null,p_kind text default null)
returns jsonb language sql security invoker set search_path='' as $$select support_private.ticket_command(p_key,p_operation,p_ticket,p_revision,p_seen_user_seq,p_body,p_category,p_kind)$$;
create function public.support_ticket_read_v1(p_ticket uuid,p_after integer default 0,p_limit integer default 50,p_ack integer default null)
returns jsonb language sql security invoker set search_path='' as $$select support_private.ticket_read(p_ticket,p_after,p_limit,p_ack)$$;
revoke all on function support_private.ticket_actor(),support_private.ticket_command(uuid,text,uuid,integer,integer,text,text,text),support_private.ticket_read(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function support_private.ticket_command(uuid,text,uuid,integer,integer,text,text,text),support_private.ticket_read(uuid,integer,integer,integer) to authenticated;
revoke all on function public.support_ticket_command_v1(uuid,text,uuid,integer,integer,text,text,text),public.support_ticket_read_v1(uuid,integer,integer,integer) from public,anon;
grant execute on function public.support_ticket_command_v1(uuid,text,uuid,integer,integer,text,text,text),public.support_ticket_read_v1(uuid,integer,integer,integer) to authenticated;
commit;

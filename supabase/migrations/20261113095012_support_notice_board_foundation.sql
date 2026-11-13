-- NURI-15 board only. No announcements, notification, delivery or Cron mutation.
-- Rollout remains closed until an operator explicitly enables the local/approved environment.
begin;
create schema support_private;
revoke all on schema support_private from public, anon;
grant usage on schema support_private to authenticated;

create table support_private.runtime (
  singleton boolean primary key default true check (singleton),
  board_enabled boolean not null default false,
  generation bigint not null default 0
);
insert into support_private.runtime(singleton) values(true);
create table support_private.capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in ('notices.manage','faq.manage','support.manage')),
  primary key(user_id, capability)
);
create table support_private.notice_drafts (
  id uuid primary key default gen_random_uuid(),
  revision integer not null default 1 check(revision > 0),
  state text not null default 'draft' check(state in ('draft','published','stopped')),
  title text not null check(char_length(btrim(title)) between 1 and 150),
  body text not null check(char_length(btrim(body)) between 1 and 10000),
  category text not null check(category in ('update','guide')),
  pinned boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  check(expires_at is null or starts_at is null or expires_at > starts_at)
);
create table support_private.notice_publications (
  id uuid primary key references support_private.notice_drafts(id),
  title text not null,
  body text not null,
  category text not null check(category in ('update','guide')),
  pinned boolean not null,
  starts_at timestamptz,
  expires_at timestamptz,
  first_published_at timestamptz not null,
  updated_at timestamptz not null
);
create unique index notice_single_pin on support_private.notice_publications(pinned) where pinned;
create table support_private.notice_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid not null references support_private.notice_drafts(id),
  read_at timestamptz not null default clock_timestamp(),
  primary key(user_id,notice_id)
);
create table support_private.request_results (
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  request_key uuid not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(actor_id, operation, request_key)
);
create table support_private.audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  operation text not null,
  resource_id uuid not null,
  revision integer not null,
  created_at timestamptz not null default clock_timestamp()
);
-- No client table access, even through a subsequently exposed schema.
alter table support_private.runtime enable row level security;
alter table support_private.capabilities enable row level security;
alter table support_private.notice_drafts enable row level security;
alter table support_private.notice_publications enable row level security;
alter table support_private.notice_reads enable row level security;
alter table support_private.request_results enable row level security;
alter table support_private.audit enable row level security;
revoke all on all tables in schema support_private from public, anon, authenticated;
revoke all on all sequences in schema support_private from public, anon, authenticated;

create function support_private.actor() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_session text := auth.jwt()->>'session_id';
begin
  if v_actor is null or not exists(select from auth.users where id=v_actor)
     or v_session is null or not exists(select from auth.sessions where user_id=v_actor and id::text=v_session) then
    raise exception using errcode='42501', message='SUPPORT_AUTH_REQUIRED';
  end if;
  if not exists(select from support_private.runtime where singleton and board_enabled) then
    raise exception using errcode='55000', message='SUPPORT_UNAVAILABLE';
  end if;
  return v_actor;
end $$;

create function support_private.notice_command(p_key uuid, p_operation text, p_id uuid, p_expected_revision integer, p_content jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := support_private.actor();
  v_input jsonb := jsonb_build_object('operation',p_operation,'id',p_id,'revision',p_expected_revision,'content',p_content);
  v_prior support_private.request_results;
  v_row support_private.notice_drafts;
  v_result jsonb;
  v_title text; v_body text; v_category text; v_pinned boolean; v_starts timestamptz; v_expires timestamptz;
begin
  -- Authorization precedes cached responses, including retries after revocation.
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='notices.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  if p_key is null or p_operation is null or p_operation not in ('save','publish','stop') then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  -- A narrow editorial lock serializes pin replacement and revision checks.
  perform pg_advisory_xact_lock(hashtextextended('nuri.support.notice-editorial',0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='notice' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise exception using errcode='23505',message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_id is not null then
    select * into v_row from support_private.notice_drafts where id=p_id for update;
    if not found then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
    if p_expected_revision is distinct from v_row.revision then raise exception using errcode='40001',message='SUPPORT_REVISION_CONFLICT'; end if;
  elsif p_operation <> 'save' or p_expected_revision is not null then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  if p_operation='save' then
    if jsonb_typeof(p_content) is distinct from 'object'
       or jsonb_typeof(p_content->'title') is distinct from 'string'
       or jsonb_typeof(p_content->'body') is distinct from 'string'
       or jsonb_typeof(p_content->'category') is distinct from 'string'
       or jsonb_typeof(p_content->'pinned') is distinct from 'boolean'
       or (p_content - array['title','body','category','pinned','startsAt','expiresAt']) <> '{}'::jsonb then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    v_title := btrim(p_content->>'title'); v_body := btrim(p_content->>'body'); v_category := p_content->>'category';
    v_pinned := (p_content->>'pinned')::boolean;
    begin
      v_starts := (p_content->>'startsAt')::timestamptz; v_expires := (p_content->>'expiresAt')::timestamptz;
    exception when others then raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT'; end;
    if char_length(v_title) not between 1 and 150 or char_length(v_body) not between 1 and 10000
       or v_category not in ('update','guide') or (v_expires is not null and v_starts is not null and v_expires<=v_starts)
       or (v_starts is not null and not isfinite(v_starts)) or (v_expires is not null and not isfinite(v_expires)) then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    if p_id is null then
      insert into support_private.notice_drafts(title,body,category,pinned,starts_at,expires_at)
        values(v_title,v_body,v_category,v_pinned,v_starts,v_expires) returning * into v_row;
    else
      update support_private.notice_drafts set title=v_title,body=v_body,category=v_category,pinned=v_pinned,
        starts_at=v_starts,expires_at=v_expires,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into v_row;
    end if;
  elsif p_content is not null then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  elsif p_operation='publish' then
    if v_row.pinned then
      -- Losing the pin is also a revision change for the competing editor.
      update support_private.notice_drafts set pinned=false,revision=revision+1,updated_at=clock_timestamp()
        where id<>v_row.id and id in (select id from support_private.notice_publications where pinned);
      update support_private.notice_publications set pinned=false where id<>v_row.id and pinned;
    end if;
    insert into support_private.notice_publications(id,title,body,category,pinned,starts_at,expires_at,first_published_at,updated_at)
      values(v_row.id,v_row.title,v_row.body,v_row.category,v_row.pinned,v_row.starts_at,v_row.expires_at,clock_timestamp(),clock_timestamp())
      on conflict(id) do update set title=excluded.title,body=excluded.body,category=excluded.category,pinned=excluded.pinned,
        starts_at=excluded.starts_at,expires_at=excluded.expires_at,updated_at=excluded.updated_at;
    update support_private.notice_drafts set state='published',revision=revision+1,updated_at=clock_timestamp()
      where id=v_row.id returning * into v_row;
  else
    update support_private.notice_publications set pinned=false where id=v_row.id;
    update support_private.notice_drafts set state='stopped',pinned=false,revision=revision+1,updated_at=clock_timestamp()
      where id=v_row.id returning * into v_row;
  end if;
  update support_private.runtime set generation=generation+1 where singleton;
  v_result := jsonb_build_object('id',v_row.id,'revision',v_row.revision,'state',v_row.state);
  insert into support_private.request_results(actor_id,operation,request_key,input,result) values(v_actor,'notice',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision) values(v_actor,'notice.'||p_operation,v_row.id,v_row.revision);
  return v_result;
end $$;

create function support_private.notice_list(p_category text, p_cursor jsonb, p_limit integer, p_management boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor uuid := support_private.actor(); v_generation bigint; v_offset integer := 0; v_count integer; v_items jsonb; v_now timestamptz := statement_timestamp(); v_as_of timestamptz; v_cursor_generation bigint;
begin
  if p_management is null or p_limit is null or p_limit not between 1 and 50 or (p_category is not null and p_category not in ('update','guide')) then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  if p_management and not exists(select from support_private.capabilities where user_id=v_actor and capability='notices.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  select generation into v_generation from support_private.runtime where singleton;
  if p_cursor is not null then
    if jsonb_typeof(p_cursor) is distinct from 'object'
       or jsonb_typeof(p_cursor->'generation') is distinct from 'number'
       or jsonb_typeof(p_cursor->'offset') is distinct from 'number'
       or jsonb_typeof(p_cursor->'management') is distinct from 'boolean'
       or jsonb_typeof(p_cursor->'asOf') is distinct from 'string'
       or not (p_cursor ? 'category') then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    begin
      v_cursor_generation := (p_cursor->>'generation')::bigint;
      v_offset := (p_cursor->>'offset')::integer;
      v_as_of := (p_cursor->>'asOf')::timestamptz;
    exception when invalid_text_representation or numeric_value_out_of_range or invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end;
    if v_offset<0 or not isfinite(v_as_of) or v_as_of>v_now then
      raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
    end if;
    if v_cursor_generation is distinct from v_generation
       or p_cursor->>'category' is distinct from p_category or (p_cursor->>'management')::boolean is distinct from p_management then
      raise exception using errcode='40001',message='SUPPORT_CURSOR_STALE';
    end if;
    -- Visibility can change with time alone. A page cursor cannot cross that boundary.
    if exists(select from support_private.notice_publications where
      (starts_at > v_as_of and starts_at <= v_now)
      or (expires_at > v_as_of and expires_at <= v_now)) then
      raise exception using errcode='40001',message='SUPPORT_CURSOR_STALE';
    end if;
  end if;
  if p_management then
    select count(*) into v_count from support_private.notice_drafts where p_category is null or category=p_category;
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into v_items from (
      select id,revision,state,title,body,category,pinned,starts_at,expires_at,updated_at from support_private.notice_drafts
      where p_category is null or category=p_category order by updated_at desc,id desc limit p_limit offset v_offset
    ) t;
  else
    select count(*) into v_count from support_private.notice_publications p join support_private.notice_drafts d using(id)
      where d.state='published' and (p_category is null or p.category=p_category)
        and (p.starts_at is null or p.starts_at<=v_now) and (p.expires_at is null or p.expires_at>v_now);
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into v_items from (
      select p.id,p.title,p.category,p.pinned,p.first_published_at,p.updated_at,p.expires_at,r.read_at
      from support_private.notice_publications p join support_private.notice_drafts d using(id)
      left join support_private.notice_reads r on r.notice_id=p.id and r.user_id=v_actor
      where d.state='published' and (p_category is null or p.category=p_category)
        and (p.starts_at is null or p.starts_at<=v_now) and (p.expires_at is null or p.expires_at>v_now)
      order by p.pinned desc,p.first_published_at desc,p.id desc limit p_limit offset v_offset
    ) t;
  end if;
  return jsonb_build_object('items',v_items,'count',v_count,'generation',v_generation,'nextCursor',
    case when v_offset+jsonb_array_length(v_items)<v_count then jsonb_build_object('generation',v_generation,'offset',v_offset+jsonb_array_length(v_items),'category',p_category,'management',p_management,'asOf',v_now) else null end);
end $$;

create function support_private.notice_detail(p_id uuid, p_mark_read boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := support_private.actor(); v_row support_private.notice_publications;
begin
  select p.* into v_row from support_private.notice_publications p join support_private.notice_drafts d using(id)
    where p.id=p_id and d.state='published' and (p.starts_at is null or p.starts_at<=statement_timestamp())
      and (p.expires_at is null or p.expires_at>statement_timestamp());
  if not found then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
  if p_mark_read then insert into support_private.notice_reads(user_id,notice_id) values(v_actor,p_id) on conflict do nothing; end if;
  return to_jsonb(v_row);
end $$;

create function public.support_notice_command_v1(p_key uuid,p_operation text,p_id uuid default null,p_expected_revision integer default null,p_content jsonb default null)
returns jsonb language sql security invoker set search_path = '' as $$select support_private.notice_command(p_key,p_operation,p_id,p_expected_revision,p_content)$$;
create function public.support_notice_list_v1(p_category text default null,p_cursor jsonb default null,p_limit integer default 20,p_management boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$select support_private.notice_list(p_category,p_cursor,p_limit,p_management)$$;
create function public.support_notice_detail_v1(p_id uuid,p_mark_read boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$select support_private.notice_detail(p_id,p_mark_read)$$;
revoke all on all functions in schema support_private from public,anon,authenticated;
grant execute on function support_private.notice_command(uuid,text,uuid,integer,jsonb), support_private.notice_list(text,jsonb,integer,boolean), support_private.notice_detail(uuid,boolean) to authenticated;
revoke all on function public.support_notice_command_v1(uuid,text,uuid,integer,jsonb),public.support_notice_list_v1(text,jsonb,integer,boolean),public.support_notice_detail_v1(uuid,boolean) from public,anon;
grant execute on function public.support_notice_command_v1(uuid,text,uuid,integer,jsonb),public.support_notice_list_v1(text,jsonb,integer,boolean),public.support_notice_detail_v1(uuid,boolean) to authenticated;
commit;

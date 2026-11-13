begin;

create table support_private.faq_entries (
  id uuid primary key default gen_random_uuid(),
  revision integer not null default 1,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz
);
alter table support_private.faq_entries enable row level security;
revoke all on support_private.faq_entries from public,anon,authenticated;

create function support_private.faq_list(p_management boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.actor();
begin
  if p_management is null then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  if p_management and not exists (
    select from support_private.capabilities where user_id=v_actor and capability='faq.manage'
  ) then raise insufficient_privilege using message='SUPPORT_FORBIDDEN'; end if;
  return jsonb_build_object('items',coalesce((
    select jsonb_agg(
      case when p_management then jsonb_build_object('id',id,'revision',revision,'draft',draft,'published',published)
        else jsonb_build_object('id',id,'published',published) end
      order by coalesce(published_at,'infinity'::timestamptz),id
    ) from support_private.faq_entries where p_management or published is not null
  ),'[]'::jsonb));
end $$;

create function support_private.faq_command(p_key uuid,p_action text,p_id uuid,p_revision integer,p_content jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=support_private.actor();
  v_input jsonb:=jsonb_build_array(p_action,p_id,p_revision,p_content);
  v_prior support_private.request_results;
  v_entry support_private.faq_entries;
  v_result jsonb;
begin
  if not exists (select from support_private.capabilities where user_id=v_actor and capability='faq.manage')
    then raise insufficient_privilege using message='SUPPORT_FORBIDDEN'; end if;
  if p_key is null or p_action is null or p_action not in ('save','publish','stop')
    or (p_id is null and (p_action<>'save' or p_revision is not null))
    or (p_action<>'save' and p_content is not null)
    then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('nuri.support.faq-editorial',0));
  select * into v_prior from support_private.request_results
    where actor_id=v_actor and operation='faq' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_id is not null then
    select * into v_entry from support_private.faq_entries where id=p_id for update;
    if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
    if v_entry.revision is distinct from p_revision then raise sqlstate 'PT409' using message='SUPPORT_REVISION_CONFLICT'; end if;
  end if;
  if p_action='save' then
    if jsonb_typeof(p_content) is distinct from 'object'
      or jsonb_typeof(p_content->'question') is distinct from 'string'
      or jsonb_typeof(p_content->'answer') is distinct from 'string'
      or jsonb_typeof(p_content->'category') is distinct from 'string'
      or p_content->>'category' not in ('usage','account','billing')
      or char_length(btrim(p_content->>'question')) not between 1 and 150
      or char_length(btrim(p_content->>'answer')) not between 1 and 4000
      or (p_content - array['question','answer','category']) <> '{}'::jsonb
      then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
    if p_id is null then
      if (select count(*) from support_private.faq_entries)>=100
        then raise sqlstate 'PT409' using message='SUPPORT_FAQ_LIMIT'; end if;
      insert into support_private.faq_entries(draft) values(p_content) returning * into v_entry;
    else
      update support_private.faq_entries set draft=p_content,revision=revision+1 where id=p_id returning * into v_entry;
    end if;
  else
    update support_private.faq_entries set
      published=case when p_action='publish' then draft end,
      published_at=case when p_action='publish' then coalesce(published_at,clock_timestamp()) end,
      revision=revision+1 where id=p_id returning * into v_entry;
  end if;
  v_result:=jsonb_build_object('id',v_entry.id,'revision',v_entry.revision,'draft',v_entry.draft,'published',v_entry.published);
  insert into support_private.request_results(actor_id,operation,request_key,input,result)
    values(v_actor,'faq',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision)
    values(v_actor,'faq.'||p_action,v_entry.id,v_entry.revision);
  return v_result;
end $$;

create function public.support_faq_list_v1(p_management boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select support_private.faq_list(p_management)$$;
create function public.support_faq_command_v1(p_key uuid,p_action text,p_id uuid default null,p_revision integer default null,p_content jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$select support_private.faq_command(p_key,p_action,p_id,p_revision,p_content)$$;
revoke all on function support_private.faq_list(boolean),support_private.faq_command(uuid,text,uuid,integer,jsonb),
  public.support_faq_list_v1(boolean),public.support_faq_command_v1(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function support_private.faq_list(boolean),support_private.faq_command(uuid,text,uuid,integer,jsonb),
  public.support_faq_list_v1(boolean),public.support_faq_command_v1(uuid,text,uuid,integer,jsonb) to authenticated;

-- Mark before deleting external bytes. The message command locks the same row and
-- accepts only ready, unexpired reservations. A failed Storage delete is retryable.
alter table support_private.ticket_photos add column purging boolean not null default false;
create function support_private.claim_expired_photo(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update support_private.ticket_photos set purging=true,ready=false
    where id=p_id and message_id is null and expires_at < clock_timestamp() - interval '5 minutes';
  return found;
end $$;
create function support_private.finish_expired_photo(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  delete from support_private.ticket_photos p where id=p_id and purging and message_id is null
    and not exists(select from storage.objects o where o.bucket_id='support-ticket-photos' and o.name=p.id::text||'.jpg');
  return found;
end $$;
create function public.support_claim_expired_photo_v1(p_id uuid)
returns boolean language sql security invoker set search_path='' as $$select support_private.claim_expired_photo(p_id)$$;
create function public.support_finish_expired_photo_v1(p_id uuid)
returns boolean language sql security invoker set search_path='' as $$select support_private.finish_expired_photo(p_id)$$;
revoke all on function support_private.claim_expired_photo(uuid),support_private.finish_expired_photo(uuid),
  public.support_claim_expired_photo_v1(uuid),public.support_finish_expired_photo_v1(uuid) from public,anon,authenticated;
grant execute on function support_private.claim_expired_photo(uuid),support_private.finish_expired_photo(uuid),
  public.support_claim_expired_photo_v1(uuid),public.support_finish_expired_photo_v1(uuid) to service_role;
commit;

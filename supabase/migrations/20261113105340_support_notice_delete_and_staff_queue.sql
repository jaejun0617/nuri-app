-- Additive, board-only deletion. Original publications, reads and audit stay intact.
begin;
alter table support_private.notice_drafts add column deleted_at timestamptz;
alter function support_private.notice_command(uuid,text,uuid,integer,jsonb) rename to notice_command_base;
revoke all on function support_private.notice_command_base(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;

create function support_private.notice_command(p_key uuid,p_operation text,p_id uuid,p_expected_revision integer,p_content jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.actor(); v_row support_private.notice_drafts;
  v_prior support_private.request_results; v_input jsonb; v_result jsonb;
begin
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='notices.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('nuri.support.notice-editorial',0));
  -- A prior committed request remains resolvable; permission is always rechecked first.
  v_input:=jsonb_build_object('operation',p_operation,'id',p_id,'revision',p_expected_revision,'content',p_content);
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='notice' and request_key=p_key;
  if found then
    if v_prior.input is distinct from v_input then raise exception using errcode='23505',message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_id is not null then
    select * into v_row from support_private.notice_drafts where id=p_id for update;
    if not found or v_row.deleted_at is not null then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
  end if;
  if p_operation is distinct from 'delete' then
    return support_private.notice_command_base(p_key,p_operation,p_id,p_expected_revision,p_content);
  end if;
  if p_key is null or p_id is null or p_content is not null then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  if p_expected_revision is distinct from v_row.revision then
    raise exception using errcode='40001',message='SUPPORT_REVISION_CONFLICT';
  end if;
  update support_private.notice_publications set pinned=false where id=p_id;
  update support_private.notice_drafts set deleted_at=clock_timestamp(),state='stopped',pinned=false,
    revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into v_row;
  update support_private.runtime set generation=generation+1 where singleton;
  v_result:=jsonb_build_object('id',p_id,'revision',v_row.revision,'state','deleted');
  insert into support_private.request_results(actor_id,operation,request_key,input,result) values(v_actor,'notice',p_key,v_input,v_result);
  insert into support_private.audit(actor_id,operation,resource_id,revision) values(v_actor,'notice.delete',p_id,v_row.revision);
  return v_result;
end $$;
-- Rebind the public SQL body to the guarded function after the internal rename.
create or replace function public.support_notice_command_v1(p_key uuid,p_operation text,p_id uuid default null,p_expected_revision integer default null,p_content jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$select support_private.notice_command(p_key,p_operation,p_id,p_expected_revision,p_content)$$;

create function support_private.notice_editor(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.actor(); v_row support_private.notice_drafts;
begin
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='notices.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  select * into v_row from support_private.notice_drafts where id=p_id and deleted_at is null;
  if not found then raise exception using errcode='PT404',message='SUPPORT_NOT_FOUND'; end if;
  return to_jsonb(v_row);
end $$;
create function public.support_notice_editor_v1(p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select support_private.notice_editor(p_id)$$;

create function support_private.staff_ticket_list(p_before timestamptz,p_before_id uuid,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_items jsonb;
begin
  if not exists(select from support_private.capabilities where user_id=v_actor and capability='support.manage') then
    raise exception using errcode='42501',message='SUPPORT_FORBIDDEN';
  end if;
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then
    raise exception using errcode='22023',message='SUPPORT_INVALID_INPUT';
  end if;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]') into v_items from (
    select id,category,state,next_actor,revision,created_at,updated_at from support_private.tickets
    where p_before is null or (created_at,id)<(p_before,p_before_id)
    order by created_at desc,id desc limit p_limit
  ) t;
  return jsonb_build_object('items',v_items);
end $$;
create function public.support_staff_ticket_list_v1(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language sql security invoker set search_path='' as $$select support_private.staff_ticket_list(p_before,p_before_id,p_limit)$$;

revoke all on function support_private.notice_command(uuid,text,uuid,integer,jsonb),support_private.notice_editor(uuid),support_private.staff_ticket_list(timestamptz,uuid,integer) from public,anon;
grant execute on function support_private.notice_command(uuid,text,uuid,integer,jsonb),support_private.notice_editor(uuid),support_private.staff_ticket_list(timestamptz,uuid,integer) to authenticated;
revoke all on function public.support_notice_editor_v1(uuid),public.support_staff_ticket_list_v1(timestamptz,uuid,integer) from public,anon;
grant execute on function public.support_notice_editor_v1(uuid),public.support_staff_ticket_list_v1(timestamptz,uuid,integer) to authenticated;
commit;

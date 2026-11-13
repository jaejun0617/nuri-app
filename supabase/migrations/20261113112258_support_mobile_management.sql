begin;

-- Management adapters use current server roles and the existing moderated
-- write paths. These do not enable production rollout or any push transport.
create function support_private.mobile_community_allowed()
returns boolean language sql stable security definer set search_path='' as $$
  select support_private.ticket_actor() is not null and public.is_community_notice_operator()
$$;

create function public.support_community_allowed_v1()
returns boolean language sql stable security invoker set search_path='' as $$
  select support_private.mobile_community_allowed()
$$;

create function support_private.mobile_community_command(p_key uuid,p_action text,p_id uuid,p_updated timestamptz,p_title text,p_content text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_prior support_private.request_results;
  v_input jsonb:=jsonb_build_array(p_action,p_id,p_updated,p_title,p_content); v_result jsonb; v_post public.posts;
begin
  if not public.is_community_notice_operator() then
    raise insufficient_privilege using message='SUPPORT_FORBIDDEN';
  end if;
  if p_key is null or p_action is null or p_action not in ('create','update','hide')
    or (p_action='create' and (p_id is not null or p_updated is not null))
    or (p_action<>'create' and (p_id is null or p_updated is null))
    or (p_action='hide' and (p_title is not null or p_content is not null))
    or (p_action<>'hide' and (coalesce(char_length(btrim(p_title)),0) not between 1 and 80
      or coalesce(char_length(btrim(p_content)),0) not between 1 and 5000)) then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':community-notice:'||p_key::text,0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='community-notice' and request_key=p_key;
  if found then
    if v_input is distinct from v_prior.input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    return v_prior.result;
  end if;
  if p_id is not null then
    select * into v_post from public.posts where id=p_id and is_notice and status='active' and deleted_at is null for update;
    if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
    if v_post.updated_at is distinct from p_updated then raise sqlstate 'PT409' using message='SUPPORT_REVISION_CONFLICT'; end if;
  end if;
  select to_jsonb(t) into strict v_result from public.community_notice_mutate_v1(p_action,p_id,p_title,p_content,null) t;
  insert into support_private.request_results(actor_id,operation,request_key,input,result) values(v_actor,'community-notice',p_key,v_input,v_result);
  return v_result;
end $$;

create function public.support_community_command_v1(p_key uuid,p_action text,p_id uuid default null,p_updated timestamptz default null,p_title text default null,p_content text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select support_private.mobile_community_command(p_key,p_action,p_id,p_updated,p_title,p_content)
$$;

create function support_private.mobile_report_list(p_before timestamptz,p_before_id uuid,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_items jsonb;
begin
  if not public.is_nuri_ops_admin_v1() then raise insufficient_privilege using message='SUPPORT_FORBIDDEN'; end if;
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc),'[]') into v_items from (
    select r.id,r.target_type,r.target_id,r.reason,r.created_at,
      coalesce(s.review_status,'pending') as review_status,s.last_audit_id,s.operator_note,
      coalesce(s.content_review_status,c.review_status,'normal') as content_review_status,
      case when r.target_type='post' then p.title when r.target_type='comment' then left(m.content,240) end as target_summary
    from public.reports r left join public.admin_report_review_states s on s.report_id=r.id
      left join public.admin_content_review_states c on (c.target_type,c.target_id)=(r.target_type,r.target_id)
      left join public.posts p on r.target_type='post' and p.id=r.target_id
      left join public.comments m on r.target_type='comment' and m.id=r.target_id
    where p_before is null or (r.created_at,r.id)<(p_before,p_before_id)
    order by r.created_at desc,r.id desc limit p_limit
  ) t;
  return jsonb_build_object('items',v_items);
end $$;

create or replace function support_private.mobile_report_review(p_key uuid,p_id uuid,p_previous uuid,p_status text,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_prior support_private.request_results; v_audit uuid;
  v_previous public.admin_report_review_states; v_content text;
  v_input jsonb:=jsonb_build_array(p_id,p_previous,p_status,p_note);
begin
  if not public.is_nuri_ops_admin_v1() then raise insufficient_privilege using message='SUPPORT_FORBIDDEN'; end if;
  if not exists(select from public.admin_action_policies where action_type='report_review_update'
    and not approval_required and not is_disabled) then
    raise insufficient_privilege using message='SUPPORT_FORBIDDEN';
  end if;
  if p_key is null or p_id is null or p_status is null or p_status not in ('reviewing','held','resolved')
    or coalesce(char_length(btrim(p_note)),0) not between 1 and 500 then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text||':report-review:'||p_key::text,0));
  select * into v_prior from support_private.request_results where actor_id=v_actor and operation='report-review' and request_key=p_key;
  if found then
    if v_input is distinct from v_prior.input then raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT'; end if;
    return (v_prior.result->>'id')::uuid;
  end if;
  perform 1 from public.reports where id=p_id for update;
  if not found then raise sqlstate 'PT404' using message='SUPPORT_NOT_FOUND'; end if;
  select * into v_previous from public.admin_report_review_states where report_id=p_id for update;
  if v_previous.last_audit_id is distinct from p_previous then raise sqlstate 'PT409' using message='SUPPORT_REVISION_CONFLICT'; end if;
  select c.review_status into v_content from public.reports r join public.admin_content_review_states c
    on (c.target_type,c.target_id)=(r.target_type,r.target_id) where r.id=p_id;
  -- The web command can also change a content overlay. Mobile writes only the
  -- report review row, so the existing content-approval boundary stays intact.
  v_audit:=public.admin_write_operation_audit_v1(
    'report_mobile_review',v_actor::text,'report',p_id::text,'신고 검토 상태 저장',
    jsonb_build_object('reviewStatus',coalesce(v_previous.review_status,'pending')),
    jsonb_build_object('reviewStatus',p_status),'report_soft_action',null,'medium','succeeded',
    'Report review only; source and content review unchanged.');
  insert into public.admin_report_review_states(report_id,review_status,content_review_status,operator_note,actor_label,last_audit_id)
    values(p_id,p_status,coalesce(v_content,'normal'),btrim(p_note),v_actor::text,v_audit)
    on conflict(report_id) do update set review_status=excluded.review_status,operator_note=excluded.operator_note,
      actor_label=excluded.actor_label,last_audit_id=excluded.last_audit_id,updated_at=clock_timestamp();
  insert into support_private.request_results(actor_id,operation,request_key,input,result)
    values(v_actor,'report-review',p_key,v_input,jsonb_build_object('id',v_audit));
  return v_audit;
end $$;

create function public.support_report_list_v1(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$
  select support_private.mobile_report_list(p_before,p_before_id,p_limit)
$$;
create function public.support_report_review_v1(p_key uuid,p_id uuid,p_previous uuid,p_status text,p_note text)
returns uuid language sql security invoker set search_path='' as $$
  select support_private.mobile_report_review(p_key,p_id,p_previous,p_status,p_note)
$$;

-- Pull-based support inbox: one durable row per reply, visible only to the
-- current ticket owner. No body, email, delivery success or OS push here.
create function support_private.mobile_my_tickets(p_before timestamptz,p_before_id uuid,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_items jsonb;
begin
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc),'[]') into v_items from (
    select t.id,t.category,t.state,t.next_actor,t.created_at,exists(
      select from support_private.outbox o where o.ticket_id=t.id and o.recipient_id=v_actor
        and o.message_seq>coalesce(r.seq,0) and o.channel='inapp'
    ) as unread
    from support_private.tickets t left join support_private.ticket_reads r on r.ticket_id=t.id and r.actor_id=v_actor
    where t.owner_id=v_actor and (p_before is null or (t.created_at,t.id)<(p_before,p_before_id))
    order by t.created_at desc,t.id desc limit p_limit
  ) t;
  return jsonb_build_object('items',v_items);
end $$;
create function support_private.mobile_reply_inbox(p_before timestamptz,p_before_id uuid,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=support_private.ticket_actor(); v_items jsonb;
begin
  if p_limit is null or p_limit not between 1 and 50 or (p_before is null)<>(p_before_id is null)
    or (p_before is not null and not isfinite(p_before)) then raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id desc),'[]') into v_items from (
    select o.id,o.ticket_id,o.message_seq,o.created_at,(o.message_seq>coalesce(r.seq,0)) as unread
    from support_private.outbox o join support_private.tickets t on t.id=o.ticket_id and t.owner_id=v_actor
    left join support_private.ticket_reads r on r.ticket_id=o.ticket_id and r.actor_id=v_actor
    where o.recipient_id=v_actor and o.channel='inapp'
      and (p_before is null or (o.created_at,o.id)<(p_before,p_before_id))
    order by o.created_at desc,o.id desc limit p_limit
  ) t;
  return jsonb_build_object('items',v_items);
end $$;
create function public.support_my_tickets_v1(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$select support_private.mobile_my_tickets(p_before,p_before_id,p_limit)$$;
create function public.support_reply_inbox_v1(p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$select support_private.mobile_reply_inbox(p_before,p_before_id,p_limit)$$;

revoke all on function support_private.mobile_community_allowed(),support_private.mobile_community_command(uuid,text,uuid,timestamptz,text,text),support_private.mobile_report_list(timestamptz,uuid,integer),support_private.mobile_report_review(uuid,uuid,uuid,text,text),support_private.mobile_my_tickets(timestamptz,uuid,integer),support_private.mobile_reply_inbox(timestamptz,uuid,integer) from public,anon;
grant execute on function support_private.mobile_community_allowed(),support_private.mobile_community_command(uuid,text,uuid,timestamptz,text,text),support_private.mobile_report_list(timestamptz,uuid,integer),support_private.mobile_report_review(uuid,uuid,uuid,text,text),support_private.mobile_my_tickets(timestamptz,uuid,integer),support_private.mobile_reply_inbox(timestamptz,uuid,integer) to authenticated;
revoke all on function public.support_community_allowed_v1(),public.support_community_command_v1(uuid,text,uuid,timestamptz,text,text),public.support_report_list_v1(timestamptz,uuid,integer),public.support_report_review_v1(uuid,uuid,uuid,text,text),public.support_my_tickets_v1(timestamptz,uuid,integer),public.support_reply_inbox_v1(timestamptz,uuid,integer) from public,anon;
grant execute on function public.support_community_allowed_v1(),public.support_community_command_v1(uuid,text,uuid,timestamptz,text,text),public.support_report_list_v1(timestamptz,uuid,integer),public.support_report_review_v1(uuid,uuid,uuid,text,text),public.support_my_tickets_v1(timestamptz,uuid,integer),public.support_reply_inbox_v1(timestamptz,uuid,integer) to authenticated;

commit;

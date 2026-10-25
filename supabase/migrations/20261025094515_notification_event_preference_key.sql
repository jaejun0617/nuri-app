begin;

-- Remote migration identity: 20261025094515.

-- Settings choose one event family, not an unrelated additional record switch.
create function notification_private.push_preference_key_v3(p_category text,p_event text) returns text
language sql immutable set search_path='' as $$
 select case when p_event='pet.memorial' then 'memorial'
  when p_event in ('pet.birthday','pet.together_anniversary','pet.together_month') then 'anniversary'
  when p_category='news' then 'service' else p_category end;
$$;
revoke all on function notification_private.push_preference_key_v3(text,text) from public,anon,authenticated;

create or replace function notification_private.claim_delivery_v3(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d record; item record; prefs record; result jsonb:='[]'; token uuid; allowed boolean;
begin
 for d in select * from notification_private.delivery_v3 where
  recipient_user_id=any(coalesce((select push_qa_user_ids from notification_private.runtime_v3 where singleton),'{}'::uuid[]))
  and notification_private.push_qa_allowed_v3(recipient_user_id)
  and ((state in ('pending','retry','provider_unavailable') and next_attempt_at<=statement_timestamp()) or (state='leased' and leased_until<statement_timestamp()))
  and available_at<=statement_timestamp() and attempts<5 order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,1),100) loop
  select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
  select * into item from notification_private.inbox_v3(d.recipient_user_id) n where n.notification_id=coalesce(d.notification_id,d.announcement_id)
   and n.notification_source=case when d.notification_id is null then 'announcement' else 'user' end;
  allowed:=item.notification_id is not null and item.read_at is null and item.target->>'kind'<>'unavailable'
   and coalesce(prefs.push_opt_in,false) and coalesce(prefs.categories->>notification_private.push_preference_key_v3(d.category,item.event_type),'false')='true'
   and (d.announcement_id is null or (item.payload->>'publishVersion')::integer=d.source_version);
  if d.expires_at<=statement_timestamp() then update notification_private.delivery_v3 set state='expired',error_code='EXPIRED' where id=d.id;
  elsif not coalesce(allowed,false) then update notification_private.delivery_v3 set state='suppressed',error_code='SETTINGS_OR_SOURCE' where id=d.id;
  else
   token:=gen_random_uuid();
   update notification_private.delivery_v3 set state='leased',lease_token=token,leased_until=statement_timestamp()+interval '2 minutes' where id=d.id;
   result:=result||jsonb_build_array(jsonb_build_object('id',d.id,'leaseToken',token,'recipientUserId',d.recipient_user_id,
    'notificationId',item.notification_id,'source',item.notification_source,'category',d.category,'title',item.title,'body',item.body,'expiresAt',d.expires_at,'availableAt',d.available_at));
  end if;
 end loop;
 return result;
end;$$;

create or replace function notification_private.delivery_devices_v3(p_id uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d notification_private.delivery_v3%rowtype; item record; prefs record;
begin
 select * into d from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' and leased_until>statement_timestamp() and expires_at>statement_timestamp();
 if d.id is null or not notification_private.push_qa_allowed_v3(d.recipient_user_id) then return '[]';end if;
 select * into item from notification_private.inbox_v3(d.recipient_user_id) n where n.notification_id=coalesce(d.notification_id,d.announcement_id)
  and n.notification_source=case when d.notification_id is null then 'announcement' else 'user' end;
 select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
 if item.notification_id is null or item.read_at is not null or item.target->>'kind'='unavailable' or not coalesce(prefs.push_opt_in,false)
  or coalesce(prefs.categories->>notification_private.push_preference_key_v3(d.category,item.event_type),'false')<>'true'
  or (d.announcement_id is not null and (item.payload->>'publishVersion')::integer<>d.source_version) then return '[]';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'userId',t.user_id,'deviceId',t.device_id,'fingerprint',t.token_fingerprint,'ciphertext',t.token_ciphertext))
  from public.user_push_tokens t where t.user_id=d.recipient_user_id and t.provider='fcm' and t.opt_in and t.token_status='active' and t.revoked_at is null
   and not exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.device_token_id=t.id and r.token_fingerprint=t.token_fingerprint)), '[]'::jsonb);
end;$$;

create or replace function notification_private.finish_delivery_v3(p_id uuid,p_lease uuid,p_result text,p_message_id text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare d notification_private.delivery_v3%rowtype; item record; prefs record; result text; accepted boolean; outstanding boolean;
begin
 select * into d from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' and leased_until>statement_timestamp() for update;
 if d.id is null then return false;end if;
 if p_result not in ('accepted','transient','permanent_failure','provider_unavailable') then raise exception using errcode='22023',message='NURI_NOTIFICATION_DELIVERY_INVALID';end if;
 select * into item from notification_private.inbox_v3(d.recipient_user_id) n where n.notification_id=coalesce(d.notification_id,d.announcement_id)
  and n.notification_source=case when d.notification_id is null then 'announcement' else 'user' end;
 select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
 result:=p_result;
 if d.expires_at<=statement_timestamp() then result:='expired';
 elsif item.notification_id is null or item.read_at is not null or item.target->>'kind'='unavailable' or not coalesce(prefs.push_opt_in,false)
  or coalesce(prefs.categories->>notification_private.push_preference_key_v3(d.category,item.event_type),'false')<>'true'
  or (d.announcement_id is not null and (item.payload->>'publishVersion')::integer<>d.source_version) then result:='suppressed';
 else
  select exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.state='accepted') into accepted;
  select exists(select 1 from public.user_push_tokens t where t.user_id=d.recipient_user_id and t.provider='fcm' and t.opt_in and t.token_status='active' and t.revoked_at is null
   and not exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.device_token_id=t.id and r.token_fingerprint=t.token_fingerprint)) into outstanding;
  if accepted and not outstanding then result:='accepted';
  elsif result='accepted' then result:='transient';end if;
 end if;
 update notification_private.delivery_v3 set
  state=case when result='transient' then case when attempts>=4 then 'permanent_failure' else 'retry' end else result end,
  attempts=case when result in ('provider_unavailable','expired','suppressed') then attempts else attempts+1 end,
  next_attempt_at=statement_timestamp()+case when result='provider_unavailable' then interval '1 hour' else make_interval(secs=>least(3600,30*power(2,attempts)::integer)) end,
  lease_token=null,leased_until=null,provider_message_id=case when result='accepted' then left(p_message_id,200) end,
  error_code=case when result='accepted' then null else upper(result) end where id=p_id;
 return true;
end;$$;

commit;

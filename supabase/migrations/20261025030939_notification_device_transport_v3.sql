begin;
create table notification_private.device_deliveries_v3 (
 delivery_id uuid not null references notification_private.delivery_v3(id) on delete cascade,
 device_token_id uuid not null references public.user_push_tokens(id) on delete cascade,
 token_fingerprint text not null,
 state text not null check(state in ('accepted','permanent_failure')),
 provider_message_id text,
 created_at timestamptz not null default statement_timestamp(),
 primary key(delivery_id,device_token_id,token_fingerprint)
);
alter table notification_private.device_deliveries_v3 enable row level security;
create index device_deliveries_v3_token on notification_private.device_deliveries_v3(device_token_id);
revoke all on notification_private.device_deliveries_v3 from public,anon,authenticated;

create function notification_private.register_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not notification_private.can_receive_v3(p_user) or not exists(select 1 from public.user_notification_preferences p where p.user_id=p_user and p.push_opt_in) then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_OPT_IN_REQUIRED';end if;
 if length(p_device) not between 12 and 128 or p_hash!~'^[a-f0-9]{64}$' or length(p_cipher) not between 30 and 16384 then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_TOKEN_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended('nuri.push.device:'||p_device,0));
 update public.user_push_tokens set token_status='revoked',opt_in=false,revoked_at=statement_timestamp(),revoke_reason='account_switched'
  where device_id=p_device and user_id<>p_user and provider='fcm' and token_status<>'revoked';
 insert into public.user_push_tokens(user_id,device_id,platform,provider,token_fingerprint,token_ciphertext,token_status,opt_in)
 values(p_user,p_device,'android','fcm',p_hash,p_cipher,'active',true)
 on conflict(user_id,device_id,provider) do update set token_fingerprint=excluded.token_fingerprint,token_ciphertext=excluded.token_ciphertext,
  token_status='active',opt_in=true,revoked_at=null,revoke_reason=null,last_seen_at=statement_timestamp(),updated_at=statement_timestamp() returning id into result;
 return result;
end;$$;

create function notification_private.delivery_devices_v3(p_id uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d notification_private.delivery_v3%rowtype; item record; prefs record;
begin
 select * into d from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' and leased_until>statement_timestamp() and expires_at>statement_timestamp();
 if d.id is null then return '[]';end if;
 select * into item from notification_private.inbox_v3(d.recipient_user_id) n where n.notification_id=coalesce(d.notification_id,d.announcement_id)
  and n.notification_source=case when d.notification_id is null then 'announcement' else 'user' end;
 select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
 if item.notification_id is null or item.read_at is not null or item.target->>'kind'='unavailable' or not coalesce(prefs.push_opt_in,false)
  or coalesce(prefs.categories->>case when d.category='news' then 'service' else d.category end,'false')<>'true'
  or (item.event_type='pet.memorial' and coalesce(prefs.categories->>'memorial','false')<>'true')
  or (item.event_type in ('pet.birthday','pet.together_anniversary','pet.together_month') and coalesce(prefs.categories->>'anniversary','false')<>'true')
  or (d.announcement_id is not null and (item.payload->>'publishVersion')::integer<>d.source_version) then return '[]';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'userId',t.user_id,'deviceId',t.device_id,'fingerprint',t.token_fingerprint,'ciphertext',t.token_ciphertext))
  from public.user_push_tokens t where t.user_id=d.recipient_user_id and t.provider='fcm' and t.opt_in and t.token_status='active' and t.revoked_at is null
   and not exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.device_token_id=t.id and r.token_fingerprint=t.token_fingerprint)), '[]'::jsonb);
end;$$;

create function notification_private.device_result_v3(p_id uuid,p_lease uuid,p_token uuid,p_hash text,p_result text,p_message text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 select recipient_user_id into owner from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' and leased_until>statement_timestamp() and expires_at>statement_timestamp();
 if owner is null or p_result not in ('accepted','permanent_failure') then return false;end if;
 if not exists(select 1 from public.user_push_tokens t where t.id=p_token and t.user_id=owner and t.token_fingerprint=p_hash) then return false;end if;
 insert into notification_private.device_deliveries_v3(delivery_id,device_token_id,token_fingerprint,state,provider_message_id)
 values(p_id,p_token,p_hash,p_result,left(p_message,200)) on conflict do nothing;
 if p_result='permanent_failure' then update public.user_push_tokens set token_status='invalid',opt_in=false,revoked_at=statement_timestamp(),revoke_reason='provider_invalid_token' where id=p_token and token_fingerprint=p_hash;end if;
 return true;
end;$$;
create function public.register_notification_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text) returns uuid language sql security invoker set search_path='' as $$select notification_private.register_device_v3(p_user,p_device,p_hash,p_cipher);$$;
create function public.get_notification_delivery_devices_v3(p_id uuid,p_lease uuid) returns jsonb language sql security invoker set search_path='' as $$select notification_private.delivery_devices_v3(p_id,p_lease);$$;
create function public.record_notification_device_result_v3(p_id uuid,p_lease uuid,p_token uuid,p_hash text,p_result text,p_message text default null) returns boolean language sql security invoker set search_path='' as $$select notification_private.device_result_v3(p_id,p_lease,p_token,p_hash,p_result,p_message);$$;
revoke all on function public.register_notification_device_v3(uuid,text,text,text),public.get_notification_delivery_devices_v3(uuid,uuid),public.record_notification_device_result_v3(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function notification_private.register_device_v3(uuid,text,text,text),notification_private.delivery_devices_v3(uuid,uuid),notification_private.device_result_v3(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.register_notification_device_v3(uuid,text,text,text),public.get_notification_delivery_devices_v3(uuid,uuid),public.record_notification_device_result_v3(uuid,uuid,uuid,text,text,text),
 notification_private.register_device_v3(uuid,text,text,text),notification_private.delivery_devices_v3(uuid,uuid),notification_private.device_result_v3(uuid,uuid,uuid,text,text,text) to service_role;

-- Finalize only the current lease; device receipts survive a partial retry.
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
  or coalesce(prefs.categories->>case when d.category='news' then 'service' else d.category end,'false')<>'true'
  or (item.event_type='pet.memorial' and coalesce(prefs.categories->>'memorial','false')<>'true')
  or (item.event_type in ('pet.birthday','pet.together_anniversary','pet.together_month') and coalesce(prefs.categories->>'anniversary','false')<>'true')
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
-- pg_net sends after this cron transaction commits. Missing transport secrets stay closed.
create function notification_private.invoke_worker_v3() returns bigint
language plpgsql security definer set search_path='' as $$
declare secret text; request_id bigint;
begin
 select decrypted_secret into secret from vault.decrypted_secrets where name='nuri_notification_worker_secret' limit 1;
 if secret is null or length(secret)<32 then return null;end if;
 select net.http_post(url:='https://grmekesqoydylqmyvfke.supabase.co/functions/v1/notification-worker-v3',
  body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),timeout_milliseconds:=1000) into request_id;
 return request_id;
end;$$;
revoke all on function notification_private.invoke_worker_v3() from public,anon,authenticated;
select cron.schedule('nuri-notification-worker-v3','* * * * *','select notification_private.invoke_worker_v3();');
commit;

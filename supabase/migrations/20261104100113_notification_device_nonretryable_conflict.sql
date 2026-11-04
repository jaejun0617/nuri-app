begin;

set local lock_timeout = '3s';
set local statement_timeout = '15s';

-- A stale login is a permanent business conflict, not a transaction retry signal.
create or replace function notification_private.lock_device_session_v3(p_user uuid,p_device text,p_session uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare started timestamptz; newest record;
begin
 if p_device is null or length(p_device) not between 12 and 128 or p_session is null then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_SESSION_REQUIRED';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('nuri.push.device:'||p_device,0));
 select s.created_at into started from auth.sessions s
  where s.id=p_session and s.user_id=p_user
   and (s.not_after is null or s.not_after>clock_timestamp()) for key share;
 if started is null then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_SESSION_EXPIRED';
 end if;
 select t.registration_session_id,t.registration_session_started_at into newest
  from public.user_push_tokens t where t.device_id=p_device and t.provider='fcm'
   and t.registration_session_started_at is not null
  order by t.registration_session_started_at desc limit 1;
 if newest.registration_session_started_at>started or
  (newest.registration_session_started_at=started and newest.registration_session_id<>p_session) then
  raise exception using errcode='PT409',message='NURI_NOTIFICATION_STALE_DEVICE_SESSION';
 end if;
 return started;
end;$$;

create or replace function notification_private.register_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text,p_session uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; started timestamptz;
begin
 started:=notification_private.lock_device_session_v3(p_user,p_device,p_session);
 if not notification_private.can_receive_v3(p_user) or not exists(
  select 1 from public.user_notification_preferences p where p.user_id=p_user and p.push_opt_in) then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_OPT_IN_REQUIRED';
 end if;
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_cipher is null or length(p_cipher) not between 30 and 16384 then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_TOKEN_INVALID';
 end if;
 if exists(select 1 from public.user_push_tokens t where t.user_id=p_user and t.device_id=p_device
  and t.provider='fcm' and t.registration_session_id=p_session and t.revoke_reason in ('user_logout','account_deleted')) then
  raise exception using errcode='PT409',message='NURI_NOTIFICATION_STALE_DEVICE_SESSION';
 end if;
 update public.user_push_tokens set token_status='revoked',opt_in=false,
  revoked_at=statement_timestamp(),revoke_reason='account_switched'
  where device_id=p_device and user_id<>p_user and provider='fcm' and token_status<>'revoked';
 insert into public.user_push_tokens(user_id,device_id,platform,provider,token_fingerprint,token_ciphertext,
  token_status,opt_in,registration_session_id,registration_session_started_at)
 values(p_user,p_device,'android','fcm',p_hash,p_cipher,'active',true,p_session,started)
 on conflict(user_id,device_id,provider) do update set
  token_fingerprint=excluded.token_fingerprint,token_ciphertext=excluded.token_ciphertext,
  token_status='active',opt_in=true,revoked_at=null,revoke_reason=null,
  registration_session_id=excluded.registration_session_id,registration_session_started_at=excluded.registration_session_started_at,
  last_seen_at=statement_timestamp(),updated_at=statement_timestamp() returning id into result;
 return result;
end;$$;

create or replace function notification_private.revoke_device_session_v3(p_user uuid,p_device text,p_session uuid,p_reason text)
returns integer language plpgsql security definer set search_path='' as $$
declare started timestamptz; affected integer;
begin
 if p_reason is null or p_reason not in ('user_logout','user_opt_out','account_deleted') then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_REVOKE_INVALID';
 end if;
 begin
  started:=notification_private.lock_device_session_v3(p_user,p_device,p_session);
 exception when sqlstate 'PT409' or insufficient_privilege then return 0;
 end;
 -- The preferences transaction already handles opt-out for every device.
 -- A delayed duplicate must not revoke a subsequently re-enabled registration.
 if p_reason='user_opt_out' and exists(select 1 from public.user_notification_preferences p
  where p.user_id=p_user and p.push_opt_in) then return 0;end if;
 if p_reason in ('user_logout','account_deleted') then
  -- Persist a logout tombstone even if its register request has not arrived yet.
  insert into public.user_push_tokens(user_id,device_id,platform,provider,token_status,opt_in,
   revoked_at,revoke_reason,registration_session_id,registration_session_started_at)
  values(p_user,p_device,'android','fcm','revoked',false,statement_timestamp(),p_reason,p_session,started)
  on conflict(user_id,device_id,provider) do update set token_status='revoked',opt_in=false,
   revoked_at=statement_timestamp(),revoke_reason=excluded.revoke_reason,
   registration_session_id=excluded.registration_session_id,registration_session_started_at=excluded.registration_session_started_at
  where public.user_push_tokens.registration_session_started_at is null
   or public.user_push_tokens.registration_session_started_at<=excluded.registration_session_started_at;
  get diagnostics affected=row_count;
 else
  update public.user_push_tokens set token_status='revoked',opt_in=false,revoked_at=statement_timestamp(),revoke_reason=p_reason
   where user_id=p_user and device_id=p_device and provider='fcm' and token_status<>'revoked'
    and (registration_session_id=p_session or registration_session_id is null);
  get diagnostics affected=row_count;
 end if;
 update public.user_push_tokens set token_status='revoked',opt_in=false,revoked_at=statement_timestamp(),revoke_reason=p_reason
  where user_id=p_user and device_id=p_device and provider<>'fcm' and token_status<>'revoked';
 return affected;
end;$$;

commit;

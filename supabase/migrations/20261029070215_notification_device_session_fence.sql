begin;

-- Keep the last server-issued login even after logout/provider invalidation.
-- A token refresh retains its session ID; a fresh login gets a newer session.
alter table public.user_push_tokens
 add column registration_session_id uuid,
 add column registration_session_started_at timestamptz;
create index user_push_tokens_device_session_v3
 on public.user_push_tokens(device_id,registration_session_started_at desc)
 where provider='fcm';

create function notification_private.lock_device_session_v3(p_user uuid,p_device text,p_session uuid)
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
  raise exception using errcode='40001',message='NURI_NOTIFICATION_STALE_DEVICE_SESSION';
 end if;
 return started;
end;$$;

create function notification_private.register_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text,p_session uuid)
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
  raise exception using errcode='40001',message='NURI_NOTIFICATION_STALE_DEVICE_SESSION';
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

-- Old service calls must fail closed rather than bypass the session fence.
create or replace function notification_private.register_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text)
returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception using errcode='42501',message='NURI_NOTIFICATION_SESSION_REQUIRED';end;$$;
create function public.register_notification_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text,p_session uuid)
returns uuid language sql security invoker set search_path='' as $$
 select notification_private.register_device_v3(p_user,p_device,p_hash,p_cipher,p_session);
$$;

create function notification_private.revoke_device_session_v3(p_user uuid,p_device text,p_session uuid,p_reason text)
returns integer language plpgsql security definer set search_path='' as $$
declare started timestamptz; affected integer;
begin
 if p_reason is null or p_reason not in ('user_logout','user_opt_out','account_deleted') then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_REVOKE_INVALID';
 end if;
 begin
  started:=notification_private.lock_device_session_v3(p_user,p_device,p_session);
 exception when serialization_failure or insufficient_privilege then return 0;
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
create function public.revoke_notification_device_v3(p_user uuid,p_device text,p_session uuid,p_reason text)
returns integer language sql security invoker set search_path='' as $$
 select notification_private.revoke_device_session_v3(p_user,p_device,p_session,p_reason);
$$;

create or replace function public.revoke_user_push_token_v1(p_device_id text default null,p_provider text default null,p_reason text default 'user_logout')
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); session_id uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
begin
 if actor is null then raise exception using errcode='42501',message='NURI_AUTH_REQUIRED';end if;
 if p_provider is not null and p_provider not in ('fcm','disabled') then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_PROVIDER_UNAVAILABLE';
 end if;
 return notification_private.revoke_device_session_v3(actor,p_device_id,session_id,p_reason);
end;$$;

-- The compatibility fallback can record provider-unavailable, never FCM data
-- or account preferences. FCM registration is exclusively verified by Edge.
create or replace function public.upsert_user_push_token_v1(p_device_id text,p_platform text,p_provider text,
 p_token_fingerprint text default null,p_token_ciphertext text default null,p_opt_in boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); session_id uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
begin
 if actor is null then raise exception using errcode='42501',message='NURI_AUTH_REQUIRED';end if;
 if p_provider is distinct from 'disabled' or p_token_fingerprint is not null or p_token_ciphertext is not null then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_VERIFIED_REGISTRATION_REQUIRED';
 end if;
 perform notification_private.lock_device_session_v3(actor,p_device_id,session_id);
 if p_opt_in is distinct from true or not exists(select 1 from public.user_notification_preferences p
  where p.user_id=actor and p.push_opt_in) then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_OPT_IN_REQUIRED';
 end if;
 insert into public.user_push_tokens(user_id,device_id,platform,provider,token_status,opt_in)
 values(actor,p_device_id,p_platform,'disabled','provider_unavailable',true)
 on conflict(user_id,device_id,provider) do update set token_status='provider_unavailable',opt_in=true,
  revoked_at=null,revoke_reason=null,last_seen_at=statement_timestamp();
 return jsonb_build_object('registered',true,'status','provider_unavailable','provider','disabled');
end;$$;

drop policy user_push_tokens_owner_all on public.user_push_tokens;
create policy user_push_tokens_owner_select on public.user_push_tokens for select to authenticated using((select auth.uid())=user_id);
revoke insert,update,delete,truncate,references,trigger on public.user_push_tokens from public,anon,authenticated;
revoke all on function notification_private.lock_device_session_v3(uuid,text,uuid),
 notification_private.register_device_v3(uuid,text,text,text,uuid),
 notification_private.revoke_device_session_v3(uuid,text,uuid,text),
 public.register_notification_device_v3(uuid,text,text,text,uuid),
 public.revoke_notification_device_v3(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function notification_private.register_device_v3(uuid,text,text,text,uuid),
 notification_private.revoke_device_session_v3(uuid,text,uuid,text),
 public.register_notification_device_v3(uuid,text,text,text,uuid),
 public.revoke_notification_device_v3(uuid,text,uuid,text) to service_role;
revoke all on function public.revoke_user_push_token_v1(text,text,text),
 public.upsert_user_push_token_v1(text,text,text,text,text,boolean) from public,anon;
grant execute on function public.revoke_user_push_token_v1(text,text,text),
 public.upsert_user_push_token_v1(text,text,text,text,text,boolean) to authenticated;
commit;

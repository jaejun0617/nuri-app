begin;
-- Transport activation is QA-only. An empty cohort fails closed without touching
-- other recipients' queued deliveries, preferences or inbox rows.
alter table notification_private.runtime_v3
  add column push_qa_user_ids uuid[] not null default '{}';

create function notification_private.push_qa_allowed_v3(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from notification_private.runtime_v3 r
  join public.nuri_public_ranking_exclusions q on q.user_id=p_user
  where r.singleton and p_user=any(r.push_qa_user_ids) and q.classification='canonical_qa'
 );
$$;
create function public.notification_push_qa_allowed_v3(p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select notification_private.push_qa_allowed_v3(p_user);
$$;
revoke all on function notification_private.push_qa_allowed_v3(uuid),public.notification_push_qa_allowed_v3(uuid) from public,anon,authenticated;
grant execute on function notification_private.push_qa_allowed_v3(uuid),public.notification_push_qa_allowed_v3(uuid) to service_role;

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
   and coalesce(prefs.push_opt_in,false) and coalesce(prefs.categories->>case when d.category='news' then 'service' else d.category end,'false')='true'
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

-- Recheck the cohort immediately before each provider call as well as at lease time.
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
  or coalesce(prefs.categories->>case when d.category='news' then 'service' else d.category end,'false')<>'true'
  or (item.event_type='pet.memorial' and coalesce(prefs.categories->>'memorial','false')<>'true')
  or (item.event_type in ('pet.birthday','pet.together_anniversary','pet.together_month') and coalesce(prefs.categories->>'anniversary','false')<>'true')
  or (d.announcement_id is not null and (item.payload->>'publishVersion')::integer<>d.source_version) then return '[]';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'userId',t.user_id,'deviceId',t.device_id,'fingerprint',t.token_fingerprint,'ciphertext',t.token_ciphertext))
  from public.user_push_tokens t where t.user_id=d.recipient_user_id and t.provider='fcm' and t.opt_in and t.token_status='active' and t.revoked_at is null
   and not exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.device_token_id=t.id and r.token_fingerprint=t.token_fingerprint)), '[]'::jsonb);
end;$$;
commit;

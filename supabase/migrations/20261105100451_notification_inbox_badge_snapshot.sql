begin;

-- One canonical snapshot for both the authenticated app and the existing,
-- lease-scoped worker. Keep unread semantics identical to the inbox.
create function notification_private.badge_snapshot_v3(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'count',count(*)::integer,
  'observedAt',floor(extract(epoch from statement_timestamp())*1000)::bigint,
  'validUntil',case when count(*)>0 then floor(extract(epoch from min(
    least(n.available_at+interval '720 hours',coalesce(a.expires_at,n.available_at+interval '720 hours'))
  ))*1000)::bigint else null end)
 from notification_private.inbox_v3(p_user) n
 left join public.announcements a on n.notification_source='announcement' and a.id=n.notification_id
 where n.read_at is null;
$$;
create function notification_private.my_badge_v3() returns jsonb
language sql stable security definer set search_path='' as $$
 select notification_private.badge_snapshot_v3(notification_private.actor_v3());
$$;
create function public.get_user_notification_badge_v3() returns jsonb
language sql stable security invoker set search_path='' as $$select notification_private.my_badge_v3();$$;
revoke all on function notification_private.badge_snapshot_v3(uuid),notification_private.my_badge_v3(),public.get_user_notification_badge_v3() from public,anon,authenticated,service_role;
grant execute on function notification_private.badge_snapshot_v3(uuid) to service_role;
grant execute on function notification_private.my_badge_v3(),public.get_user_notification_badge_v3() to authenticated;

create or replace function notification_private.delivery_devices_v3(p_id uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d notification_private.delivery_v3%rowtype; item record; prefs record; devices jsonb; badge jsonb;
begin
 select * into d from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' and leased_until>statement_timestamp() and expires_at>statement_timestamp();
 if d.id is null or not notification_private.push_qa_allowed_v3(d.recipient_user_id) then return '[]';end if;
 select * into item from notification_private.inbox_v3(d.recipient_user_id) n where n.notification_id=coalesce(d.notification_id,d.announcement_id)
  and n.notification_source=case when d.notification_id is null then 'announcement' else 'user' end;
 select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
 if item.notification_id is null or item.read_at is not null or item.target->>'kind'='unavailable' or not coalesce(prefs.push_opt_in,false)
  or coalesce(prefs.categories->>notification_private.push_preference_key_v3(d.category,item.event_type),'false')<>'true'
  or (d.announcement_id is not null and (item.payload->>'publishVersion')::integer<>d.source_version) then return '[]';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'userId',t.user_id,'deviceId',t.device_id,'fingerprint',t.token_fingerprint,'ciphertext',t.token_ciphertext)), '[]'::jsonb) into devices
 from public.user_push_tokens t where t.user_id=d.recipient_user_id and t.provider='fcm' and t.opt_in and t.token_status='active' and t.revoked_at is null
  and not exists(select 1 from notification_private.device_deliveries_v3 r where r.delivery_id=d.id and r.device_token_id=t.id and r.token_fingerprint=t.token_fingerprint);
 if jsonb_array_length(devices)=0 then return devices;end if;
 badge:=notification_private.badge_snapshot_v3(d.recipient_user_id);
 return (select jsonb_agg(value||jsonb_build_object('badge',badge)) from jsonb_array_elements(devices));
end;$$;

commit;

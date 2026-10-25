begin;
alter table notification_private.delivery_v3 add column announcement_id uuid references public.announcements(id) on delete cascade,
 add column source_version integer,
 add constraint notification_delivery_source_v3 check(num_nonnulls(notification_id,announcement_id)=1);
create index delivery_v3_announcement on notification_private.delivery_v3(announcement_id);

create function notification_private.publication_v3() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.is_active then new.published_at:=statement_timestamp(); end if;
 elsif new.publish_version<old.publish_version then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_VERSION_INVALID';
 elsif new.publish_version>old.publish_version or (new.is_active and old.published_at is null) then
  new.published_at:=statement_timestamp();
 else new.published_at:=old.published_at;
 end if;
 return new;
end;$$;
create trigger notification_publication_v3 before insert or update on public.announcements for each row execute function notification_private.publication_v3();

create function notification_private.fanout_v3(p_limit integer default 100) returns integer
language plpgsql security definer set search_path='' as $$
declare publication record; recipient record; cursor_id uuid; count_users integer; count_total integer:=0; last_user uuid;
begin
 for publication in select * from public.announcements a where a.is_active and a.target_scope='all'
  and a.published_at is not null and greatest(a.starts_at,a.published_at,a.created_at)<=statement_timestamp()
  and (a.expires_at is null or a.expires_at>statement_timestamp())
  and greatest(a.starts_at,a.published_at,a.created_at)>=(select activated_at from notification_private.runtime_v3)
  and greatest(a.starts_at,a.published_at,a.created_at)>statement_timestamp()-interval '3 days'
  order by a.id limit 10 loop
  insert into notification_private.announcement_fanout_v3(announcement_id,version) values(publication.id,publication.publish_version) on conflict do nothing;
  select user_cursor into cursor_id from notification_private.announcement_fanout_v3 where announcement_id=publication.id and version=publication.publish_version and completed_at is null for update;
  if not found then continue; end if;
  count_users:=0;last_user:=null;
  for recipient in select p.user_id from public.profiles p where cursor_id is null or p.user_id>cursor_id order by p.user_id limit least(greatest(p_limit,1),500) loop
   count_users:=count_users+1;count_total:=count_total+1;last_user:=recipient.user_id;
   if notification_private.can_receive_v3(recipient.user_id) then
    insert into notification_private.delivery_v3(announcement_id,source_version,recipient_user_id,dedupe_key,category,available_at,expires_at)
    values(publication.id,publication.publish_version,recipient.user_id,'announcement:'||publication.id||':'||publication.publish_version,'news',
     greatest(publication.starts_at,publication.published_at,publication.created_at),least(coalesce(publication.expires_at,'infinity'::timestamptz),greatest(publication.starts_at,publication.published_at,publication.created_at)+interval '3 days')) on conflict do nothing;
   end if;
  end loop;
  update notification_private.announcement_fanout_v3 set user_cursor=last_user,completed_at=case when count_users<least(greatest(p_limit,1),500) then statement_timestamp() end where announcement_id=publication.id and version=publication.publish_version;
 end loop;
 return count_total;
end;$$;

create function notification_private.moderation_v3() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; version text;
begin
 if tg_op='UPDATE' and (new.review_status,new.content_review_status) is not distinct from (old.review_status,old.content_review_status) then return new; end if;
 select reporter_id into recipient from public.reports where id=new.report_id;
 version:=new.review_status||':'||new.content_review_status;
 perform notification_private.emit_v3(recipient,'community.report_result','reports',new.report_id::text,version,
  '보내주신 신고의 처리 상태가 변경됐어요','접수한 내용의 처리 상태를 확인했어요.','community','{"kind":"notification_detail"}',
  jsonb_build_object('reviewStatus',new.review_status,'contentReviewStatus',new.content_review_status),null,null,statement_timestamp(),null,true);
 return new;
end;$$;
create trigger notification_report_result_v3 after insert or update on public.admin_report_review_states for each row execute function notification_private.moderation_v3();

-- Publishing is a trusted operator action; drafts and edits preserve the version.
create function notification_private.publish_v3(p_id uuid,p_title text,p_body text,p_active boolean,p_starts timestamptz,p_expires timestamptz,p_payload jsonb,p_reissue boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare id uuid:=coalesce(p_id,gen_random_uuid());
begin
 perform notification_private.actor_v3();
 if not public.is_nuri_notification_admin_v1() then raise exception using errcode='42501',message='NURI_NOTIFICATION_ADMIN_REQUIRED';end if;
 if length(btrim(p_title)) not between 1 and 150 or length(p_body)>10000 or jsonb_typeof(p_payload)<>'object'
  or (p_expires is not null and p_expires<=coalesce(p_starts,statement_timestamp())) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_PUBLICATION_INVALID';end if;
 if p_payload->>'eventType' is not null and p_payload->>'eventType' not in ('news.published','news.monthly_editorial','service.maintenance_started','service.maintenance_changed','service.maintenance_ended','service.action_required','account.policy') then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_EVENT_INVALID';end if;
 if p_payload->>'layout'='monthly_news' and (coalesce(p_payload->>'month','')!~'^\d{4}-(0[1-9]|1[0-2])$') then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_PERIOD_INVALID';end if;
 insert into public.announcements(id,title,body,is_active,starts_at,expires_at,payload)
 values(id,btrim(p_title),p_body,p_active,p_starts,p_expires,p_payload)
 on conflict on constraint announcements_pkey do update set title=excluded.title,body=excluded.body,is_active=excluded.is_active,
  starts_at=excluded.starts_at,expires_at=excluded.expires_at,payload=excluded.payload,
  publish_version=public.announcements.publish_version+case when p_reissue then 1 else 0 end;
 return id;
end;$$;
create function public.publish_nuri_announcement_v3(p_id uuid,p_title text,p_body text,p_active boolean default false,p_starts timestamptz default null,p_expires timestamptz default null,p_payload jsonb default '{}',p_reissue boolean default false) returns uuid
language sql security invoker set search_path='' as $$select notification_private.publish_v3(p_id,p_title,p_body,p_active,p_starts,p_expires,p_payload,p_reissue);$$;

-- Revalidate the current source, read status, version and opt-in at lease time.
create or replace function notification_private.claim_delivery_v3(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d record; item record; prefs record; result jsonb:='[]'; token uuid; allowed boolean;
begin
 for d in select * from notification_private.delivery_v3 where
  ((state in ('pending','retry','provider_unavailable') and next_attempt_at<=statement_timestamp()) or (state='leased' and leased_until<statement_timestamp()))
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

revoke all on all functions in schema notification_private from public,anon,authenticated;
grant execute on function notification_private.page_v3(integer,timestamptz,uuid,text),notification_private.detail_v3(uuid,text),notification_private.mark_read_v3(uuid,text,boolean),
 notification_private.preferences_v3(jsonb,text),notification_private.publish_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean) to authenticated;
revoke all on function public.publish_nuri_announcement_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean) from public,anon;
grant execute on function public.publish_nuri_announcement_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean) to authenticated;

-- Inbox and count invalidation use the same RLS-protected server rows.
do $$declare t text;begin
 foreach t in array array['user_notifications','user_notification_reads','announcements'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end;$$;
select cron.schedule('nuri-notification-publication-v3','* * * * *','select notification_private.fanout_v3();');
commit;

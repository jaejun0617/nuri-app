begin;

create function notification_private.calendar_month_v3(p_date date,p_months integer) returns date
language sql immutable set search_path='' as $$select (p_date+make_interval(months=>p_months))::date;$$;

create function notification_private.periods_v3(p_now timestamptz,p_tz text) returns table(kind text,start_date date,end_date date,due_at timestamptz)
language sql stable set search_path='' as $$
 with local as(select p_now at time zone p_tz as t), boundaries as(
  select date_trunc('week',t)::date as week_start,date_trunc('month',t)::date as month_start from local)
 select 'weekly',week_start-7,week_start,(week_start+time '09:00') at time zone p_tz from boundaries
 union all select 'monthly',(month_start-interval '1 month')::date,month_start,(month_start+time '09:00') at time zone p_tz from boundaries;
$$;

create function notification_private.scheduler_user_v3(p_user uuid,p_now timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare tz text; cats jsonb; local_date date; activated timestamptz; period record; pet record;
 due date; due_at timestamptz; year integer; count_records integer; occurrence record; schedule record; minutes integer;
 base_local timestamp; occurrence_local timestamp; step integer; approx integer; idx integer; scheduled timestamptz;
begin
 if not notification_private.can_receive_v3(p_user) then return; end if;
 select coalesce(p.time_zone,'Asia/Seoul'),coalesce(p.categories,'{}') into tz,cats
 from public.profiles a left join public.user_notification_preferences p on p.user_id=a.user_id where a.user_id=p_user;
 if not exists(select 1 from pg_timezone_names where name=tz) then tz:='Asia/Seoul'; end if;
 local_date:=(p_now at time zone tz)::date;
 select activated_at into activated from notification_private.runtime_v3;
 for period in select * from notification_private.periods_v3(p_now,tz) loop
  -- Bounded three-day summary recovery, never a launch-time backfill blast.
  if p_now<period.due_at or p_now>=period.due_at+interval '3 days' or period.due_at<activated then continue; end if;
  select count(*)::integer into count_records from public.memories m join public.pets p on p.id=m.pet_id and p.user_id=m.user_id
   where m.user_id=p_user and m.occurred_at>=period.start_date and m.occurred_at<period.end_date
    and not(m.metadata @> '{"qaFixture":true}' or m.metadata @> '{"isQaFixture":true}' or m.metadata @> '{"draft":true}' or m.metadata @> '{"invalidated":true}');
  if count_records>0 then
   perform notification_private.emit_v3(p_user,'record.'||period.kind||'_summary','period',period.start_date::text,'1',
    case when period.kind='weekly' then '이번 주 기록이 차곡차곡 쌓였어요' else '지난달의 추억을 돌아볼까요?' end,
    count_records||'개의 기록으로 남긴 순간을 돌아보세요.','record',
    jsonb_build_object('kind','timeline_period','startDate',period.start_date,'endDate',period.end_date),
    jsonb_build_object('count',count_records,'period',period.kind),null,null,period.due_at,null,true);
  end if;
 end loop;
 for pet in select * from public.pets p where p.user_id=p_user loop
  if pet.adoption_date is not null then
   due:=notification_private.calendar_month_v3(pet.adoption_date,1);due_at:=(due+time '09:00') at time zone tz;
   if due_at>=activated and p_now>=due_at and p_now<due_at+interval '7 days' and pet.death_date is null then
    perform notification_private.emit_v3(p_user,'pet.together_month','pets',pet.id::text,pet.adoption_date::text,
     '함께한 지 한 달이 되었어요',pet.name||'와 함께한 시간을 기억해보세요.','record',
     jsonb_build_object('kind','pet_anniversary','petId',pet.id),'{}',pet.id,null,due_at,null,true);
   end if;
  end if;
  for occurrence in select * from (values('birthday',pet.birth_date),('together_anniversary',pet.adoption_date),('memorial',pet.death_date)) d(kind,base_date) where base_date is not null loop
   if occurrence.kind='memorial' and coalesce(cats->>'memorial','false')<>'true' then continue; end if;
   if occurrence.kind<>'memorial' and pet.death_date is not null then continue; end if;
   for year in extract(year from local_date)::integer-1..extract(year from local_date)::integer loop
    due:=title_private.anniversary_v2(occurrence.base_date,year);due_at:=(due+time '09:00') at time zone tz;
    if due<=occurrence.base_date or due_at<activated or p_now<due_at or p_now>=due_at+interval '1 day' then continue; end if;
    perform notification_private.emit_v3(p_user,'pet.'||occurrence.kind,'pets',pet.id::text,occurrence.base_date||':'||year,
     case occurrence.kind when 'birthday' then pet.name||'의 생일이에요' when 'memorial' then '함께한 마음을 조용히 기억해요' else '처음 함께한 날이 돌아왔어요' end,
     '함께한 시간을 천천히 돌아보세요.','record',jsonb_build_object('kind','pet_anniversary','petId',pet.id),
     '{}',pet.id,null,due_at,null,true);
   end loop;
  end loop;
 end loop;
 -- Native local alarms remain the sole OS schedule channel. Server adds inbox
 -- occurrences only, so a schedule never rings from both local and push paths.
 for schedule in select * from public.pet_schedules s where s.user_id=p_user and s.completed_at is null and s.sync_status<>'deleted'
  and cardinality(s.reminder_minutes)>0 and (s.repeat_until is null or s.repeat_until>=p_now-interval '2 days') loop
  base_local:=schedule.starts_at at time zone tz;step:=greatest(schedule.repeat_interval,1);
  approx:=case schedule.repeat_rule
   when 'daily' then floor(((p_now at time zone tz)::date-base_local::date)::numeric/step)::integer
   when 'weekly' then floor(((p_now at time zone tz)::date-base_local::date)::numeric/(7*step))::integer
   when 'monthly' then floor(((extract(year from p_now at time zone tz)-extract(year from base_local))*12+extract(month from p_now at time zone tz)-extract(month from base_local))/step)::integer
   when 'yearly' then floor((extract(year from p_now at time zone tz)-extract(year from base_local))/step)::integer else 0 end;
  for idx in greatest(0,approx-1)..greatest(0,approx+2) loop
   if schedule.repeat_rule='none' and idx>0 then continue; end if;
   occurrence_local:=base_local+case schedule.repeat_rule when 'daily' then make_interval(days=>idx*step)
    when 'weekly' then make_interval(days=>idx*step*7) when 'monthly' then make_interval(months=>idx*step)
    when 'yearly' then make_interval(years=>idx*step) else interval '0' end;
   scheduled:=occurrence_local at time zone tz;
   if schedule.repeat_until is not null and scheduled>schedule.repeat_until then continue; end if;
   foreach minutes in array schedule.reminder_minutes loop
    if minutes<0 or minutes>10080 then continue; end if;
    due_at:=scheduled-make_interval(mins=>minutes);
    if due_at<activated or p_now<due_at or p_now>=due_at+interval '15 minutes' then continue; end if;
    perform notification_private.emit_v3(p_user,'schedule.reminder','pet_schedules',schedule.id::text,schedule.updated_at::text,
     '예정된 일정이 있어요',schedule.title,'schedule',jsonb_build_object('kind','schedule','scheduleId',schedule.id,'petId',schedule.pet_id,'version',schedule.updated_at::text),
     jsonb_build_object('scheduledFor',scheduled),schedule.pet_id,null,due_at,due_at+interval '1 day',false,
     'schedule:'||schedule.id||':'||schedule.updated_at||':'||scheduled||':'||minutes);
   end loop;
  end loop;
 end loop;
end;$$;

create function notification_private.tick_v3(p_now timestamptz default statement_timestamp(),p_batch integer default 100) returns integer
language plpgsql security definer set search_path='' as $$
declare cursor_id uuid; actor record; count_users integer:=0; last_user uuid;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('nuri.notifications.scheduler.v3',0)) then return 0; end if;
 select scheduler_cursor into cursor_id from notification_private.runtime_v3 for update;
 for actor in select p.user_id from public.profiles p where cursor_id is null or p.user_id>cursor_id order by p.user_id limit least(greatest(p_batch,1),500) loop
  perform notification_private.scheduler_user_v3(actor.user_id,p_now);last_user:=actor.user_id;count_users:=count_users+1;
 end loop;
 update notification_private.runtime_v3 set scheduler_cursor=case when count_users<least(greatest(p_batch,1),500) then null else last_user end;
 update notification_private.delivery_v3 set state='expired',error_code='EXPIRED' where expires_at<=p_now and state in ('pending','retry','leased','provider_unavailable');
 return count_users;
end;$$;

-- Exposed only to the service worker. Unknown provider configuration does not
 -- consume attempts or report success. Every lease rechecks settings and rights.
create function notification_private.claim_delivery_v3(p_limit integer default 50) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d record; notification record; prefs record; result jsonb:='[]'; token uuid; allowed boolean;
begin
 for d in select * from notification_private.delivery_v3 where
  ((state in ('pending','retry','provider_unavailable') and next_attempt_at<=statement_timestamp()) or (state='leased' and leased_until<statement_timestamp()))
  and available_at<=statement_timestamp() and attempts<5 order by next_attempt_at,id for update skip locked limit least(greatest(p_limit,1),100) loop
  select * into notification from public.user_notifications n where n.id=d.notification_id;
  select * into prefs from public.user_notification_preferences p where p.user_id=d.recipient_user_id;
  allowed:=notification_private.target_available_v3(d.recipient_user_id,notification.target,notification.actor_user_id)
   and coalesce(prefs.push_opt_in,false) and coalesce(prefs.categories->>case when d.category='news' then 'service' else d.category end,'false')='true';
  if d.expires_at<=statement_timestamp() then
   update notification_private.delivery_v3 set state='expired' where id=d.id;
  elsif not coalesce(allowed,false) or notification.read_at is not null then
   update notification_private.delivery_v3 set state='suppressed',error_code='SETTINGS_OR_SOURCE' where id=d.id;
  else
   token:=gen_random_uuid();
   update notification_private.delivery_v3 set state='leased',lease_token=token,leased_until=statement_timestamp()+interval '2 minutes' where id=d.id;
   result:=result||jsonb_build_array(jsonb_build_object('id',d.id,'leaseToken',token,'recipientUserId',d.recipient_user_id,
    'notificationId',d.notification_id,'category',d.category,'title',notification.title,'body',notification.body,'target',notification.target));
  end if;
 end loop;
 return result;
end;$$;

create function notification_private.finish_delivery_v3(p_id uuid,p_lease uuid,p_result text,p_message_id text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare d notification_private.delivery_v3%rowtype;
begin
 select * into d from notification_private.delivery_v3 where id=p_id and lease_token=p_lease and state='leased' for update;
 if d.id is null then return false; end if;
 if p_result not in ('accepted','transient','permanent_failure','provider_unavailable') then raise exception using errcode='22023',message='NURI_NOTIFICATION_DELIVERY_INVALID'; end if;
 update notification_private.delivery_v3 set
  state=case when expires_at<=statement_timestamp() then 'expired' when p_result='transient' then case when attempts>=4 then 'permanent_failure' else 'retry' end else p_result end,
  attempts=case when p_result='provider_unavailable' then attempts else attempts+1 end,
  next_attempt_at=statement_timestamp()+case when p_result='provider_unavailable' then interval '1 hour' else make_interval(secs=>least(3600,30*power(2,attempts)::integer)) end,
  lease_token=null,leased_until=null,provider_message_id=case when p_result='accepted' then left(p_message_id,200) end,error_code=case when p_result='accepted' then null else upper(p_result) end where id=p_id;
 return true;
end;$$;
create function public.claim_notification_deliveries_v3(p_limit integer default 50) returns jsonb language sql security invoker set search_path='' as $$select notification_private.claim_delivery_v3(p_limit);$$;
create function public.finish_notification_delivery_v3(p_id uuid,p_lease uuid,p_result text,p_message_id text default null) returns boolean
language sql security invoker set search_path='' as $$select notification_private.finish_delivery_v3(p_id,p_lease,p_result,p_message_id);$$;

revoke all on all functions in schema notification_private from public,anon,authenticated;
grant execute on function notification_private.page_v3(integer,timestamptz,uuid,text),notification_private.detail_v3(uuid,text),
 notification_private.mark_read_v3(uuid,text,boolean),notification_private.preferences_v3(jsonb,text) to authenticated;
grant usage on schema notification_private to service_role;
grant execute on function notification_private.claim_delivery_v3(integer),notification_private.finish_delivery_v3(uuid,uuid,text,text) to service_role;
revoke all on function public.claim_notification_deliveries_v3(integer),public.finish_notification_delivery_v3(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_notification_deliveries_v3(integer),public.finish_notification_delivery_v3(uuid,uuid,text,text) to service_role;

-- One bounded SQL job, no HTTP and no end-user login dependency.
select cron.schedule('nuri-notification-scheduler-v3','* * * * *','select notification_private.tick_v3();');
commit;

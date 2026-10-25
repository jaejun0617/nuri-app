begin;

-- Extend the existing inbox. Business transactions never make network calls.
create schema if not exists notification_private;
revoke all on schema notification_private from public, anon, authenticated;
create table notification_private.runtime_v3 (
  singleton boolean primary key default true check(singleton),
  activated_at timestamptz not null default statement_timestamp(),
  scheduler_cursor uuid
);
insert into notification_private.runtime_v3(singleton) values(true);
alter table notification_private.runtime_v3 enable row level security;

alter table public.user_notifications
  add column event_id uuid not null default gen_random_uuid(),
  add column event_type text not null default 'legacy.notice',
  add column schema_version integer not null default 1 check(schema_version>0),
  add column category text not null default 'news' check(category in ('news','community','schedule','activity','record')),
  add column priority text not null default 'normal' check(priority in ('low','normal','high')),
  add column actor_user_id uuid references auth.users(id) on delete set null,
  add column pet_id uuid references public.pets(id) on delete set null,
  add column source_type text,
  add column source_id text,
  add column source_version text not null default '1',
  add column dedupe_key text,
  add column target jsonb not null default '{"kind":"notification_detail"}',
  add column payload jsonb not null default '{}',
  add column available_at timestamptz,
  add column occurred_at timestamptz,
  add column expires_at timestamptz;
update public.user_notifications set available_at=created_at,occurred_at=created_at;
alter table public.user_notifications alter column available_at set default statement_timestamp(),
  alter column available_at set not null,alter column occurred_at set default statement_timestamp(),
  alter column occurred_at set not null;
update public.user_notifications set category='community',event_type=replace(metadata->>'kind','_','.'),
  target=jsonb_build_object('kind','community_comment','postId',metadata->>'post_id','commentId',metadata->>'comment_id')
where metadata->>'kind' in ('community_comment','community_reply')
  and metadata->>'post_id' ~* '^[0-9a-f-]{36}$' and metadata->>'comment_id' ~* '^[0-9a-f-]{36}$';
update public.user_notifications n set actor_user_id=c.user_id from public.comments c
 where n.category='community' and c.id::text=n.metadata->>'comment_id';
create unique index user_notifications_dedupe_v3 on public.user_notifications(user_id,dedupe_key) where dedupe_key is not null;
create index user_notifications_cursor_v3 on public.user_notifications(user_id,available_at desc,id desc) where dismissed_at is null;
create index user_notifications_actor_v3 on public.user_notifications(actor_user_id) where actor_user_id is not null;
create index user_notifications_pet_v3 on public.user_notifications(pet_id) where pet_id is not null;

alter table public.announcements add column publish_version integer not null default 1 check(publish_version>0),
  add column published_at timestamptz,
  add column category text not null default 'news' check(category='news'),
  add column payload jsonb not null default '{}';
alter table public.user_notification_reads add column read_version integer not null default 1;
alter table public.user_notification_dismissals add column dismissed_version integer not null default 1;
alter table public.user_notification_preferences add column time_zone text not null default 'Asia/Seoul';

create table notification_private.delivery_v3 (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.user_notifications(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null,
  category text not null,
  available_at timestamptz not null,
  expires_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','leased','accepted','retry','expired','suppressed','provider_unavailable','permanent_failure')),
  attempts integer not null default 0 check(attempts between 0 and 5),
  next_attempt_at timestamptz not null default statement_timestamp(),
  lease_token uuid,
  leased_until timestamptz,
  provider_message_id text,
  error_code text,
  created_at timestamptz not null default statement_timestamp(),
  unique(recipient_user_id,dedupe_key)
);
alter table notification_private.delivery_v3 enable row level security;
create index delivery_v3_ready on notification_private.delivery_v3(next_attempt_at,id) where state in ('pending','retry');
create index delivery_v3_notification on notification_private.delivery_v3(notification_id);
create table notification_private.announcement_fanout_v3 (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  version integer not null,
  user_cursor uuid,
  completed_at timestamptz,
  primary key(announcement_id,version)
);
alter table notification_private.announcement_fanout_v3 enable row level security;

create function notification_private.actor_v3() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.profiles p where p.user_id=actor)
  or exists(select 1 from public.account_deletion_requests r where r.user_id=actor and r.status<>'cancelled') then
  raise exception using errcode='42501',message='NURI_NOTIFICATION_AUTH_REQUIRED';
 end if;
 return actor;
end;$$;

create function notification_private.can_receive_v3(p_user uuid,p_actor uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.user_id=p_user)
 and not exists(select 1 from public.account_deletion_requests d where d.user_id=p_user and d.status<>'cancelled')
 and (p_actor is null or (p_actor<>p_user and not exists(select 1 from public.community_user_blocks b
  where (b.blocker_user_id=p_user and b.blocked_user_id=p_actor) or (b.blocker_user_id=p_actor and b.blocked_user_id=p_user))));
$$;

create function notification_private.target_available_v3(p_user uuid,p_target jsonb,p_actor uuid default null) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare kind text:=p_target->>'kind';
begin
 if not notification_private.can_receive_v3(p_user,p_actor) then return false; end if;
 if kind in ('community_comment','community_post') then
  return exists(select 1 from public.posts p where p.id::text=p_target->>'postId'
   and p.status='active' and p.deleted_at is null and p.visibility='public'
   and not exists(select 1 from public.community_user_blocks b where
    (b.blocker_user_id=p_user and b.blocked_user_id=p.user_id) or (b.blocker_user_id=p.user_id and b.blocked_user_id=p_user)))
   and (kind='community_post' or exists(select 1 from public.comments c where c.id::text=p_target->>'commentId'
     and c.post_id::text=p_target->>'postId' and c.status='active' and c.deleted_at is null));
 elsif kind='record' then
  return exists(select 1 from public.memories m where m.id::text=p_target->>'memoryId' and m.user_id=p_user);
 elsif kind='schedule' then
  return exists(select 1 from public.pet_schedules s where s.id::text=p_target->>'scheduleId' and s.user_id=p_user
   and s.completed_at is null and s.sync_status<>'deleted'
   and (p_target->>'version' is null or s.updated_at::text=p_target->>'version'));
 elsif kind='title' then
  return exists(select 1 from title_private.nuri_title_awards_v2 a where a.user_id=p_user and a.title_id=p_target->>'titleId'
   and coalesce(a.pet_id::text,'')=coalesce(p_target->>'petId',''));
 elsif kind in ('timeline_period','pet_anniversary') then
  return p_target->>'petId' is null or exists(select 1 from public.pets p where p.id::text=p_target->>'petId' and p.user_id=p_user);
 end if;
 return kind in ('activity','notification_detail','unavailable');
end;$$;

create function notification_private.emit_v3(p_user uuid,p_event text,p_source text,p_id text,p_version text,
 p_title text,p_body text,p_category text,p_target jsonb,p_payload jsonb default '{}',p_pet uuid default null,
 p_actor uuid default null,p_available timestamptz default statement_timestamp(),p_expires timestamptz default null,
 p_push boolean default false,p_key text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; key text:=coalesce(p_key,p_event||':'||p_source||':'||p_id||':'||p_version);
begin
 if not notification_private.can_receive_v3(p_user,p_actor) then return null; end if;
 if not notification_private.target_available_v3(p_user,p_target,p_actor) then return null; end if;
 insert into public.user_notifications(user_id,title,body,type,event_type,category,source_type,source_id,source_version,
  dedupe_key,target,payload,pet_id,actor_user_id,available_at,occurred_at,expires_at)
 values(p_user,p_title,p_body,'event',p_event,p_category,p_source,p_id,p_version,key,p_target,p_payload,
  case when exists(select 1 from public.pets p where p.id=p_pet and p.user_id=p_user) then p_pet end,p_actor,
  p_available,statement_timestamp(),p_expires)
 on conflict(user_id,dedupe_key) where dedupe_key is not null do nothing returning id into result;
 if result is not null and p_push then
  insert into notification_private.delivery_v3(notification_id,recipient_user_id,dedupe_key,category,available_at,expires_at)
  values(result,p_user,key,p_category,p_available+case when p_category='activity' then interval '2 minutes' else interval '0' end,
   coalesce(p_expires,p_available+interval '24 hours')) on conflict do nothing;
 end if;
 return result;
end;$$;

-- The old public read APIs remain callable, but all new clients share this source.
create function notification_private.inbox_v3(p_user uuid) returns table(
 notification_id uuid,notification_source text,title text,body text,type text,read_at timestamptz,
 created_at timestamptz,available_at timestamptz,event_type text,schema_version integer,category text,target jsonb,payload jsonb)
language sql stable security definer set search_path='' as $$
 select n.id,'user',case when access.ok then n.title else '지금은 확인할 수 없는 알림이에요' end,
  case when access.ok then n.body else '삭제되었거나 접근할 수 없는 대상이에요.' end,n.type,n.read_at,n.created_at,n.available_at,
  n.event_type,n.schema_version,n.category,case when access.ok then n.target else '{"kind":"unavailable"}'::jsonb end,
  case when access.ok then n.payload else '{}'::jsonb end
 from public.user_notifications n
 cross join lateral (select notification_private.target_available_v3(p_user,n.target,n.actor_user_id) as ok) access
 where n.user_id=p_user and n.dismissed_at is null and n.available_at<=statement_timestamp()
  and (n.expires_at is null or n.expires_at>statement_timestamp())
 union all
 select a.id,'announcement',a.title,a.body,a.type,
  case when r.read_version>=a.publish_version then r.read_at end,greatest(a.starts_at,a.published_at,a.created_at),greatest(a.starts_at,a.published_at,a.created_at),
  coalesce(a.payload->>'eventType','news.published'),1,'news','{"kind":"notification_detail"}'::jsonb,
  a.payload||jsonb_build_object('publishVersion',a.publish_version)
 from public.announcements a left join public.user_notification_reads r on r.announcement_id=a.id and r.user_id=p_user
 where a.is_active and a.target_scope='all' and greatest(a.starts_at,a.published_at,a.created_at)<=statement_timestamp()
  and (a.expires_at is null or a.expires_at>statement_timestamp())
  and not exists(select 1 from public.user_notification_dismissals d where d.user_id=p_user and d.announcement_id=a.id and d.dismissed_version>=a.publish_version);
$$;

create function notification_private.page_v3(p_limit integer,p_cursor_at timestamptz,p_cursor_id uuid,p_cursor_source text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); result jsonb; lim integer:=least(greatest(coalesce(p_limit,30),1),100);
begin
 if (p_cursor_at is null)<>(p_cursor_id is null) or (p_cursor_at is not null and (p_cursor_source is null or p_cursor_source not in ('user','announcement'))) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_CURSOR_INVALID';
 end if;
 with rows as (select * from notification_private.inbox_v3(actor) n
  where p_cursor_at is null or (n.available_at,n.notification_id,n.notification_source)<(p_cursor_at,p_cursor_id,p_cursor_source)
  order by n.available_at desc,n.notification_id desc,n.notification_source desc limit lim+1),
 visible as (select * from rows order by available_at desc,notification_id desc,notification_source desc limit lim)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(v) order by available_at desc,notification_id desc,notification_source desc) from visible v),'[]'::jsonb),
  'hasMore',(select count(*)>lim from rows),'unreadCount',(select count(*) from notification_private.inbox_v3(actor) n where n.read_at is null),
  'timeZone',coalesce((select p.time_zone from public.user_notification_preferences p join pg_timezone_names z on z.name=p.time_zone where p.user_id=actor),'Asia/Seoul'),
  'serverTime',statement_timestamp()) into result;
 return result;
end;$$;
create function public.get_user_notifications_v3(p_limit integer default 30,p_cursor_at timestamptz default null,p_cursor_id uuid default null,p_cursor_source text default null)
returns jsonb language sql security invoker set search_path='' as $$select notification_private.page_v3(p_limit,p_cursor_at,p_cursor_id,p_cursor_source);$$;

create function notification_private.detail_v3(p_id uuid,p_source text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); result jsonb;
begin
 select to_jsonb(n) into result from notification_private.inbox_v3(actor) n where n.notification_id=p_id and n.notification_source=p_source;
 if result is null then raise exception using errcode='P0002',message='NURI_NOTIFICATION_UNAVAILABLE'; end if;
 return result;
end;$$;
create function public.get_user_notification_detail_v3(p_id uuid,p_source text) returns jsonb language sql security invoker set search_path='' as $$select notification_private.detail_v3(p_id,p_source);$$;

create function notification_private.mark_read_v3(p_id uuid,p_source text,p_all boolean default false) returns integer
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); cutoff timestamptz:=statement_timestamp();
begin
 -- Materialize the visible set once. An event committed after this snapshot is
 -- never accidentally consumed by the second write in mark-all.
 with targets as materialized(select * from notification_private.inbox_v3(actor) n where n.read_at is null and n.available_at<=cutoff
  and (p_all or (n.notification_id=p_id and n.notification_source=p_source))),
 users as (update public.user_notifications n set read_at=cutoff from targets t where t.notification_source='user'
   and n.id=t.notification_id and n.user_id=actor returning n.id)
 insert into public.user_notification_reads(user_id,announcement_id,read_at,read_version)
 select actor,t.notification_id,cutoff,(t.payload->>'publishVersion')::integer from targets t where t.notification_source='announcement'
 on conflict(user_id,announcement_id) do update set read_at=excluded.read_at,read_version=excluded.read_version;
 return (select count(*)::integer from notification_private.inbox_v3(actor) n where n.read_at is null);
end;$$;
create function public.mark_all_user_notifications_read_v3() returns integer language sql security invoker set search_path='' as $$select notification_private.mark_read_v3(null,null,true);$$;
create or replace function public.mark_user_notification_read_v1(p_notification_id uuid,p_notification_source text default 'user') returns integer
language sql security invoker set search_path='' as $$select notification_private.mark_read_v3(p_notification_id,p_notification_source,false);$$;
create or replace function public.get_user_notification_unread_count_v1() returns integer language sql stable security invoker set search_path='' as $$
 select (notification_private.page_v3(1,null,null,null)->>'unreadCount')::integer;
$$;

create function notification_private.preferences_v3(p_categories jsonb,p_tz text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); result jsonb;
begin
 if p_categories is not null and (jsonb_typeof(p_categories)<>'object' or exists(select 1 from jsonb_each(p_categories) e
  where e.key not in ('service','community','schedule','activity','record','anniversary','memorial') or jsonb_typeof(e.value)<>'boolean')) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_CATEGORIES_INVALID'; end if;
 if p_tz is not null and not exists(select 1 from pg_timezone_names where name=p_tz) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_TIMEZONE_INVALID'; end if;
 if p_categories is not null or p_tz is not null then
  insert into public.user_notification_preferences(user_id) values(actor) on conflict do nothing;
 end if;
 if p_categories is not null or p_tz is not null then
  update public.user_notification_preferences set categories=categories||coalesce(p_categories,'{}'::jsonb),time_zone=coalesce(p_tz,time_zone),updated_at=statement_timestamp() where user_id=actor;
 end if;
 select jsonb_build_object('pushOptIn',push_opt_in,'categories',categories,'timeZone',time_zone) into result
 from public.user_notification_preferences where user_id=actor;
 return coalesce(result,'{"pushOptIn":false,"categories":{},"timeZone":"Asia/Seoul"}'::jsonb);
end;$$;
create function public.manage_user_notification_preferences_v3(p_categories jsonb default null,p_time_zone text default null) returns jsonb
language sql security invoker set search_path='' as $$select notification_private.preferences_v3(p_categories,p_time_zone);$$;

-- A master opt-in change must not reset an existing category's explicit OFF.
create or replace function public.set_user_notification_opt_in_v1(p_push_opt_in boolean,p_categories jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=notification_private.actor_v3(); result jsonb;
begin
 if jsonb_typeof(p_categories)<>'object' then raise exception using errcode='22023',message='NURI_NOTIFICATION_CATEGORIES_INVALID';end if;
 insert into public.user_notification_preferences(user_id) values(actor) on conflict do nothing;
 update public.user_notification_preferences set push_opt_in=coalesce(p_push_opt_in,false),
  categories=coalesce(p_categories,'{}')||categories,
  opted_in_at=case when p_push_opt_in then coalesce(opted_in_at,statement_timestamp()) else opted_in_at end,
  opted_out_at=case when p_push_opt_in then null else statement_timestamp() end,updated_at=statement_timestamp() where user_id=actor;
 if not coalesce(p_push_opt_in,false) then update public.user_push_tokens set token_status='revoked',opt_in=false,
  revoked_at=statement_timestamp(),revoke_reason='user_opt_out' where user_id=actor and token_status in ('active','provider_unavailable');end if;
 select jsonb_build_object('pushOptIn',push_opt_in,'categories',categories) into result from public.user_notification_preferences where user_id=actor;
 return result;
end;$$;

-- Replace only the notification trigger, not moderation, counters, or XP.
create or replace function public.notify_community_comment_insert_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor_name text; event text; label text;
begin
 if new.status<>'active' or new.deleted_at is not null then return new; end if;
 if new.parent_comment_id is null then
  select p.user_id into recipient from public.posts p where p.id=new.post_id;
  event:='community.comment';label:='댓글';
 else
  select c.user_id into recipient from public.comments c where c.id=coalesce(new.reply_to_comment_id,new.parent_comment_id) and c.status='active' and c.deleted_at is null;
  event:='community.reply';label:='답글';
 end if;
 select left(coalesce(nullif(btrim(p.nickname::text),''),'사용자'),20) into actor_name from public.profiles p where p.user_id=new.user_id;
 perform notification_private.emit_v3(recipient,event,'comments',new.id::text,'1',actor_name||'님이 '||label||'을 남겼어요',
  '“'||left(new.content,100)||'”','community',jsonb_build_object('kind','community_comment','postId',new.post_id,'commentId',new.id),
  '{}',null,new.user_id,statement_timestamp(),null,true);
 return new;
end;$$;

create function notification_private.like_v3() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; target jsonb; event text;
begin
 if tg_table_name='likes' then
  select user_id into recipient from public.posts where id=new.post_id;
  target:=jsonb_build_object('kind','community_post','postId',new.post_id);event:='community.post_liked';
 else
  select user_id,jsonb_build_object('kind','community_comment','postId',post_id,'commentId',id) into recipient,target from public.comments where id=new.comment_id;
  event:='community.comment_liked';
 end if;
 -- One notification for an actor/target lifetime, including unlike/re-like.
 perform notification_private.emit_v3(recipient,event,tg_table_name,coalesce(target->>'commentId',target->>'postId'),'1',
  '누군가 마음을 남겼어요','함께한 이야기에 공감했어요.','community',target,'{}',null,new.user_id,statement_timestamp(),null,true,
  event||':'||coalesce(target->>'commentId',target->>'postId')||':'||new.user_id);
 return new;
end;$$;
create trigger notification_post_like_v3 after insert on public.likes for each row execute function notification_private.like_v3();
create trigger notification_comment_like_v3 after insert on public.comment_likes for each row execute function notification_private.like_v3();

create function notification_private.activity_v3() returns trigger language plpgsql security definer set search_path='' as $$
declare label text;
begin
 if tg_table_name='nuri_title_awards_v2' then
  if new.reason<>'rule_v2' then return new; end if;
  select name into label from title_private.nuri_title_catalog_v2 where id=new.title_id;
  perform notification_private.emit_v3(new.user_id,'activity.title_earned','title_award',new.id::text,'1',
   '새로운 칭호를 획득했어요','‘'||label||'’ 칭호를 확인해보세요.','activity',
   jsonb_build_object('kind','title','titleId',new.title_id,'petId',new.pet_id),'{}',new.pet_id,null,
   statement_timestamp(),null,true);
 elsif tg_table_name='user_xp_ledger' then
  if new.xp<=0 then return new; end if;
  perform notification_private.emit_v3(new.user_id,'activity.xp_granted',new.source_type,new.id::text,'1',
   '경험치가 차곡차곡 쌓였어요','+'||new.xp||' XP가 반영되었어요.','activity',
   jsonb_build_object('kind','activity','grantId',new.id),jsonb_build_object('xp',new.xp,'sourceId',new.source_id),new.pet_id);
 elsif tg_table_name='user_level_summaries' then
  if tg_op='UPDATE' then if new.level<=old.level then return new; end if;
  elsif new.level<=1 then return new; end if;
  perform notification_private.emit_v3(new.user_id,'activity.level_changed','level',new.user_id::text,new.level::text,
   '새로운 레벨에 도착했어요','Lv.'||new.level||'이 되었어요.','activity','{"kind":"activity"}',
   jsonb_build_object('level',new.level),null,null,statement_timestamp(),null,true);
 end if;
 return new;
end;$$;
create trigger notification_title_v3 after insert on title_private.nuri_title_awards_v2 for each row execute function notification_private.activity_v3();
create trigger notification_xp_v3 after insert on public.user_xp_ledger for each row execute function notification_private.activity_v3();
create trigger notification_level_v3 after insert or update of level on public.user_level_summaries for each row execute function notification_private.activity_v3();

create function notification_private.memory_v3() returns trigger language plpgsql security definer set search_path='' as $$
declare rowdata public.memories%rowtype; event text; label text; target jsonb; version text;
begin
 if tg_op='DELETE' then rowdata:=old;event:='record.deleted';label:='추억 기록을 삭제했어요';
 else rowdata:=new;
  if tg_op='UPDATE' then
   if (new.title,new.content,new.occurred_at,new.category,new.sub_category,new.price,new.emotion,new.tags)
    is not distinct from (old.title,old.content,old.occurred_at,old.category,old.sub_category,old.price,old.emotion,old.tags) then return new; end if;
   event:='record.updated';label:='추억 기록을 수정했어요';
  else event:='record.created';label:='새로운 추억을 남겼어요'; end if;
 end if;
 if rowdata.metadata @> '{"qaFixture":true}' or rowdata.metadata @> '{"draft":true}' or rowdata.metadata @> '{"invalidated":true}' then return rowdata; end if;
 target:=case when tg_op='DELETE' then '{"kind":"unavailable"}'::jsonb else jsonb_build_object('kind','record','memoryId',rowdata.id,'petId',rowdata.pet_id) end;
 version:=case when tg_op='DELETE' then 'deleted' else rowdata.updated_at::text end;
 perform notification_private.emit_v3(rowdata.user_id,event,'memories',rowdata.id::text,version,label,
  case when tg_op='DELETE' then '삭제된 기록은 다시 볼 수 없어요.' else '기록에 반영된 내용을 확인해보세요.' end,'record',target,'{}',rowdata.pet_id);
 return rowdata;
end;$$;
create trigger notification_memory_v3 after insert or update or delete on public.memories for each row execute function notification_private.memory_v3();

-- Individual operator messages already use the inbox; no second fan-out path.
create function notification_private.admin_message_v3() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.event_type='legacy.notice' and coalesce(new.metadata->>'kind','') not in ('community_comment','community_reply') then
  new.event_type:='news.direct';new.category:='news';new.source_type:='admin_message';new.source_id:=new.id::text;
 end if;
 return new;
end;$$;
create trigger notification_admin_message_v3 before insert on public.user_notifications for each row execute function notification_private.admin_message_v3();

-- All private helpers deny client execution unless explicitly exposed below.
revoke all on all tables in schema notification_private from public,anon,authenticated;
revoke all on all functions in schema notification_private from public,anon,authenticated;
grant usage on schema notification_private to authenticated;
grant execute on function notification_private.page_v3(integer,timestamptz,uuid,text),
 notification_private.detail_v3(uuid,text),notification_private.mark_read_v3(uuid,text,boolean),
 notification_private.preferences_v3(jsonb,text) to authenticated;
revoke all on function public.get_user_notifications_v3(integer,timestamptz,uuid,text),public.get_user_notification_detail_v3(uuid,text),
 public.mark_all_user_notifications_read_v3(),public.manage_user_notification_preferences_v3(jsonb,text) from public,anon;
grant execute on function public.get_user_notifications_v3(integer,timestamptz,uuid,text),public.get_user_notification_detail_v3(uuid,text),
 public.mark_all_user_notifications_read_v3(),public.manage_user_notification_preferences_v3(jsonb,text) to authenticated;

commit;

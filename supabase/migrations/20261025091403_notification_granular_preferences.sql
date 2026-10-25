begin;

-- Remote migration identity: 20261025091403 (Master QA-scoped rollout).

-- Keep legacy master-OFF effective for every untouched category. Only an
-- explicit category change activates that category; service is not a master.
create or replace function notification_private.preferences_v3(p_categories jsonb,p_tz text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=notification_private.actor_v3();
 prefs public.user_notification_preferences%rowtype;
 next_categories jsonb;
 previous_opt_in boolean;
 next_opt_in boolean;
 result jsonb;
begin
 if p_categories is not null and (jsonb_typeof(p_categories)<>'object' or exists(select 1 from jsonb_each(p_categories) e
  where e.key not in ('service','community','schedule','activity','record','anniversary','memorial') or jsonb_typeof(e.value)<>'boolean')) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_CATEGORIES_INVALID';end if;
 if p_tz is not null and not exists(select 1 from pg_timezone_names where name=p_tz) then
  raise exception using errcode='22023',message='NURI_NOTIFICATION_TIMEZONE_INVALID';end if;
 if p_categories is not null or p_tz is not null then
  insert into public.user_notification_preferences(user_id) values(actor) on conflict do nothing;
  select * into prefs from public.user_notification_preferences where user_id=actor for update;
  previous_opt_in:=coalesce(prefs.push_opt_in,false);
  next_categories:=coalesce(prefs.categories,'{}');
  if p_categories is not null and p_categories<>'{}'::jsonb then
   if not previous_opt_in then
    select coalesce(jsonb_object_agg(e.key,false),'{}'::jsonb) into next_categories from jsonb_each(next_categories) e where e.key<>'schedule';
    if prefs.categories?'schedule' then next_categories:=next_categories||jsonb_build_object('schedule',prefs.categories->'schedule');end if;
   end if;
   next_categories:=next_categories||p_categories;
   select exists(select 1 from jsonb_each(next_categories) e where e.key in ('service','community','activity','record','anniversary','memorial') and e.value='true'::jsonb) into next_opt_in;
  else next_opt_in:=previous_opt_in;
  end if;
  update public.user_notification_preferences set categories=next_categories,push_opt_in=next_opt_in,
   time_zone=coalesce(p_tz,time_zone),
   opted_in_at=case when next_opt_in then coalesce(opted_in_at,statement_timestamp()) else opted_in_at end,
   opted_out_at=case when previous_opt_in and not next_opt_in then statement_timestamp() when next_opt_in then null else opted_out_at end,
   updated_at=statement_timestamp() where user_id=actor;
  if previous_opt_in and not next_opt_in then
   update public.user_push_tokens set token_status='revoked',opt_in=false,revoked_at=statement_timestamp(),revoke_reason='user_opt_out'
    where user_id=actor and token_status in ('active','provider_unavailable');
  end if;
 end if;
 select * into prefs from public.user_notification_preferences where user_id=actor;
 if not found then return '{"pushOptIn":false,"categories":{},"timeZone":"Asia/Seoul"}'::jsonb;end if;
 next_categories:=coalesce(prefs.categories,'{}');
 if not coalesce(prefs.push_opt_in,false) then
  select coalesce(jsonb_object_agg(e.key,case when e.key='schedule' then e.value else 'false'::jsonb end),'{}'::jsonb) into next_categories from jsonb_each(next_categories) e;
 end if;
 result:=jsonb_build_object('pushOptIn',prefs.push_opt_in,'categories',next_categories,'timeZone',prefs.time_zone);
 return result;
end;$$;

commit;

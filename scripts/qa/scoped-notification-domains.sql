-- Apply only to the pre-existing isolated notification stack. No scheduling or writes.
begin;
do $$
begin
  if current_setting('nuri.qa_scope',true) is distinct from 'n15-local'
     or current_database() <> 'postgres'
     or to_regprocedure('notification_private.mixed_actor_v4()') is null
     or not exists (select from support_private.runtime where singleton and not mixed_inbox_enabled) then
    raise exception 'Unexpected isolated notification baseline';
  end if;
end $$;

-- PROVISION_PINNED_XP_LEDGER

create or replace function notification_private.destination_domain_v4(p_id uuid, p_source text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := notification_private.mixed_actor_v4();
  target jsonb;
  kind text;
  pet uuid;
  start_day date;
  end_day date;
  pets jsonb;
  memories jsonb;
  ledger jsonb;
  xp bigint;
begin
  if not exists (select from support_private.runtime where singleton and support_enabled and mixed_inbox_enabled) then
    raise sqlstate 'PT404' using message = 'NURI_NOTIFICATION_UNAVAILABLE';
  end if;
  select n.target into target
    from notification_private.mixed_rows_v4(actor) n
    where n.notification_id = p_id and n.notification_source = p_source and p_source = 'user';
  kind := target->>'kind';
  if kind is null or kind not in ('timeline_period', 'pet_anniversary', 'activity') then
    raise sqlstate 'PT404' using message = 'NURI_NOTIFICATION_UNAVAILABLE';
  end if;
  pet := (target->>'petId')::uuid;
  if kind = 'timeline_period' then
    start_day := (target->>'startDate')::date;
    end_day := (target->>'endDate')::date;
    if start_day is null or end_day is null or start_day >= end_day then
      raise sqlstate 'PT404' using message = 'NURI_NOTIFICATION_UNAVAILABLE';
    end if;
  elsif kind = 'pet_anniversary' and pet is null then
    raise sqlstate 'PT404' using message = 'NURI_NOTIFICATION_UNAVAILABLE';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'themeColor',p.theme_color) order by p.created_at,p.id),'[]')
    into pets from public.pets p where p.user_id = actor and (pet is null or p.id = pet);
  if pet is not null and jsonb_array_length(pets) <> 1 then
    raise sqlstate 'PT404' using message = 'NURI_NOTIFICATION_UNAVAILABLE';
  end if;
  -- Never return image paths: the production image signer must not see isolated records.
  select coalesce(jsonb_agg(to_jsonb(m) order by m."occurredAt" desc,m.id),'[]') into memories from (
    select r.id,r.pet_id as "petId",r.title,r.category,r.sub_category as "subCategory",
      coalesce(r.occurred_at,(r.created_at at time zone 'Asia/Seoul')::date) as "occurredAt",
      r.created_at as "createdAt"
    from public.memories r join public.pets p on p.id = r.pet_id and p.user_id = actor
    where r.user_id = actor and (pet is null or r.pet_id = pet)
      and (start_day is null or coalesce(r.occurred_at,(r.created_at at time zone 'Asia/Seoul')::date) >= start_day)
      and (end_day is null or coalesce(r.occurred_at,(r.created_at at time zone 'Asia/Seoul')::date) < end_day)
    order by 5 desc, r.id limit 1001
  ) m;
  if jsonb_array_length(memories) > 1000 then
    raise sqlstate 'PT422' using message = 'NURI_NOTIFICATION_SCOPE_TOO_LARGE';
  end if;
  if kind <> 'activity' then
    return jsonb_build_object('kind','timeline','pets',pets,'records',memories);
  end if;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]') into ledger from (
    select l.id,l.pet_id,l.event_type,l.source_type,l.source_id,l.xp,l.activity_date_kst,l.created_at
    from public.user_xp_ledger l
    where l.user_id = actor and (l.pet_id is null or exists(
      select from public.pets p where p.id = l.pet_id and p.user_id = actor))
    order by l.created_at desc,l.id limit 1001
  ) e;
  if jsonb_array_length(ledger) > 1000 then
    raise sqlstate 'PT422' using message = 'NURI_NOTIFICATION_SCOPE_TOO_LARGE';
  end if;
  select coalesce(sum((e->>'xp')::int),0) into xp from jsonb_array_elements(ledger) e;
  return jsonb_build_object('kind','activity','pets',pets,'records',memories,'ledger',ledger,'totalXp',xp,
    'postCount',(select count(*) from public.posts p where p.user_id = actor and p.status = 'active' and p.deleted_at is null),
    'commentCount',(select count(*) from public.comments c where c.user_id = actor and c.status = 'active' and c.deleted_at is null));
end $$;

create or replace function public.get_notification_destination_domain_v4(p_id uuid, p_source text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select notification_private.destination_domain_v4(p_id,p_source)
$$;
revoke all on function notification_private.destination_domain_v4(uuid,text),
  public.get_notification_destination_domain_v4(uuid,text) from public,anon,authenticated,service_role;
grant execute on function notification_private.destination_domain_v4(uuid,text),
  public.get_notification_destination_domain_v4(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;

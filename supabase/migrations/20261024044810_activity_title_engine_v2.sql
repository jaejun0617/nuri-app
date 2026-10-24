-- Server-owned v2 acquisition. Source content, XP and GPS engine remain unchanged.
create function title_private.anniversary_v2(p_date date,p_year integer) returns date
language sql immutable strict set search_path='' as $$
 select make_date(p_year,extract(month from p_date)::integer,
 least(extract(day from p_date)::integer,extract(day from (make_date(p_year,extract(month from p_date)::integer,1)+interval '1 month - 1 day'))::integer));
$$;
create function title_private.elapsed_months_v2(p_first date,p_last date) returns integer
language sql immutable strict set search_path='' as $$
 with n as (select greatest(0,(extract(year from p_last)::integer-extract(year from p_first)::integer)*12
  +extract(month from p_last)::integer-extract(month from p_first)::integer) as v)
 select greatest(0,v-case when (p_first+make_interval(months=>v))::date>p_last then 1 else 0 end) from n;
$$;

-- Reads only the actor's live original rows. A linked GPS Memory remains a
-- Memory, but its walk contribution is owned by its accepted Session once.
create function title_private.facts_v2(p_user uuid,p_pet uuid,p_as_of timestamptz default statement_timestamp())
returns table(record_date date,received_at timestamptz,domain text,source_id text,
 photo_keys text[],remembrance boolean,memory_record boolean,gps_m bigint)
language sql stable set search_path='' as $$
 with memory as (
  select m.*,coalesce(m.occurred_at,(m.created_at at time zone 'Asia/Seoul')::date) as activity_date,
   exists(select 1 from public.walk_record_claims c where c.original_memory_id=m.id and c.user_id=p_user) as linked
  from public.memories m join public.pets p on p.id=m.pet_id and p.user_id=m.user_id
  where m.user_id=p_user and m.pet_id=p_pet and m.created_at<=p_as_of
   and not (m.metadata @> '{"qaFixture":true}' or m.metadata @> '{"isQaFixture":true}'
     or m.metadata @> '{"draft":true}' or m.metadata @> '{"invalidated":true}')
 )
 select m.activity_date,m.created_at,
  case when m.category='walk' and not m.linked then 'walk'
   when m.category='meal' then 'meal'
   when m.category='health' or m.sub_category='hospital' then 'health'
   when m.category='other' and m.sub_category in ('grooming','bathing')
    and exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(m.metadata#>'{grooming,careTypes}')='array'
      then m.metadata#>'{grooming,careTypes}' else '[]'::jsonb end) code where code in
      ('bath','coat_care','nail_trim','ear_cleaning','tooth_brushing','full_grooming','partial_grooming','sanitary_trim',
       'scissor_cut','clipper_cut','sporting_cut','face_trim','paw_pad_trim','drying','brushing','conditioning','anal_gland_care','spa','mud_pack')) then 'care'
   when m.category='diary' then 'diary' else null end,
  'memory:'||m.id::text,
  array(select distinct 'etag:'||lower(trim(both '"' from o.metadata->>'eTag')) from unnest(
   coalesce(m.image_urls,array[]::text[])||array[m.image_url]||
   array(select i.original_path from public.memory_images i where i.memory_id=m.id and i.user_id=p_user and i.status='ready')
  ) x join storage.objects o on o.bucket_id='memory-images' and o.name=split_part(x,'?',1)
   and (o.owner_id=p_user::text or o.owner::text=p_user::text)
   where x is not null and btrim(x)<>'' and trim(both '"' from o.metadata->>'eTag') ~ '^[0-9a-fA-F]{32}$'),
  exists(select 1 from title_private.nuri_remembrance_records_v2 r where r.memory_id=m.id and r.user_id=p_user and r.pet_id=p_pet),true,null::bigint
 from memory m where m.activity_date<=(p_as_of at time zone 'Asia/Seoul')::date
 union all
 select (w.started_at at time zone 'Asia/Seoul')::date,w.accepted_at,'walk','gps:'||w.id::text,
  array[]::text[],false,false,w.accepted_distance_m
 from public.walk_sessions w join public.pets p on p.id=w.pet_id and p.user_id=w.user_id
 where w.user_id=p_user and w.pet_id=p_pet and w.state='ACCEPTED_SERVER' and w.deleted_at is null
  and w.eligibility='PROGRESSION_ELIGIBLE' and w.accepted_at<=p_as_of
 union all
 select w.measured_on,w.created_at,'health','weight:'||w.id::text,array[]::text[],false,false,null::bigint
 from public.pet_weight_logs w join public.pets p on p.id=w.pet_id and p.user_id=w.user_id
 where w.user_id=p_user and w.pet_id=p_pet and w.created_at<=p_as_of
  and w.measured_on<=(p_as_of at time zone 'Asia/Seoul')::date and w.source<>'backfill';
$$;

create function title_private.pet_metrics_v2(p_user uuid,p_pet uuid,p_as_of timestamptz default statement_timestamp()) returns jsonb
language sql stable set search_path='' as $$
 with facts as materialized (select * from title_private.facts_v2(p_user,p_pet,p_as_of)),
 days as (select distinct record_date as d from facts where domain in ('walk','meal','health','care','diary')),
 walk_days as (select distinct record_date as d from facts where domain='walk'),
 bounds as (select coalesce((select (o.first_recorded_at at time zone 'Asia/Seoul')::date
  from title_private.nuri_title_pet_origins_v2 o where o.pet_id=p_pet),min((received_at at time zone 'Asia/Seoul')::date)) as first_day,
  max((received_at at time zone 'Asia/Seoul')::date) as last_day from facts),
 weeks as (select date_trunc('week',d) from days group by 1 having count(*)>=2),
 routine as (select date_trunc('month',d) from days group by 1
  having count(*)>=6 and count(distinct date_trunc('week',d))>=2),
 domain_months as (select date_trunc('month',record_date) as m,domain from facts
  where domain in ('walk','meal','health','care','diary') group by 1,2 having count(distinct record_date)>=2),
 month_totals as (select date_trunc('month',d) as m,count(*) as n from days group by 1),
 balanced as (select d.m from domain_months d join month_totals t on t.m=d.m and t.n>=4 group by d.m having count(*)>=2),
 photo_origins as (select distinct on (photo) photo,record_date from facts f cross join lateral unnest(f.photo_keys) photo
  order by photo,received_at,source_id),
 -- Exact copies of an explicitly included memory share one remembrance origin.
 -- The hash stays inside this query; no private text is copied to award evidence.
 remembrance_origins as (
  select distinct on (md5(jsonb_build_array(btrim(m.title),regexp_replace(btrim(coalesce(m.content,'')),'\s+',' ','g'),f.photo_keys)::text))
   f.source_id from facts f join public.memories m on f.source_id='memory:'||m.id::text
  where f.remembrance
  order by md5(jsonb_build_array(btrim(m.title),regexp_replace(btrim(coalesce(m.content,'')),'\s+',' ','g'),f.photo_keys)::text),f.received_at,f.source_id
 ),
 season_dates as (select distinct (received_at at time zone 'Asia/Seoul')::date as d from facts),
 seasons as (select distinct (date_trunc('quarter',d-interval '2 months')+interval '2 months')::date as s from season_dates),
 window7 as (select count(*) over(order by d::timestamp range between interval '6 days' preceding and current row) as n from days),
 window14walk as (select count(*) over(order by d::timestamp range between interval '13 days' preceding and current row) as n from walk_days),
 hidden_source as (select record_date as d,(received_at at time zone 'Asia/Seoul')::date as rx,domain,received_at from facts),
 lunar as (select h.kind,count(distinct h.event_year) as n from title_private.nuri_title_holidays_v2 h
  join hidden_source f on f.d between h.event_date-3 and h.event_date+3
   and f.rx between h.event_date-3 and h.event_date+10 group by h.kind),
 fixed as (select v.kind,count(distinct y) as n
  from (select distinct extract(year from d)::integer as y from hidden_source) years
  cross join (values ('newyear',1,1,1,7),('yearend',12,25,12,31),('winterstar',12,22,12,28),
    ('hangeul',10,6,10,12),('green',4,2,4,8)) v(kind,sm,sd,em,ed)
  join hidden_source f on f.d between make_date(y,sm,sd) and make_date(y,em,ed)
   and f.rx between make_date(y,sm,sd) and make_date(y,em,ed)+7
   and (v.kind<>'hangeul' or f.domain='diary') group by v.kind),
 anniversary_observations as (
  select f.d,f.rx,p.birth_date,p.adoption_date
  from hidden_source f cross join lateral (
   select s.birth_date,s.adoption_date from title_private.nuri_title_pet_dates_v2 s
   where s.pet_id=p_pet and s.observed_at<=f.received_at order by s.observed_at desc limit 1
  ) p
 ), anniversaries as (
  select v.kind,count(distinct y) as n from anniversary_observations f
  cross join lateral (values ('birthday',f.birth_date),('adoption',f.adoption_date)) v(kind,base)
  cross join lateral generate_series(extract(year from f.d)::integer-1,extract(year from f.d)::integer+1) y
  where v.base is not null and y>=extract(year from v.base)::integer
   and f.d between title_private.anniversary_v2(v.base,y)-7 and title_private.anniversary_v2(v.base,y)+7
   and f.rx between title_private.anniversary_v2(v.base,y)-7 and title_private.anniversary_v2(v.base,y)+14
  group by v.kind
 ), first_anniversary as (
  select count(*)>0 as found from hidden_source f cross join bounds b
  where f.d between title_private.anniversary_v2(b.first_day,extract(year from b.first_day)::integer+1)-7
   and title_private.anniversary_v2(b.first_day,extract(year from b.first_day)::integer+1)+7
   and f.rx between title_private.anniversary_v2(b.first_day,extract(year from b.first_day)::integer+1)-7
   and title_private.anniversary_v2(b.first_day,extract(year from b.first_day)::integer+1)+14
 ), gaps as (select d,lag(d) over(order by d) as previous_day from (select distinct record_date as d from facts) eligible_days),
 returns as (select count(*)>0 as found from gaps g where g.d-g.previous_day>=31
  and (select count(distinct f.d) from hidden_source f where f.d between g.d and g.d+13 and f.rx between g.d and g.d+20)>=3),
 edges as (select count(*)>0 as found from seasons s where
  exists(select 1 from hidden_source f where f.d between s.s-7 and s.s-1 and f.rx between s.s-7 and s.s+6)
  and exists(select 1 from hidden_source f where f.d between s.s and s.s+6 and f.rx between s.s and s.s+13)),
 balanced_week as (select exists(select 1 from hidden_source f cross join generate_series(0,6) offset_days
   where f.rx between f.d-offset_days and f.d-offset_days+13
    and f.domain in ('walk','meal','health','care','diary')
   group by f.d-offset_days having count(distinct f.domain)>=3 and count(distinct f.d)>=3) as found)
 select jsonb_build_object(
  'walk_days',(select count(*) from walk_days),
  'gps_m',coalesce((select sum(gps_m) from facts),0),
  'gps_days',(select count(distinct record_date) from facts where gps_m is not null),
  'memory_days',(select count(distinct record_date) from facts where memory_record),
  'meal_days',(select count(distinct record_date) from facts where domain='meal'),
  'health_weeks',(select count(distinct date_trunc('week',record_date)) from facts where domain='health'),
  'care_months',(select count(distinct date_trunc('month',record_date)) from facts where domain='care'),
  'active_days',(select count(*) from days),
  'record_weeks',(select count(*) from weeks),
  'routine_months',(select count(*) from routine),
  'balanced_months',(select count(*) from balanced),
  'photo_days',(select count(distinct record_date) from photo_origins),
  'photo_proof_pending',(select count(*) from public.memories m where m.user_id=p_user and m.pet_id=p_pet
   and exists(select 1 from facts f where f.source_id='memory:'||m.id::text)
   and exists(select 1 from unnest(coalesce(m.image_urls,array[]::text[])||array[m.image_url]||
    array(select i.original_path from public.memory_images i where i.memory_id=m.id and i.user_id=p_user and i.status='ready')) x
    where x is not null and btrim(x)<>'' and not exists(select 1 from storage.objects o
     where o.bucket_id='memory-images' and o.name=split_part(x,'?',1) and (o.owner_id=p_user::text or o.owner::text=p_user::text)
      and trim(both '"' from o.metadata->>'eTag') ~ '^[0-9a-fA-F]{32}$'))),
  'season_kinds',(select count(distinct extract(month from s)) from seasons),
  'season_count',(select count(*) from seasons),
  'elapsed_months',coalesce((select title_private.elapsed_months_v2(first_day,last_day) from bounds),0),
  'elapsed_days',coalesce((select greatest(0,last_day-first_day) from bounds),0),
  'window7_days',coalesce((select max(n) from window7),0),
  'window14_walk_days',coalesce((select max(n) from window14walk),0),
  'remembrance_count',(select count(*) from remembrance_origins),
  'remembrance_photos',(select count(distinct photo) from facts f cross join lateral unnest(f.photo_keys) photo where remembrance),
  'remembrance_months',(select count(distinct date_trunc('month',m.created_at at time zone 'Asia/Seoul'))
   from title_private.nuri_remembrance_records_v2 r join public.memories m on m.id=r.memory_id
   where r.user_id=p_user and r.pet_id=p_pet and r.included_at<=p_as_of),
  'seollal_years',coalesce((select n from lunar where kind='seollal'),0),
  'daeboreum_years',coalesce((select n from lunar where kind='daeboreum'),0),
  'chuseok_years',coalesce((select n from lunar where kind='chuseok'),0),
  'newyear_years',coalesce((select n from fixed where kind='newyear'),0),
  'yearend_years',coalesce((select n from fixed where kind='yearend'),0),
  'winterstar_years',coalesce((select n from fixed where kind='winterstar'),0),
  'hangeul_years',coalesce((select n from fixed where kind='hangeul'),0),
  'green_years',coalesce((select n from fixed where kind='green'),0),
  'birthday_years',coalesce((select n from anniversaries where kind='birthday'),0),
  'adoption_years',coalesce((select n from anniversaries where kind='adoption'),0),
  'first_anniversary',(select found::integer from first_anniversary),
  'return_after_gap',(select found::integer from returns),
  'season_edge',(select found::integer from edges),
  'balanced_week',(select found::integer from balanced_week));
$$;

create function title_private.common_metrics_v2(p_user uuid,p_as_of timestamptz default statement_timestamp()) returns jsonb
language sql stable set search_path='' as $$
 with post_source as (
  select distinct on (md5(regexp_replace(btrim(p.content),'\s+',' ','g')))
   p.id,p.category,(p.created_at at time zone 'Asia/Seoul')::date as d
  from public.posts p where p.user_id=p_user and p.status='active' and p.deleted_at is null and p.created_at<=p_as_of
  order by md5(regexp_replace(btrim(p.content),'\s+',' ','g')),p.created_at,p.id
 ), comment_source as (
  select distinct on (c.post_id,md5(regexp_replace(btrim(c.content),'\s+',' ','g')))
   c.id,c.post_id,(c.created_at at time zone 'Asia/Seoul')::date as d,c.created_at
  from public.comments c join public.posts p on p.id=c.post_id
  where c.user_id=p_user and p.user_id<>p_user and c.status='active' and c.deleted_at is null
   and p.status='active' and p.deleted_at is null and c.created_at<=p_as_of
  order by c.post_id,md5(regexp_replace(btrim(c.content),'\s+',' ','g')),c.created_at,c.id
 ), per_post_day as (
  select distinct on (post_id,d) * from comment_source order by post_id,d,created_at,id
 ), per_day as (select d,least(2,count(*)) as n from per_post_day group by d)
 select jsonb_build_object(
 'post_days',(select count(distinct d) from post_source),
 'post_months',(select count(distinct date_trunc('month',d)) from post_source),
 'info_post_days',(select count(distinct d) from post_source where category='info'),
 'comments',coalesce((select sum(n) from per_day),0),
 'level',coalesce((select s.level from public.user_level_summaries s where s.user_id=p_user),1),
 'activity_count',(select count(*) from public.user_xp_ledger l where l.user_id=p_user and l.created_at<=p_as_of)
  +(select count(*) from public.memories m join public.pets p on p.id=m.pet_id and p.user_id=m.user_id
    where m.user_id=p_user and m.created_at<=p_as_of
     and not(m.metadata @> '{"qaFixture":true}' or m.metadata @> '{"isQaFixture":true}' or m.metadata @> '{"draft":true}' or m.metadata @> '{"invalidated":true}'))
  +(select count(*) from public.pet_weight_logs w join public.pets p on p.id=w.pet_id and p.user_id=w.user_id
    where w.user_id=p_user and w.created_at<=p_as_of and w.source<>'backfill')
  +(select count(*) from public.walk_sessions w where w.user_id=p_user and w.state='ACCEPTED_SERVER'
    and w.deleted_at is null and w.eligibility='PROGRESSION_ELIGIBLE' and w.accepted_at<=p_as_of)
  +(select count(*) from post_source)+coalesce((select sum(n) from per_day),0));
$$;

create function title_private.assert_actor_v2() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception using errcode='42501',message='TITLE_AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.profiles p where p.user_id=actor)
  or exists(select 1 from public.account_deletion_requests r where r.user_id=actor
   and r.status not in ('cancelled')) then
  raise exception using errcode='42501',message='TITLE_ACCOUNT_UNAVAILABLE';
 end if;
 return actor;
end;
$$;

create function title_private.refresh_v2(p_user uuid,p_pet uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare metrics jsonb;
begin
 if not exists(select 1 from public.profiles p where p.user_id=p_user)
  or (p_pet is not null and not exists(select 1 from public.pets p where p.id=p_pet and p.user_id=p_user))
  or exists(select 1 from public.account_deletion_requests r where r.user_id=p_user and r.status<>'cancelled') then
  return '{}'::jsonb;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,332));
 if p_pet is not null then
  insert into title_private.nuri_title_pet_origins_v2(pet_id,first_recorded_at)
   select p_pet,min(f.received_at) from title_private.facts_v2(p_user,p_pet) f having min(f.received_at) is not null
   on conflict(pet_id) do update set first_recorded_at=least(nuri_title_pet_origins_v2.first_recorded_at,excluded.first_recorded_at);
 end if;
 metrics:=case when p_pet is null then title_private.common_metrics_v2(p_user)
  else title_private.pet_metrics_v2(p_user,p_pet) end;
 if exists(select 1 from title_private.nuri_title_catalog_v2 c cross join lateral jsonb_array_elements(c.requirements) r
  where c.scope=case when p_pet is null then 'common' else 'pet' end and not (metrics ? (r->>'metric'))) then
  raise exception using errcode='22023',message='TITLE_POLICY_DATA_UNAVAILABLE';
 end if;
 insert into title_private.nuri_title_awards_v2(user_id,pet_id,title_id,reason,evidence)
 select p_user,p_pet,c.id,'rule_v2',
  (select jsonb_object_agg(r->>'metric',metrics->(r->>'metric')) from jsonb_array_elements(c.requirements) r)
 from title_private.nuri_title_catalog_v2 c
 where c.scope=case when p_pet is null then 'common' else 'pet' end
  and not exists(select 1 from jsonb_array_elements(c.requirements) r
   where (metrics->>(r->>'metric'))::numeric<(r->>'target')::numeric)
 on conflict(user_id,pet_id,title_id) do nothing;
 return metrics;
end;
$$;

-- One-time compatibility bridge. This never rewrites user_titles or copies a
-- user's unscoped historical walk award to every pet.
create function title_private.preserve_legacy_v2(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare receipt uuid; pet record; m jsonb; cutoff timestamptz;
begin
 insert into title_private.nuri_title_legacy_receipts_v2(user_id) values(p_user)
 on conflict do nothing returning user_id into receipt;
 if receipt is null then return; end if;
 select activated_at into cutoff from title_private.nuri_title_policy_state_v2;
 insert into title_private.nuri_title_awards_v2(user_id,pet_id,title_id,earned_at,reason,evidence)
 select p_user,case when c.scope='common' then null else t.pet_id end,c.id,t.earned_at,
  'legacy_preserved',jsonb_build_object('legacyKey',t.title_key,'ownership','preserved')
 from public.user_titles t join (values
  ('first_walk_friend','WK01'),('walk_sprout','WK02'),('neighborhood_walker','WK07'),('walk_king','WK10'),
  ('first_memory_record','MR01'),('memory_collector','MR03'),('record_master','MR08'),
  ('first_hello_done','CP01'),('neighborhood_news','CP05'),('comment_fairy','CM07'),('warm_commenter','CM10')
 ) a(old_key,new_key) on a.old_key=t.title_key join title_private.nuri_title_catalog_v2 c on c.id=a.new_key
 where t.user_id=p_user and t.earned_at<=cutoff and (c.scope='common' or exists(
  select 1 from public.pets p where p.id=t.pet_id and p.user_id=p_user))
 on conflict(user_id,pet_id,title_id) do nothing;

 for pet in select p.id from public.pets p where p.user_id=p_user loop
  with daily as (select distinct a.activity_date_kst as d from public.pet_daily_activities a
    where a.user_id=p_user and a.pet_id=pet.id and a.created_at<=cutoff),
  islands as (select d,d-(row_number() over(order by d))::integer as g from daily),
  best as (select count(*) as n from islands group by g)
  select jsonb_build_object(
   'walk',(select count(*) from public.user_xp_ledger l where l.user_id=p_user and l.pet_id=pet.id
    and l.created_at<=cutoff and l.event_type in ('walk_record','walk_timeline_post')),
   'streak',greatest(coalesce((select max(n) from best),0),coalesce((select s.best_streak from public.pet_streak_summaries s
     where s.user_id=p_user and s.pet_id=pet.id and s.updated_at<=cutoff),0)),
   'timeline',(select count(*) from public.memories r where r.user_id=p_user and r.pet_id=pet.id and r.created_at<=cutoff
     and r.category is distinct from 'health' and r.sub_category is distinct from 'hospital'),
   'health',(select count(*) from public.memories r where r.user_id=p_user and r.pet_id=pet.id
    and r.created_at<=cutoff and (r.category='health' or r.sub_category='hospital'))
  ) into m;
  insert into title_private.nuri_title_awards_v2(user_id,pet_id,title_id,earned_at,reason,evidence)
  select p_user,pet.id,v.id,cutoff,'legacy_preserved',jsonb_build_object('legacyDashboard',true,'metric',v.metric,'value',m->v.metric)
  from (values ('WK01','walk',1),('WK02','walk',7),('RT01','streak',3),('RT03','streak',7),
   ('MR01','timeline',1),('MR03','timeline',10),('MR05','timeline',10),('HC01','health',1),('HC05','health',10)) v(id,metric,target)
  where (m->>v.metric)::integer>=v.target on conflict(user_id,pet_id,title_id) do nothing;
 end loop;
 select jsonb_build_object(
  'posts',(select count(*) from public.posts p where p.user_id=p_user and p.created_at<=cutoff and p.status='active' and p.deleted_at is null),
  'comments',(select count(*) from public.comments c where c.user_id=p_user and c.created_at<=cutoff and c.status='active' and c.deleted_at is null)
 ) into m;
 insert into title_private.nuri_title_awards_v2(user_id,pet_id,title_id,earned_at,reason,evidence)
 select p_user,null,v.id,cutoff,'legacy_preserved',jsonb_build_object('legacyDashboard',true,'metric',v.metric,'value',m->v.metric)
 from (values ('CP01','posts',1),('CP05','posts',10),('CP09','posts',50),('CM03','comments',10),('CM07','comments',30),('CM10','comments',100)) v(id,metric,target)
 where (m->>v.metric)::integer>=v.target on conflict(user_id,pet_id,title_id) do nothing;
end;
$$;

create function title_private.vault_rows_v2(p_user uuid,p_pet uuid,p_metrics jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'key',c.id,'name',c.name,'domain',c.domain,'scope',c.scope,'ownerId',coalesce(p_pet::text,'common'),
  'conditionLabel',c.condition_label,'currentValue',p.progress,'threshold',1000,
  'achieved',a.title_id is not null,
  'progressLabel',p.label||case when (c.category='PH' or c.id in ('ME06','ME07','ME08','ME09','ME10'))
    and (p_metrics->>'photo_proof_pending')::integer>0 then ' · 사진 원본 확인 중' else '' end,
  'progressKnown',not((c.category='PH' or c.id in ('ME06','ME07','ME08','ME09','ME10')) and coalesce((p_metrics->>'photo_proof_pending')::integer,0)>0),
  'categoryKey',c.category,'categoryLabel',c.category_label,
  'hidden',c.hidden,'policyVersion',2,'earnedAt',a.earned_at,'acquisitionReason',a.reason
 ) order by c.id),'[]'::jsonb)
 from title_private.nuri_title_catalog_v2 c
 left join title_private.nuri_title_awards_v2 a on a.user_id=p_user and a.pet_id is not distinct from p_pet and a.title_id=c.id
 cross join lateral (select floor(least(1,min((p_metrics->>(r.value->>'metric'))::numeric/(r.value->>'target')::numeric))*1000)::integer as progress,
  string_agg((p_metrics->>(r.value->>'metric'))||' / '||(r.value->>'target')||(r.value->>'unit'),' · ' order by ordinal) as label
  from jsonb_array_elements(c.requirements) with ordinality r(value,ordinal)
 ) p
 where c.scope=case when p_pet is null then 'common' else 'pet' end and (not c.hidden or a.title_id is not null);
$$;

create function title_private.get_vault_v2() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=title_private.assert_actor_v2(); pet record; metrics jsonb; rows jsonb;
begin
 perform title_private.preserve_legacy_v2(actor);
 metrics:=title_private.refresh_v2(actor,null);
 rows:=title_private.vault_rows_v2(actor,null,metrics);
 for pet in select p.id from public.pets p where p.user_id=actor order by p.id loop
  metrics:=title_private.refresh_v2(actor,pet.id);
  rows:=rows||title_private.vault_rows_v2(actor,pet.id,metrics);
 end loop;
 rows:=rows||coalesce((select jsonb_agg(jsonb_build_object(
  'key',t.title_key,'name',t.title_name,'domain','timeline','scope','common','ownerId','common',
  'conditionLabel','기존 획득 기록','currentValue',1,'threshold',1,'achieved',true,
  'progressLabel','기존 획득 보존','categoryKey','LEGACY','categoryLabel','기존 칭호','hidden',false,
  'policyVersion',1,'earnedAt',t.earned_at))
  from public.user_titles t where t.user_id=actor and t.pet_id is null
   and t.title_key in ('first_walk_friend','walk_sprout','neighborhood_walker','walk_king','first_memory_record','memory_collector','record_master')
   and t.earned_at<=(select activated_at from title_private.nuri_title_policy_state_v2)), '[]'::jsonb);
 return jsonb_build_object('policyVersion',2,'rows',rows,'catalogCount',332,'generalCount',308);
end;
$$;
create function public.get_nuri_title_vault_v2() returns jsonb
language sql security invoker set search_path='' as $$ select title_private.get_vault_v2(); $$;

create function title_private.home_badge_v2(p_pet uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=title_private.assert_actor_v2(); result jsonb;
begin
 if not exists(select 1 from public.pets p where p.id=p_pet and p.user_id=actor) then
  raise exception using errcode='42501',message='TITLE_PET_SCOPE_INVALID'; end if;
 select jsonb_build_object('titleKey',c.id,'titleName',c.name) into result
 from title_private.nuri_title_awards_v2 a join title_private.nuri_title_catalog_v2 c on c.id=a.title_id
 where a.user_id=actor and a.pet_id=p_pet order by a.earned_at desc,c.id limit 1;
 return result;
end;
$$;
create function public.get_nuri_home_title_v2(p_pet_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select title_private.home_badge_v2(p_pet_id); $$;

create function title_private.remembrance_record_v2(p_memory uuid,p_included boolean default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=title_private.assert_actor_v2(); pet uuid; included boolean;
begin
 select m.pet_id into pet from public.memories m join public.pets p on p.id=m.pet_id and p.user_id=m.user_id
  where m.id=p_memory and m.user_id=actor;
 if pet is null then raise exception using errcode='42501',message='TITLE_RECORD_SCOPE_INVALID'; end if;
 if p_included is true then
  insert into title_private.nuri_remembrance_records_v2(memory_id,user_id,pet_id) values(p_memory,actor,pet)
  on conflict do nothing;
 elsif p_included is false then
  delete from title_private.nuri_remembrance_records_v2 r where r.memory_id=p_memory and r.user_id=actor;
 end if;
 if p_included is not null then perform title_private.refresh_v2(actor,pet); end if;
 select exists(select 1 from title_private.nuri_remembrance_records_v2 r where r.memory_id=p_memory and r.user_id=actor) into included;
 return jsonb_build_object('included',included);
end;
$$;
create function public.manage_nuri_remembrance_record_v2(p_memory_id uuid,p_included boolean default null) returns jsonb
language sql security invoker set search_path='' as $$ select title_private.remembrance_record_v2(p_memory_id,p_included); $$;

create function title_private.refresh_source_v2() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid; pet uuid;
begin
 -- Cascading cleanup and unrelated nested maintenance never create new awards.
 if pg_trigger_depth()>1 then return new; end if;
 actor:=new.user_id;
 if tg_table_name='pets' then
  insert into title_private.nuri_title_pet_dates_v2(pet_id,birth_date,adoption_date)
   values(new.id,new.birth_date,new.adoption_date)
   on conflict(pet_id,observed_at) do update set birth_date=excluded.birth_date,adoption_date=excluded.adoption_date;
  return new;
 elsif tg_table_name in ('posts','comments','user_level_summaries') then
  perform title_private.refresh_v2(actor,null);
  return new;
 elsif tg_table_name='walk_sessions' then
  if new.state<>'ACCEPTED_SERVER' or new.deleted_at is not null then return new; end if;
 end if;
 pet:=new.pet_id;
 perform title_private.refresh_v2(actor,null);
 perform title_private.refresh_v2(actor,pet);
 return new;
end;
$$;

create trigger nuri_titles_v2_memory after insert or update of occurred_at,category,sub_category,image_url,image_urls,metadata,title,content on public.memories
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_photo after insert or update of status on public.memory_images
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_walk after insert or update of state,eligibility,accepted_at,deleted_at on public.walk_sessions
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_weight after insert or update of measured_on on public.pet_weight_logs
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_post after insert or update of content,status,deleted_at,category on public.posts
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_comment after insert or update of content,status,deleted_at on public.comments
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_level after insert or update of level,total_xp on public.user_level_summaries
 for each row execute function title_private.refresh_source_v2();
create trigger nuri_titles_v2_pet_dates after insert or update of birth_date,adoption_date on public.pets
 for each row execute function title_private.refresh_source_v2();

-- Private implementation routines are never a user-callable award API.
revoke all on all functions in schema title_private from public,anon,authenticated,service_role;
grant execute on function title_private.get_vault_v2(),title_private.home_badge_v2(uuid),
 title_private.remembrance_record_v2(uuid,boolean) to authenticated;
revoke all on function public.get_nuri_title_vault_v2(),public.get_nuri_home_title_v2(uuid),
 public.manage_nuri_remembrance_record_v2(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.get_nuri_title_vault_v2(),public.get_nuri_home_title_v2(uuid),
 public.manage_nuri_remembrance_record_v2(uuid,boolean) to authenticated;

-- Preserve the installed pre-v2 vault once, then acquire from verified sources.
-- No original record, old award, user XP, rank exclusion or Walk row is updated.
do $initialize$
declare actor record; pet record;
begin
 for actor in select p.user_id from public.profiles p where not exists(
  select 1 from public.account_deletion_requests d where d.user_id=p.user_id and d.status<>'cancelled'
 ) order by p.user_id loop
  perform title_private.preserve_legacy_v2(actor.user_id);
  perform title_private.refresh_v2(actor.user_id,null);
  for pet in select p.id from public.pets p where p.user_id=actor.user_id order by p.id loop
   perform title_private.refresh_v2(actor.user_id,pet.id);
  end loop;
 end loop;
end;
$initialize$;

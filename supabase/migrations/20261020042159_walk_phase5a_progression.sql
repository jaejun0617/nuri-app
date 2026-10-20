-- Phase5A only. Live distance is derived from sessions, never a mutable counter.
create table public.pet_walk_milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  milestone_key text not null check (milestone_key in ('FIRST_GPS_WALK','10_KM','100_KM')),
  policy_version integer not null check (policy_version=1),
  threshold_m numeric not null check (threshold_m = case milestone_key when 'FIRST_GPS_WALK' then 0 when '10_KM' then 10000 else 100000 end),
  source_session_id uuid references public.walk_sessions(id) on delete set null,
  earned_at timestamptz not null default transaction_timestamp(),
  primary key (user_id,pet_id,milestone_key,policy_version)
);
create index pet_walk_milestones_pet on public.pet_walk_milestones(pet_id);
create index pet_walk_milestones_source on public.pet_walk_milestones(source_session_id);
create index walk_sessions_progression on public.walk_sessions(user_id,pet_id)
  include (accepted_distance_m)
  where state='ACCEPTED_SERVER' and eligibility='PROGRESSION_ELIGIBLE' and deleted_at is null;
alter table public.pet_walk_milestones enable row level security;
revoke all on public.pet_walk_milestones from public,anon,authenticated,service_role;
grant select on public.pet_walk_milestones to authenticated;
create policy pet_walk_milestones_owner_read on public.pet_walk_milestones for select to authenticated
 using (user_id=(select auth.uid()) and (select walk_private.owner_readable_v1())
   and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=(select auth.uid())));

-- Exact policy1 integer exponential/binary search, mirroring Phase1 domain.
-- SUM(bigint) is numeric: do not narrow totals, levels or thresholds to bigint.
create function walk_private.progression_snapshot_v1(distance_m numeric,eligible_count numeric)
returns jsonb language plpgsql immutable set search_path=pg_catalog as $$
declare low numeric:=1; high numeric:=2; middle numeric; threshold numeric; next_threshold numeric;
begin
 if distance_m is null or eligible_count is null
   or distance_m::text in ('NaN','Infinity','-Infinity')
   or eligible_count::text in ('NaN','Infinity','-Infinity')
   or distance_m<0 or eligible_count<0
   or distance_m<>trunc(distance_m) or eligible_count<>trunc(eligible_count) then
   raise exception using errcode='22023',message='WALK_INVALID_DISTANCE';
 end if;
 distance_m:=trunc(distance_m);eligible_count:=trunc(eligible_count);
 while 500*high*(high-1)<=distance_m loop high:=high*2;end loop;
 while high-low>1 loop
   middle:=trunc((low+high)/2);
   if 500*middle*(middle-1)<=distance_m then low:=middle;else high:=middle;end if;
 end loop;
 threshold:=500*low*(low-1);next_threshold:=500*(low+1)*low;
 return jsonb_build_object('policyVersion',1,'lifetimeDistanceM',distance_m::text,
   'eligibleSessionCount',eligible_count::text,'level',low::text,'thresholdM',threshold::text,
   'nextThresholdM',next_threshold::text,
   'progress',jsonb_build_object('numeratorM',(distance_m-threshold)::text,
     'denominatorM',(next_threshold-threshold)::text),
   'distanceToNextLevelM',(next_threshold-distance_m)::text);
end $$;
revoke all on function walk_private.progression_snapshot_v1(numeric,numeric) from public,anon,authenticated,service_role;

-- Runs in the SAME finish transaction under the SAME cross-device owner lock.
-- Deletions never erase earned history; read RPC always recalculates live level.
create function walk_private.earn_walk_milestones_v1() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare distance_m numeric; eligible_count numeric; candidate record;
begin
 if new.state<>'ACCEPTED_SERVER' or new.eligibility is distinct from 'PROGRESSION_ELIGIBLE'
   or new.deleted_at is not null then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('nuri-walk-owner:'||new.user_id::text,0));
 select coalesce(sum(s.accepted_distance_m),0),count(*)::numeric into distance_m,eligible_count
 from public.walk_sessions s where s.user_id=new.user_id and s.pet_id=new.pet_id
   and s.state='ACCEPTED_SERVER' and s.eligibility='PROGRESSION_ELIGIBLE' and s.deleted_at is null;
 for candidate in select * from (values
   ('FIRST_GPS_WALK'::text,0::numeric,eligible_count>0),
   ('10_KM'::text,10000::numeric,distance_m>=10000),
   ('100_KM'::text,100000::numeric,distance_m>=100000)
 ) as candidates(key,threshold,qualified) where qualified loop
   insert into public.pet_walk_milestones(user_id,pet_id,milestone_key,policy_version,threshold_m,source_session_id)
   values(new.user_id,new.pet_id,candidate.key,1,candidate.threshold,new.id)
   on conflict (user_id,pet_id,milestone_key,policy_version) do nothing;
 end loop;
 return new;
end $$;
revoke all on function walk_private.earn_walk_milestones_v1() from public,anon,authenticated,service_role;
create trigger walk_sessions_earn_milestones
 after insert or update of state,eligibility,accepted_distance_m,deleted_at on public.walk_sessions
 for each row execute function walk_private.earn_walk_milestones_v1();

-- Separate versioned read contract: frozen Native finish receipt stays unchanged.
create function public.get_pet_walk_progression_v1(p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid; distance_m numeric; eligible_count numeric; history jsonb;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 select coalesce(sum(s.accepted_distance_m),0),count(*)::numeric into distance_m,eligible_count
 from public.walk_sessions s where s.user_id=actor and s.pet_id=p_pet_id
   and s.state='ACCEPTED_SERVER' and s.eligibility='PROGRESSION_ELIGIBLE' and s.deleted_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('key',m.milestone_key,'policyVersion',m.policy_version,
   'thresholdM',m.threshold_m::text,'earnedAt',walk_private.iso_v1(m.earned_at),
   'sourceSessionId',m.source_session_id) order by m.threshold_m,m.milestone_key),'[]'::jsonb)
 into history from public.pet_walk_milestones m where m.user_id=actor and m.pet_id=p_pet_id;
 return walk_private.progression_snapshot_v1(distance_m,eligible_count)
   ||jsonb_build_object('petId',p_pet_id,'milestones',history);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm in ('WALK_OWNER_MISMATCH','WALK_INVALID_IDENTIFIER','WALK_INVALID_DISTANCE') then
   raise exception using errcode=sqlstate,message='Walk progression request could not be completed',
     detail=jsonb_build_object('walkErrorVersion',1,'walkCode',sqlerrm)::text;
 end if;
 raise;
end $$;
revoke all on function public.get_pet_walk_progression_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_pet_walk_progression_v1(uuid) to authenticated;

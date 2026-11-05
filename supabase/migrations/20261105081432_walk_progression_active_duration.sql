begin;

-- Read-only additive field; distance eligibility and earned milestone history
-- retain their existing policy. Activity time includes completed quality-excluded
-- walks too, but never deleted/pending sessions or time spent paused.
create or replace function public.get_pet_walk_progression_v1(p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid; distance_m numeric; eligible_count numeric; duration_ms numeric; history jsonb;
begin
 actor:=walk_private.actor_v1(p_pet_id);
 select coalesce(sum(s.accepted_distance_m) filter(where s.eligibility='PROGRESSION_ELIGIBLE'),0),
   count(*) filter(where s.eligibility='PROGRESSION_ELIGIBLE')::numeric,
   coalesce(sum(s.active_duration_ms),0)
 into distance_m,eligible_count,duration_ms
 from public.walk_sessions s where s.user_id=actor and s.pet_id=p_pet_id
   and s.state='ACCEPTED_SERVER' and s.deleted_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('key',m.milestone_key,'policyVersion',m.policy_version,
   'thresholdM',m.threshold_m::text,'earnedAt',walk_private.iso_v1(m.earned_at),
   'sourceSessionId',m.source_session_id) order by m.threshold_m,m.milestone_key),'[]'::jsonb)
 into history from public.pet_walk_milestones m where m.user_id=actor and m.pet_id=p_pet_id;
 return walk_private.progression_snapshot_v1(distance_m,eligible_count)
   ||jsonb_build_object('petId',p_pet_id,'milestones',history,'lifetimeActiveDurationMs',duration_ms::text);
exception when sqlstate '42501' or sqlstate '22023' then
 if sqlerrm in ('WALK_OWNER_MISMATCH','WALK_INVALID_IDENTIFIER','WALK_INVALID_DISTANCE') then
   raise exception using errcode=sqlstate,message='Walk progression request could not be completed',
     detail=jsonb_build_object('walkErrorVersion',1,'walkCode',sqlerrm)::text;
 end if;
 raise;
end $$;

commit;

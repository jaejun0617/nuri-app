-- Forward correction after adversarial runtime counterexample; no prior rewrite.
create function walk_private.owner_readable_v1() returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now()))
  and not exists(select 1 from public.account_deletion_requests r where r.user_id=auth.uid()
    and r.status not in ('cancelled','completed','completed_with_cleanup_pending'))
$$;
revoke all on function walk_private.owner_readable_v1() from public,anon,authenticated,service_role;
-- Stored RLS expression can invoke this identity-only helper; schema stays
-- unexposed/no client USAGE, so it is not a Data API RPC or arbitrary-ID oracle.
grant execute on function walk_private.owner_readable_v1() to authenticated;
alter policy walk_sessions_owner_read on public.walk_sessions
  using (user_id=(select auth.uid()) and (select walk_private.owner_readable_v1()));

create or replace function public.finish_walk_v1(p_payload jsonb,p_payload_digest text) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid; parsed jsonb; p jsonb; q jsonb; s public.walk_sessions;
  st timestamptz; en timestamptz; eligible boolean;
begin
  parsed := walk_private.parse_finish_v1(p_payload); p := parsed->'payload'; q := p->'qualitySummary';
  actor := walk_private.actor_v1((p->>'petId')::uuid);
  if p_payload_digest is null or p_payload_digest is distinct from parsed->>'digest' then
    raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT';
  end if;
  select * into s from public.walk_sessions where user_id=actor and client_session_id=(p->>'clientSessionId')::uuid;
  if not found then raise exception using errcode='22023', message='WALK_RESERVATION_REQUIRED'; end if;
  if s.pet_id <> (p->>'petId')::uuid then raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT'; end if;
  if s.state in ('DELETED','NOT_ACCEPTED_FINAL') then
    raise exception using errcode='22023', message='WALK_SESSION_DELETED';
  end if;
  if s.state <> 'ACTIVE' then
    if s.payload_digest <> p_payload_digest then raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT'; end if;
    return walk_private.receipt_v1(s);
  end if;
  st := walk_private.timestamp_v1(p->>'startedAt'); en := walk_private.timestamp_v1(p->>'endedAt');
  if exists (select 1 from public.walk_sessions w where w.user_id=actor and w.state='ACCEPTED_SERVER'
      and w.started_at < en and st < w.ended_at) then
    update public.walk_sessions set state='REJECTED_SERVER',payload_digest=p_payload_digest,
      rejection_code='WALK_OVERLAP_CONFLICT' where id=s.id returning * into s;
    return walk_private.receipt_v1(s);
  end if;
  -- Reuse WalkDistancePolicyV1 candidate bounds; no new GPS filter/calibration.
  -- measuredDistanceM on this wire is the filtered accepted Native proposal.
  -- The digest is NOT GPS attestation. Legacy QA has no product reservation.
  eligible := not (q->>'mockLocationObserved')::boolean
    and (q->>'acceptedFixCount')::integer >= 10
    and (q->>'totalFixCount')::integer <= 200000
    and (p->>'measuredDistanceM')::bigint between 50 and 10000000
    and (p->>'activeDurationMs')::bigint >= 60000
    and (q->>'segmentCount')::integer > 0
    and ((q->>'rejectedAccuracyCount')::bigint + (q->>'rejectedTimestampCount')::bigint
      + (q->>'rejectedDuplicateCount')::bigint + (q->>'rejectedJumpCount')::bigint
      + (q->>'rejectedSpeedCount')::bigint) * 2 <= (q->>'totalFixCount')::bigint
    and (q->>'gpsGapDurationMs')::numeric * 10 <= (p->>'activeDurationMs')::numeric * 3
    and (q->>'maxGapDurationMs')::bigint <= 120000
    -- Existing Algorithm1: <=8.5m/s plus <=22.5m accuracy uncertainty per
    -- credited edge. Seeds add no distance. Allow <1ms per edge and one
    -- final integer-meter rounding unit, using exact numeric arithmetic.
    and (p->>'measuredDistanceM')::numeric * 2000 <=
      ((p->>'activeDurationMs')::numeric + greatest(0,(q->>'acceptedFixCount')::numeric-(q->>'segmentCount')::numeric)) * 17
      + greatest(0,(q->>'acceptedFixCount')::numeric-(q->>'segmentCount')::numeric) * 45000 + 2000;
  update public.walk_sessions set state='ACCEPTED_SERVER',payload_digest=p_payload_digest,
    started_at=st,ended_at=en,measured_duration_ms=(p->>'measuredDurationMs')::bigint,
    active_duration_ms=(p->>'activeDurationMs')::bigint,measured_distance_m=(p->>'measuredDistanceM')::bigint,
    accepted_distance_m=case when eligible then (p->>'measuredDistanceM')::bigint else 0 end,
    eligibility=case when eligible then 'PROGRESSION_ELIGIBLE' else 'PROGRESSION_INELIGIBLE_QUALITY' end,
    quality_summary=q,payload_version=1,algorithm_version=1,quality_schema_version=1,
    route_backup_choice=p->>'routeBackupChoice',route_revision=0,accepted_at=transaction_timestamp()
    where id=s.id returning * into s;
  return walk_private.receipt_v1(s);
end $$;

create or replace function public.get_walk_sessions_v1(p_client_session_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null or not walk_private.owner_readable_v1() then
    raise exception using errcode='42501', message='WALK_OWNER_MISMATCH';
  end if;
  if p_client_session_ids is null or cardinality(p_client_session_ids) > 100
    or array_position(p_client_session_ids,null) is not null then
    raise exception using errcode='22023', message='WALK_INVALID_PAYLOAD';
  end if;
  select coalesce(jsonb_agg(case when s.id is null then
      jsonb_build_object('clientSessionId',r.id,'state','NOT_FOUND')
    else walk_private.receipt_v1(s) end order by r.ordinality),'[]'::jsonb)
  into result from unnest(p_client_session_ids) with ordinality r(id,ordinality)
  left join public.walk_sessions s on s.user_id=actor and s.client_session_id=r.id;
  return result;
end $$;

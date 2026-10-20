-- Phase 4 only: private summaries/receipts. No route coordinates, Memory or XP writes.
create schema walk_private;
revoke all on schema walk_private from public, anon, authenticated, service_role;

create table public.walk_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  client_session_id uuid not null,
  state text not null check (state in ('ACTIVE','ACCEPTED_SERVER','REJECTED_SERVER','NOT_ACCEPTED_FINAL','DELETED')),
  payload_digest text check (payload_digest ~ '^[0-9a-f]{64}$'),
  started_at timestamptz,
  ended_at timestamptz,
  measured_duration_ms bigint,
  active_duration_ms bigint,
  measured_distance_m bigint,
  accepted_distance_m bigint,
  eligibility text check (eligibility in ('PROGRESSION_ELIGIBLE','PROGRESSION_INELIGIBLE_QUALITY')),
  quality_summary jsonb,
  payload_version integer,
  algorithm_version integer,
  quality_schema_version integer,
  route_backup_choice text check (route_backup_choice in ('LOCAL_ONLY','PRIVATE_BACKUP')),
  route_revision bigint,
  route_deleted_at timestamptz,
  accepted_at timestamptz,
  rejection_code text,
  deleted_at timestamptz,
  record_claim_exists boolean not null default false,
  unique(user_id, client_session_id),
  check (measured_duration_ms >= 0 and active_duration_ms >= 0 and measured_distance_m >= 0 and accepted_distance_m >= 0),
  check (active_duration_ms <= measured_duration_ms and accepted_distance_m <= measured_distance_m),
  check (state <> 'ACCEPTED_SERVER' or (
    payload_digest is not null and started_at is not null and ended_at > started_at
    and measured_duration_ms > 0 and active_duration_ms is not null
    and measured_distance_m is not null and accepted_distance_m is not null
    and eligibility is not null and quality_summary is not null and accepted_at is not null)),
  check (state not in ('DELETED','NOT_ACCEPTED_FINAL') or (
    started_at is null and ended_at is null and measured_duration_ms is null
    and active_duration_ms is null and measured_distance_m is null and accepted_distance_m is null
    and eligibility is null and quality_summary is null and accepted_at is null
    and payload_version is null and algorithm_version is null and quality_schema_version is null
    and route_backup_choice is null and route_revision is null and route_deleted_at is null
    and rejection_code is null and deleted_at is not null))
);
create unique index walk_one_active_per_user on public.walk_sessions(user_id) where state = 'ACTIVE';
create index walk_sessions_pet_id on public.walk_sessions(pet_id);
create index walk_sessions_overlap on public.walk_sessions(user_id, started_at, ended_at)
  where state = 'ACCEPTED_SERVER';
alter table public.walk_sessions enable row level security;
revoke all on public.walk_sessions from public, anon, authenticated, service_role;
grant select on public.walk_sessions to authenticated;
create policy walk_sessions_owner_read on public.walk_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- Helpers are in an unexposed schema and have no client execution privilege.
create function walk_private.uuid_v1(v text) returns uuid language plpgsql immutable
set search_path = pg_catalog as $$
begin
  if v is null or v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode='22023', message='WALK_INVALID_IDENTIFIER';
  end if;
  return v::uuid;
end $$;

create function walk_private.integer_v1(v jsonb, unit_code text) returns bigint language plpgsql immutable
set search_path = pg_catalog as $$
declare s text; n numeric;
begin
  if jsonb_typeof(v) is distinct from 'string' then
    raise exception using errcode='22023', message=unit_code;
  end if;
  s := v #>> '{}';
  if length(s) > 256 then raise exception using errcode='22023', message='WALK_INTEGER_OUT_OF_RANGE'; end if;
  if s !~ '^[0-9]+$' then raise exception using errcode='22023', message=unit_code; end if;
  n := s::numeric;
  if n > 9223372036854775807 then raise exception using errcode='22023', message='WALK_INTEGER_OUT_OF_RANGE'; end if;
  return n::bigint;
end $$;

create function walk_private.timestamp_v1(v text) returns timestamptz language plpgsql immutable
set search_path = pg_catalog as $$
declare m text[]; t timestamp; off_m integer := 0; result timestamptz;
begin
  m := regexp_match(v, '^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$');
  if m is null or m[1]::int < 100 or m[4]::int > 23 or m[5]::int > 59 or m[6]::int > 59 then
    raise exception using errcode='22023', message='WALK_INVALID_TIMESTAMP_ORDER';
  end if;
  t := make_date(m[1]::int,m[2]::int,m[3]::int)::timestamp
    + make_interval(hours=>m[4]::int, mins=>m[5]::int, secs=>m[6]::int)
    + (coalesce(rpad(m[7],3,'0'),'0')::int * interval '1 millisecond');
  if m[8] <> 'Z' then
    if substring(m[8],2,2)::int > 23 or substring(m[8],5,2)::int > 59 then
      raise exception using errcode='22023', message='WALK_INVALID_TIMESTAMP_ORDER';
    end if;
    off_m := (substring(m[8],2,2)::int * 60 + substring(m[8],5,2)::int)
      * case left(m[8],1) when '-' then -1 else 1 end;
  end if;
  result := (t - make_interval(mins=>off_m)) at time zone 'UTC';
  if extract(year from result at time zone 'UTC') not between 1 and 9999 then
    raise exception using errcode='22023', message='WALK_INVALID_TIMESTAMP_ORDER';
  end if;
  return result;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception using errcode='22023', message='WALK_INVALID_TIMESTAMP_ORDER';
end $$;

create function walk_private.iso_v1(v timestamptz) returns text language sql immutable
set search_path = pg_catalog as $$
  select to_char(v at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

create function walk_private.parse_finish_v1(p jsonb) returns jsonb language plpgsql immutable
set search_path = pg_catalog as $$
declare
  keys text[] := array['payloadVersion','clientSessionId','petId','startedAt','endedAt',
    'measuredDurationMs','activeDurationMs','measuredDistanceM','algorithmVersion',
    'qualitySchemaVersion','qualitySummary','routeBackupChoice'];
  qkeys text[] := array['schemaVersion','totalFixCount','acceptedFixCount','rejectedAccuracyCount',
    'rejectedTimestampCount','rejectedDuplicateCount','rejectedJumpCount','rejectedSpeedCount',
    'stationarySuppressedCount','segmentCount','gpsGapDurationMs','maxGapDurationMs','mockLocationObserved'];
  counts text[] := array['totalFixCount','acceptedFixCount','rejectedAccuracyCount','rejectedTimestampCount',
    'rejectedDuplicateCount','rejectedJumpCount','rejectedSpeedCount','stationarySuppressedCount','segmentCount'];
  q jsonb; k text; n numeric; terminal bigint := 0; normalized jsonb;
  st timestamptz; en timestamptz; duration bigint; active bigint; distance bigint; gap bigint; maxgap bigint;
  qc text := ''; canonical text := '';
begin
  if p is null or jsonb_typeof(p) <> 'object' or not (p ?& keys)
     or (select count(*) from jsonb_object_keys(p)) <> cardinality(keys) then
    raise exception using errcode='22023', message='WALK_INVALID_PAYLOAD';
  end if;
  if p->'payloadVersion' is distinct from '1'::jsonb then
    raise exception using errcode='22023', message='WALK_UNSUPPORTED_PAYLOAD_VERSION';
  end if;
  if p->'algorithmVersion' is distinct from '1'::jsonb then
    raise exception using errcode='22023', message='WALK_UNSUPPORTED_ALGORITHM_VERSION';
  end if;
  if p->'qualitySchemaVersion' is distinct from '1'::jsonb then
    raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
  end if;
  if p->>'routeBackupChoice' not in ('LOCAL_ONLY','PRIVATE_BACKUP')
     or jsonb_typeof(p->'routeBackupChoice') <> 'string' then
    raise exception using errcode='22023', message='WALK_INVALID_PAYLOAD';
  end if;
  foreach k in array array['clientSessionId','petId','startedAt','endedAt'] loop
    if jsonb_typeof(p->k) is distinct from 'string' then
      raise exception using errcode='22023', message='WALK_INVALID_PAYLOAD';
    end if;
  end loop;
  st := walk_private.timestamp_v1(p->>'startedAt'); en := walk_private.timestamp_v1(p->>'endedAt');
  if en <= st then raise exception using errcode='22023', message='WALK_INVALID_TIMESTAMP_ORDER'; end if;
  duration := walk_private.integer_v1(p->'measuredDurationMs','WALK_INVALID_DURATION');
  active := walk_private.integer_v1(p->'activeDurationMs','WALK_INVALID_DURATION');
  distance := walk_private.integer_v1(p->'measuredDistanceM','WALK_INVALID_DISTANCE');
  if duration = 0 or duration > extract(epoch from (en-st))*1000 or active > duration then
    raise exception using errcode='22023', message='WALK_INVALID_DURATION';
  end if;
  q := p->'qualitySummary';
  if jsonb_typeof(q) is distinct from 'object' or not (q ?& qkeys)
     or (select count(*) from jsonb_object_keys(q)) <> cardinality(qkeys)
     or q->'schemaVersion' is distinct from '1'::jsonb
     or jsonb_typeof(q->'mockLocationObserved') is distinct from 'boolean' then
    raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
  end if;
  q := jsonb_set(q,'{schemaVersion}','1'::jsonb);
  foreach k in array counts loop
    if jsonb_typeof(q->k) is distinct from 'number' then
      raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
    end if;
    n := (q->>k)::numeric;
    if n < 0 or n > 2147483647 or n <> trunc(n) then
      raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
    end if;
    q := jsonb_set(q,array[k],to_jsonb(n::integer));
    if k not in ('totalFixCount','segmentCount') then terminal := terminal + n::bigint; end if;
  end loop;
  begin
    gap := walk_private.integer_v1(q->'gpsGapDurationMs','WALK_INVALID_QUALITY_SUMMARY');
    maxgap := walk_private.integer_v1(q->'maxGapDurationMs','WALK_INVALID_QUALITY_SUMMARY');
  exception when sqlstate '22023' then
    raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
  end;
  if terminal > (q->>'totalFixCount')::bigint
     or (q->>'segmentCount')::bigint > (q->>'acceptedFixCount')::bigint
     or maxgap > gap or gap > duration then
    raise exception using errcode='22023', message='WALK_INVALID_QUALITY_SUMMARY';
  end if;
  q := jsonb_set(jsonb_set(q,'{gpsGapDurationMs}',to_jsonb(gap::text)),'{maxGapDurationMs}',to_jsonb(maxgap::text));
  normalized := jsonb_build_object('payloadVersion',1,
    'clientSessionId',walk_private.uuid_v1(p->>'clientSessionId')::text,
    'petId',walk_private.uuid_v1(p->>'petId')::text,
    'startedAt',walk_private.iso_v1(st),'endedAt',walk_private.iso_v1(en),
    'measuredDurationMs',duration::text,'activeDurationMs',active::text,'measuredDistanceM',distance::text,
    'algorithmVersion',1,'qualitySchemaVersion',1,'qualitySummary',q,'routeBackupChoice',p->>'routeBackupChoice');
  -- jsonb textual output sorts keys and adds spaces; build V1 ordered bytes explicitly.
  foreach k in array qkeys loop qc := qc || case when qc='' then '' else ',' end || to_json(k)::text || ':' || (q->k)::text; end loop;
  foreach k in array keys loop
    canonical := canonical || case when canonical='' then '' else ',' end || to_json(k)::text || ':'
      || case when k='qualitySummary' then '{'||qc||'}' else (normalized->k)::text end;
  end loop;
  canonical := '{'||canonical||'}';
  return jsonb_build_object('payload',normalized,'canonical',canonical,
    'digest',encode(extensions.digest(convert_to(canonical,'UTF8'),'sha256'),'hex'));
end $$;

create function walk_private.actor_v1(p_pet_id uuid) returns uuid language plpgsql volatile
set search_path = public, pg_catalog as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception using errcode='42501', message='WALK_OWNER_MISMATCH'; end if;
  -- One lock key for start, finish, cancel and delete across every pet/device.
  perform pg_advisory_xact_lock(hashtextextended('nuri-walk-owner:'||actor::text,0));
  perform 1 from auth.users u where u.id=actor and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now()) for key share;
  if not found then raise exception using errcode='42501', message='WALK_OWNER_MISMATCH'; end if;
  if exists (select 1 from public.account_deletion_requests r
    where r.user_id=actor and r.status not in ('cancelled','completed','completed_with_cleanup_pending')) then
    raise exception using errcode='42501', message='WALK_OWNER_MISMATCH';
  end if;
  perform 1 from public.pets p where p.id=p_pet_id and p.user_id=actor for share;
  if not found then raise exception using errcode='42501', message='WALK_OWNER_MISMATCH'; end if;
  return actor;
end $$;

create function walk_private.receipt_v1(s public.walk_sessions) returns jsonb language sql stable
set search_path = public, pg_catalog as $$
select jsonb_build_object(
  'clientSessionId',s.client_session_id,'petId',s.pet_id,'state',s.state,
  'payloadDigest',s.payload_digest,'deletedAt',walk_private.iso_v1(s.deleted_at),
  'recordClaimExists',s.record_claim_exists,
  'summary',case when s.state='ACCEPTED_SERVER' then jsonb_build_object(
    'sessionId',s.id,'startedAt',walk_private.iso_v1(s.started_at),'endedAt',walk_private.iso_v1(s.ended_at),
    'measuredDurationMs',s.measured_duration_ms::text,'activeDurationMs',s.active_duration_ms::text,
    'measuredDistanceM',s.measured_distance_m::text,'acceptedDistanceM',s.accepted_distance_m::text,
    'eligibility',s.eligibility,'acceptedAt',walk_private.iso_v1(s.accepted_at),
    'routeBackupChoice',s.route_backup_choice,'routeRevision',s.route_revision::text,
    'routeDeletedAt',walk_private.iso_v1(s.route_deleted_at)
  ) else null end,
  'rejectionCode',s.rejection_code)
$$;

create function public.start_walk_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid; s public.walk_sessions;
begin
  perform walk_private.uuid_v1(p_client_session_id::text); perform walk_private.uuid_v1(p_pet_id::text);
  actor := walk_private.actor_v1(p_pet_id);
  select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id;
  if found then
    if s.pet_id <> p_pet_id then raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT'; end if;
    return walk_private.receipt_v1(s);
  end if;
  if exists (select 1 from public.walk_sessions where user_id=actor and state='ACTIVE') then
    raise exception using errcode='22023', message='WALK_ALREADY_ACTIVE';
  end if;
  insert into public.walk_sessions(user_id,pet_id,client_session_id,state)
    values(actor,p_pet_id,p_client_session_id,'ACTIVE') returning * into s;
  return walk_private.receipt_v1(s);
end $$;

create function public.finish_walk_v1(p_payload jsonb,p_payload_digest text) returns jsonb
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
    and (q->>'maxGapDurationMs')::bigint <= 120000;
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

-- Cancellation writes a durable final absence receipt under the SAME owner lock.
-- An already accepted finish wins; caller must explicitly delete that session.
create function public.cancel_walk_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid; s public.walk_sessions;
begin
  perform walk_private.uuid_v1(p_client_session_id::text); actor := walk_private.actor_v1(p_pet_id);
  select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id;
  if not found then
    insert into public.walk_sessions(user_id,pet_id,client_session_id,state,deleted_at)
      values(actor,p_pet_id,p_client_session_id,'NOT_ACCEPTED_FINAL',transaction_timestamp()) returning * into s;
  elsif s.pet_id <> p_pet_id then
    raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT';
  elsif s.state='ACTIVE' then
    update public.walk_sessions set state='NOT_ACCEPTED_FINAL',deleted_at=transaction_timestamp()
      where id=s.id returning * into s;
  end if;
  return walk_private.receipt_v1(s);
end $$;

create function public.delete_walk_session_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid; s public.walk_sessions;
begin
  actor := walk_private.actor_v1(p_pet_id);
  select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id;
  if not found then return public.cancel_walk_v1(p_client_session_id,p_pet_id); end if;
  if s.pet_id <> p_pet_id then raise exception using errcode='22023', message='WALK_PAYLOAD_CONFLICT'; end if;
  if s.state in ('DELETED','NOT_ACCEPTED_FINAL') then return walk_private.receipt_v1(s); end if;
  update public.walk_sessions set state='DELETED',deleted_at=transaction_timestamp(),
    started_at=null,ended_at=null,measured_duration_ms=null,active_duration_ms=null,
    measured_distance_m=null,accepted_distance_m=null,eligibility=null,quality_summary=null,
    payload_version=null,algorithm_version=null,quality_schema_version=null,
    route_backup_choice=null,route_revision=null,route_deleted_at=null,accepted_at=null,rejection_code=null
    where id=s.id returning * into s;
  return walk_private.receipt_v1(s);
end $$;

create function public.delete_walk_route_v1(p_client_session_id uuid,p_pet_id uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid; s public.walk_sessions;
begin
  actor := walk_private.actor_v1(p_pet_id);
  select * into s from public.walk_sessions where user_id=actor and client_session_id=p_client_session_id;
  if not found or s.pet_id <> p_pet_id then raise exception using errcode='42501', message='WALK_OWNER_MISMATCH'; end if;
  if s.state='ACCEPTED_SERVER' and s.route_deleted_at is null then
    update public.walk_sessions set route_revision=route_revision+1,route_deleted_at=transaction_timestamp()
      where id=s.id returning * into s;
  end if;
  return walk_private.receipt_v1(s);
end $$;

create function public.get_walk_sessions_v1(p_client_session_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null or not exists(select 1 from auth.users where id=actor and deleted_at is null) then
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

revoke all on all functions in schema walk_private from public, anon, authenticated, service_role;
revoke all on function public.start_walk_v1(uuid,uuid),
  public.finish_walk_v1(jsonb,text), public.cancel_walk_v1(uuid,uuid),
  public.delete_walk_session_v1(uuid,uuid), public.delete_walk_route_v1(uuid,uuid),
  public.get_walk_sessions_v1(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.start_walk_v1(uuid,uuid),
  public.finish_walk_v1(jsonb,text), public.cancel_walk_v1(uuid,uuid),
  public.delete_walk_session_v1(uuid,uuid), public.delete_walk_route_v1(uuid,uuid),
  public.get_walk_sessions_v1(uuid[]) to authenticated;

-- Walk-owned proof only. New FK actions add failure/lock dependencies to
-- referenced Auth/Pet deletion. No global deletion function/policy is replaced.
create table walk_private.final_deletion_receipts (
  request_id uuid primary key,
  purpose text not null check (purpose in ('ACCOUNT_FINAL','PET_FINAL')),
  owner_ref uuid references auth.users(id) on delete set null,
  pet_ref uuid references public.pets(id) on delete set null,
  owner_binding bytea check (owner_binding is null or octet_length(owner_binding)=32),
  pet_binding bytea,
  resource_binding text not null check (resource_binding ~ '^[0-9a-f]{64}$'),
  capability_digest bytea not null check (octet_length(capability_digest)=32),
  state text not null default 'PENDING' check (state in ('PENDING','FINAL','ACKNOWLEDGED')),
  registered_at timestamptz not null default transaction_timestamp(),
  confirmed_at timestamptz,
  acknowledged_at timestamptz,
  check ((purpose='ACCOUNT_FINAL' and pet_ref is null and pet_binding is null)
    or (purpose='PET_FINAL' and owner_ref is null and ((pet_binding is not null and octet_length(pet_binding)=32) or (state='ACKNOWLEDGED' and pet_binding is null)))),
  check ((state='ACKNOWLEDGED' and owner_binding is null and pet_binding is null)
    or(state<>'ACKNOWLEDGED' and owner_binding is not null)),
  check ((state='PENDING' and confirmed_at is null and acknowledged_at is null
    and ((purpose='ACCOUNT_FINAL' and owner_ref is not null) or (purpose='PET_FINAL' and pet_ref is not null)))
    or (state='FINAL' and confirmed_at is not null and acknowledged_at is null and owner_ref is null and pet_ref is null)
    or (state='ACKNOWLEDGED' and confirmed_at is not null and acknowledged_at is not null and owner_ref is null and pet_ref is null))
);
alter table walk_private.final_deletion_receipts enable row level security;
revoke all on walk_private.final_deletion_receipts from public,anon,authenticated,service_role;
create index walk_final_delete_owner_state on walk_private.final_deletion_receipts(owner_binding,state);
create index walk_final_delete_auth_ref on walk_private.final_deletion_receipts(owner_ref) where owner_ref is not null;
create index walk_final_delete_pet_ref on walk_private.final_deletion_receipts(pet_ref) where pet_ref is not null;
-- Independent devices may watch the same resource. Owner total64 bounds
-- unacknowledged fanout without an abandoned-watch resource monopoly.

create function walk_private.final_delete_fail_v1(p_code text) returns void
language plpgsql set search_path=public,pg_catalog as $$
begin
  raise exception using errcode=case when p_code='WALK_DELETE_INPUT_INVALID' then '22023' else '42501' end,
    message='Walk deletion receipt request could not be completed',
    detail=jsonb_build_object('walkErrorVersion',1,'walkCode',p_code)::text;
end $$;

create function walk_private.final_delete_digest_v1(p_request uuid,p_purpose text,p_binding text,p_secret text)
returns bytea language sql immutable set search_path=public,pg_catalog as $$
  select extensions.hmac(convert_to(p_request::text||'|'||p_purpose||'|'||p_binding,'UTF8'),decode(p_secret,'hex'),'sha256')
$$;

-- Only the referencing Walk table gets a custom trigger. RI SET NULL fires
-- this trigger after actual parent removal, within that same transaction.
create function walk_private.finalize_deletion_receipt_v1() returns trigger
language plpgsql security definer set search_path=public,pg_catalog as $$
declare became_final boolean;
begin
  if row(new.request_id,new.purpose,new.resource_binding,new.capability_digest,new.registered_at)
    is distinct from row(old.request_id,old.purpose,old.resource_binding,old.capability_digest,old.registered_at) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_IMMUTABLE');
  end if;
  if row(new.owner_binding,new.pet_binding) is distinct from row(old.owner_binding,old.pet_binding)
    and not(old.state='FINAL' and new.state='ACKNOWLEDGED' and new.owner_binding is null and new.pet_binding is null) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_IMMUTABLE');
  end if;
  if (new.owner_ref is distinct from old.owner_ref and not(old.owner_ref is not null and new.owner_ref is null))
    or (new.pet_ref is distinct from old.pet_ref and not(old.pet_ref is not null and new.pet_ref is null)) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_IMMUTABLE');
  end if;
  if old.owner_ref is not null and new.owner_ref is null and exists(select 1 from auth.users where id=old.owner_ref) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_NOT_FINAL');
  end if;
  if old.pet_ref is not null and new.pet_ref is null and exists(select 1 from public.pets where id=old.pet_ref) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_NOT_FINAL');
  end if;
  became_final := (old.purpose='ACCOUNT_FINAL' and old.owner_ref is not null and new.owner_ref is null)
    or (old.purpose='PET_FINAL' and old.pet_ref is not null and new.pet_ref is null);
  if became_final and old.state='PENDING' then
    new.state:='FINAL'; new.confirmed_at:=transaction_timestamp(); new.acknowledged_at:=null;
  elsif old.state='FINAL' and new.state='ACKNOWLEDGED' and new.acknowledged_at is not null
    and new.confirmed_at=old.confirmed_at then
    null; -- ACK only, never a manual FINAL transition.
  elsif row(new.state,new.confirmed_at,new.acknowledged_at) is distinct from row(old.state,old.confirmed_at,old.acknowledged_at) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_NOT_FINAL');
  end if;
  return new;
end $$;
create trigger walk_finalize_deletion_receipt before update on walk_private.final_deletion_receipts
for each row execute function walk_private.finalize_deletion_receipt_v1();

create function walk_private.final_delete_projection_v1(r walk_private.final_deletion_receipts) returns jsonb
language sql stable set search_path=public,pg_catalog as $$
  select jsonb_build_object('version',1,'requestId',r.request_id,'purpose',r.purpose,
    'resourceBinding',r.resource_binding,'state',r.state,
    'registeredAt',walk_private.iso_v1(r.registered_at),
    'confirmedAt',case when r.confirmed_at is null then null else walk_private.iso_v1(r.confirmed_at) end,
    'acknowledgedAt',case when r.acknowledged_at is null then null else walk_private.iso_v1(r.acknowledged_at) end)
$$;

create function public.prepare_walk_final_deletion_v1(
  p_request_id uuid,p_purpose text,p_pet_id uuid,p_capability text
) returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare actor uuid:=auth.uid(); gen timestamptz; ob bytea; pb bytea; rb text; cd bytea;
  r walk_private.final_deletion_receipts;
begin
  if p_request_id is null or p_purpose is null or p_purpose not in ('ACCOUNT_FINAL','PET_FINAL')
    or p_capability is null or p_capability !~ '^[0-9a-f]{64}$'
    or (p_purpose='ACCOUNT_FINAL' and p_pet_id is not null) or(p_purpose='PET_FINAL' and p_pet_id is null) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_INPUT_INVALID');
  end if;
  if actor is null or not exists(select 1 from auth.users where id=actor and deleted_at is null) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_OWNER_UNAVAILABLE');
  end if;
  -- PET holds only its Pet row: no owner FK/owner row lock that could invert
  -- the existing account finalizer's pets-before-Auth deletion order.
  if p_purpose='PET_FINAL' then
    select created_at into gen from public.pets where id=p_pet_id and user_id=actor for key share;
    if not found then perform walk_private.final_delete_fail_v1('WALK_DELETE_TARGET_UNAVAILABLE');end if;
    pb:=extensions.digest(convert_to(p_pet_id::text,'UTF8'),'sha256');
  else
    select created_at into gen from auth.users where id=actor and deleted_at is null for key share;
    if not found then perform walk_private.final_delete_fail_v1('WALK_DELETE_OWNER_UNAVAILABLE');end if;
  end if;
  if gen is null then perform walk_private.final_delete_fail_v1('WALK_DELETE_GENERATION_UNAVAILABLE');end if;
  ob:=extensions.digest(convert_to(actor::text,'UTF8'),'sha256');
  rb:=encode(extensions.digest(convert_to(actor::text||'|'||p_purpose||'|'||coalesce(p_pet_id::text,'')||'|'
    ||to_char(gen at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'),'UTF8'),'sha256'),'hex');
  cd:=walk_private.final_delete_digest_v1(p_request_id,p_purpose,rb,p_capability);
  -- Resource -> owner-registration lock -> receipt; helpers never lock back
  -- from a receipt to Auth/Pet. This lock controls fanout, not deletion.
  perform pg_advisory_xact_lock(hashtextextended('walk-delete-register:'||actor::text,0));
  select * into r from walk_private.final_deletion_receipts where request_id=p_request_id;
  if found then
    if (r.owner_binding is not null and r.owner_binding<>ob) or r.purpose<>p_purpose or r.resource_binding<>rb
      or r.capability_digest<>cd or (r.state<>'ACKNOWLEDGED' and r.pet_binding is distinct from pb) then
      perform walk_private.final_delete_fail_v1('WALK_DELETE_REQUEST_CONFLICT');
    end if;
    if r.state<>'PENDING' then perform walk_private.final_delete_fail_v1('WALK_DELETE_REQUEST_STALE');end if;
    return walk_private.final_delete_projection_v1(r);
  end if;
  if (select count(*) from walk_private.final_deletion_receipts where owner_binding=ob and state<>'ACKNOWLEDGED')>=64 then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_LIMIT');
  end if;
  insert into walk_private.final_deletion_receipts(request_id,purpose,owner_ref,pet_ref,owner_binding,pet_binding,resource_binding,capability_digest)
    values(p_request_id,p_purpose,case when p_purpose='ACCOUNT_FINAL' then actor end,
      case when p_purpose='PET_FINAL' then p_pet_id end,ob,pb,rb,cd) returning * into r;
  return walk_private.final_delete_projection_v1(r);
exception when unique_violation then
  perform walk_private.final_delete_fail_v1('WALK_DELETE_REQUEST_CONFLICT');
end $$;

create function public.recover_walk_final_deletion_v1(p_request_id uuid,p_purpose text,p_capability text)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare r walk_private.final_deletion_receipts;
begin
  -- Uniform denial: missing/foreign/forged/malformed proof is never FINAL.
  if p_request_id is null or p_purpose is null or p_purpose not in ('ACCOUNT_FINAL','PET_FINAL')
    or p_capability is null or p_capability !~ '^[0-9a-f]{64}$' then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_UNAVAILABLE');
  end if;
  select * into r from walk_private.final_deletion_receipts where request_id=p_request_id;
  if not found then perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_UNAVAILABLE');end if;
  if r.purpose<>p_purpose or r.capability_digest<>walk_private.final_delete_digest_v1(p_request_id,p_purpose,r.resource_binding,p_capability) then
    perform walk_private.final_delete_fail_v1('WALK_DELETE_RECEIPT_UNAVAILABLE');
  end if;
  return walk_private.final_delete_projection_v1(r);
end $$;

create function public.ack_walk_final_deletion_v1(p_request_id uuid,p_purpose text,p_capability text)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare r walk_private.final_deletion_receipts; result jsonb;
begin
  -- Capability authorizes only receipt ACK, never deleting an Auth/Pet/route.
  result:=public.recover_walk_final_deletion_v1(p_request_id,p_purpose,p_capability);
  select * into r from walk_private.final_deletion_receipts where request_id=p_request_id for update;
  if r.state='PENDING' then perform walk_private.final_delete_fail_v1('WALK_DELETE_NOT_FINAL');end if;
  if r.state='FINAL' then
    update walk_private.final_deletion_receipts set state='ACKNOWLEDGED',acknowledged_at=transaction_timestamp(),owner_binding=null,pet_binding=null
      where request_id=p_request_id returning * into r;
  end if;
  -- Minimal hashed tombstone prevents request-ID rebinding forever. No raw
  -- entity refs survive FINAL; no route/media/measurement exists in this table.
  return walk_private.final_delete_projection_v1(r);
end $$;

revoke all on function walk_private.final_delete_fail_v1(text) from public,anon,authenticated,service_role;
revoke all on function walk_private.final_delete_digest_v1(uuid,text,text,text) from public,anon,authenticated,service_role;
revoke all on function walk_private.finalize_deletion_receipt_v1() from public,anon,authenticated,service_role;
revoke all on function walk_private.final_delete_projection_v1(walk_private.final_deletion_receipts) from public,anon,authenticated,service_role;
revoke all on function public.prepare_walk_final_deletion_v1(uuid,text,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.recover_walk_final_deletion_v1(uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.ack_walk_final_deletion_v1(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_walk_final_deletion_v1(uuid,text,uuid,text) to authenticated;
grant execute on function public.recover_walk_final_deletion_v1(uuid,text,text) to anon,authenticated;
grant execute on function public.ack_walk_final_deletion_v1(uuid,text,text) to anon,authenticated;

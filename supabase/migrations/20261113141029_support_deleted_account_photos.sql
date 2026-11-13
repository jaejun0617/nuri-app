begin;

-- Survives Auth/FK deletion; captures IDs, not message bodies or credentials.
create table support_private.deleted_account_photos (
  photo_id uuid primary key,
  owner_id uuid not null,
  state text not null default 'pending' check(state in ('pending','leased','completed','failed')),
  lease uuid,
  lease_until timestamptz,
  attempts integer not null default 0 check(attempts between 0 and 5),
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
alter table support_private.deleted_account_photos enable row level security;
revoke all on support_private.deleted_account_photos from public,anon,authenticated,service_role;
create index deleted_account_photos_pending on support_private.deleted_account_photos(created_at)
  where state in ('pending','leased');

create function support_private.capture_deleted_account_photos() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into support_private.deleted_account_photos(photo_id,owner_id)
    select id,owner_id from support_private.ticket_photos where owner_id=old.id
    on conflict(photo_id) do nothing;
  return old;
end $$;
create trigger support_capture_deleted_account_photos before delete on auth.users
  for each row execute function support_private.capture_deleted_account_photos();

create function support_private.reject_deleted_photo_id() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select from support_private.deleted_account_photos where photo_id=new.id) then
    raise sqlstate 'PT409' using message='SUPPORT_REQUEST_CONFLICT';
  end if;
  return new;
end $$;
create trigger support_reject_deleted_photo_id before insert on support_private.ticket_photos
  for each row execute function support_private.reject_deleted_photo_id();

create function public.support_deleted_photo_batch_v1(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if p_limit is null or p_limit not between 1 and 50 then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  update support_private.deleted_account_photos set state='failed'
    where state='leased' and attempts>=5 and lease_until<=clock_timestamp();
  return coalesce((select jsonb_agg(photo_id) from (
    select p.photo_id from support_private.deleted_account_photos p
    where p.state in ('pending','leased') and p.attempts<5
      and (p.lease_until is null or p.lease_until<=clock_timestamp())
      and not exists(select from auth.users where id=p.owner_id)
    order by p.created_at,p.photo_id limit p_limit
  ) pending),'[]'::jsonb);
end $$;

create function public.support_claim_deleted_photo_v1(p_id uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_photo support_private.deleted_account_photos;
begin
  if p_id is null or p_lease is null then
    raise invalid_parameter_value using message='SUPPORT_INVALID_INPUT';
  end if;
  select * into v_photo from support_private.deleted_account_photos where photo_id=p_id for update;
  if not found or v_photo.state in ('completed','failed') then return null; end if;
  if v_photo.lease_until>clock_timestamp() then return null; end if;
  if v_photo.attempts>=5 then
    update support_private.deleted_account_photos set state='failed' where photo_id=p_id;
    return null;
  end if;
  if exists(select from auth.users where id=v_photo.owner_id)
    or exists(select from support_private.ticket_photos where id=p_id) then
    raise insufficient_privilege using message='SUPPORT_CLEANUP_OWNER_ACTIVE';
  end if;
  update support_private.deleted_account_photos set state='leased',lease=p_lease,
    lease_until=clock_timestamp()+interval '1 minute',attempts=attempts+1 where photo_id=p_id;
  return jsonb_build_object('bucket','support-ticket-photos','path',p_id::text||'.jpg');
end $$;

create function public.support_finish_deleted_photo_v1(p_id uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update support_private.deleted_account_photos p set state='completed',completed_at=clock_timestamp(),lease_until=null
    where photo_id=p_id and state='leased' and lease=p_lease
      and not exists(select from auth.users where id=p.owner_id)
      and not exists(select from storage.objects where bucket_id='support-ticket-photos' and name=p_id::text||'.jpg');
  return found;
end $$;

revoke all on function support_private.capture_deleted_account_photos(),support_private.reject_deleted_photo_id(),
  public.support_deleted_photo_batch_v1(integer),public.support_claim_deleted_photo_v1(uuid,uuid),
  public.support_finish_deleted_photo_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.support_deleted_photo_batch_v1(integer),public.support_claim_deleted_photo_v1(uuid,uuid),
  public.support_finish_deleted_photo_v1(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;

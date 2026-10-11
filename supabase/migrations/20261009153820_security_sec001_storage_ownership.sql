begin;

-- Paths are object keys, never URLs. The namespace must match the owning row.
create or replace function public.is_owned_storage_path(
  p_bucket text, p_path text, p_user_id uuid,
  p_pet_id uuid default null, p_entity_id uuid default null
) returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_parts text[];
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if p_bucket is null or p_user_id is null or p_path is null or length(p_path) > 1024
     or p_path !~ '^[a-zA-Z0-9_./-]+$' or p_path ~ '(^|/)\.{1,2}(/|$)'
     or p_path like '%//%' then return false; end if;
  v_parts := string_to_array(p_path, '/');
  if p_bucket = 'memory-images' and v_parts[1] = 'timeline-thumb' then
    return coalesce(array_length(v_parts, 1) = 5 and v_parts[2] = p_user_id::text
      and v_parts[3] ~ v_uuid and v_parts[4] ~ v_uuid
      and v_parts[5] ~ '^[0-9a-f-]{36}\.jpg$'
      and (p_pet_id is null or v_parts[3] = p_pet_id::text)
      and (p_entity_id is null or v_parts[4] = p_entity_id::text), false);
  end if;
  if p_bucket not in ('pet-profiles', 'memory-images', 'community-images') then
    return false;
  end if;
  if array_length(v_parts, 1) <> 3 or v_parts[1] <> p_user_id::text
     or v_parts[2] !~ v_uuid or coalesce(v_parts[3], '') = '' then return false; end if;
  if p_bucket = 'pet-profiles' then
    return p_pet_id is null or v_parts[2] = p_pet_id::text;
  elsif p_bucket = 'community-images' then
    return p_entity_id is null or v_parts[2] = p_entity_id::text;
  end if;
  return (p_pet_id is null or v_parts[2] = p_pet_id::text)
    and (p_entity_id is null or left(v_parts[3], 37) = p_entity_id::text || '_');
end;
$$;
revoke all on function public.is_owned_storage_path(text,text,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.is_owned_storage_path(text,text,uuid,uuid,uuid) to service_role;

create or replace function public.enforce_image_reference_ownership()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_bucket text;
  v_paths text[];
  v_path text;
  v_pet uuid;
  v_entity uuid;
begin
  if tg_table_name = 'pets' then
    if tg_op = 'UPDATE' and new.profile_image_url is not distinct from old.profile_image_url
       and new.user_id = old.user_id and new.id = old.id then return new; end if;
    v_bucket := 'pet-profiles'; v_pet := new.id;
    v_paths := array[new.profile_image_url];
  elsif tg_table_name = 'posts' then
    if tg_op = 'UPDATE' and new.image_url is not distinct from old.image_url
       and new.image_urls is not distinct from old.image_urls
       and new.user_id = old.user_id and new.id = old.id then return new; end if;
    v_bucket := 'community-images'; v_entity := new.id;
    v_paths := array[new.image_url] || coalesce(new.image_urls, '{}'::text[]);
  elsif tg_table_name = 'memories' then
    if tg_op = 'UPDATE' and new.image_url is not distinct from old.image_url
       and new.image_urls is not distinct from old.image_urls and new.user_id = old.user_id
       and new.pet_id = old.pet_id and new.id = old.id then return new; end if;
    v_bucket := 'memory-images'; v_pet := new.pet_id; v_entity := new.id;
    v_paths := array[new.image_url] || coalesce(new.image_urls, '{}'::text[]);
  elsif tg_table_name = 'memory_images' then
    if tg_op = 'UPDATE' and new.original_path is not distinct from old.original_path
       and new.timeline_thumb_path is not distinct from old.timeline_thumb_path
       and new.user_id = old.user_id and new.pet_id = old.pet_id
       and new.memory_id = old.memory_id then return new; end if;
    v_bucket := 'memory-images'; v_pet := new.pet_id; v_entity := new.memory_id;
    v_paths := array[new.original_path, new.timeline_thumb_path];
    if new.original_path like 'timeline-thumb/%' or (new.timeline_thumb_path is not null
      and new.timeline_thumb_path <> 'timeline-thumb/' || new.user_id::text || '/' ||
        new.pet_id::text || '/' || new.memory_id::text || '/' || new.id::text || '.jpg') then
      raise exception using errcode = '42501', message = 'storage_reference_owner_mismatch';
    end if;
    if not exists (select 1 from public.memories m where m.id = new.memory_id
      and m.user_id = new.user_id and m.pet_id = new.pet_id) then
      raise exception using errcode = '42501', message = 'storage_reference_owner_mismatch';
    end if;
  else
    raise exception 'unsupported_image_reference_table';
  end if;
  if tg_table_name in ('memories', 'memory_images') and not exists (
    select 1 from public.pets p where p.id = v_pet and p.user_id = new.user_id
  ) then
    raise exception using errcode = '42501', message = 'storage_reference_owner_mismatch';
  end if;
  foreach v_path in array v_paths loop
    if nullif(v_path, '') is not null and not public.is_owned_storage_path(
      v_bucket, v_path, new.user_id, v_pet, v_entity
    ) then
      raise exception using errcode = '42501', message = 'storage_reference_owner_mismatch';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.enforce_image_reference_ownership() from public, anon, authenticated;
create trigger enforce_image_reference_ownership before insert or update on public.pets
  for each row execute function public.enforce_image_reference_ownership();
create trigger enforce_image_reference_ownership before insert or update on public.memories
  for each row execute function public.enforce_image_reference_ownership();
create trigger zz_enforce_image_reference_ownership before insert or update on public.memory_images
  for each row execute function public.enforce_image_reference_ownership();
create trigger enforce_image_reference_ownership before insert or update on public.posts
  for each row execute function public.enforce_image_reference_ownership();

-- No auth.users FK: cleanup must retain the original identity after auth deletion.
alter table public.account_deletion_cleanup_items add column owner_user_id uuid;
update public.account_deletion_cleanup_items i set owner_user_id = r.user_id
from public.account_deletion_requests r where r.id = i.request_id;
alter table public.account_deletion_cleanup_items alter column owner_user_id set not null;
alter table public.account_deletion_cleanup_items drop constraint account_deletion_cleanup_items_status_check;
alter table public.account_deletion_cleanup_items add constraint account_deletion_cleanup_items_status_check
  check (status in ('pending','processing','completed','failed','skipped_security'));

create or replace function public.bind_cleanup_item_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if row(new.request_id,new.bucket_name,new.storage_path,new.owner_user_id)
       is distinct from row(old.request_id,old.bucket_name,old.storage_path,old.owner_user_id) then
      raise exception using errcode = '42501', message = 'cleanup_identity_immutable';
    end if;
  else
    select r.user_id into new.owner_user_id from public.account_deletion_requests r where r.id = new.request_id;
    if new.owner_user_id is null then raise exception 'cleanup_owner_required'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.bind_cleanup_item_owner() from public, anon, authenticated;
create trigger bind_cleanup_item_owner before insert or update on public.account_deletion_cleanup_items
  for each row execute function public.bind_cleanup_item_owner();

create or replace function public.authorize_account_deletion_cleanup_item(p_cleanup_item_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item public.account_deletion_cleanup_items%rowtype;
  v_request public.account_deletion_requests%rowtype;
begin
  select * into v_item from public.account_deletion_cleanup_items where id = p_cleanup_item_id for update;
  if not found then return jsonb_build_object('allowed', false, 'code', 'cleanup_item_missing'); end if;
  select * into v_request from public.account_deletion_requests where id = v_item.request_id;
  if v_item.status <> 'processing' or v_request.status not in
    ('db_deleted','cleanup_pending','completed_with_cleanup_pending','completed') then
    return jsonb_build_object('allowed', false, 'code', 'cleanup_not_claimed');
  end if;
  if v_item.owner_user_id is distinct from v_request.user_id
     or not public.is_owned_storage_path(v_item.bucket_name, v_item.storage_path, v_item.owner_user_id)
     or exists (select 1 from storage.objects o where o.bucket_id = v_item.bucket_name
       and o.name = v_item.storage_path and nullif(o.owner_id, '') is not null
       and o.owner_id <> v_item.owner_user_id::text) then
    update public.account_deletion_cleanup_items set status = 'skipped_security',
      processing_started_at = null, last_error_code = 'storage_cleanup_owner_mismatch',
      last_error_message = 'SECURITY_EVENT: object deletion blocked by ownership validation'
    where id = v_item.id;
    perform public.sync_account_deletion_cleanup_summary(v_item.request_id);
    return jsonb_build_object('allowed', false, 'code', 'storage_cleanup_owner_mismatch');
  end if;
  return jsonb_build_object('allowed', true, 'bucket_name', v_item.bucket_name,
    'storage_path', v_item.storage_path, 'owner_user_id', v_item.owner_user_id);
end;
$$;
revoke all on function public.authorize_account_deletion_cleanup_item(uuid) from public, anon, authenticated;
grant execute on function public.authorize_account_deletion_cleanup_item(uuid) to service_role;

-- Keep the old RPC signature so already-running workers cannot claim unsafe paths.
create or replace function public.claim_account_deletion_cleanup_items(p_limit integer default 20)
returns table(cleanup_item_id uuid, request_id uuid, bucket_name text, storage_path text, attempts integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.account_deletion_cleanup_items%rowtype;
  v_auth jsonb;
begin
  for v_item in select i.* from public.account_deletion_cleanup_items i
    join public.account_deletion_requests r on r.id = i.request_id
    where (i.status in ('pending','failed') or (i.status = 'processing'
      and i.processing_started_at < now() - interval '10 minutes'))
      and r.status in ('db_deleted','cleanup_pending','completed_with_cleanup_pending','completed')
    order by i.created_at, i.id limit least(greatest(coalesce(p_limit,20),1),100)
    for update of i skip locked
  loop
    update public.account_deletion_cleanup_items i set status = 'processing',
      attempts = i.attempts + 1, processing_started_at = now(), last_attempted_at = now(),
      last_error_code = null, last_error_message = null where i.id = v_item.id;
    v_auth := public.authorize_account_deletion_cleanup_item(v_item.id);
    if (v_auth->>'allowed')::boolean then
      update public.account_deletion_requests r set cleanup_started_at = coalesce(r.cleanup_started_at,now()),
        status = case when r.status = 'completed_with_cleanup_pending' then 'cleanup_pending' else r.status end
      where r.id = v_item.request_id;
      return query select v_item.id,v_item.request_id,v_item.bucket_name,v_item.storage_path,v_item.attempts + 1;
    end if;
  end loop;
end;
$$;
revoke all on function public.claim_account_deletion_cleanup_items(integer) from public, anon, authenticated;
grant execute on function public.claim_account_deletion_cleanup_items(integer) to service_role;

CREATE OR REPLACE FUNCTION public.sync_account_deletion_cleanup_summary(p_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total_count integer := 0;
  v_completed_count integer := 0;
  v_pending_count integer := 0;
  v_now timestamptz := timezone('utc', now());
begin
  if p_request_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'completed')::integer,
    count(*) filter (where status not in ('completed', 'skipped_security'))::integer
  into
    v_total_count,
    v_completed_count,
    v_pending_count
  from public.account_deletion_cleanup_items
  where request_id = p_request_id;

  update public.account_deletion_requests
  set cleanup_item_count = v_total_count,
      cleanup_completed_count = v_completed_count,
      storage_cleanup_pending = (v_pending_count > 0),
      cleanup_completed_at = case
        when v_total_count > 0 and v_pending_count = 0
          then coalesce(cleanup_completed_at, v_now)
        else cleanup_completed_at
      end,
      completed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then coalesce(completed_at, v_now)
        else completed_at
      end,
      status = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then 'completed'
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then 'completed_with_cleanup_pending'
        else status
      end,
      last_status_changed_at = case
        when v_total_count > 0
          and v_pending_count = 0
          and status in ('cleanup_pending', 'completed_with_cleanup_pending')
          then v_now
        when v_total_count > 0
          and v_pending_count > 0
          and status in ('db_deleted', 'completed', 'completed_with_cleanup_pending')
          then v_now
        else last_status_changed_at
      end
  where id = p_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_account_deletion_cleanup_item(p_cleanup_item_id uuid, p_success boolean, p_error_code text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  update public.account_deletion_cleanup_items
  set status = case when p_success then 'completed' else 'failed' end,
      cleanup_completed_at = case when p_success then v_now else cleanup_completed_at end,
      processing_started_at = null,
      last_attempted_at = v_now,
      last_error_code = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_code, '')), '')
      end,
      last_error_message = case
        when p_success then null
        else nullif(btrim(coalesce(p_error_message, '')), '')
      end
  where id = p_cleanup_item_id and status <> 'skipped_security'
  returning request_id
    into v_request_id;

  if v_request_id is null then
    raise exception 'account_deletion_cleanup_item_not_found';
  end if;

  perform public.sync_account_deletion_cleanup_summary(v_request_id);
  return public.build_account_deletion_response(v_request_id);
end;
$function$;

commit;

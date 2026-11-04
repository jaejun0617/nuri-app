create function public.replace_memory_image_refs(
  p_memory_id uuid,
  p_expected_paths text[],
  p_paths text[]
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_memory public.memories;
  v_rows public.memory_images[];
  v_current text[];
  v_retired text[];
begin
  if v_owner is null then
    raise exception using errcode = '42501', message = 'memory_image_owner_required';
  end if;
  if p_expected_paths is null or p_paths is null or exists (
    select 1 from unnest(p_paths) as p(path)
    where path is null or path = '' or path <> btrim(path)
  ) or cardinality(p_paths) <> (select count(distinct path) from unnest(p_paths) as p(path)) then
    raise exception using errcode = '22023', message = 'memory_image_paths_invalid';
  end if;

  select * into v_memory from public.memories
  where id = p_memory_id and user_id = v_owner for update;
  if not found then
    raise exception using errcode = '42501', message = 'memory_image_owner_required';
  end if;

  select coalesce(array_agg(r.item order by (r.item).sort_order), '{}'),
         coalesce(array_agg((r.item).original_path order by (r.item).sort_order), '{}')
  into v_rows, v_current
  from (
    select i as item from public.memory_images i where i.memory_id = p_memory_id for update
  ) r;

  -- A lost HTTP reply is recoverable only when both server representations match.
  if v_current = p_paths and v_memory.image_urls is not distinct from p_paths
      and v_memory.image_url is not distinct from p_paths[1] then
    return jsonb_build_object('paths', p_paths, 'retired_paths', array[]::text[]);
  end if;
  if cardinality(v_current) = 0 then
    v_current := coalesce(nullif(v_memory.image_urls, '{}'),
      array_remove(array[v_memory.image_url], null));
  end if;
  if v_current is distinct from p_expected_paths then
    raise exception using errcode = 'PT409', message = 'memory_image_refs_changed';
  end if;

  select coalesce(array_agg(distinct path), '{}') into v_retired
  from (
    select original_path as path from unnest(v_rows) where not (original_path = any(p_paths))
    union all
    select timeline_thumb_path from unnest(v_rows) where not (original_path = any(p_paths))
  ) retired
  where not (path = any(p_paths)) and (
    left(path, length(v_owner::text || '/' || v_memory.pet_id::text || '/' || p_memory_id::text || '_'))
      = v_owner::text || '/' || v_memory.pet_id::text || '/' || p_memory_id::text || '_'
    or left(path, length('timeline-thumb/' || v_owner::text || '/' || v_memory.pet_id::text || '/' || p_memory_id::text || '/'))
      = 'timeline-thumb/' || v_owner::text || '/' || v_memory.pet_id::text || '/' || p_memory_id::text || '/'
  );

  -- Unchanged slots stay in place. Moved rows keep their identity and metadata.
  -- A rejected insert or legacy update rolls back all reference changes.
  delete from public.memory_images i where i.memory_id = p_memory_id
    and i.original_path is distinct from p_paths[i.sort_order + 1];
  insert into public.memory_images
  select (jsonb_populate_record(r, jsonb_build_object('sort_order', p.ord - 1))).*
  from unnest(v_rows) r
  join unnest(p_paths) with ordinality p(path, ord) on p.path = r.original_path
  where r.sort_order <> p.ord - 1;
  insert into public.memory_images (memory_id, user_id, pet_id, sort_order, original_path)
  select p_memory_id, v_owner, v_memory.pet_id, (p.ord - 1)::integer, p.path
  from unnest(p_paths) with ordinality p(path, ord)
  where not exists (select 1 from unnest(v_rows) r where r.original_path = p.path);

  update public.memories set image_url = p_paths[1], image_urls = p_paths
  where id = p_memory_id and user_id = v_owner;
  return jsonb_build_object('paths', p_paths, 'retired_paths', v_retired);
end;
$$;

revoke all on function public.replace_memory_image_refs(uuid, text[], text[])
  from public, anon, authenticated, service_role;
grant execute on function public.replace_memory_image_refs(uuid, text[], text[])
  to authenticated;

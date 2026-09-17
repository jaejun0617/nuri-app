begin;

-- Old clients still write compatibility groups without the new canonical columns.
create function public.pack04_sync_legacy_guide_species()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.species_keys = array['COMMON']::text[]
      and new.target_species <> array['common']::text[])
    or (tg_op = 'UPDATE' and new.target_species is distinct from old.target_species
      and new.species_keys is not distinct from old.species_keys) then
    select array_agg(distinct case value
      when 'dog' then 'DOG' when 'cat' then 'CAT'
      when 'common' then 'COMMON' else 'OTHER' end order by case value
      when 'dog' then 'DOG' when 'cat' then 'CAT'
      when 'common' then 'COMMON' else 'OTHER' end)
    into new.species_keys from unnest(new.target_species) as legacy(value);
  end if;
  -- A plain-body legacy edit must not leave the rendered semantic body stale.
  if tg_op = 'INSERT' and new.content_blocks = '[]'::jsonb then
    new.content_blocks := jsonb_build_array(jsonb_build_object(
      'id', 'legacy-body', 'role', 'normal', 'title', null, 'body', new.body));
  elsif tg_op = 'UPDATE' and new.body is distinct from old.body
    and new.content_blocks is not distinct from old.content_blocks then
    new.content_blocks := jsonb_build_array(jsonb_build_object(
      'id', 'legacy-body', 'role', 'normal', 'title', null, 'body', new.body));
  end if;
  return new;
end;
$$;

create trigger pack04_legacy_guide_write_compatibility
before insert or update on public.pet_care_guides
for each row execute function public.pack04_sync_legacy_guide_species();

create function public.pack04_preserve_legacy_pet_species_writes()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.species_group is distinct from old.species_group
    and new.species_key is not distinct from old.species_key then
    -- Null restores the read-time legacy alias resolver, not a guessed canonical key.
    new.species_key := null;
  end if;
  return new;
end;
$$;

create trigger pack04_legacy_pet_write_compatibility
before update of species_group on public.pets
for each row execute function public.pack04_preserve_legacy_pet_species_writes();

revoke all on function public.pack04_sync_legacy_guide_species() from public, anon, authenticated;
revoke all on function public.pack04_preserve_legacy_pet_species_writes() from public, anon, authenticated;

commit;

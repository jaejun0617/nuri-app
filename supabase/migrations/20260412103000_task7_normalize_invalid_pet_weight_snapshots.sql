begin;

update public.pets
set weight_kg = null
where weight_kg is not null
  and (
    weight_kg <= 0
    or weight_kg > 999.99
  );

commit;


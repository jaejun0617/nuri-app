alter table public.memories
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists price integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memories_price_check'
  ) then
    alter table public.memories
      add constraint memories_price_check
      check (price is null or price >= 0);
  end if;
end
$$;

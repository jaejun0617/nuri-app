begin;

create table if not exists public.pet_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint pet_weight_logs_weight_kg_check
    check (weight_kg > 0 and weight_kg <= 999.99),
  constraint pet_weight_logs_note_length_check
    check (note is null or char_length(note) <= 500),
  constraint pet_weight_logs_source_check
    check (
      source in (
        'manual',
        'health_report',
        'pet_profile',
        'pet_create',
        'home',
        'backfill'
      )
    ),
  constraint pet_weight_logs_unique_pet_measured_on
    unique (pet_id, measured_on)
);

create index if not exists idx_pet_weight_logs_pet_id_measured_on
  on public.pet_weight_logs (pet_id, measured_on desc, created_at desc, id desc);

create index if not exists idx_pet_weight_logs_user_id_measured_on
  on public.pet_weight_logs (user_id, measured_on desc, created_at desc, id desc);

drop trigger if exists trg_pet_weight_logs_updated_at on public.pet_weight_logs;
create trigger trg_pet_weight_logs_updated_at
before update on public.pet_weight_logs
for each row execute function public.set_updated_at();

create or replace function public.sync_pet_latest_weight_from_logs()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_pet_id uuid;
begin
  for v_pet_id in
    select distinct pet_id
    from unnest(array[
      case when tg_op in ('UPDATE', 'DELETE') then old.pet_id else null end,
      case when tg_op in ('INSERT', 'UPDATE') then new.pet_id else null end
    ]) as source_pet_ids(pet_id)
    where pet_id is not null
  loop
    update public.pets pet
    set weight_kg = (
      select log.weight_kg
      from public.pet_weight_logs log
      where log.pet_id = v_pet_id
      order by log.measured_on desc, log.created_at desc, log.id desc
      limit 1
    )
    where pet.id = v_pet_id;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_pet_weight_logs_sync_pet_weight on public.pet_weight_logs;
create trigger trg_pet_weight_logs_sync_pet_weight
after insert or update or delete on public.pet_weight_logs
for each row execute function public.sync_pet_latest_weight_from_logs();

insert into public.pet_weight_logs (
  user_id,
  pet_id,
  measured_on,
  weight_kg,
  note,
  source
)
select
  pet.user_id,
  pet.id,
  timezone('Asia/Seoul', pet.updated_at)::date,
  pet.weight_kg,
  null,
  'backfill'
from public.pets pet
where pet.weight_kg is not null
  and pet.weight_kg > 0
  and pet.weight_kg <= 999.99
  and not exists (
    select 1
    from public.pet_weight_logs log
    where log.pet_id = pet.id
  )
on conflict (pet_id, measured_on) do nothing;

alter table public.pet_weight_logs enable row level security;

drop policy if exists "pet_weight_logs_crud_own" on public.pet_weight_logs;
create policy "pet_weight_logs_crud_own"
on public.pet_weight_logs for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

commit;

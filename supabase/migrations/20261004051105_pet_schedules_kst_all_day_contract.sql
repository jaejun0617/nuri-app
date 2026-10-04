-- Only the all-day boundary changes. Timed schedules, RLS and reminders retain
-- their existing contracts. No stored instant is rewritten.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if exists (
    select 1 from public.pet_schedules
    where all_day and (
      starts_at <> date_trunc('day', starts_at, 'Asia/Seoul')
      or (ends_at is not null and ends_at <> date_trunc('day', ends_at, 'Asia/Seoul'))
    )
  ) then
    raise exception 'Existing non-KST all-day schedules require separate review';
  end if;
end $$;

alter table public.pet_schedules
  drop constraint pet_schedules_all_day_check;
alter table public.pet_schedules
  add constraint pet_schedules_all_day_check check (
    not all_day or (
      starts_at = date_trunc('day', starts_at, 'Asia/Seoul')
      and (ends_at is null or ends_at = date_trunc('day', ends_at, 'Asia/Seoul'))
    )
  );
commit;

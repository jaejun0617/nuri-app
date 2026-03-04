-- pet_schedules
-- 목적:
-- - 반려동물별 일정/리마인더/루틴 관리
-- - 홈 "이번 주 일정" / 일정 목록 / 알림 / 외부 캘린더 sync의 기준 테이블
-- - 외부 캘린더는 source/external_* 컬럼으로 추적하고,
--   앱 내부 UX는 이 테이블만 바라보도록 설계

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.pet_schedules (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,

  title text not null,
  note text null,

  starts_at timestamptz not null,
  ends_at timestamptz null,
  all_day boolean not null default false,

  category text not null,
  sub_category text null,

  icon_key text not null,
  color_key text not null default 'brand',

  reminder_minutes integer[] not null default '{}',
  repeat_rule text not null default 'none',
  repeat_interval integer not null default 1,
  repeat_until timestamptz null,

  linked_memory_id uuid null references public.memories (id) on delete set null,
  completed_at timestamptz null,

  source text not null default 'manual',
  external_calendar_id text null,
  external_event_id text null,
  sync_status text not null default 'local',

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint pet_schedules_title_length_check
    check (char_length(btrim(title)) between 1 and 80),

  constraint pet_schedules_note_length_check
    check (note is null or char_length(note) <= 1000),

  constraint pet_schedules_time_range_check
    check (ends_at is null or ends_at >= starts_at),

  constraint pet_schedules_repeat_interval_check
    check (repeat_interval >= 1 and repeat_interval <= 365),

  constraint pet_schedules_repeat_until_check
    check (repeat_until is null or repeat_until >= starts_at),

  constraint pet_schedules_completed_at_check
    check (completed_at is null or completed_at >= starts_at),

  constraint pet_schedules_category_check
    check (
      category in (
        'walk',
        'meal',
        'health',
        'grooming',
        'diary',
        'other'
      )
    ),

  constraint pet_schedules_sub_category_check
    check (
      sub_category is null or sub_category in (
        'vaccine',
        'hospital',
        'medicine',
        'checkup',
        'bath',
        'haircut',
        'nail',
        'meal-plan',
        'walk-routine',
        'journal',
        'etc'
      )
    ),

  constraint pet_schedules_icon_key_check
    check (
      icon_key in (
        'walk',
        'meal',
        'bowl',
        'medical-bag',
        'stethoscope',
        'syringe',
        'pill',
        'content-cut',
        'shower',
        'notebook',
        'heart',
        'star',
        'calendar',
        'dots'
      )
    ),

  constraint pet_schedules_color_key_check
    check (
      color_key in (
        'brand',
        'blue',
        'green',
        'orange',
        'pink',
        'yellow',
        'gray'
      )
    ),

  constraint pet_schedules_repeat_rule_check
    check (
      repeat_rule in (
        'none',
        'daily',
        'weekly',
        'monthly',
        'yearly'
      )
    ),

  constraint pet_schedules_source_check
    check (
      source in (
        'manual',
        'google_calendar',
        'apple_calendar',
        'imported'
      )
    ),

  constraint pet_schedules_sync_status_check
    check (
      sync_status in (
        'local',
        'synced',
        'dirty',
        'deleted'
      )
    ),

  constraint pet_schedules_all_day_check
    check (
      (all_day = false)
      or (
        date_trunc('day', starts_at) = starts_at
        and (ends_at is null or date_trunc('day', ends_at) = ends_at)
      )
    ),

  constraint pet_schedules_repeat_source_check
    check (
      (repeat_rule = 'none' and repeat_interval = 1)
      or (repeat_rule <> 'none')
    ),

  constraint pet_schedules_external_pair_check
    check (
      (external_event_id is null and external_calendar_id is null)
      or (external_event_id is not null and external_calendar_id is not null)
    )
);

alter table public.pet_schedules
  add column if not exists user_id uuid,
  add column if not exists pet_id uuid,
  add column if not exists title text,
  add column if not exists note text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists all_day boolean,
  add column if not exists category text,
  add column if not exists sub_category text,
  add column if not exists icon_key text,
  add column if not exists color_key text,
  add column if not exists reminder_minutes integer[],
  add column if not exists repeat_rule text,
  add column if not exists repeat_interval integer,
  add column if not exists repeat_until timestamptz,
  add column if not exists linked_memory_id uuid,
  add column if not exists completed_at timestamptz,
  add column if not exists source text,
  add column if not exists external_calendar_id text,
  add column if not exists external_event_id text,
  add column if not exists sync_status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.pet_schedules
  alter column all_day set default false,
  alter column color_key set default 'brand',
  alter column reminder_minutes set default '{}',
  alter column repeat_rule set default 'none',
  alter column repeat_interval set default 1,
  alter column source set default 'manual',
  alter column sync_status set default 'local',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.pet_schedules
set
  all_day = coalesce(all_day, false),
  color_key = coalesce(nullif(color_key, ''), 'brand'),
  reminder_minutes = coalesce(reminder_minutes, '{}'),
  repeat_rule = coalesce(nullif(repeat_rule, ''), 'none'),
  repeat_interval = coalesce(repeat_interval, 1),
  source = coalesce(nullif(source, ''), 'manual'),
  sync_status = coalesce(nullif(sync_status, ''), 'local'),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  all_day is null
  or color_key is null
  or reminder_minutes is null
  or repeat_rule is null
  or repeat_interval is null
  or source is null
  or sync_status is null
  or created_at is null
  or updated_at is null;

create index if not exists pet_schedules_pet_id_starts_at_idx
  on public.pet_schedules (pet_id, starts_at asc);

create index if not exists pet_schedules_user_id_starts_at_idx
  on public.pet_schedules (user_id, starts_at asc);

create index if not exists pet_schedules_pet_id_category_starts_at_idx
  on public.pet_schedules (pet_id, category, starts_at asc);

create index if not exists pet_schedules_pet_id_completed_at_idx
  on public.pet_schedules (pet_id, completed_at);

create index if not exists pet_schedules_source_sync_status_idx
  on public.pet_schedules (source, sync_status);

create unique index if not exists pet_schedules_external_unique_idx
  on public.pet_schedules (user_id, source, external_calendar_id, external_event_id)
  where external_event_id is not null;

drop trigger if exists trg_pet_schedules_set_updated_at on public.pet_schedules;
create trigger trg_pet_schedules_set_updated_at
before update on public.pet_schedules
for each row
execute function public.set_updated_at();

alter table public.pet_schedules enable row level security;

drop policy if exists "pet_schedules_select_own" on public.pet_schedules;
create policy "pet_schedules_select_own"
on public.pet_schedules
for select
using (user_id = auth.uid());

drop policy if exists "pet_schedules_insert_own" on public.pet_schedules;
create policy "pet_schedules_insert_own"
on public.pet_schedules
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.pets p
    where p.id = pet_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "pet_schedules_update_own" on public.pet_schedules;
create policy "pet_schedules_update_own"
on public.pet_schedules
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.pets p
    where p.id = pet_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "pet_schedules_delete_own" on public.pet_schedules;
create policy "pet_schedules_delete_own"
on public.pet_schedules
for delete
using (user_id = auth.uid());

comment on table public.pet_schedules is
'반려동물별 일정/리마인더/루틴 관리 테이블';

comment on column public.pet_schedules.category is
'메인 카테고리: walk | meal | health | grooming | diary | other';

comment on column public.pet_schedules.sub_category is
'세부 분류: vaccine | hospital | medicine | checkup | bath | haircut | nail | meal-plan | walk-routine | journal | etc';

comment on column public.pet_schedules.icon_key is
'UI에서 emoji/vector icon으로 매핑할 키';

comment on column public.pet_schedules.color_key is
'UI accent color 키';

comment on column public.pet_schedules.reminder_minutes is
'일정 시작 전 알림 분 단위 배열. 예: {10,60,1440}';

comment on column public.pet_schedules.repeat_rule is
'반복 규칙: none | daily | weekly | monthly | yearly';

comment on column public.pet_schedules.source is
'일정 생성 출처: manual | google_calendar | apple_calendar | imported';

comment on column public.pet_schedules.sync_status is
'외부 캘린더 동기화 상태: local | synced | dirty | deleted';

commit;

-- ============================================================
-- NURI FULL RELEASE MASTER SQL
-- ============================================================
-- 목적:
-- - 현재 앱 + 근시일 내 확장 도메인까지 한 번에 세팅하는 "전체판"
-- - 새 Supabase 프로젝트 기준으로 바로 실행 가능한 릴리즈용 마스터 SQL
-- - RLS / auth trigger / storage bucket / storage policy 포함
--
-- 성격:
-- - v1_release 보다 범위가 넓음
-- - 그러나 권한은 더 보수적으로 잠가서
--   "있어도 지금 당장 안 터지는" 방향으로 정리
--
-- 현재 앱과 맞춘 핵심:
-- - pets.profile_image_url = pet-profiles bucket path
-- - memories.image_url = memory-images bucket path
-- - pet-profiles = public bucket
-- - memory-images = private bucket + signed URL
-- ============================================================

begin;

-- ============================================================
-- 0) EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ============================================================
-- 1) ENUMS
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'pet_gender') then
    create type public.pet_gender as enum ('male', 'female', 'unknown');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'emotion_tag') then
    create type public.emotion_tag as enum (
      'happy',
      'calm',
      'excited',
      'neutral',
      'sad',
      'anxious',
      'angry',
      'tired'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recall_mode') then
    create type public.recall_mode as enum ('anniversary', 'random', 'emotion_based');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visibility') then
    create type public.visibility as enum ('public', 'private');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'system',
      'anniversary',
      'daily_recall',
      'community_comment',
      'community_like',
      'subscription',
      'schedule',
      'support'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free', 'plus', 'pro');
  end if;
end $$;

-- ============================================================
-- 2) COMMON FUNCTIONS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_email text;
  raw_nickname text;
begin
  raw_email := new.email;

  raw_nickname := coalesce(
    new.raw_user_meta_data->>'nickname',
    split_part(coalesce(raw_email, 'user'), '@', 1)
  );

  insert into public.profiles (user_id, email, nickname, avatar_url)
  values (
    new.id,
    raw_email,
    raw_nickname,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 3) CORE
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  nickname citext not null,
  avatar_url text,
  locale text not null default 'ko-KR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint profiles_nickname_length_check
    check (char_length(btrim(nickname::text)) between 2 and 24)
);

create unique index if not exists uq_profiles_nickname
  on public.profiles (nickname);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  adoption_date date,
  weight_kg numeric(5,2),
  gender public.pet_gender not null default 'unknown',
  neutered boolean,
  breed text,
  profile_image_url text,
  theme_color text,
  likes text[] not null default '{}'::text[],
  dislikes text[] not null default '{}'::text[],
  hobbies text[] not null default '{}'::text[],
  personality_tags text[] not null default '{}'::text[],
  death_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint pets_name_length_check
    check (char_length(btrim(name)) between 1 and 40),
  constraint pets_weight_kg_check
    check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 999.99)),
  constraint pets_birth_before_death_check
    check (birth_date is null or death_date is null or birth_date <= death_date),
  constraint pets_adoption_before_death_check
    check (adoption_date is null or death_date is null or adoption_date <= death_date)
);

create index if not exists idx_pets_user_id
  on public.pets (user_id);
create index if not exists idx_pets_death_date
  on public.pets (death_date);

drop trigger if exists trg_pets_updated_at on public.pets;
create trigger trg_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

create or replace function public.owns_pet(target_pet_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.pets p
    where p.id = target_pet_id
      and p.user_id = auth.uid()
  );
$$;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  image_url text, -- 앱 현재 기준: memory-images bucket path
  title text not null,
  content text,
  emotion public.emotion_tag,
  tags text[] not null default '{}'::text[],
  category text,
  sub_category text,
  price integer,
  occurred_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint memories_title_length_check
    check (char_length(btrim(title)) between 1 and 100),
  constraint memories_content_length_check
    check (content is null or char_length(content) <= 5000),
  constraint memories_price_check
    check (price is null or price >= 0)
);

create index if not exists idx_memories_user_id
  on public.memories (user_id);
create index if not exists idx_memories_pet_id
  on public.memories (pet_id);
create index if not exists idx_memories_created_at
  on public.memories (created_at desc);
create index if not exists idx_memories_occurred_at
  on public.memories (occurred_at desc);

drop trigger if exists trg_memories_updated_at on public.memories;
create trigger trg_memories_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  content text not null,
  is_ai_generated boolean not null default false,
  ai_model text,
  ai_context jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint letters_content_length_check
    check (char_length(btrim(content)) between 1 and 5000)
);

create index if not exists idx_letters_user_id
  on public.letters (user_id);
create index if not exists idx_letters_pet_id
  on public.letters (pet_id);
create index if not exists idx_letters_created_at
  on public.letters (created_at desc);

-- ============================================================
-- 4) GROWTH
-- ============================================================
create table if not exists public.emotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  score numeric(5,2),
  primary_emotion public.emotion_tag,
  raw jsonb,
  analyzed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_emotions_user_pet
  on public.emotions (user_id, pet_id);
create index if not exists idx_emotions_analyzed_at
  on public.emotions (analyzed_at desc);

create table if not exists public.daily_recall (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  date date not null,
  memory_id uuid references public.memories(id) on delete set null,
  mode public.recall_mode not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, date)
);

create index if not exists idx_daily_recall_user_pet_date
  on public.daily_recall (user_id, pet_id, date desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  date date not null,
  kind text not null,
  message text not null,
  model text,
  prompt jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, date, kind),

  constraint ai_messages_kind_length_check
    check (char_length(btrim(kind)) between 1 and 50)
);

create index if not exists idx_ai_messages_user_pet_date
  on public.ai_messages (user_id, pet_id, date desc);

create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null,
  date date not null,
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, pet_id, type, date),

  constraint anniversaries_type_length_check
    check (char_length(btrim(type)) between 1 and 40)
);

create index if not exists idx_anniversaries_user_pet_date
  on public.anniversaries (user_id, pet_id, date desc);

-- ============================================================
-- 5) BILLING
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  store text,
  store_receipt text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions (user_id);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint billing_events_event_type_length_check
    check (char_length(btrim(event_type)) between 1 and 50)
);

create index if not exists idx_billing_events_user
  on public.billing_events (user_id, created_at desc);

-- ============================================================
-- 6) COMMUNITY
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  visibility public.visibility not null default 'public',
  content text not null,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint posts_content_length_check
    check (char_length(btrim(content)) between 1 and 5000)
);

create index if not exists idx_posts_visibility_created_at
  on public.posts (visibility, created_at desc);
create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc);

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint comments_content_length_check
    check (char_length(btrim(content)) between 1 and 2000)
);

create index if not exists idx_comments_post_created_at
  on public.comments (post_id, created_at asc);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(post_id, user_id)
);

create index if not exists idx_likes_post
  on public.likes (post_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),

  constraint reports_target_type_check
    check (target_type in ('post', 'comment')),
  constraint reports_status_check
    check (status in ('open', 'resolved', 'rejected'))
);

create index if not exists idx_reports_status_created_at
  on public.reports (status, created_at desc);

-- ============================================================
-- 7) NOTIFICATIONS / AUDIT
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text,
  body text,
  reference jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint audit_logs_action_length_check
    check (char_length(btrim(action)) between 1 and 80)
);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

-- ============================================================
-- 8) SCHEDULES
-- ============================================================
create table if not exists public.pet_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,

  title text not null,
  note text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  category text not null,
  sub_category text,
  icon_key text not null,
  color_key text not null default 'brand',
  reminder_minutes integer[] not null default '{}',
  repeat_rule text not null default 'none',
  repeat_interval integer not null default 1,
  repeat_until timestamptz,
  linked_memory_id uuid references public.memories(id) on delete set null,
  completed_at timestamptz,
  source text not null default 'manual',
  external_calendar_id text,
  external_event_id text,
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
    check (repeat_interval between 1 and 365),
  constraint pet_schedules_repeat_rule_check
    check (repeat_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  constraint pet_schedules_repeat_until_check
    check (
      (repeat_rule = 'none' and repeat_until is null)
      or (repeat_rule <> 'none' and (repeat_until is null or repeat_until >= starts_at))
    ),
  constraint pet_schedules_completed_at_check
    check (completed_at is null or completed_at >= starts_at),
  constraint pet_schedules_category_check
    check (category in ('walk', 'meal', 'health', 'grooming', 'diary', 'other')),
  constraint pet_schedules_sub_category_check
    check (
      sub_category is null
      or sub_category in (
        'vaccine', 'hospital', 'medicine', 'checkup',
        'bath', 'haircut', 'nail', 'meal-plan',
        'walk-routine', 'journal', 'etc'
      )
    ),
  constraint pet_schedules_icon_key_check
    check (
      icon_key in (
        'walk', 'meal', 'bowl', 'medical-bag', 'stethoscope',
        'syringe', 'pill', 'content-cut', 'shower', 'notebook',
        'heart', 'star', 'calendar', 'dots'
      )
    ),
  constraint pet_schedules_color_key_check
    check (color_key in ('brand', 'blue', 'green', 'orange', 'pink', 'yellow', 'gray')),
  constraint pet_schedules_source_check
    check (source in ('manual', 'google_calendar', 'apple_calendar', 'imported')),
  constraint pet_schedules_sync_status_check
    check (sync_status in ('local', 'synced', 'dirty', 'deleted')),
  constraint pet_schedules_all_day_check
    check (
      all_day = false
      or (
        date_trunc('day', starts_at) = starts_at
        and (ends_at is null or date_trunc('day', ends_at) = ends_at)
      )
    ),
  constraint pet_schedules_external_sync_check
    check (
      (
        source = 'manual'
        and external_calendar_id is null
        and external_event_id is null
      )
      or (
        source in ('google_calendar', 'apple_calendar', 'imported')
        and (
          (external_calendar_id is null and external_event_id is null)
          or (external_calendar_id is not null and external_event_id is not null)
        )
      )
    )
);

create index if not exists idx_pet_schedules_pet_id_starts_at
  on public.pet_schedules (pet_id, starts_at asc);
create index if not exists idx_pet_schedules_user_id_starts_at
  on public.pet_schedules (user_id, starts_at asc);
create index if not exists idx_pet_schedules_pet_id_category_starts_at
  on public.pet_schedules (pet_id, category, starts_at asc);
create index if not exists idx_pet_schedules_pet_id_completed_at
  on public.pet_schedules (pet_id, completed_at);
create index if not exists idx_pet_schedules_source_sync_status
  on public.pet_schedules (source, sync_status);

create unique index if not exists uq_pet_schedules_external_event
  on public.pet_schedules (user_id, source, external_calendar_id, external_event_id)
  where external_event_id is not null;

drop trigger if exists trg_pet_schedules_updated_at on public.pet_schedules;
create trigger trg_pet_schedules_updated_at
before update on public.pet_schedules
for each row execute function public.set_updated_at();

-- ============================================================
-- 9) RLS ENABLE
-- ============================================================
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.memories enable row level security;
alter table public.letters enable row level security;
alter table public.emotions enable row level security;
alter table public.daily_recall enable row level security;
alter table public.ai_messages enable row level security;
alter table public.anniversaries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.pet_schedules enable row level security;

-- ============================================================
-- 10) RLS POLICIES
-- ============================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pets_crud_own" on public.pets;
create policy "pets_crud_own"
on public.pets for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "memories_crud_own" on public.memories;
create policy "memories_crud_own"
on public.memories for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "letters_crud_own" on public.letters;
create policy "letters_crud_own"
on public.letters for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "emotions_crud_own" on public.emotions;
create policy "emotions_crud_own"
on public.emotions for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "daily_recall_crud_own" on public.daily_recall;
create policy "daily_recall_crud_own"
on public.daily_recall for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "ai_messages_crud_own" on public.ai_messages;
create policy "ai_messages_crud_own"
on public.ai_messages for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "anniversaries_crud_own" on public.anniversaries;
create policy "anniversaries_crud_own"
on public.anniversaries for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "billing_events_select_own" on public.billing_events;
create policy "billing_events_select_own"
on public.billing_events for select
using (auth.uid() = user_id);

drop policy if exists "posts_select_public_or_own" on public.posts;
create policy "posts_select_public_or_own"
on public.posts for select
using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "posts_crud_own" on public.posts;
create policy "posts_crud_own"
on public.posts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_select_by_post_visibility" on public.comments;
create policy "comments_select_by_post_visibility"
on public.comments for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  )
  or comments.user_id = auth.uid()
);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
on public.comments for insert
with check (auth.uid() = user_id);

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id);

drop policy if exists "likes_select_by_post_visibility" on public.likes;
create policy "likes_select_by_post_visibility"
on public.likes for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = likes.post_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  )
  or likes.user_id = auth.uid()
);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select
using (auth.uid() = reporter_id);

drop policy if exists "notifications_crud_own" on public.notifications;
create policy "notifications_crud_own"
on public.notifications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
using (auth.uid() = user_id);

drop policy if exists "pet_schedules_crud_own" on public.pet_schedules;
create policy "pet_schedules_crud_own"
on public.pet_schedules for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

-- ============================================================
-- 11) AUTH TRIGGER
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 12) VIEW
-- ============================================================
create or replace view public.v_my_pets_with_days as
select
  p.*,
  case
    when p.adoption_date is null then null
    else current_date - p.adoption_date
  end as together_days
from public.pets p
where p.user_id = auth.uid();

-- ============================================================
-- 13) STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('pet-profiles', 'pet-profiles', true)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('memory-images', 'memory-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "nuri_pet_profiles_insert_own" on storage.objects;
drop policy if exists "nuri_pet_profiles_update_own" on storage.objects;
drop policy if exists "nuri_pet_profiles_delete_own" on storage.objects;
drop policy if exists "nuri_memory_images_insert_own" on storage.objects;
drop policy if exists "nuri_memory_images_delete_own" on storage.objects;
drop policy if exists "nuri_memory_images_select_own" on storage.objects;

create policy "nuri_pet_profiles_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_pet_profiles_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_pet_profiles_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pet-profiles'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "nuri_memory_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

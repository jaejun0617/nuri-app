-- backfilled baseline-history skeleton
-- file: 20260330140442_backfilled_baseline_history_auth_core.sql
-- created_at: 2026-03-30 14:04:42 Asia/Seoul
--
-- This file is a backfilled baseline-history skeleton for pre-Task6 auth/account.
-- It does not pretend to be the original historical migration that first created
-- these objects. The timestamp is the actual skeleton creation time.
--
-- runtime source of truth != execution history
-- - Runtime/source-of-truth for this axis is described by:
--   1) docs/sql/공용/누리-전체초기구성-부트스트랩.sql
--   2) docs/sql/인증-계정/프로필-닉네임확정-보조.sql
--   3) linked remote runtime objects once re-verified
-- - Execution history is currently only the recent supabase/migrations/* set.
-- - This skeleton exists to prepare a future executable backfill package, not to
--   replace the docs baseline or to rewrite past execution chronology.
--
-- included objects for this axis
-- - public.profiles auth/account-owned baseline contract
-- - profiles own RLS policies and auth/account-owned indexes/constraints only
-- - trg_profiles_updated_at binding only if verified as part of auth core scope
-- - public.handle_new_user() baseline registration for auth signup flow
-- - trigger on_auth_user_created on auth.users
-- - public.profiles.nickname_confirmed onboarding contract
--
-- excluded objects for this axis
-- - blocked_nicknames / blocked_nickname_patterns and nickname policy trigger/RPC
-- - user_consent_history / account_deletion_requests / account_deletion_cleanup_items
-- - blocked nickname seed rows
-- - public.set_updated_at() definition itself
-- - public.app_role, public.profiles.role, admin helper functions
-- - bootstrap-wide pets/memories/community/storage objects
--
-- dependency boundaries
-- - no prerequisite backfilled axis
-- - nickname policy axis will later replace/extend handle_new_user() with the
--   safe temporary nickname generator that matches final nickname constraints
-- - account deletion + consent axis is logically downstream but schema-independent
--
-- remote already-exists collision risk
-- - high: public.profiles, handle_new_user(), on_auth_user_created, profiles RLS
-- - medium: nickname_confirmed default/not-null backfill on existing rows
--
-- verification required before any real SQL is filled or applied
-- - verify linked remote current profiles column set and ownership boundary
-- - verify exact handle_new_user() body currently bound to on_auth_user_created
-- - verify current profiles RLS/policy names and trg_profiles_updated_at binding
-- - verify whether nickname_confirmed already exists remotely with same default/not-null
-- - verify no remote-only drift on profiles constraints before translating docs to SQL
--
-- do not apply before verification
-- - this skeleton intentionally contains only transaction-safe comments/sections
-- - future fill-in must stay limited to auth core ownership and must not copy
--   cross-domain helper definitions into this axis

begin;

-- ============================================================================
-- section 0. skeleton status
-- ============================================================================
-- Fresh remote verification basis:
-- - verified against linked remote `grmekesqoydylqmyvfke` on 2026-03-30 UTC
-- - current remote `public.profiles` also has excluded `role app_role` column
-- - this axis intentionally leaves `profiles.role` ownership outside the file

-- ============================================================================
-- section 1. source references for future fill-in
-- ============================================================================
-- bootstrap source:
-- - docs/sql/공용/누리-전체초기구성-부트스트랩.sql
-- docs mirror source:
-- - docs/sql/인증-계정/프로필-닉네임확정-보조.sql
-- remote verification source:
-- - linked remote catalog rechecked on 2026-03-30 before this body fill

-- ============================================================================
-- section 2. planned executable blocks
-- ============================================================================
-- 2-1. profiles baseline DDL block
-- Source rationale:
-- - keep auth/account-owned columns only
-- - exclude remote `profiles.role` because it belongs to cross-domain role/admin ownership
create extension if not exists citext;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  nickname citext not null,
  avatar_url text,
  locale text not null default 'ko-KR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists email citext,
  add column if not exists nickname citext,
  add column if not exists avatar_url text,
  add column if not exists locale text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.profiles
  alter column locale set default 'ko-KR',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.profiles
set locale = coalesce(nullif(btrim(locale), ''), 'ko-KR')
where locale is null or btrim(locale) = '';

update public.profiles
set created_at = coalesce(created_at, timezone('utc', now()))
where created_at is null;

update public.profiles
set updated_at = coalesce(updated_at, timezone('utc', now()))
where updated_at is null;

alter table public.profiles
  alter column locale set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- 2-2. profiles baseline index/constraint block
-- Fresh remote verification confirmed the legacy bootstrap length constraint is still 2..24.
create unique index if not exists uq_profiles_nickname
  on public.profiles (nickname);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_nickname_length_check
      check (char_length(btrim(nickname::text)) between 2 and 24);
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_profiles_updated_at on public.profiles';
    execute 'create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at()';
  end if;
end $$;

-- 2-3. profiles own RLS policy block
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 2-4. signup trigger/function preservation block
-- Fresh remote already runs the final safe nickname generator body verified on
-- 2026-03-30. Rebinding auth core back to the older baseline body would create
-- an unnecessary regression window if the later nickname-policy axis failed.
-- This backfilled baseline-history package therefore preserves the current
-- runtime handle_new_user()/on_auth_user_created state and leaves final signup
-- trigger ownership to the nickname-policy axis.

-- 2-5. nickname_confirmed onboarding contract block
alter table public.profiles
  add column if not exists nickname_confirmed boolean;

update public.profiles
set nickname_confirmed = true
where nickname_confirmed is null;

alter table public.profiles
  alter column nickname_confirmed set default false,
  alter column nickname_confirmed set not null;

-- ============================================================================
-- section 3. explicit exclusions and non-goals
-- ============================================================================
-- Not owned here:
-- - nickname blocked term tables, normalize helper, policy trigger, availability RPC
-- - account deletion RPC/status/cleanup queue
-- - common helper definitions such as public.set_updated_at()
-- - cross-domain role/admin contracts

-- ============================================================================
-- section 4. collision checkpoints to re-verify before fill-in
-- ============================================================================
-- Fresh remote re-verification result:
-- - `profiles.role app_role` exists remotely and stays excluded here
-- - `trg_profiles_updated_at` is currently bound to `public.set_updated_at()`
-- - `handle_new_user()` is already a later safe-nickname body remotely, so this file
--   remains a baseline draft and must not be remote-applied without review

-- ============================================================================
-- section 5. implementation notes for the next fill-in turn
-- ============================================================================
-- - Keep this axis small: auth core only.
-- - Do not drag blocked nickname seed rows or deletion RPC logic into this file.
-- - Remote apply review is now locked to preserve the current linked remote
--   `handle_new_user()` / `on_auth_user_created` runtime state in this axis.
-- - Nickname-policy axis remains the only axis that should rebind the final
--   signup-safe body.

commit;

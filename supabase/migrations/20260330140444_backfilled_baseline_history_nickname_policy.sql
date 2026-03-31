-- backfilled baseline-history skeleton
-- file: 20260330140444_backfilled_baseline_history_nickname_policy.sql
-- created_at: 2026-03-30 14:04:44 Asia/Seoul
--
-- This file is a backfilled baseline-history skeleton for pre-Task6 auth/account.
-- It does not claim to be the original historical nickname-policy rollout.
-- The timestamp is the actual skeleton creation time.
--
-- runtime source of truth != execution history
-- - Runtime/source-of-truth for this axis is described by:
--   1) docs/sql/인증-계정/프로필-닉네임정책-현재로컬미러.sql
--   2) docs/sql/인증-계정/신규유저-안전닉네임처리-보조.sql
--   3) docs/sql/인증-계정/프로필-닉네임확정-보조.sql for onboarding interaction
--   4) linked remote runtime objects once re-verified
-- - Execution history currently does not explain this axis in supabase/migrations/*.
-- - This skeleton prepares a future executable backfill package without rewriting
--   the project into a fake original chronology.
--
-- included objects for this axis
-- - profiles.nickname hardening owned by nickname policy
-- - blocked_nicknames
-- - blocked_nickname_patterns
-- - set_updated_at_blocked_nicknames()
-- - normalize_nickname_for_policy()
-- - enforce_profile_nickname_policy()
-- - trg_blocked_nicknames_updated_at
-- - trg_profiles_nickname_policy
-- - blocked nickname select policies
-- - check_nickname_availability() and execute grants
-- - final policy-compatible handle_new_user() replacement for signup safety
--
-- excluded objects for this axis
-- - blocked nickname seed row inserts or 운영 row snapshots
-- - full profiles base schema and own RLS baseline
-- - user_consent_history and account deletion contracts
-- - public.set_updated_at() definition, app_role, profiles.role
-- - release checklist, app nickname UX, remote seed management
--
-- dependency boundaries
-- - depends on auth core axis for base public.profiles and trigger registration surface
-- - logically follows auth core because it tightens profiles.nickname and replaces
--   handle_new_user() with the final safe temporary nickname generator
-- - independent from account deletion + consent axis
--
-- remote already-exists collision risk
-- - high: profiles nickname constraints/index, handle_new_user(), trg_profiles_nickname_policy
-- - high: blocked_nicknames / blocked_nickname_patterns may already exist with remote-only drift
-- - medium: grant surface for check_nickname_availability()
--
-- verification required before any real SQL is filled or applied
-- - verify linked remote columns/constraints for public.profiles.nickname
-- - verify exact blocked_nicknames and blocked_nickname_patterns shape
-- - verify current handle_new_user() body and its relationship to nickname_confirmed
-- - verify current select policies and grant recipients for nickname availability RPC
-- - verify remote seed management remains outside executable baseline scope
--
-- do not apply before verification
-- - this skeleton intentionally contains no executable DDL/DML yet
-- - next fill-in must keep seed rows and cross-domain helper definitions out

begin;

-- ============================================================================
-- section 0. skeleton status
-- ============================================================================
-- Fresh remote verification basis:
-- - linked remote re-checked on 2026-03-30 UTC before this body fill
-- - current remote table-level length constraint still keeps legacy 2..24 shape
-- - current remote runtime strictness lives in trigger/RPC/handle_new_user()

-- ============================================================================
-- section 1. source references for future fill-in
-- ============================================================================
-- docs mirror source:
-- - docs/sql/인증-계정/프로필-닉네임정책-현재로컬미러.sql
-- - docs/sql/인증-계정/신규유저-안전닉네임처리-보조.sql
-- - docs/sql/인증-계정/프로필-닉네임확정-보조.sql
-- bootstrap source:
-- - docs/sql/공용/누리-전체초기구성-부트스트랩.sql only for original profiles/handle_new_user context
-- remote verification source:
-- - linked remote catalog rechecked on 2026-03-30 before this body fill

-- ============================================================================
-- section 2. planned executable blocks
-- ============================================================================
-- 2-1. profiles nickname hardening block
-- Fresh remote keeps the bootstrap 2..24 length constraint under the same name.
-- This draft preserves that verified table-level shape and leaves the stricter
-- 2..8 runtime contract to trigger/RPC/signup-safe handle_new_user().
create extension if not exists citext;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'nickname'
      and udt_name <> 'citext'
  ) then
    alter table public.profiles
      alter column nickname type citext
      using btrim(nickname::text)::citext;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_not_blank_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_nickname_not_blank_check
      check (char_length(btrim(nickname::text)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_chars_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_nickname_chars_check
      check (btrim(nickname::text) ~ '^[A-Za-z0-9가-힣]+$');
  end if;
end $$;

create unique index if not exists uq_profiles_nickname
  on public.profiles (nickname);

-- 2-2. blocked nickname schema block
create table if not exists public.blocked_nicknames (
  term citext primary key,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  match_mode text not null default 'exact'
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blocked_nicknames_match_mode_check'
      and conrelid = 'public.blocked_nicknames'::regclass
  ) then
    alter table public.blocked_nicknames
      add constraint blocked_nicknames_match_mode_check
      check (match_mode in ('exact', 'contains'));
  end if;
end $$;

create table if not exists public.blocked_nickname_patterns (
  id bigserial primary key,
  pattern text not null unique,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at_blocked_nicknames()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_blocked_nicknames_updated_at on public.blocked_nicknames;
create trigger trg_blocked_nicknames_updated_at
before update on public.blocked_nicknames
for each row execute function public.set_updated_at_blocked_nicknames();

alter table public.blocked_nicknames enable row level security;
alter table public.blocked_nickname_patterns enable row level security;

drop policy if exists "blocked_nicknames_select_authenticated" on public.blocked_nicknames;
create policy "blocked_nicknames_select_authenticated"
on public.blocked_nicknames
for select
to authenticated
using (true);

drop policy if exists "blocked_nickname_patterns_select_authenticated" on public.blocked_nickname_patterns;
create policy "blocked_nickname_patterns_select_authenticated"
on public.blocked_nickname_patterns
for select
to authenticated
using (true);

-- 2-3. normalize and policy trigger block
create or replace function public.normalize_nickname_for_policy(p_input text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(coalesce(p_input, ''));
  v := btrim(v);

  -- Remove separators before matching so simple obfuscation does not bypass policy.
  v := regexp_replace(v, '[[:space:][:punct:]_·ㆍ•…]+', '', 'g');

  -- Normalize common leet substitutions.
  v := replace(v, '0', 'o');
  v := replace(v, '1', 'i');
  v := replace(v, '!', 'i');
  v := replace(v, '3', 'e');
  v := replace(v, '4', 'a');
  v := replace(v, '5', 's');
  v := replace(v, '7', 't');
  v := replace(v, '@', 'a');
  v := replace(v, '$', 's');

  -- Collapse excessive repeated characters.
  v := regexp_replace(v, '(.)\1{2,}', '\1\1', 'g');

  return v;
end;
$$;

create or replace function public.enforce_profile_nickname_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_v text;
  v text;
begin
  raw_v := btrim(new.nickname::text);
  v := public.normalize_nickname_for_policy(raw_v);

  if raw_v is null or raw_v = '' then
    raise exception using errcode = '22023', message = 'nickname_empty';
  end if;

  if char_length(raw_v) < 2 then
    raise exception using errcode = '22023', message = 'nickname_too_short';
  end if;

  if char_length(raw_v) > 8 then
    raise exception using errcode = '22023', message = 'nickname_too_long';
  end if;

  if raw_v !~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$' then
    raise exception using errcode = '22023', message = 'nickname_invalid_chars';
  end if;

  if exists (
    select 1
    from public.blocked_nicknames bn
    where bn.is_active = true
      and (
        (bn.match_mode = 'exact' and bn.term = raw_v::citext)
        or (bn.match_mode = 'contains' and position(bn.term::text in raw_v) > 0)
        or (bn.match_mode = 'contains' and position(bn.term::text in v) > 0)
      )
  ) then
    raise exception using errcode = '22023', message = 'nickname_blocked';
  end if;

  if exists (
    select 1
    from public.blocked_nickname_patterns bp
    where bp.is_active = true
      and (raw_v ~* bp.pattern or v ~* bp.pattern)
  ) then
    raise exception using errcode = '22023', message = 'nickname_blocked';
  end if;

  new.nickname := raw_v::citext;
  return new;
end;
$$;

drop trigger if exists trg_profiles_nickname_policy on public.profiles;
create trigger trg_profiles_nickname_policy
before insert or update of nickname on public.profiles
for each row execute function public.enforce_profile_nickname_policy();

-- 2-4. nickname availability RPC block
create or replace function public.check_nickname_availability(
  p_nickname text,
  p_user_id uuid default auth.uid()
)
returns table (
  available boolean,
  code text,
  normalized text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_v text;
  v text;
begin
  if p_user_id is null then
    return query select false, 'not_authenticated'::text, ''::text;
    return;
  end if;

  raw_v := btrim(coalesce(p_nickname, ''));
  v := public.normalize_nickname_for_policy(raw_v);

  if raw_v = '' then
    return query select false, 'empty'::text, ''::text;
    return;
  end if;

  if char_length(raw_v) < 2 then
    return query select false, 'too_short'::text, v;
    return;
  end if;

  if char_length(raw_v) > 8 then
    return query select false, 'too_long'::text, v;
    return;
  end if;

  if raw_v !~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$' then
    return query select false, 'invalid_chars'::text, v;
    return;
  end if;

  if exists (
    select 1
    from public.blocked_nicknames bn
    where bn.is_active = true
      and (
        (bn.match_mode = 'exact' and bn.term = raw_v::citext)
        or (bn.match_mode = 'contains' and position(bn.term::text in raw_v) > 0)
        or (bn.match_mode = 'contains' and position(bn.term::text in v) > 0)
      )
  ) then
    return query select false, 'blocked'::text, v;
    return;
  end if;

  if exists (
    select 1
    from public.blocked_nickname_patterns bp
    where bp.is_active = true
      and (raw_v ~* bp.pattern or v ~* bp.pattern)
  ) then
    return query select false, 'blocked'::text, v;
    return;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.nickname = raw_v::citext
      and p.user_id <> p_user_id
  ) then
    return query select false, 'taken'::text, v;
    return;
  end if;

  return query select true, 'ok'::text, v;
end;
$$;

revoke all on function public.check_nickname_availability(text, uuid) from public;
grant execute on function public.check_nickname_availability(text, uuid) to anon;
grant execute on function public.check_nickname_availability(text, uuid) to authenticated;
grant execute on function public.check_nickname_availability(text, uuid) to service_role;

-- 2-5. signup-safe handle_new_user replacement block
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_email text;
  seed text;
  base text;
  candidate text;
  i int;
begin
  raw_email := new.email;

  seed := coalesce(
    new.raw_user_meta_data->>'nickname',
    split_part(coalesce(raw_email, 'nuriuser'), '@', 1),
    'nuriuser'
  );

  base := regexp_replace(seed, '[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g');
  base := btrim(base);
  if base = '' then base := 'nuri'; end if;
  if char_length(base) = 1 then base := base || '1'; end if;
  base := left(base, 8);

  candidate := base;
  for i in 0..20 loop
    begin
      insert into public.profiles (
        user_id,
        email,
        nickname,
        nickname_confirmed,
        avatar_url
      )
      values (
        new.id,
        raw_email,
        candidate::citext,
        false,
        new.raw_user_meta_data->>'avatar_url'
      )
      on conflict (user_id) do nothing;
      return new;
    exception
      when unique_violation then
        candidate := left(base, 6) || lpad((i % 100)::text, 2, '0');
    end;
  end loop;

  candidate := 'u' || substr(replace(new.id::text, '-', ''), 1, 7);
  insert into public.profiles (
    user_id,
    email,
    nickname,
    nickname_confirmed,
    avatar_url
  )
  values (
    new.id,
    raw_email,
    candidate::citext,
    false,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- section 3. explicit exclusions and non-goals
-- ============================================================================
-- Not owned here:
-- - blocked term seed data
-- - runtime 운영 row counts or manual seed sync
-- - profiles.role or admin helper contracts
-- - consent/delete RPC family

-- ============================================================================
-- section 4. collision checkpoints to re-verify before fill-in
-- ============================================================================
-- Fresh remote re-verification result:
-- - blocked-term schema/function/trigger/RPC path matches this draft
-- - `handle_new_user()` already equals the final safe-generator body remotely
-- - table-level `profiles_nickname_length_check` remains a legacy bootstrap shape

-- ============================================================================
-- section 5. implementation notes for the next fill-in turn
-- ============================================================================
-- - Keep seed rows out of executable baseline-history.
-- - Treat docs mirror as schema/function reference, not as seed snapshot.
-- - Remote apply review is now locked to preserve the verified remote
--   `profiles_nickname_length_check` 2..24 table-level shape in this package.
-- - Any 2..8 table-level tightening belongs to a later repair task with data audit.

commit;

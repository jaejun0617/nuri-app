-- 이 파일명은 legacy지만, 내용은 2026-03-30 linked remote 기준 닉네임 정책 mirror다.
-- remote source of truth는 `blocked_nicknames`, `blocked_nickname_patterns`,
-- `normalize_nickname_for_policy()`, `enforce_profile_nickname_policy()`,
-- `check_nickname_availability()`, `trg_profiles_nickname_policy` 조합이다.
-- 다만 `supabase/migrations/*`에는 이 경로의 execution migration history가 아직 없다.
-- 이 문서는 schema/function/policy mirror만 다루며, 운영 row seed 자체는 remote managed data로 본다.
--
-- ============================================================
-- NURI - Nickname policy remote-aligned mirror
-- Date: 2026-03-30
--
-- Includes:
-- 1) case-insensitive unique nickname (citext + unique index)
-- 2) blocked_nicknames + blocked_nickname_patterns schema
-- 3) normalize helper + server-side nickname policy trigger
-- 4) security-definer RPC for availability check
-- ============================================================

begin;

create extension if not exists citext;

-- 1) profiles.nickname hardening
alter table public.profiles
  alter column nickname type citext
  using btrim(nickname::text)::citext;

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
    where conname = 'profiles_nickname_length_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_nickname_length_check
      check (char_length(btrim(nickname::text)) between 2 and 10);
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
      check (btrim(nickname::text) ~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$');
  end if;
end $$;

create unique index if not exists uq_profiles_nickname
  on public.profiles (nickname);

-- 2) normalize helper used by blocked term and regex matching
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

-- 3) blocked nickname tables
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

-- Remote row data is 운영-managed. This mirror intentionally does not pin runtime seed rows.

-- 4) policy trigger for profiles.nickname
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

  if char_length(raw_v) > 10 then
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

-- 5) RPC: check nickname availability
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

  if char_length(raw_v) > 10 then
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

commit;

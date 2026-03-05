-- ============================================================
-- NURI - Nickname hardening (production-grade)
-- Date: 2026-03-06
--
-- Includes:
-- 1) case-insensitive unique nickname (citext + unique index)
-- 2) blocked nickname table
-- 3) server-side nickname policy trigger
-- 4) security-definer RPC for availability check (RLS-safe)
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
      check (char_length(btrim(nickname::text)) between 2 and 8);
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

-- 2) blocked nickname table
create table if not exists public.blocked_nicknames (
  term citext primary key,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

insert into public.blocked_nicknames(term, reason, is_active) values
  ('admin', 'reserved role', true),
  ('administrator', 'reserved role', true),
  ('official', 'reserved role', true),
  ('support', 'reserved role', true),
  ('manager', 'reserved role', true),
  ('운영자', 'reserved role', true),
  ('관리자', 'reserved role', true),
  ('누리운영팀', 'reserved role', true),
  ('nuri', 'reserved brand', true),
  ('nuri_official', 'reserved brand', true)
on conflict (term) do nothing;

alter table public.blocked_nicknames enable row level security;

drop policy if exists "blocked_nicknames_select_authenticated" on public.blocked_nicknames;
create policy "blocked_nicknames_select_authenticated"
on public.blocked_nicknames
for select
to authenticated
using (true);

-- Admin write only (service role). no insert/update/delete policy for authenticated.

-- 3) policy trigger for profiles.nickname
create or replace function public.enforce_profile_nickname_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v text;
begin
  v := btrim(new.nickname::text);

  if v is null or v = '' then
    raise exception using errcode = '22023', message = 'nickname_empty';
  end if;

  if char_length(v) < 2 then
    raise exception using errcode = '22023', message = 'nickname_too_short';
  end if;

  if char_length(v) > 8 then
    raise exception using errcode = '22023', message = 'nickname_too_long';
  end if;

  if v !~ '^[A-Za-z0-9가-힣]+$' then
    raise exception using errcode = '22023', message = 'nickname_invalid_chars';
  end if;

  if exists (
    select 1
    from public.blocked_nicknames bn
    where bn.term = v::citext
      and bn.is_active = true
  ) then
    raise exception using errcode = '22023', message = 'nickname_blocked';
  end if;

  new.nickname := v::citext;
  return new;
end;
$$;

drop trigger if exists trg_profiles_nickname_policy on public.profiles;
create trigger trg_profiles_nickname_policy
before insert or update of nickname on public.profiles
for each row execute function public.enforce_profile_nickname_policy();

-- 4) RPC: check nickname availability (RLS-safe)
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
  v text;
begin
  if p_user_id is null then
    return query select false, 'not_authenticated'::text, ''::text;
    return;
  end if;

  v := btrim(coalesce(p_nickname, ''));

  if v = '' then
    return query select false, 'empty'::text, ''::text;
    return;
  end if;

  if char_length(v) < 2 then
    return query select false, 'too_short'::text, v;
    return;
  end if;

  if char_length(v) > 8 then
    return query select false, 'too_long'::text, v;
    return;
  end if;

  if v !~ '^[A-Za-z0-9가-힣]+$' then
    return query select false, 'invalid_chars'::text, v;
    return;
  end if;

  if exists (
    select 1
    from public.blocked_nicknames bn
    where bn.term = v::citext
      and bn.is_active = true
  ) then
    return query select false, 'blocked'::text, v;
    return;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.nickname = v::citext
      and p.user_id <> p_user_id
  ) then
    return query select false, 'taken'::text, v;
    return;
  end if;

  return query select true, 'ok'::text, v;
end;
$$;

revoke all on function public.check_nickname_availability(text, uuid) from public;
grant execute on function public.check_nickname_availability(text, uuid) to authenticated;

commit;

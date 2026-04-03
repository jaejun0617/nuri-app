begin;

-- live audit on 2026-04-03 confirmed no profiles.nickname rows violate 2..10.
alter table public.profiles
  drop constraint if exists profiles_nickname_length_check;

alter table public.profiles
  add constraint profiles_nickname_length_check
  check (char_length(btrim(nickname::text)) between 2 and 10) not valid;

alter table public.profiles
  drop constraint if exists profiles_nickname_chars_check;

alter table public.profiles
  add constraint profiles_nickname_chars_check
  check (btrim(nickname::text) ~ '^[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$') not valid;

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

  if base = '' then
    base := 'nuri';
  end if;

  if char_length(base) = 1 then
    base := base || '1';
  end if;

  base := left(base, 10);
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
        candidate := left(base, 8) || lpad((i % 100)::text, 2, '0');
    end;
  end loop;

  candidate := 'u' || substr(replace(new.id::text, '-', ''), 1, 9);
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

alter table public.profiles
  validate constraint profiles_nickname_length_check;

alter table public.profiles
  validate constraint profiles_nickname_chars_check;

commit;

-- ============================================================
-- NURI - Nickname completion flag
-- Date: 2026-03-06
--
-- 목적:
-- - "닉네임 존재 여부"가 아닌 "닉네임 설정 완료 여부"로 온보딩 분기
-- - 앱 튕김/재실행 시에도 닉네임 미완료면 NicknameSetup으로 복귀
-- ============================================================

begin;

alter table public.profiles
  add column if not exists nickname_confirmed boolean;

-- 기존 사용자 보호: 기존 row는 완료 처리
update public.profiles
set nickname_confirmed = true
where nickname_confirmed is null;

alter table public.profiles
  alter column nickname_confirmed set default false;

alter table public.profiles
  alter column nickname_confirmed set not null;

-- auth signup 트리거: 신규 계정은 nickname_confirmed=false로 시작
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

commit;

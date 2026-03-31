-- 이 파일은 신규 유저 가입 시 안전한 임시 닉네임을 만드는 보조 SQL이다.
-- `handle_new_user()`를 닉네임 정책과 연결해 회원가입 실패를 줄이는 용도로 사용한다.
-- 단독 최종본이 아니라 `프로필-닉네임정책-현재로컬미러.sql`, `프로필-닉네임확정-보조.sql`과 함께 인증/계정 최소 세트를 이룬다.
--
-- ============================================================
-- NURI - Auth signUp 안정화 (profiles 자동 생성 닉네임 보정)
-- Date: 2026-03-06
--
-- 배경:
-- - profiles.nickname 제약(길이/문자/금칙어/unique) 강화 이후
--   auth.users 가입 트리거(handle_new_user)가 생성하는 닉네임이
--   제약에 걸리면 회원가입 자체가 실패할 수 있음.
--
-- 목적:
-- - signUp 시 profiles 자동 생성은 유지하되,
--   제약을 통과하는 안전한 임시 닉네임을 보장.
-- ============================================================

begin;

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

  -- 닉네임 정책과 동일한 허용 문자만 남긴다.
  base := regexp_replace(seed, '[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g');
  base := btrim(base);

  if base = '' then
    base := 'nuri';
  end if;

  -- 최소 2자 보장
  if char_length(base) = 1 then
    base := base || '1';
  end if;

  -- 최대 8자 제한
  base := left(base, 8);

  -- 우선 base 그대로 시도, 충돌 시 짧은 suffix를 붙여 재시도
  candidate := base;
  for i in 0..20 loop
    begin
      insert into public.profiles (user_id, email, nickname, avatar_url)
      values (new.id, raw_email, candidate::citext, new.raw_user_meta_data->>'avatar_url')
      on conflict (user_id) do nothing;

      return new;
    exception
      when unique_violation then
        -- nickname unique 충돌 시 2자리 suffix
        candidate := left(base, 6) || lpad((i % 100)::text, 2, '0');
    end;
  end loop;

  -- 최후 fallback (uuid 기반, 길이 8)
  candidate := 'u' || substr(replace(new.id::text, '-', ''), 1, 7);
  insert into public.profiles (user_id, email, nickname, avatar_url)
  values (new.id, raw_email, candidate::citext, new.raw_user_meta_data->>'avatar_url')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

commit;

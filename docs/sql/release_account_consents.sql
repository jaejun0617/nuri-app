-- 파일: docs/sql/release_account_consents.sql
-- 목적:
-- - 출시 전 필수 항목 중 "약관/개인정보/마케팅 동의 이력" 저장 테이블 추가
-- - 앱 내 계정 삭제 RPC(delete_my_account) 기준 함수 제공

create extension if not exists pgcrypto;

create table if not exists public.user_consent_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing')),
  agreed boolean not null,
  policy_version text not null,
  source text not null default 'signup',
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_consent_history_user_created_at
  on public.user_consent_history (user_id, created_at desc);

alter table public.user_consent_history enable row level security;

drop policy if exists "user_consent_history_select_own"
  on public.user_consent_history;

create policy "user_consent_history_select_own"
  on public.user_consent_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_consent_history_insert_own"
  on public.user_consent_history;

create policy "user_consent_history_insert_own"
  on public.user_consent_history
  for insert
  with check (auth.uid() = user_id);

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_consent_history where user_id = v_user_id;
  delete from public.memories where pet_id in (select id from public.pets where user_id = v_user_id);
  delete from public.pet_schedules where user_id = v_user_id;
  delete from public.pets where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

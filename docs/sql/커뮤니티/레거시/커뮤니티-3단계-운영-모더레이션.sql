-- 레거시 단계 적용 SQL
-- 이 파일은 커뮤니티 운영 스키마를 단계별로 쪼개 적용하던 과거 분할본이다.
-- 현재 최종 상태 source of truth는 `docs/sql/커뮤니티/커뮤니티-운영-최종.sql`과 linked remote migration history다.
-- 신규 remote 적용 기준으로 이 파일만 단독 실행하지 말고, 차이 분석이나 단계별 참고용으로만 사용한다.

-- NURI 커뮤니티 3단계 적용 SQL
-- 목표:
-- - 운영자/모더레이션 기준 컬럼 보강
-- - 관리자 helper 함수
-- - admin RLS
-- - 감사 로그 조회 확장
--
-- 의도적으로 제외:
-- - 신고 임계값 auto_hidden trigger
--   현재 프로젝트 문서 기준으로 임계값 확정 전이라 여기서는 보류한다.

begin;

alter table public.posts
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists operator_memo text;

alter table public.reports
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists operator_memo text;

create index if not exists idx_audit_logs_user_id
  on public.audit_logs (user_id, created_at desc);

create or replace function public.is_community_admin()
returns boolean
language plpgsql
stable
as $$
declare
  is_admin boolean := false;
begin
  begin
    select exists (
      select 1
      from public.profiles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
    )
    into is_admin;
  exception
    when undefined_column then
      return false;
  end;

  return coalesce(is_admin, false);
end;
$$;

drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

create policy "posts_update_own"
on public.posts for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "posts_delete_own"
on public.posts for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;

create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "reports_admin_select" on public.reports;
drop policy if exists "reports_admin_update" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_select_own_or_admin" on public.reports;

create policy "reports_select_own_or_admin"
on public.reports for select
using (auth.uid() = reporter_id or public.is_community_admin());

create policy "reports_admin_update"
on public.reports for update
using (public.is_community_admin())
with check (public.is_community_admin());

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
drop policy if exists "audit_logs_select_own_or_admin" on public.audit_logs;
create policy "audit_logs_select_own_or_admin"
on public.audit_logs for select
using (public.is_community_admin() or auth.uid() = user_id);

commit;

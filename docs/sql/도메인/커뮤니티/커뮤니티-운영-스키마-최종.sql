-- NURI 커뮤니티 운영 스키마 최종본
-- 작성일: 2026-03-22
-- 작성 기준:
-- - docs/커뮤니티-기획/커뮤니티-실서비스급-아키텍처-기획서.md
-- - docs/sql/공용-릴리즈-묶음/전체-초기-구성/누리-전체-초기-구성.sql
--
-- 목적:
-- - 기존 public.posts / comments / likes / reports / audit_logs seed 구조를
--   커뮤니티 MVP + 운영/모더레이션 기준까지 확장하는 최종 목표 SQL이다.
-- - 이 파일은 전체 목표 상태를 한 번에 보여주는 기준본이다.
-- - 실제 적용은 1단계/2단계/3단계 분리 SQL을 우선 권장한다.
--
-- 주의:
-- - image_url 컬럼은 signed URL이 아니라 storage path 저장을 전제로 한다.
-- - 삭제의 source of truth는 deleted_at 이다. status = 'deleted'는 deleted_at과 함께만 사용한다.
-- - auto_hidden 임계값 trigger는 제품 의사결정이 고정되기 전까지 포함하지 않는다.
-- - 현재 프로젝트 role 체계는 public.profiles.role 에 admin / super_admin 존재를 전제한다.
-- - 게시/댓글 rate limiting은 RLS만으로 해결하지 않고 앱 레이어 또는 Edge Function에서 별도 처리해야 한다.

begin;

-- ============================================================
-- 1) POSTS 보강
-- ============================================================
alter table public.posts
  add column if not exists status text not null default 'active',
  add column if not exists category text,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists report_count integer not null default 0,
  add column if not exists author_snapshot_nickname text,
  add column if not exists author_snapshot_avatar_url text,
  add column if not exists pet_snapshot_name text,
  add column if not exists pet_snapshot_species text,
  add column if not exists pet_snapshot_breed text,
  add column if not exists pet_snapshot_age_label text,
  add column if not exists pet_snapshot_avatar_path text,
  add column if not exists show_pet_age boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists operator_memo text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_status_check'
  ) then
    alter table public.posts
      add constraint posts_status_check
      check (status in ('active', 'hidden', 'auto_hidden', 'deleted', 'banned'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_deleted_consistency_check'
  ) then
    alter table public.posts
      add constraint posts_deleted_consistency_check
      check (
        (deleted_at is null and status <> 'deleted')
        or (deleted_at is not null and status = 'deleted')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_check'
  ) then
    alter table public.posts
      add constraint posts_category_check
      check (category is null or category in ('free', 'question', 'info', 'daily'));
  end if;
end
$$;

create index if not exists idx_posts_active_public_feed
  on public.posts (created_at desc, id desc)
  where visibility = 'public' and status = 'active' and deleted_at is null;

create index if not exists idx_posts_category_active_public_feed
  on public.posts (category, created_at desc, id desc)
  where visibility = 'public' and status = 'active' and deleted_at is null;

drop index if exists idx_posts_user_created_at;
create index if not exists idx_posts_user_created_at
  on public.posts (user_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists idx_posts_status_created_at
  on public.posts (status, created_at desc, id desc);

-- ============================================================
-- 2) COMMENTS 보강
-- ============================================================
alter table public.comments
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_status_check'
  ) then
    alter table public.comments
      add constraint comments_status_check
      check (status in ('active', 'hidden', 'deleted'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_deleted_consistency_check'
  ) then
    alter table public.comments
      add constraint comments_deleted_consistency_check
      check (
        (deleted_at is null and status <> 'deleted')
        or (deleted_at is not null and status = 'deleted')
      );
  end if;
end
$$;

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create index if not exists idx_comments_post_active_created_at
  on public.comments (post_id, created_at asc, id asc)
  where status = 'active' and deleted_at is null;

create index if not exists idx_comments_user_created_at
  on public.comments (user_id, created_at desc, id desc);

-- ============================================================
-- 3) REPORTS 보강
-- ============================================================
alter table public.reports
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists operator_memo text,
  add column if not exists reason_category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_reason_category_check'
  ) then
    alter table public.reports
      add constraint reports_reason_category_check
      check (
        reason_category is null
        or reason_category in (
          'spam',
          'hate',
          'advertising',
          'misinformation',
          'personal_info',
          'other'
        )
      );
  end if;
end
$$;

create unique index if not exists uq_reports_reporter_target
  on public.reports (reporter_id, target_type, target_id);

create index if not exists idx_reports_target
  on public.reports (target_type, target_id, created_at desc);

-- ============================================================
-- 4) AUDIT LOGS 보강
-- ============================================================
create index if not exists idx_audit_logs_user_id
  on public.audit_logs (user_id, created_at desc);

-- ============================================================
-- 5) ADMIN HELPER
-- ============================================================
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

-- ============================================================
-- 6) COUNTER SYNC TRIGGERS
-- ============================================================
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set like_count = like_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
    set like_count = greatest(like_count - 1, 0)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.repair_post_counts(target_post_id uuid default null)
returns void
language plpgsql
as $$
begin
  update public.posts p
  set
    like_count = (
      select count(*)
      from public.likes l
      where l.post_id = p.id
    ),
    comment_count = (
      select count(*)
      from public.comments c
      where c.post_id = p.id
        and c.deleted_at is null
        and c.status = 'active'
    ),
    report_count = (
      select count(*)
      from public.reports r
      where r.target_type = 'post'
        -- 현재 seed 스키마 기준 public.reports.target_id 는 uuid다.
        -- 따라서 캐스팅 없이 uuid = uuid 비교를 유지해 인덱스 활용을 보장한다.
        and r.target_id = p.id
    )
  where target_post_id is null
    or p.id = target_post_id;
end;
$$;

drop trigger if exists trg_sync_post_like_count on public.likes;
create trigger trg_sync_post_like_count
after insert or delete on public.likes
for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
as $$
declare
  old_countable boolean := false;
  new_countable boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_countable := old.deleted_at is null and old.status = 'active';
  end if;

  if tg_op <> 'DELETE' then
    new_countable := new.deleted_at is null and new.status = 'active';
  end if;

  if tg_op = 'INSERT' and new_countable then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' and old_countable then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.post_id;
  elsif tg_op = 'UPDATE' and old_countable = true and new_countable = false then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = new.post_id;
  elsif tg_op = 'UPDATE' and old_countable = false and new_countable = true then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comment_count on public.comments;
create trigger trg_sync_post_comment_count
after insert or delete or update of deleted_at, status on public.comments
for each row execute function public.sync_post_comment_count();

create or replace function public.sync_post_report_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.target_type = 'post' then
    update public.posts
    set report_count = report_count + 1
    where id = new.target_id;
  elsif tg_op = 'DELETE' and old.target_type = 'post' then
    update public.posts
    set report_count = greatest(report_count - 1, 0)
    where id = old.target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_report_count on public.reports;
create trigger trg_sync_post_report_count
after insert or delete on public.reports
for each row execute function public.sync_post_report_count();

-- ============================================================
-- 7) RLS 재작성
-- ============================================================
drop policy if exists "posts_select_public_or_own" on public.posts;
drop policy if exists "posts_crud_own" on public.posts;
drop policy if exists "posts_select_active_public" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

create policy "posts_select_active_public"
on public.posts for select
using (
  (
    visibility = 'public'
    and status = 'active'
    and deleted_at is null
  )
  or auth.uid() = user_id
  or public.is_community_admin()
);

create policy "posts_insert_own"
on public.posts for insert
with check (auth.uid() = user_id);

create policy "posts_update_own"
on public.posts for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "posts_delete_own"
on public.posts for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "comments_select_by_post_visibility" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;

create policy "comments_select_by_post_visibility"
on public.comments for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or comments.user_id = auth.uid()
);

create policy "comments_insert_own"
on public.comments for insert
with check (auth.uid() = user_id);

create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id or public.is_community_admin())
with check (auth.uid() = user_id or public.is_community_admin());

create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "likes_select_by_post_visibility" on public.likes;
drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;

create policy "likes_select_by_post_visibility"
on public.likes for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = likes.post_id
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or likes.user_id = auth.uid()
);

create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id or public.is_community_admin());

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_admin_select" on public.reports;
drop policy if exists "reports_select_own_or_admin" on public.reports;
drop policy if exists "reports_admin_update" on public.reports;

create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "reports_select_own_or_admin"
on public.reports for select
using (auth.uid() = reporter_id or public.is_community_admin());

create policy "reports_admin_update"
on public.reports for update
using (public.is_community_admin())
with check (public.is_community_admin());

drop policy if exists "audit_logs_select_own" on public.audit_logs;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
drop policy if exists "audit_logs_select_own_or_admin" on public.audit_logs;

create policy "audit_logs_select_own_or_admin"
on public.audit_logs for select
using (public.is_community_admin() or auth.uid() = user_id);

-- ============================================================
-- 8) STORAGE: community-images
-- ============================================================
-- 앱 레이어 주의:
-- - image_url 은 storage path 저장만 담당한다.
-- - 실제 렌더링은 앱 레이어에서 signed URL 생성/캐시/만료 갱신을 직접 처리해야 한다.
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', false)
on conflict (id) do nothing;

drop policy if exists "community_images_insert_own" on storage.objects;
create policy "community_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "community_images_select_authenticated" on storage.objects;
create policy "community_images_select_authenticated"
on storage.objects for select to authenticated
using (
  bucket_id = 'community-images'
);

drop policy if exists "community_images_delete_own" on storage.objects;
create policy "community_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'community-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

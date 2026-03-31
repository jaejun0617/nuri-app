-- 레거시 단계 적용 SQL
-- 이 파일은 커뮤니티 운영 스키마를 단계별로 쪼개 적용하던 과거 분할본이다.
-- 현재 최종 상태 source of truth는 `docs/sql/커뮤니티/커뮤니티-운영-최종.sql`과 linked remote migration history다.
-- 신규 remote 적용 기준으로 이 파일만 단독 실행하지 말고, 차이 분석이나 단계별 참고용으로만 사용한다.

-- NURI 커뮤니티 2단계 적용 SQL
-- 목표:
-- - 게시글 작성/수정/삭제
-- - 댓글 작성/삭제
-- - 좋아요
-- - 신고 접수
-- - 이미지 업로드 bucket
-- - like_count / comment_count 동기화
--
-- 주의:
-- - 게시/댓글 rate limiting은 앱 레이어 또는 Edge Function에서 별도 처리해야 한다.
-- - image_url 은 storage path 저장만 담당하며, signed URL 생성/만료 갱신은 앱 레이어 책임이다.

begin;

alter table public.reports
  add column if not exists reason_category text;

alter table public.posts
  add column if not exists report_count integer not null default 0,
  add column if not exists author_snapshot_nickname text,
  add column if not exists author_snapshot_avatar_url text,
  add column if not exists pet_snapshot_name text,
  add column if not exists pet_snapshot_species text,
  add column if not exists pet_snapshot_breed text,
  add column if not exists pet_snapshot_age_label text,
  add column if not exists pet_snapshot_avatar_path text,
  add column if not exists show_pet_age boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_reason_category_check'
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
        -- 따라서 캐스팅 없이 uuid = uuid 비교를 유지한다.
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

drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

create policy "posts_insert_own"
on public.posts for insert
with check (auth.uid() = user_id);

create policy "posts_update_own"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "posts_delete_own"
on public.posts for delete
using (auth.uid() = user_id);

drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;

create policy "comments_insert_own"
on public.comments for insert
with check (auth.uid() = user_id);

create policy "comments_update_own"
on public.comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "comments_delete_own"
on public.comments for delete
using (auth.uid() = user_id);

drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_delete_own" on public.likes;

create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own" on public.reports;

create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "reports_select_own"
on public.reports for select
using (auth.uid() = reporter_id);

-- 주의:
-- - 2단계에서는 신고 접수와 사용자 본인 조회까지만 포함한다.
-- - resolved_by / resolved_at / operator_memo 기반 처리 플로우는 3단계 운영/모더레이션 SQL 적용 후 활성화한다.

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

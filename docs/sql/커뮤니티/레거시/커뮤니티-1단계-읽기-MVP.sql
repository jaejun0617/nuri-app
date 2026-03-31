-- 레거시 단계 적용 SQL
-- 이 파일은 커뮤니티 운영 스키마를 단계별로 쪼개 적용하던 과거 분할본이다.
-- 현재 최종 상태 source of truth는 `docs/sql/커뮤니티/커뮤니티-운영-최종.sql`과 linked remote migration history다.
-- 신규 remote 적용 기준으로 이 파일만 단독 실행하지 말고, 차이 분석이나 단계별 참고용으로만 사용한다.

-- NURI 커뮤니티 1단계 적용 SQL
-- 목표:
-- - 목록/상세 읽기 MVP에 필요한 최소 posts/comments 보강
-- - feed / comments 조회 인덱스
-- - 게스트 읽기 + 본인 글 읽기를 위한 최소 RLS 재작성
--
-- 이번 단계에 포함하지 않는 것:
-- - 이미지 bucket
-- - 신고 확장
-- - 관리자 정책
-- - like/comment counter trigger
-- - moderation 전용 컬럼 다수
-- - 게시/댓글 rate limiting

-- 주의:
-- - 삭제의 source of truth는 deleted_at 이다.
-- - status = 'deleted'는 deleted_at과 함께만 사용한다.

begin;

alter table public.posts
  add column if not exists status text not null default 'active',
  add column if not exists category text,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_status_check'
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
    select 1 from pg_constraint where conname = 'posts_deleted_consistency_check'
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
    select 1 from pg_constraint where conname = 'posts_category_check'
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

alter table public.comments
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_status_check'
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
    select 1 from pg_constraint where conname = 'comments_deleted_consistency_check'
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

drop policy if exists "posts_select_public_or_own" on public.posts;
drop policy if exists "posts_crud_own" on public.posts;
drop policy if exists "posts_select_active_public" on public.posts;

create policy "posts_select_active_public"
on public.posts for select
using (
  (
    visibility = 'public'
    and status = 'active'
    and deleted_at is null
  )
  or auth.uid() = user_id
);

drop policy if exists "comments_select_by_post_visibility" on public.comments;

create policy "comments_select_by_post_visibility"
on public.comments for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (
        p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or comments.user_id = auth.uid()
);

drop policy if exists "likes_select_by_post_visibility" on public.likes;
create policy "likes_select_by_post_visibility"
on public.likes for select
using (
  exists (
    select 1
    from public.posts p
    where p.id = likes.post_id
      and (
        p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  )
  or likes.user_id = auth.uid()
);

commit;

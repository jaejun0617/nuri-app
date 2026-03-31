-- 레거시 단계 적용 SQL
-- 이 파일은 커뮤니티 운영 스키마를 단계별로 쪼개 적용하던 과거 분할본이다.
-- 현재 최종 상태 source of truth는 `docs/sql/커뮤니티/커뮤니티-운영-최종.sql`과 linked remote migration history다.
-- 신규 remote 적용 기준으로 이 파일만 단독 실행하지 말고, 차이 분석이나 단계별 참고용으로만 사용한다.

-- NURI 커뮤니티 6단계 적용 SQL
-- 목표:
-- - comments를 1-depth reply 구조로 확장
-- - comment_likes 테이블 추가
-- - reply_count / like_count 동기화 trigger 추가
-- - 댓글/댓글좋아요 RLS를 실서비스 기준으로 강화
--
-- 전제:
-- - 3단계 운영 모더레이션 SQL까지 적용되어 있어 public.is_community_admin()을 사용할 수 있다고 가정한다.
-- - 앱은 reply 저장 시 항상 top-level comment id를 parent_comment_id로 넘긴다.
--
-- 정책:
-- - depth는 0(원댓글), 1(답글)만 허용한다.
-- - 답글에 다시 답글을 다는 depth 2+ 구조는 DB에서 차단한다.
-- - soft delete 기준은 deleted_at + status 조합을 따른다.

begin;

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists depth smallint not null default 0,
  add column if not exists reply_count integer not null default 0,
  add column if not exists like_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_depth_check'
  ) then
    alter table public.comments
      add constraint comments_depth_check
      check (depth in (0, 1));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_depth_parent_consistency_check'
  ) then
    alter table public.comments
      add constraint comments_depth_parent_consistency_check
      check (
        (depth = 0 and parent_comment_id is null)
        or (depth = 1 and parent_comment_id is not null)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'comments_parent_not_self_check'
  ) then
    alter table public.comments
      add constraint comments_parent_not_self_check
      check (parent_comment_id is null or parent_comment_id <> id);
  end if;
end
$$;

create index if not exists idx_comments_post_parent_created_at
  on public.comments (post_id, parent_comment_id, created_at asc, id asc);

create index if not exists idx_comments_parent_created_at
  on public.comments (parent_comment_id, created_at asc, id asc)
  where parent_comment_id is not null;

create index if not exists idx_comments_post_like_rank
  on public.comments (post_id, like_count desc, created_at asc, id asc)
  where parent_comment_id is null and status = 'active' and deleted_at is null;

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_comment_likes_comment_user unique (comment_id, user_id)
);

create index if not exists idx_comment_likes_comment
  on public.comment_likes (comment_id, created_at desc);

create index if not exists idx_comment_likes_user
  on public.comment_likes (user_id, created_at desc);

create or replace function public.enforce_comment_thread_integrity()
returns trigger
language plpgsql
as $$
declare
  parent_comment_record public.comments%rowtype;
begin
  if new.parent_comment_id is null then
    new.depth := 0;
    return new;
  end if;

  select *
  into parent_comment_record
  from public.comments
  where id = new.parent_comment_id;

  if not found then
    raise exception 'parent comment not found';
  end if;

  if parent_comment_record.post_id <> new.post_id then
    raise exception 'reply must reference a comment in the same post';
  end if;

  if parent_comment_record.parent_comment_id is not null or parent_comment_record.depth <> 0 then
    raise exception 'reply depth exceeds supported range';
  end if;

  if parent_comment_record.deleted_at is not null or parent_comment_record.status <> 'active' then
    raise exception 'cannot reply to inactive parent comment';
  end if;

  new.depth := 1;
  return new;
end;
$$;

create or replace function public.can_insert_community_comment(
  target_post_id uuid,
  target_parent_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if target_parent_comment_id is null then
    return exists (
      select 1
      from public.posts p
      where p.id = target_post_id
        and (
          public.is_community_admin()
          or p.user_id = auth.uid()
          or (
            p.visibility = 'public'
            and p.status = 'active'
            and p.deleted_at is null
          )
        )
    );
  end if;

  return exists (
    select 1
    from public.posts p
    join public.comments parent on parent.post_id = p.id
    where p.id = target_post_id
      and parent.id = target_parent_comment_id
      and parent.post_id = target_post_id
      and parent.parent_comment_id is null
      and parent.depth = 0
      and parent.deleted_at is null
      and parent.status = 'active'
      and (
        public.is_community_admin()
        or p.user_id = auth.uid()
        or (
          p.visibility = 'public'
          and p.status = 'active'
          and p.deleted_at is null
        )
      )
  );
end;
$$;

drop trigger if exists trg_enforce_comment_thread_integrity on public.comments;
create trigger trg_enforce_comment_thread_integrity
before insert or update of parent_comment_id, post_id on public.comments
for each row execute function public.enforce_comment_thread_integrity();

create or replace function public.cascade_comment_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if
    new.parent_comment_id is null
    and old.deleted_at is null
    and new.deleted_at is not null
    and new.status = 'deleted'
  then
    update public.comments
    set
      status = 'deleted',
      deleted_at = coalesce(deleted_at, new.deleted_at),
      updated_at = timezone('utc', now())
    where parent_comment_id = new.id
      and deleted_at is null
      and status <> 'deleted';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_cascade_comment_soft_delete on public.comments;
create trigger trg_cascade_comment_soft_delete
after update of deleted_at, status on public.comments
for each row execute function public.cascade_comment_soft_delete();

create or replace function public.sync_comment_reply_count()
returns trigger
language plpgsql
as $$
declare
  target_parent_id uuid := null;
  alternate_parent_id uuid := null;
begin
  if tg_op <> 'INSERT' then
    target_parent_id := old.parent_comment_id;
  end if;

  if tg_op <> 'DELETE' then
    if target_parent_id is null then
      target_parent_id := new.parent_comment_id;
    elsif new.parent_comment_id is distinct from old.parent_comment_id then
      alternate_parent_id := new.parent_comment_id;
    end if;
  end if;

  if target_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = target_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = target_parent_id;
  end if;

  if alternate_parent_id is not null then
    update public.comments parent
    set reply_count = (
      select count(*)
      from public.comments child
      where child.parent_comment_id = alternate_parent_id
        and child.deleted_at is null
        and child.status = 'active'
    )
    where parent.id = alternate_parent_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_comment_reply_count on public.comments;
create trigger trg_sync_comment_reply_count
after insert or delete or update of parent_comment_id, deleted_at, status on public.comments
for each row execute function public.sync_comment_reply_count();

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments
    set like_count = like_count + 1
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_comment_like_count on public.comment_likes;
create trigger trg_sync_comment_like_count
after insert or delete on public.comment_likes
for each row execute function public.sync_comment_like_count();

update public.comments parent
set reply_count = (
  select count(*)
  from public.comments child
  where child.parent_comment_id = parent.id
    and child.deleted_at is null
    and child.status = 'active'
)
where parent.parent_comment_id is null;

update public.comments
set like_count = 0;

update public.comments c
set like_count = counts.total_count
from (
  select comment_id, count(*)::integer as total_count
  from public.comment_likes
  group by comment_id
) counts
where c.id = counts.comment_id;

drop policy if exists "comment_likes_select_by_comment_visibility" on public.comment_likes;
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
drop policy if exists "comment_likes_delete_own" on public.comment_likes;
drop policy if exists "comments_insert_own" on public.comments;

create policy "comments_insert_own"
on public.comments for insert
with check (
  auth.uid() = user_id
  and public.can_insert_community_comment(comments.post_id, comments.parent_comment_id)
);

create policy "comment_likes_select_by_comment_visibility"
on public.comment_likes for select
using (
  exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_likes.comment_id
      and c.deleted_at is null
      and c.status = 'active'
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
  or comment_likes.user_id = auth.uid()
);

create policy "comment_likes_insert_own"
on public.comment_likes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_likes.comment_id
      and c.deleted_at is null
      and c.status = 'active'
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
);

create policy "comment_likes_delete_own"
on public.comment_likes for delete
using (auth.uid() = user_id or public.is_community_admin());

commit;

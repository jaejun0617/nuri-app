-- 레거시 단계 적용 SQL
-- 이 파일은 커뮤니티 운영 스키마를 단계별로 쪼개 적용하던 과거 분할본이다.
-- 현재 최종 상태 source of truth는 `docs/sql/커뮤니티/커뮤니티-운영-최종.sql`과 linked remote migration history다.
-- 신규 remote 적용 기준으로 이 파일만 단독 실행하지 말고, 차이 분석이나 단계별 참고용으로만 사용한다.

-- NURI 커뮤니티 5단계 적용 SQL
-- 목표:
-- - posts.title 컬럼 추가
-- - 기존 레거시 게시글 title backfill
-- - 제목 길이 제약 추가
--
-- 주의:
-- - 기존 게시글은 본문 첫 줄을 우선 title로 승격하고, 첫 줄이 비어 있으면 본문 trim 결과를 사용한다.
-- - 제목 정책은 1자 이상 80자 이하를 기준으로 맞춘다.

begin;

alter table public.posts
  add column if not exists title text;

update public.posts
set title = coalesce(
  nullif(left(btrim(split_part(content, E'\n', 1)), 80), ''),
  left(btrim(content), 80)
)
where title is null
   or btrim(title) = '';

alter table public.posts
  alter column title set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_title_length_check'
  ) then
    alter table public.posts
      add constraint posts_title_length_check
      check (char_length(btrim(title)) between 1 and 80);
  end if;
end
$$;

commit;

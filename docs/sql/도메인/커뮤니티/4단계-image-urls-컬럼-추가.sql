-- NURI 커뮤니티 image_urls 컬럼 추가 마이그레이션
-- 작성일: 2026-03-22
-- 목적:
-- - 기존 단일 image_url 하위 호환을 유지한 채 posts에 다중 이미지 경로 컬럼을 추가한다.
-- - 커뮤니티 글 작성 화면의 최대 3장 썸네일 업로드 구조를 위한 저장소 확장을 연다.
--
-- 주의:
-- - image_url 컬럼은 삭제하지 않는다.
-- - image_urls 는 storage path 기준 text[] 컬럼으로 유지한다.
-- - 기존 단일 image_url 값은 image_urls[1]로 1차 백필한다.

begin;

alter table public.posts
  add column if not exists image_urls text[] not null default '{}';

update public.posts
set image_urls = array[image_url]
where coalesce(array_length(image_urls, 1), 0) = 0
  and image_url is not null
  and btrim(image_url) <> '';

commit;

-- 이 파일은 legacy `memories.image_url`과 `image_urls`를 함께 유지하기 위한 호환성 추가 SQL이다.
-- `public.memories.image_urls` 컬럼과 GIN index를 추가해 다중 이미지 persistence 이전/이후 데이터를 함께 읽게 한다.
-- 타임라인 메모리 이미지 최종본을 대체하지 않고, backward compatibility가 필요할 때 함께 비교하는 보조 SQL이다.
--
-- NURI migration: enable multi-image persistence for memories
-- Run in Supabase SQL Editor once.

alter table public.memories
  add column if not exists image_urls text[] not null default '{}'::text[];

update public.memories
set image_urls = case
  when coalesce(array_length(image_urls, 1), 0) > 0 then image_urls
  when image_url is not null and btrim(image_url) <> '' then array[image_url]
  else '{}'::text[]
end
where true;

create index if not exists idx_memories_image_urls_gin
  on public.memories using gin (image_urls);

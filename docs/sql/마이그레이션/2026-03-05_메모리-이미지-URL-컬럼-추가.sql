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


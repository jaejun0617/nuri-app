begin;

-- The first notice-first index was created with PostgreSQL's default DESC null
-- placement. Recreate only that newly-added index with the exact feed order so
-- notice_published_at DESC NULLS LAST is supported without an extra sort.
drop index if exists public.idx_posts_active_public_all_notice_first;

create index idx_posts_active_public_all_notice_first
  on public.posts (
    is_notice desc,
    notice_published_at desc nulls last,
    created_at desc,
    id desc
  )
  where visibility = 'public'
    and status = 'active'
    and deleted_at is null;

commit;

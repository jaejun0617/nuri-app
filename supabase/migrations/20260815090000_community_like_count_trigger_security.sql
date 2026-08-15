begin;

-- NURI-09 additive like_count integrity hardening.
--
-- likes INSERT/DELETE remains the source event. The trigger must update the
-- related post as its owner so posts RLS cannot silently filter a non-owner's
-- counter update. No post, like, or production data is created or repaired.
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
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

-- This function is trigger-internal. Client roles must not invoke it directly.
revoke all on function public.sync_post_like_count()
  from public, anon, authenticated;
grant execute on function public.sync_post_like_count()
  to postgres, service_role;

-- repair_post_counts() is retained for trusted operational use only. It is
-- intentionally not SECURITY DEFINER and is not a client repair API; removing
-- client EXECUTE closes the arbitrary direct repair path without changing data.
revoke all on function public.repair_post_counts(uuid)
  from public, anon, authenticated;
grant execute on function public.repair_post_counts(uuid)
  to postgres, service_role;

commit;

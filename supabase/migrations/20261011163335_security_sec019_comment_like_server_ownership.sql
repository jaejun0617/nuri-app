begin;

-- Only the trusted aggregate path may change an existing count. INVOKER
-- distinguishes direct Data API writes from SECURITY DEFINER trigger work.
create or replace function public.guard_community_comment_like_count()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.like_count := 0;
  elsif current_user in ('anon', 'authenticated')
      and new.like_count is distinct from old.like_count then
    raise exception using errcode = '42501',
      message = 'community_comment_like_count_server_owned';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_community_comment_like_count()
  from public, anon, authenticated;
create trigger aaa_guard_community_comment_like_count
before insert or update of like_count on public.comments
for each row execute function public.guard_community_comment_like_count();

-- Likes still pass their own RLS. The resulting counter update must not be
-- silently filtered by comments_update_own when liking another user's comment.
create or replace function public.sync_comment_like_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
  end if;
  return null;
end;
$$;
revoke all on function public.sync_comment_like_count()
  from public, anon, authenticated;
grant execute on function public.sync_comment_like_count() to service_role;

commit;

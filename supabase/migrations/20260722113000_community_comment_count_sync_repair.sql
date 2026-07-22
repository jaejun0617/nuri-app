begin;

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_old_countable boolean := false;
  v_new_countable boolean := false;
  v_old_post_id uuid;
  v_new_post_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_countable := old.deleted_at is null and old.status = 'active';
    v_old_post_id := old.post_id;
  end if;

  if tg_op <> 'DELETE' then
    v_new_countable := new.deleted_at is null and new.status = 'active';
    v_new_post_id := new.post_id;
  end if;

  if tg_op = 'INSERT' and v_new_countable then
    update public.posts
    set comment_count = comment_count + 1
    where id = v_new_post_id;
  elsif tg_op = 'DELETE' and v_old_countable then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = v_old_post_id;
  elsif tg_op = 'UPDATE' and v_old_post_id is distinct from v_new_post_id then
    if v_old_countable then
      update public.posts
      set comment_count = greatest(comment_count - 1, 0)
      where id = v_old_post_id;
    end if;
    if v_new_countable then
      update public.posts
      set comment_count = comment_count + 1
      where id = v_new_post_id;
    end if;
  elsif tg_op = 'UPDATE' and v_old_countable and not v_new_countable then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = v_new_post_id;
  elsif tg_op = 'UPDATE' and not v_old_countable and v_new_countable then
    update public.posts
    set comment_count = comment_count + 1
    where id = v_new_post_id;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_post_comment_count()
  from public, anon, authenticated;

drop trigger if exists trg_sync_post_comment_count on public.comments;
create trigger trg_sync_post_comment_count
after insert or delete or update of post_id, deleted_at, status on public.comments
for each row execute function public.sync_post_comment_count();

-- comment_count는 source content가 아니라 파생 집계다. 현재 active row를
-- 기준으로 불일치한 counter만 보정해 기존 원본 데이터에는 손대지 않는다.
with active_comment_counts as (
  select
    p.id as post_id,
    count(c.id)::integer as active_count
  from public.posts p
  left join public.comments c
    on c.post_id = p.id
   and c.status = 'active'
   and c.deleted_at is null
  group by p.id
)
update public.posts p
set comment_count = counts.active_count
from active_comment_counts counts
where p.id = counts.post_id
  and p.comment_count is distinct from counts.active_count;

comment on function public.sync_post_comment_count()
  is 'Keeps posts.comment_count aligned with active non-deleted comments, including replies. Direct execution is revoked; it is trigger-only.';

commit;

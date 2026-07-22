begin;

create or replace function public.notify_community_comment_insert_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_post public.posts%rowtype;
  v_actor_nickname text := '사용자';
  v_recipient_id uuid;
  v_title text;
  v_body text;
  v_kind text;
begin
  if new.status is distinct from 'active' or new.deleted_at is not null then
    return new;
  end if;

  select p.*
  into v_post
  from public.posts p
  where p.id = new.post_id
  limit 1;

  if v_post.id is null
     or v_post.status is distinct from 'active'
     or v_post.deleted_at is not null
     or v_post.visibility is distinct from 'public' then
    return new;
  end if;

  select coalesce(nullif(btrim(pr.nickname), ''), '사용자')
  into v_actor_nickname
  from public.profiles pr
  where pr.user_id = new.user_id
  limit 1;

  if new.parent_comment_id is null then
    v_recipient_id := v_post.user_id;
    v_kind := 'community_comment';
    v_title := left(v_actor_nickname, 20) || '님이 댓글을 남겼어요';
    v_body := '“' || left(coalesce(nullif(btrim(v_post.title), ''), '게시글'), 54)
      || '” 게시글에 새 댓글이 달렸어요.';
  else
    select c.user_id
    into v_recipient_id
    from public.comments c
    where c.id = new.parent_comment_id
      and c.post_id = new.post_id
    limit 1;

    v_kind := 'community_reply';
    v_title := left(v_actor_nickname, 20) || '님이 답글을 남겼어요';
    v_body := '“' || left(coalesce(nullif(btrim(v_post.title), ''), '게시글'), 54)
      || '” 댓글에 새 답글이 달렸어요.';
  end if;

  if v_recipient_id is null or v_recipient_id = new.user_id then
    return new;
  end if;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    type,
    metadata
  )
  values (
    v_recipient_id,
    v_title,
    v_body,
    'event',
    jsonb_build_object(
      'kind', v_kind,
      'post_id', new.post_id,
      'comment_id', new.id
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_community_comment_insert_v1()
  from public, anon, authenticated;

drop trigger if exists trg_notify_community_comment_insert_v1
  on public.comments;
create trigger trg_notify_community_comment_insert_v1
after insert on public.comments
for each row
execute function public.notify_community_comment_insert_v1();

comment on function public.notify_community_comment_insert_v1()
  is 'Creates an in-app notification for the post owner or parent-comment owner after another user writes an active comment. It never dispatches push.';

commit;

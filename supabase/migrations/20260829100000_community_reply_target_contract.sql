begin;

-- NURI-09 / COMMUNITY_REPLY_TARGET_CONTRACT_001:
-- Keep parent_comment_id as the one-level visual thread root while storing
-- the exact comment selected by 답글쓰기 and that comment's canonical author.
-- Both fields are nullable so legacy comments remain valid without guessed
-- backfill data.
alter table public.comments
  add column reply_to_comment_id uuid
    references public.comments(id)
    on delete set null,
  add column reply_target_user_id uuid
    references auth.users(id)
    on delete set null;

comment on column public.comments.reply_to_comment_id
  is 'Exact comment selected as the reply target. parent_comment_id remains the root thread id.';

comment on column public.comments.reply_target_user_id
  is 'Canonical user_id of reply_to_comment_id, derived by the server.';

-- Direct legacy inserts remain compatible, but the new target fields cannot be
-- trusted from a client payload. The trigger derives the target author and
-- normalizes every reply to the root comment before the existing thread
-- integrity trigger runs.
create or replace function public.enforce_community_comment_reply_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_target public.comments%rowtype;
  v_root_id uuid;
  v_reply_to_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.post_id is distinct from old.post_id
      or new.parent_comment_id is distinct from old.parent_comment_id
      or new.depth is distinct from old.depth
      or new.reply_to_comment_id is distinct from old.reply_to_comment_id
      or new.reply_target_user_id is distinct from old.reply_target_user_id then
      perform public.raise_community_write_error(
        'community_comment_write_forbidden',
        '댓글의 게시글·답글 구조는 변경할 수 있어요.',
        'comment'
      );
    end if;

    return new;
  end if;

  if auth.uid() is null then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '로그인 후 댓글을 작성할 수 있어요.',
      'comment'
    );
  end if;

  -- A root comment has neither target field. For a legacy direct reply where
  -- only parent_comment_id is supplied, treat that root as the selected
  -- target so old clients remain readable and internally consistent.
  v_reply_to_id := coalesce(new.reply_to_comment_id, new.parent_comment_id);
  if v_reply_to_id is null then
    if new.reply_target_user_id is not null then
      perform public.raise_community_write_error(
        'community_comment_write_forbidden',
        '답글 대상이 올바르지 않아요.',
        'comment'
      );
    end if;

    new.reply_to_comment_id := null;
    new.reply_target_user_id := null;
    return new;
  end if;

  select target_comment.*
    into v_target
  from public.comments target_comment
  where target_comment.id = v_reply_to_id
  limit 1;

  if v_target.id is null
    or v_target.post_id is distinct from new.post_id
    or v_target.status is distinct from 'active'
    or v_target.deleted_at is not null
    or not private.community_parent_post_visible_to_current_user(v_target.post_id)
    or not exists (
      select 1
      from auth.users target_author
      where target_author.id = v_target.user_id
    ) then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '답글을 남길 수 없는 댓글이에요.',
      'comment'
    );
  end if;

  v_root_id := coalesce(v_target.parent_comment_id, v_target.id);

  if not exists (
    select 1
    from public.comments root_comment
    where root_comment.id = v_root_id
      and root_comment.post_id = new.post_id
      and root_comment.parent_comment_id is null
      and root_comment.depth = 0
      and root_comment.status = 'active'
      and root_comment.deleted_at is null
  ) then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '답글의 원댓글을 확인할 수 없어요.',
      'comment'
    );
  end if;

  if new.parent_comment_id is not null
    and new.parent_comment_id is distinct from v_root_id then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '답글의 원댓글이 올바르지 않아요.',
      'comment'
    );
  end if;

  if new.reply_target_user_id is not null
    and new.reply_target_user_id is distinct from v_target.user_id then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '답글 대상 사용자를 직접 지정할 수 없어요.',
      'comment'
    );
  end if;

  new.parent_comment_id := v_root_id;
  new.depth := 1;
  new.reply_to_comment_id := v_target.id;
  new.reply_target_user_id := v_target.user_id;
  return new;
end;
$function$;

revoke all on function public.enforce_community_comment_reply_target()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_community_comment_reply_target_integrity
  on public.comments;
create trigger trg_community_comment_reply_target_integrity
before insert or update of
  post_id,
  parent_comment_id,
  depth,
  reply_to_comment_id,
  reply_target_user_id
on public.comments
for each row
execute function public.enforce_community_comment_reply_target();

-- The RPC is the canonical path for new targeted replies. It accepts only the
-- selected target id, derives auth/user identity server-side, and returns the
-- existing public comment fields plus the two persisted target fields.
create or replace function public.community_create_comment_v1(
  p_post_id uuid,
  p_content text,
  p_parent_comment_id uuid default null,
  p_reply_to_comment_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_comment public.comments%rowtype;
begin
  if v_actor_id is null
    or p_post_id is null
    or btrim(coalesce(p_content, '')) = '' then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '댓글을 작성할 수 없는 요청이에요.',
      'comment'
    );
  end if;

  perform public.assert_community_actor_is_active();

  -- SECURITY DEFINER bypasses table RLS for the insert itself, so preserve the
  -- existing comment-create authorization explicitly before writing. The
  -- reply target trigger performs the stricter target and root validation.
  if not public.can_insert_community_comment(p_post_id, p_parent_comment_id) then
    perform public.raise_community_write_error(
      'community_comment_write_forbidden',
      '댓글을 작성할 수 없는 게시글이에요.',
      'comment'
    );
  end if;

  insert into public.comments (
    post_id,
    user_id,
    parent_comment_id,
    depth,
    reply_to_comment_id,
    reply_target_user_id,
    content,
    status
  )
  values (
    p_post_id,
    v_actor_id,
    p_parent_comment_id,
    case
      when p_parent_comment_id is null and p_reply_to_comment_id is null then 0
      else 1
    end,
    p_reply_to_comment_id,
    null,
    btrim(p_content),
    'active'
  )
  returning * into v_comment;

  return jsonb_build_object(
    'item', jsonb_build_object(
      'id', v_comment.id,
      'post_id', v_comment.post_id,
      'user_id', v_comment.user_id,
      'content', v_comment.content,
      'parent_comment_id', v_comment.parent_comment_id,
      'depth', v_comment.depth,
      'reply_count', v_comment.reply_count,
      'like_count', v_comment.like_count,
      'reply_to_comment_id', v_comment.reply_to_comment_id,
      'reply_target_user_id', v_comment.reply_target_user_id,
      'status', v_comment.status,
      'deleted_at', v_comment.deleted_at,
      'created_at', v_comment.created_at,
      'updated_at', v_comment.updated_at
    )
  );
end;
$function$;

revoke all on function public.community_create_comment_v1(uuid, text, uuid, uuid)
  from public, anon, service_role;
grant execute on function public.community_create_comment_v1(uuid, text, uuid, uuid)
  to authenticated;

commit;

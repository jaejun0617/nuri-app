begin;

-- NURI-09 / COMMUNITY_THREAD_REPLY_SEMANTICS_001:
-- parent_comment_id identifies the canonical visual thread root. A null
-- reply_to_comment_id is now a thread reply without a direct user target;
-- only an explicit reply_to_comment_id creates a direct reply target.
create or replace function public.enforce_community_comment_reply_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_target public.comments%rowtype;
  v_root_id uuid;
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

  -- A root comment and an untargeted thread reply both keep a null direct
  -- target. The parent for a thread reply must already be the canonical root;
  -- can_insert_community_comment applies the same rule to the RPC caller.
  if new.reply_to_comment_id is null then
    if new.reply_target_user_id is not null then
      perform public.raise_community_write_error(
        'community_comment_write_forbidden',
        '답글 대상 사용자를 직접 지정할 수 없어요.',
        'comment'
      );
    end if;

    if new.parent_comment_id is null then
      new.depth := 0;
      new.reply_target_user_id := null;
      return new;
    end if;

    select parent_comment.*
      into v_target
    from public.comments parent_comment
    where parent_comment.id = new.parent_comment_id
      and parent_comment.post_id = new.post_id
      and parent_comment.parent_comment_id is null
      and parent_comment.depth = 0
      and parent_comment.status = 'active'
      and parent_comment.deleted_at is null
      and private.community_parent_post_visible_to_current_user(
        parent_comment.post_id
      )
    limit 1;

    if v_target.id is null then
      perform public.raise_community_write_error(
        'community_comment_write_forbidden',
        '답글의 원댓글을 확인할 수 없어요.',
        'comment'
      );
    end if;

    new.parent_comment_id := v_target.id;
    new.depth := 1;
    new.reply_to_comment_id := null;
    new.reply_target_user_id := null;
    return new;
  end if;

  -- An explicit reply_to_comment_id is a direct reply. Preserve the existing
  -- cross-post, visibility, moderation, and root-thread checks for this path.
  select target_comment.*
    into v_target
  from public.comments target_comment
  where target_comment.id = new.reply_to_comment_id
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
  new.reply_target_user_id := v_target.user_id;
  return new;
end;
$function$;

revoke all on function public.enforce_community_comment_reply_target()
  from public, anon, authenticated, service_role;

comment on function public.enforce_community_comment_reply_target()
  is 'Preserves root/thread replies without a direct target and derives direct reply targets server-side.';

commit;

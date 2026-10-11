begin;

-- INVOKER is intentional: trusted moderation/aggregate functions run as their
-- owner, while direct Data API writes must pass the client-field boundary.
create or replace function public.guard_community_post_server_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  editable text[] := array[
    'title','content','category','pet_id','visibility','image_url','image_urls',
    'pet_snapshot_name','pet_snapshot_species','pet_snapshot_breed',
    'pet_snapshot_age_label','pet_snapshot_avatar_path','show_pet_age','updated_at'
  ];
  deleting boolean;
begin
  if current_user not in ('anon','authenticated') then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if tg_op='DELETE' then
    raise exception using errcode='42501', message='community_post_hard_delete_forbidden';
  end if;
  perform public.assert_community_actor_is_active();
  if tg_op='INSERT' then
    new.status := 'active';
    new.deleted_at := null;
    new.moderated_at := null;
    new.moderated_by := null;
    new.operator_memo := null;
    new.like_count := 0;
    new.comment_count := 0;
    new.report_count := 0;
    new.view_count := 0;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- Preserve the installed client's narrow soft-delete command. The server
  -- chooses the deletion time; it never accepts a restore or moderation edit.
  deleting := new.status='deleted' and old.status<>'deleted'
    and old.user_id=auth.uid();
  if deleting then
    if (to_jsonb(new)-array['status','deleted_at','updated_at'])
        is distinct from (to_jsonb(old)-array['status','deleted_at','updated_at']) then
      raise exception using errcode='42501', message='community_post_server_fields_forbidden';
    end if;
    new.deleted_at := now();
  elsif (to_jsonb(new)-editable) is distinct from (to_jsonb(old)-editable) then
    raise exception using errcode='42501', message='community_post_server_fields_forbidden';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_community_post_server_fields() from public,anon,authenticated;
create trigger aaa_guard_community_post_server_fields
before insert or update or delete on public.posts
for each row execute function public.guard_community_post_server_fields();

create or replace function public.guard_community_comment_created_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' then
    -- Also applies to the supported SECURITY DEFINER comment-create RPC.
    new.created_at := now();
  elsif current_user in ('anon','authenticated') and new.created_at is distinct from old.created_at then
    raise exception using errcode='42501', message='community_comment_created_at_forbidden';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_community_comment_created_at() from public,anon,authenticated;
create trigger aaa_guard_community_comment_created_at
before insert or update of created_at on public.comments
for each row execute function public.guard_community_comment_created_at();
commit;

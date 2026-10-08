-- PO-approved per-post limit only. Ownership, moderation and the 10-minute
-- account quota remain identical to the verified production trigger function.
create or replace function public.guard_community_image_upload()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  actor_id uuid := auth.uid();
  owner_id_candidate text := nullif(btrim(coalesce(new.owner_id, '')), '');
  path_segments text[];
  target_post_id uuid := null;
  recent_upload_count integer := 0;
  current_post_upload_count integer := 0;
begin
  if new.bucket_id <> 'community-images' then
    return new;
  end if;

  if actor_id is null and owner_id_candidate is not null then
    begin
      actor_id := owner_id_candidate::uuid;
    exception
      when invalid_text_representation then
        actor_id := null;
    end;
  end if;

  actor_id := coalesce(actor_id, new.owner);

  perform public.assert_community_actor_id_is_active(actor_id);

  path_segments := storage.foldername(new.name);
  if coalesce(array_length(path_segments, 1), 0) < 2 then
    raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end if;

  if actor_id is null or path_segments[1] <> actor_id::text then
    raise exception '본인 경로에만 이미지를 업로드할 수 있어요.';
  end if;

  begin
    target_post_id := path_segments[2]::uuid;
  exception
    when invalid_text_representation then
      raise exception '커뮤니티 이미지 경로가 올바르지 않아요.';
  end;

  perform 1
  from public.posts p
  where p.id = target_post_id
    and p.user_id = actor_id
    and p.deleted_at is null
    and p.status = 'active';

  if not found then
    raise exception '이미지 업로드 대상 게시글을 확인할 수 없어요.';
  end if;

  select count(*)
  into recent_upload_count
  from public.community_image_assets a
  where a.user_id = actor_id
    and a.created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_upload_count >= 10 then
    raise exception '이미지 업로드는 10분에 10장까지 가능해요. 잠시 후 다시 시도해 주세요.';
  end if;

  select count(*)
  into current_post_upload_count
  from public.community_image_assets a
  where a.post_id = target_post_id
    and a.upload_status in ('uploaded', 'attached');

  if current_post_upload_count >= 5 then
    raise exception '게시글당 이미지는 최대 5장까지 첨부할 수 있어요.';
  end if;

  return new;
end;
$$;

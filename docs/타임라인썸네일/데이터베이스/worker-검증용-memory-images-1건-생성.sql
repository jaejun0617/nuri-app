-- 실행 목적:
-- - Supabase SQL Editor 에서 바로 실행해 worker 1건 검증용 memory_images row 를 만든다.
-- - 기존 public.memories 중 "최근 1건"을 골라 original_path 를 채운다.
-- - status 는 'pending', timeline_thumb_path 는 null 로 둔다.
-- - 이미 같은 memory_id + sort_order(0) row 가 있으면 중복 insert 하지 않는다.
--
-- 실행 전제:
-- - public.memory_images 테이블이 이미 생성되어 있어야 한다.
-- - public.memories.image_url 또는 image_urls 중 하나 이상이 실제 storage path 를 가지고 있어야 한다.
--
-- 주의:
-- - 이 SQL 은 운영 데이터 전체 백필이 아니다.
-- - worker 수동 1건 검증을 위한 최소 테스트 데이터만 만든다.

do $$
declare
  v_has_image_urls boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memories'
      and column_name = 'image_urls'
  )
  into v_has_image_urls;

  if v_has_image_urls then
    execute $sql$
      with candidate as (
        select
          m.id as memory_id,
          m.user_id,
          m.pet_id,
          coalesce(
            (
              select nullif(btrim(img.path), '')
              from unnest(m.image_urls) with ordinality as img(path, ord)
              where nullif(btrim(img.path), '') is not null
              order by img.ord asc
              limit 1
            ),
            nullif(btrim(m.image_url), '')
          ) as original_path
        from public.memories m
        where not exists (
          select 1
          from public.memory_images mi
          where mi.memory_id = m.id
            and mi.sort_order = 0
        )
        order by m.created_at desc
        limit 1
      )
      insert into public.memory_images (
        memory_id,
        user_id,
        pet_id,
        sort_order,
        original_path,
        timeline_thumb_path,
        width,
        height,
        status
      )
      select
        c.memory_id,
        c.user_id,
        c.pet_id,
        0,
        c.original_path,
        null,
        null,
        null,
        'pending'::public.memory_image_status
      from candidate c
      where c.original_path is not null
      on conflict (memory_id, sort_order) do nothing;
    $sql$;
  else
    execute $sql$
      with candidate as (
        select
          m.id as memory_id,
          m.user_id,
          m.pet_id,
          nullif(btrim(m.image_url), '') as original_path
        from public.memories m
        where not exists (
          select 1
          from public.memory_images mi
          where mi.memory_id = m.id
            and mi.sort_order = 0
        )
        order by m.created_at desc
        limit 1
      )
      insert into public.memory_images (
        memory_id,
        user_id,
        pet_id,
        sort_order,
        original_path,
        timeline_thumb_path,
        width,
        height,
        status
      )
      select
        c.memory_id,
        c.user_id,
        c.pet_id,
        0,
        c.original_path,
        null,
        null,
        null,
        'pending'::public.memory_image_status
      from candidate c
      where c.original_path is not null
      on conflict (memory_id, sort_order) do nothing;
    $sql$;
  end if;
end $$;

-- 실행 후 확인:
-- - 가장 최근에 들어간 worker 검증용 row 1건이 보이는지 확인한다.
select
  mi.id,
  mi.memory_id,
  mi.user_id,
  mi.pet_id,
  mi.sort_order,
  mi.original_path,
  mi.timeline_thumb_path,
  mi.status,
  mi.retry_count,
  mi.last_error_code,
  mi.last_error_message,
  mi.last_processed_at,
  mi.processing_started_at,
  mi.created_at
from public.memory_images mi
order by mi.created_at desc
limit 5;

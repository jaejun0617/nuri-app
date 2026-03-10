-- 실행 목적:
-- - worker 운영 전 2~5건 batch 검증
-- - failed 재시도 검증
-- - processing_started_at 이 남은 stuck job 회수 검증
--
-- 사용 순서:
-- 1) [섹션 A] 로 pending row 2~5건 준비
-- 2) worker batch POST 실행
-- 3) [섹션 B] 로 failed 재시도 대상 1건 준비
-- 4) worker targeted POST 실행
-- 5) [섹션 C] 로 stuck job 대상 1건 준비
-- 6) worker batch 또는 targeted POST 실행
--
-- 주의:
-- - 검증용 최소 SQL 이다.
-- - 운영 전체 백필 용도가 아니다.

-- ============================================================
-- 섹션 A) pending row 2~5건 준비
-- - 최근 memories 중 이미지 path 가 있는 row 를 최대 5건 골라 memory_images 로 만든다.
-- - 이미 같은 memory_id + sort_order(0) 가 있으면 건너뛴다.
-- ============================================================
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
        limit 5
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
        limit 5
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

select
  mi.id,
  mi.memory_id,
  mi.sort_order,
  mi.original_path,
  mi.timeline_thumb_path,
  mi.status,
  mi.retry_count,
  mi.last_error_code,
  mi.last_processed_at,
  mi.processing_started_at,
  mi.created_at
from public.memory_images mi
order by mi.created_at desc
limit 10;

-- ============================================================
-- 섹션 B) failed 재시도 검증용 1건 준비
-- - 최근 ready 또는 pending row 1건을 골라 failed 로 만든다.
-- - worker 가 즉시 다시 집을 수 있게 last_processed_at 을 충분히 과거로 민다.
-- ============================================================
update public.memory_images mi
set
  status = 'failed',
  retry_count = 1,
  last_error_code = 'manual_retry_test',
  last_error_message = 'manual failed retry verification seed',
  last_processed_at = now() - interval '10 minutes',
  processing_started_at = null,
  updated_at = now()
where mi.id = (
  select id
  from public.memory_images
  where original_path is not null
  order by created_at desc
  limit 1
)
returning
  id,
  memory_id,
  status,
  retry_count,
  last_error_code,
  last_error_message,
  last_processed_at,
  processing_started_at;

-- ============================================================
-- 섹션 C) stuck job 회수 검증용 1건 준비
-- - processing_started_at 이 오래 남은 pending row 를 만든다.
-- - worker 의 stuck 회수 기준(기본 15분)보다 충분히 과거 시각으로 둔다.
-- ============================================================
update public.memory_images mi
set
  status = 'pending',
  timeline_thumb_path = null,
  processing_started_at = now() - interval '20 minutes',
  last_processed_at = now() - interval '20 minutes',
  updated_at = now()
where mi.id = (
  select id
  from public.memory_images
  where original_path is not null
  order by created_at desc
  limit 1
)
returning
  id,
  memory_id,
  status,
  retry_count,
  last_processed_at,
  processing_started_at;

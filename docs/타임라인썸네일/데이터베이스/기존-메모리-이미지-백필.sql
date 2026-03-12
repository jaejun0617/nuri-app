-- 실행 순서
-- 1) memory_images-썸네일-null-유니크-제약-수정.sql 을 먼저 실행한다.
-- 2) 대상 건수 확인 쿼리를 실행한다.
-- 3) v_batch_size 를 50~500 사이로 조정한다.
-- 4) 아래 DO 블록을 실행한다.
-- 5) insert 결과 확인 쿼리를 실행한다.
-- 6) worker batch 를 돌려 pending -> ready 전환을 진행한다.
--
-- 목적
-- - 기존 public.memories.image_url / image_urls 기반 데이터를 public.memory_images 로 백필한다.
-- - 이번 SQL 은 "memory_images row 가 아직 1건도 없는 memory" 만 집는다.
-- - 새 row 는 timeline_thumb_path = null, status = 'pending' 으로 넣는다.
-- - 중복 실행해도 이미 backfill 된 memory 는 다시 집지 않는다.
--
-- 주의
-- - 이 SQL 은 전체 백필용 공용 실행 스크립트다.
-- - staging 또는 소량 batch 로 먼저 검증한 뒤 운영에서 반복 실행하는 것을 권장한다.
-- - worker 는 별도로 실행해야 썸네일이 채워진다.
-- - timeline_thumb_path = null 을 여러 건 허용하도록 unique 제약이 먼저 수정되어 있어야 한다.

-- ------------------------------------------------------------
-- 0) 백필 대상 건수 확인
-- ------------------------------------------------------------
with target_memories as (
  select m.id
  from public.memories m
  where not exists (
    select 1
    from public.memory_images mi
    where mi.memory_id = m.id
  )
    and (
      nullif(btrim(m.image_url), '') is not null
      or exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'memories'
          and c.column_name = 'image_urls'
      )
    )
)
select count(*) as remaining_memory_count
from target_memories;

-- ------------------------------------------------------------
-- 1) batch backfill
-- - v_batch_size 를 상황에 맞게 조정한다.
-- - image_urls 컬럼이 있으면 sort_order 순서대로 사용한다.
-- - 없으면 image_url 1장만 sort_order 0 으로 넣는다.
-- ------------------------------------------------------------
do $$
declare
  v_batch_size integer := 100;
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
    execute format(
      $sql$
        with candidate_memories as (
          select
            m.id,
            m.user_id,
            m.pet_id,
            m.image_url,
            m.image_urls,
            m.created_at
          from public.memories m
          where not exists (
            select 1
            from public.memory_images mi
            where mi.memory_id = m.id
          )
            and (
              coalesce(array_length(m.image_urls, 1), 0) > 0
              or nullif(btrim(m.image_url), '') is not null
            )
          order by m.created_at asc, m.id asc
          limit %s
        ),
        expanded as (
          select
            cm.id as memory_id,
            cm.user_id,
            cm.pet_id,
            img.ord - 1 as sort_order,
            nullif(btrim(img.path), '') as original_path
          from candidate_memories cm
          cross join lateral unnest(
            case
              when coalesce(array_length(cm.image_urls, 1), 0) > 0 then cm.image_urls
              when nullif(btrim(cm.image_url), '') is not null then array[cm.image_url]
              else array[]::text[]
            end
          ) with ordinality as img(path, ord)
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
          e.memory_id,
          e.user_id,
          e.pet_id,
          e.sort_order,
          e.original_path,
          null,
          null,
          null,
          'pending'::public.memory_image_status
        from expanded e
        where e.original_path is not null
        on conflict (memory_id, original_path) do nothing
      $sql$,
      v_batch_size
    );
  else
    execute format(
      $sql$
        with candidate_memories as (
          select
            m.id,
            m.user_id,
            m.pet_id,
            nullif(btrim(m.image_url), '') as original_path,
            m.created_at
          from public.memories m
          where not exists (
            select 1
            from public.memory_images mi
            where mi.memory_id = m.id
          )
            and nullif(btrim(m.image_url), '') is not null
          order by m.created_at asc, m.id asc
          limit %s
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
          cm.id,
          cm.user_id,
          cm.pet_id,
          0,
          cm.original_path,
          null,
          null,
          null,
          'pending'::public.memory_image_status
        from candidate_memories cm
        where cm.original_path is not null
        on conflict (memory_id, original_path) do nothing
      $sql$,
      v_batch_size
    );
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) 이번 batch 결과 확인
-- ------------------------------------------------------------
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
limit 30;

-- ------------------------------------------------------------
-- 3) 남은 대상 건수 재확인
-- ------------------------------------------------------------
with target_memories as (
  select m.id
  from public.memories m
  where not exists (
    select 1
    from public.memory_images mi
    where mi.memory_id = m.id
  )
    and (
      nullif(btrim(m.image_url), '') is not null
      or exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'memories'
          and c.column_name = 'image_urls'
      )
    )
)
select count(*) as remaining_memory_count
from target_memories;

-- ------------------------------------------------------------
-- 운영 메모
-- - 이 SQL 은 "memory_images 가 없는 memory" 만 대상으로 잡기 때문에 재실행이 안전하다.
-- - 일부 memory 에 row 가 부분적으로만 들어간 비정상 상태는 별도 repair SQL 로 다루는 것이 안전하다.
-- - worker 실행 전까지는 status='pending', timeline_thumb_path=null 상태가 정상이다.
-- - 백필 후에는 worker batch 를 돌려 ready 비율을 올리고, failed row 는 별도 점검한다.

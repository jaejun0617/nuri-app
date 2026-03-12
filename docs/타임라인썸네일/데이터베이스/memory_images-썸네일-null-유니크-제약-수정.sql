-- 실행 목적
-- - public.memory_images.timeline_thumb_path 에 걸린 잘못된 unique 제약을 수정한다.
-- - pending 상태에서 timeline_thumb_path = null row 가 여러 건 들어갈 수 있어야 한다.
-- - 실제 썸네일 path 가 채워진 경우에만 unique 하도록 partial unique index 로 교체한다.
--
-- 왜 필요한가
-- - 기존 제약이 "unique nulls not distinct (timeline_thumb_path)" 로 생성되어 있으면
--   null 도 서로 같은 값으로 취급되어 pending row 두 번째부터 insert 가 실패한다.
-- - worker 설계상 timeline_thumb_path 는 처음엔 null 이어야 하므로
--   운영 의도와 제약이 충돌한다.
--
-- 실행 순서
-- 1) 이 SQL 을 먼저 실행한다.
-- 2) 그 다음 기존 memory_images backfill SQL 을 실행한다.
-- 3) worker batch 를 실행한다.

begin;

-- ------------------------------------------------------------
-- 1) 기존 unique constraint 제거
-- ------------------------------------------------------------
alter table public.memory_images
  drop constraint if exists memory_images_unique_timeline_thumb_path;

-- 혹시 기존 수동 인덱스가 있으면 같이 제거
drop index if exists public.idx_memory_images_unique_timeline_thumb_path;

-- ------------------------------------------------------------
-- 2) 실제 path 가 있는 경우에만 unique 하도록 partial unique index 생성
-- - null 은 여러 건 허용
-- - 공백 문자열은 허용하지 않는 체크 제약이 이미 있으므로 null 여부만 보면 된다
-- ------------------------------------------------------------
create unique index if not exists idx_memory_images_unique_timeline_thumb_path_not_null
  on public.memory_images (timeline_thumb_path)
  where timeline_thumb_path is not null;

commit;

-- ------------------------------------------------------------
-- 3) 확인 쿼리
-- ------------------------------------------------------------
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'memory_images'
  and indexname like '%timeline_thumb_path%';

-- 운영 메모
-- - 이 SQL 은 null 허용 정책만 수정한다.
-- - 실제 썸네일 path 중복은 계속 막는다.
-- - 앱/worker 코드 수정 없이 바로 적용 가능하다.

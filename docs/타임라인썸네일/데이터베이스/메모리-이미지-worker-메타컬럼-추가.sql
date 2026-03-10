-- =========================================================
-- Supabase SQL Editor 실행 순서
-- 1) 아래 SQL 전체를 그대로 실행한다.
-- 2) public.memory_images 에 worker 운영 메타 컬럼이 추가됐는지 확인한다.
-- 3) 인덱스가 생성됐는지 확인한다.
-- 4) 이후 worker 구현에서 retry / failed / stuck-job 회수 로직에 사용한다.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 0) worker 운영 메타 컬럼 추가
-- ---------------------------------------------------------
alter table public.memory_images
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists last_processed_at timestamptz,
  add column if not exists processing_started_at timestamptz;

-- ---------------------------------------------------------
-- 1) check 제약
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memory_images_retry_count_check'
  ) then
    alter table public.memory_images
      add constraint memory_images_retry_count_check
      check (retry_count >= 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memory_images_last_error_code_not_blank_check'
  ) then
    alter table public.memory_images
      add constraint memory_images_last_error_code_not_blank_check
      check (
        last_error_code is null
        or char_length(btrim(last_error_code)) > 0
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memory_images_last_error_message_not_blank_check'
  ) then
    alter table public.memory_images
      add constraint memory_images_last_error_message_not_blank_check
      check (
        last_error_message is null
        or char_length(btrim(last_error_message)) > 0
      );
  end if;
end
$$;

-- ---------------------------------------------------------
-- 2) 컬럼 설명
-- ---------------------------------------------------------
comment on column public.memory_images.retry_count is
  '썸네일 worker 재시도 횟수';
comment on column public.memory_images.last_error_code is
  '마지막 실패 코드(original_not_found, storage_upload_failed 등)';
comment on column public.memory_images.last_error_message is
  '마지막 실패 상세 메시지';
comment on column public.memory_images.last_processed_at is
  'worker가 마지막으로 처리 시도한 시각';
comment on column public.memory_images.processing_started_at is
  '현재 또는 최근 처리 시작 시각(stuck job 회수 판단용)';

-- ---------------------------------------------------------
-- 3) worker 운영용 인덱스
-- ---------------------------------------------------------
create index if not exists idx_memory_images_worker_pending
  on public.memory_images (status, created_at asc)
  where status = 'pending';

create index if not exists idx_memory_images_worker_failed_retry
  on public.memory_images (status, retry_count asc, last_processed_at asc)
  where status = 'failed';

create index if not exists idx_memory_images_worker_processing_started_at
  on public.memory_images (processing_started_at asc)
  where processing_started_at is not null;

create index if not exists idx_memory_images_worker_last_processed_at
  on public.memory_images (last_processed_at asc)
  where last_processed_at is not null;

-- ---------------------------------------------------------
-- 4) 운영 기준 주석
-- ---------------------------------------------------------
-- [failed / pending 재시도 운영 기준]
-- 1. pending:
--    - 생성 직후 즉시 처리 대상
-- 2. failed:
--    - retry_count, last_processed_at 기준으로 backoff 후 재시도
-- 3. 권장 backoff:
--    - retry_count = 0 : 즉시
--    - retry_count = 1 : 5분 후
--    - retry_count = 2 : 30분 후
--    - retry_count = 3 : 2시간 후
--    - retry_count = 4 : 6시간 후
--    - retry_count >= 5 : 24시간 간격
-- 4. retry_count >= 8:
--    - 자동 재시도 중단 권장
--    - 운영자 확인 대상

-- [stuck job 회수 기준]
-- worker 가 row 를 집은 뒤 예기치 않게 종료되면 processing_started_at 만 남을 수 있다.
-- 권장 기준:
-- - processing_started_at is not null
-- - status = 'pending' 또는 'failed'
-- - processing_started_at <= now() - interval '15 minutes'
-- 이 조건이면 stuck job 으로 간주하고 재처리 가능 상태로 회수한다.

-- [stuck job 회수 예시 SQL - 운영 스크립트용 참고]
-- update public.memory_images
-- set
--   processing_started_at = null,
--   last_processed_at = now(),
--   updated_at = now()
-- where processing_started_at is not null
--   and processing_started_at <= now() - interval '15 minutes'
--   and status in ('pending', 'failed');

-- ---------------------------------------------------------
-- 5) worker 구현 시 사용 예시 메모
-- ---------------------------------------------------------
-- worker 시작 시:
-- - processing_started_at = now()
-- - last_processed_at = now()
--
-- 성공 시:
-- - status = 'ready'
-- - retry_count = 0
-- - last_error_code = null
-- - last_error_message = null
-- - processing_started_at = null
-- - last_processed_at = now()
--
-- 실패 시:
-- - status = 'failed'
-- - retry_count = retry_count + 1
-- - last_error_code 기록
-- - last_error_message 기록
-- - processing_started_at = null
-- - last_processed_at = now()

-- ---------------------------------------------------------
-- 6) rollback / 주의사항
-- ---------------------------------------------------------
-- rollback 시 주의:
-- - 이미 worker 가 이 컬럼들을 사용하기 시작한 뒤 drop 하면 안 된다.
-- - 운영 중 rollback 은 앱 코드 rollback 이 아니라 worker 비활성화가 우선이다.
-- - 컬럼 drop 은 충분한 운영 검증 후에만 수동 수행 권장.
--
-- 수동 rollback 예시(운영 중 즉시 실행 비권장):
-- alter table public.memory_images
--   drop column if exists processing_started_at,
--   drop column if exists last_processed_at,
--   drop column if exists last_error_message,
--   drop column if exists last_error_code,
--   drop column if exists retry_count;

commit;

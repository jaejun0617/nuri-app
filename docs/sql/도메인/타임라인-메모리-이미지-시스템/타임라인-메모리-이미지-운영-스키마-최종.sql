begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'memory_image_status'
  ) then
    create type public.memory_image_status as enum ('pending', 'ready', 'failed');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.memory_images (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  sort_order integer not null,
  original_path text not null,
  timeline_thumb_path text,
  width integer,
  height integer,
  status public.memory_image_status not null default 'pending',
  retry_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  last_processed_at timestamptz,
  processing_started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_images_sort_order_check
    check (sort_order >= 0),
  constraint memory_images_original_path_not_blank_check
    check (char_length(btrim(original_path)) > 0),
  constraint memory_images_timeline_thumb_path_not_blank_check
    check (timeline_thumb_path is null or char_length(btrim(timeline_thumb_path)) > 0),
  constraint memory_images_dimensions_check
    check (
      (width is null and height is null)
      or (width is not null and height is not null and width > 0 and height > 0)
    ),
  constraint memory_images_ready_requires_thumb_check
    check (
      status <> 'ready'
      or timeline_thumb_path is not null
    ),
  constraint memory_images_retry_count_check
    check (retry_count >= 0),
  constraint memory_images_last_error_code_not_blank_check
    check (
      last_error_code is null
      or char_length(btrim(last_error_code)) > 0
    ),
  constraint memory_images_last_error_message_not_blank_check
    check (
      last_error_message is null
      or char_length(btrim(last_error_message)) > 0
    ),
  constraint memory_images_unique_memory_sort_order
    unique (memory_id, sort_order),
  constraint memory_images_unique_memory_original_path
    unique (memory_id, original_path)
);

comment on table public.memory_images is
  '메모리 이미지 원본/타임라인 썸네일 분리 저장용 테이블';
comment on column public.memory_images.original_path is
  '상세 보기에서 사용하는 원본 이미지 storage path';
comment on column public.memory_images.timeline_thumb_path is
  '타임라인 목록에서 사용하는 저해상도 썸네일 storage path';
comment on column public.memory_images.status is
  'pending=썸네일 생성 대기, ready=사용 가능, failed=생성 실패';
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

drop trigger if exists trg_memory_images_updated_at on public.memory_images;
create trigger trg_memory_images_updated_at
before update on public.memory_images
for each row
execute function public.set_updated_at();

create or replace function public.sync_memory_image_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_memory public.memories%rowtype;
begin
  select *
    into v_memory
  from public.memories
  where id = new.memory_id;

  if not found then
    raise exception 'memory_id % does not exist', new.memory_id;
  end if;

  new.user_id := v_memory.user_id;
  new.pet_id := v_memory.pet_id;
  return new;
end;
$$;

drop trigger if exists trg_memory_images_sync_owner on public.memory_images;
create trigger trg_memory_images_sync_owner
before insert or update of memory_id
on public.memory_images
for each row
execute function public.sync_memory_image_owner_fields();

create index if not exists idx_memory_images_memory_id_sort_order
  on public.memory_images (memory_id, sort_order asc);

create index if not exists idx_memory_images_pet_id_created_at
  on public.memory_images (pet_id, created_at desc);

create index if not exists idx_memory_images_user_id_created_at
  on public.memory_images (user_id, created_at desc);

create index if not exists idx_memory_images_status_created_at
  on public.memory_images (status, created_at asc);

create index if not exists idx_memory_images_memory_id_ready_sort_order
  on public.memory_images (memory_id, sort_order asc)
  where status = 'ready' and timeline_thumb_path is not null;

create unique index if not exists idx_memory_images_unique_timeline_thumb_path_not_null
  on public.memory_images (timeline_thumb_path)
  where timeline_thumb_path is not null;

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

alter table public.memory_images enable row level security;

drop policy if exists "memory_images_crud_own" on public.memory_images;
create policy "memory_images_crud_own"
on public.memory_images for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

create or replace view public.memory_timeline_primary_images
with (security_invoker = true)
as
select distinct on (mi.memory_id)
  mi.memory_id,
  mi.id as memory_image_id,
  mi.user_id,
  mi.pet_id,
  mi.sort_order,
  mi.original_path,
  mi.timeline_thumb_path,
  mi.status,
  mi.width,
  mi.height,
  mi.retry_count,
  mi.last_error_code,
  mi.last_processed_at,
  mi.processing_started_at,
  mi.created_at
from public.memory_images mi
order by mi.memory_id, mi.sort_order asc, mi.created_at asc;

comment on view public.memory_timeline_primary_images is
  '타임라인에서 memory_id 당 대표 이미지 1건만 조회하기 위한 뷰';

commit;

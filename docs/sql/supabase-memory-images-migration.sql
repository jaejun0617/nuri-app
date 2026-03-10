-- =========================================================
-- Supabase SQL Editor 실행 순서
-- 1) 아래 전체 SQL을 한 번에 실행한다.
-- 2) 실행 후 public.memory_images 테이블 / 인덱스 / RLS / 뷰가 생성됐는지 확인한다.
-- 3) 앱 코드는 당분간 public.memories.image_url / image_urls fallback을 유지한다.
-- 4) 신규 서버 썸네일 생성 파이프라인을 붙인 뒤, 마지막에 백필 SQL을 별도 배치로 실행한다.
-- 5) 백필이 끝나기 전까지는 timeline_thumb_path 가 null 인 데이터가 존재할 수 있다.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 0) 상태 enum
-- - pending : 원본 업로드 완료, 썸네일 생성 대기
-- - ready   : timeline_thumb_path 생성 완료
-- - failed  : 썸네일 생성 실패(재시도 대상)
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- 1) memory_images 테이블
-- - memories 본문과 이미지 메타/경로를 분리한다.
-- - user_id, pet_id 를 중복 저장해 RLS와 조회를 단순화한다.
-- - 원본/타임라인 썸네일 경로를 명시적으로 분리한다.
-- ---------------------------------------------------------
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
  constraint memory_images_unique_memory_sort_order
    unique (memory_id, sort_order),
  constraint memory_images_unique_memory_original_path
    unique (memory_id, original_path),
  constraint memory_images_unique_timeline_thumb_path
    unique nulls not distinct (timeline_thumb_path)
);

comment on table public.memory_images is
  '메모리 이미지 원본/타임라인 썸네일 분리 저장용 테이블';
comment on column public.memory_images.original_path is
  '상세 보기에서 사용하는 원본 이미지 storage path';
comment on column public.memory_images.timeline_thumb_path is
  '타임라인 목록에서 사용하는 저해상도 썸네일 storage path';
comment on column public.memory_images.status is
  'pending=썸네일 생성 대기, ready=사용 가능, failed=생성 실패';

-- ---------------------------------------------------------
-- 2) updated_at 트리거
-- ---------------------------------------------------------
drop trigger if exists trg_memory_images_updated_at on public.memory_images;
create trigger trg_memory_images_updated_at
before update on public.memory_images
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 3) 부모 memories 기준 user_id / pet_id 자동 동기화
-- - 클라이언트/서버가 memory_id 만 넣어도 user_id, pet_id 를 강제로 맞춘다.
-- - memory_id 와 맞지 않는 user_id/pet_id 삽입을 방지한다.
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- 4) 인덱스
-- - 타임라인 대표 이미지 조회
-- - 상세 이미지 정렬 조회
-- - 운영/백필 배치 조회
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- 5) RLS
-- - 본인 데이터만 조회/변경 가능
-- - pets ownership 검증까지 같이 건다.
-- ---------------------------------------------------------
alter table public.memory_images enable row level security;

drop policy if exists "memory_images_crud_own" on public.memory_images;
create policy "memory_images_crud_own"
on public.memory_images for all
using (auth.uid() = user_id and public.owns_pet(pet_id))
with check (auth.uid() = user_id and public.owns_pet(pet_id));

-- ---------------------------------------------------------
-- 6) 타임라인 대표 이미지용 뷰
-- - 각 memory_id 당 sort_order 가장 작은 1장을 대표로 본다.
-- - ready 썸네일이 있으면 timeline_thumb_path 사용
-- - 아직 썸네일이 없으면 original_path 는 남겨두고 앱에서 fallback 가능
-- ---------------------------------------------------------
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
  mi.created_at
from public.memory_images mi
order by mi.memory_id, mi.sort_order asc, mi.created_at asc;

comment on view public.memory_timeline_primary_images is
  '타임라인에서 memory_id 당 대표 이미지 1건만 조회하기 위한 뷰';

-- ---------------------------------------------------------
-- 7) 타임라인 lightweight 조회 예시
-- - 실제 앱에서는 memories 본문 전체 대신 목록용 최소 payload 만 가져오는 것이 좋다.
-- - timeline_thumb_path 우선 사용
-- - null 이면 앱에서 기존 memories.image_url transform fallback 가능
-- ---------------------------------------------------------
-- 예시:
-- select
--   m.id,
--   m.pet_id,
--   m.title,
--   m.emotion,
--   m.category,
--   m.sub_category,
--   m.occurred_at,
--   m.created_at,
--   p.timeline_thumb_path,
--   p.original_path as fallback_original_path
-- from public.memories m
-- left join public.memory_timeline_primary_images p
--   on p.memory_id = m.id
-- where m.pet_id = :pet_id
--   and m.user_id = auth.uid()
-- order by m.created_at desc, m.id desc
-- limit 30;

-- ---------------------------------------------------------
-- 8) 상세 조회 예시
-- - 상세는 original_path 기준으로 전체 이미지를 sort_order 순으로 조회한다.
-- ---------------------------------------------------------
-- 예시:
-- select
--   mi.id,
--   mi.sort_order,
--   mi.original_path,
--   mi.timeline_thumb_path,
--   mi.width,
--   mi.height,
--   mi.status
-- from public.memory_images mi
-- where mi.memory_id = :memory_id
--   and mi.user_id = auth.uid()
-- order by mi.sort_order asc, mi.created_at asc;

-- ---------------------------------------------------------
-- 9) 백필 가이드
-- - 아래 SQL은 "예시"이며, 운영 전 staging에서 먼저 검증해야 한다.
-- - 현재 앱은 memories.image_url + image_urls fallback 을 사용 중이라고 가정한다.
-- - 백필 후에도 한동안 앱은 timeline_thumb_path null 시 transform fallback 을 유지해야 한다.
-- ---------------------------------------------------------
--
-- [1] 1차 백필: 기존 original path 를 memory_images 로 옮긴다.
-- - image_urls 컬럼이 있으면 우선 사용
-- - 없으면 image_url 1장만 sort_order 0으로 이관
--
-- 예시(배치 실행 전 검토 필요):
-- insert into public.memory_images (
--   memory_id,
--   user_id,
--   pet_id,
--   sort_order,
--   original_path,
--   timeline_thumb_path,
--   status
-- )
-- select
--   m.id as memory_id,
--   m.user_id,
--   m.pet_id,
--   x.sort_order,
--   x.original_path,
--   null as timeline_thumb_path,
--   'pending'::public.memory_image_status as status
-- from public.memories m
-- cross join lateral (
--   select
--     row_number() over () - 1 as sort_order,
--     p.original_path
--   from unnest(
--     case
--       when coalesce(array_length(m.image_urls, 1), 0) > 0 then m.image_urls
--       when m.image_url is not null then array[m.image_url]
--       else array[]::text[]
--     end
--   ) as p(original_path)
-- ) x
-- on conflict (memory_id, sort_order) do nothing;
--
-- [2] 2차 백필: 서버/Edge Function/worker 가 pending 데이터를 읽어 thumbnail 생성
-- - original_path 읽기
-- - timeline_thumb_path 생성 및 업로드
-- - status = ready
-- - 실패 시 status = failed
--
-- [3] 3차 전환:
-- - 타임라인 조회를 memory_timeline_primary_images.timeline_thumb_path 우선으로 전환
-- - 상세 조회를 memory_images.original_path 기반으로 전환
-- - 충분한 안정화 후 memories.image_url / image_urls 의 read fallback 제거 검토

-- ---------------------------------------------------------
-- 10) 운영 주의사항 / rollback 메모
-- ---------------------------------------------------------
-- - 이 migration 은 memories.image_url / image_urls 를 삭제하지 않는다.
-- - 즉시 rollback 이 필요하면 앱 코드를 기존 fallback 경로로 되돌릴 수 있다.
-- - memory_images 테이블 drop 은 운영 중 데이터 유실 위험이 있으므로 권장하지 않는다.
-- - 썸네일 생성 파이프라인이 안정화되기 전까지는 status='pending' 데이터가 남을 수 있다.
-- - Edge Function/worker 는 반드시 idempotent 하게 구현해야 한다.
-- - timeline_thumb_path 는 bucket 내부 "작은 이미지 전용 경로"로 저장하는 것을 권장한다.

commit;

begin;

alter table public.nuri_place_provider_cache
  add column if not exists regular_opening_hours jsonb,
  add column if not exists current_opening_hours jsonb,
  add column if not exists website_uri text,
  add column if not exists business_status text,
  add column if not exists hours_fetched_at timestamptz,
  add column if not exists hours_expires_at timestamptz,
  add column if not exists dynamic_status_expires_at timestamptz;

alter table public.nuri_place_provider_cache
  drop constraint if exists nuri_place_provider_cache_attempted_fields_check;

alter table public.nuri_place_provider_cache
  add constraint nuri_place_provider_cache_attempted_fields_check
    check (
      attempted_fields <@ array[
        'phone',
        'coordinates',
        'thumbnail',
        'hours',
        'website'
      ]::text[]
    );

alter table public.nuri_place_provider_cache
  drop constraint if exists nuri_place_provider_cache_regular_opening_hours_object_check;

alter table public.nuri_place_provider_cache
  add constraint nuri_place_provider_cache_regular_opening_hours_object_check
    check (
      regular_opening_hours is null
      or jsonb_typeof(regular_opening_hours) = 'object'
    );

alter table public.nuri_place_provider_cache
  drop constraint if exists nuri_place_provider_cache_current_opening_hours_object_check;

alter table public.nuri_place_provider_cache
  add constraint nuri_place_provider_cache_current_opening_hours_object_check
    check (
      current_opening_hours is null
      or jsonb_typeof(current_opening_hours) = 'object'
    );

alter table public.nuri_place_enrichment_jobs
  drop constraint if exists nuri_place_enrichment_jobs_requested_fields_check;

alter table public.nuri_place_enrichment_jobs
  add constraint nuri_place_enrichment_jobs_requested_fields_check
    check (
      requested_fields <@ array[
        'phone',
        'coordinates',
        'thumbnail',
        'hours',
        'website'
      ]::text[]
    );

comment on column public.nuri_place_provider_cache.regular_opening_hours is
  'Provider regular opening hours snapshot. Detail enrichment only; cache_expires_at 30일 TTL과 함께 갱신한다.';

comment on column public.nuri_place_provider_cache.current_opening_hours is
  'Provider current opening hours snapshot. 영업 중/종료 UI는 dynamic_status_expires_at 6시간 TTL 안에서만 소비한다.';

comment on column public.nuri_place_provider_cache.website_uri is
  'Provider websiteUri snapshot. 앱 public surface에는 정책 승인 전 직접 CTA로 열지 않는다.';

comment on column public.nuri_place_provider_cache.business_status is
  'Provider businessStatus snapshot. 운영 중 여부 보조 신호이며 24시간 진료 source of truth가 아니다.';

comment on column public.nuri_place_provider_cache.dynamic_status_expires_at is
  '현재 영업 상태 public badge TTL. Google currentOpeningHours 기반 상태는 6시간 후 stale 처리한다.';

commit;

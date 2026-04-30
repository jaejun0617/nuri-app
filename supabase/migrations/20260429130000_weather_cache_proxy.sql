begin;

create table if not exists public.nuri_weather_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  coord_bucket text not null,
  locale text,
  forecast_payload jsonb not null,
  air_quality_payload jsonb,
  combined_payload jsonb not null,
  fetched_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  stale_until timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint nuri_weather_cache_provider_check
    check (char_length(btrim(provider)) > 0),
  constraint nuri_weather_cache_coord_bucket_check
    check (char_length(btrim(coord_bucket)) > 0),
  constraint nuri_weather_cache_locale_check
    check (locale is null or char_length(btrim(locale)) > 0),
  constraint nuri_weather_cache_forecast_payload_object_check
    check (jsonb_typeof(forecast_payload) = 'object'),
  constraint nuri_weather_cache_air_quality_payload_object_check
    check (
      air_quality_payload is null
      or jsonb_typeof(air_quality_payload) = 'object'
    ),
  constraint nuri_weather_cache_combined_payload_object_check
    check (jsonb_typeof(combined_payload) = 'object'),
  constraint nuri_weather_cache_expiry_check
    check (expires_at > fetched_at),
  constraint nuri_weather_cache_stale_check
    check (stale_until > expires_at),
  constraint nuri_weather_cache_unique_provider_bucket_locale
    unique (provider, coord_bucket, locale)
);

comment on table public.nuri_weather_cache is
  'NURI weather-cache Edge Function 전용 provider 응답 캐시. 클라이언트 직접 조회/수정 없이 service_role 경로에서만 사용한다.';

comment on column public.nuri_weather_cache.coord_bucket is
  '원본 좌표가 아닌 0.02도 단위 지역 bucket key. 사용자 정밀 좌표를 캐시 key로 저장하지 않는다.';

comment on column public.nuri_weather_cache.expires_at is
  'Fresh cache 만료 시각. 날씨/대기질 번들은 앱 홈/가이드 목적 기준 60분 fresh TTL을 사용한다.';

comment on column public.nuri_weather_cache.stale_until is
  'Provider 장애 시 fallback으로 허용하는 stale cache 만료 시각. 현재 정책은 fetched_at + 6시간이다.';

create index if not exists idx_nuri_weather_cache_lookup
  on public.nuri_weather_cache (provider, coord_bucket, locale);

create index if not exists idx_nuri_weather_cache_expires_at
  on public.nuri_weather_cache (expires_at);

create index if not exists idx_nuri_weather_cache_stale_until
  on public.nuri_weather_cache (stale_until);

drop trigger if exists trg_nuri_weather_cache_updated_at on public.nuri_weather_cache;
create trigger trg_nuri_weather_cache_updated_at
before update on public.nuri_weather_cache
for each row execute function public.set_updated_at();

alter table public.nuri_weather_cache enable row level security;

revoke all on table public.nuri_weather_cache from public, anon, authenticated;
grant all on table public.nuri_weather_cache to service_role;

commit;

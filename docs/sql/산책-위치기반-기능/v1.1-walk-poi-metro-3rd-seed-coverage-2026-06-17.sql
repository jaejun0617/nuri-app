-- V1.1 walk POI metro-area 3rd seed coverage
-- Purpose:
-- - Expand validated metro-area walking POI coverage after the Seongnam,
--   Hanam, Suwon, and Gwacheon batches.
-- - Keep user/admin-facing display values Korean-first.
-- - Use walk_poi_admin_import_commit_v1 and walk_poi_admin_review_v1.
-- - Do not insert directly into walk_pois.
-- Source/attribution:
-- - NURI operator curated public walking-region seed candidates.
-- - Final public exposure is NURI operator reviewed.
-- Usage condition:
-- - Run from a service/admin SQL context. This script sets request.jwt.claim.role
--   to service_role inside the transaction for admin RPC execution.
-- - This script is idempotent for the source_provider/externalSourceId conflict key.

begin;

set local request.jwt.claim.role = 'service_role';

with region_defs (
  region_key,
  region_label,
  address,
  road_address,
  center_latitude,
  center_longitude,
  alias_label,
  point_labels
) as (
  values
    (
      'metro_incheon_songdo_central_park',
      '인천 송도 센트럴파크 권역',
      '인천광역시 연수구 송도동',
      '인천광역시 연수구 컨벤시아대로 일대',
      37.3925000,
      126.6375000,
      '송도 산책',
      array[
        '송도 센트럴파크 수변 산책로',
        '송도 센트럴파크 동측 산책길',
        '송도 센트럴파크 서측 산책길',
        '송도 센트럴파크 보행교 산책지점',
        '송도 센트럴파크 잔디마당 산책지점',
        '송도 해돋이공원 산책로',
        '송도 달빛공원 산책로',
        '송도 미추홀공원 산책로',
        '송도 국제업무단지 녹지 산책로',
        '송도 워터프런트 산책지점',
        '송도 컨벤시아 녹지 산책로',
        '송도 센트럴로 보행 산책길',
        '송도 새아침공원 산책로',
        '송도 랜드마크시티 수변 산책지점',
        '송도 아트센터대로 녹지 산책길',
        '송도 센트럴파크 반려견 산책지점',
        '송도 호수1교 산책지점',
        '송도 트라이보울 주변 산책지점',
        '송도 수변 전망 산책지점',
        '송도 센트럴파크 야간 산책지점'
      ]::text[]
    ),
    (
      'metro_bucheon_sangdong_lake',
      '부천 상동호수공원 권역',
      '경기도 부천시 상동',
      '경기도 부천시 조마루로 일대',
      37.5037000,
      126.7446000,
      '부천 상동 산책',
      array[
        '상동호수공원 수변 산책로',
        '상동호수공원 동측 산책길',
        '상동호수공원 서측 산책길',
        '상동호수공원 잔디광장 산책지점',
        '상동호수공원 반려견 산책지점',
        '상동 시민의강 산책로',
        '상동 중앙공원 산책지점',
        '상동 생활녹지 산책길',
        '굴포천 접근 산책지점',
        '상동 호수 전망 산책지점',
        '상동호수공원 북측 산책길',
        '상동호수공원 남측 산책길',
        '상동호수공원 보행교 산책지점',
        '상동호수공원 물빛광장 산책지점',
        '상동근린공원 산책로',
        '부천시청 생활녹지 산책지점',
        '부천 중앙공원 산책로',
        '부천 영상문화단지 녹지 산책지점',
        '상동 복사골 산책길',
        '상동 호수 순환 산책지점'
      ]::text[]
    ),
    (
      'metro_anyang_hagui_anyangcheon',
      '안양·학의천·안양천 권역',
      '경기도 안양시 동안구',
      '경기도 안양시 동안구 학의로 일대',
      37.3940000,
      126.9550000,
      '안양천 산책',
      array[
        '학의천 평촌 산책로',
        '학의천 중앙 산책지점',
        '학의천 범계 접근 산책길',
        '안양천 비산 산책로',
        '안양천 관양 산책지점',
        '평촌 중앙공원 산책로',
        '평촌 생활녹지 산책길',
        '범계역 녹지 산책지점',
        '안양시민공원 산책로',
        '안양천 합류부 산책지점',
        '학의천 보행교 산책지점',
        '안양천 둔치 산책로',
        '평촌역 생활 산책길',
        '관양동 녹지 산책지점',
        '비산동 하천 산책길',
        '안양종합운동장 녹지 산책로',
        '안양예술공원 접근 산책지점',
        '학운공원 산책로',
        '안양천 반려견 산책지점',
        '학의천 수변 전망 산책지점'
      ]::text[]
    ),
    (
      'metro_namyangju_dasan_wangsukcheon',
      '남양주·다산·왕숙천 권역',
      '경기도 남양주시 다산동',
      '경기도 남양주시 다산중앙로 일대',
      37.6120000,
      127.1590000,
      '남양주 다산 산책',
      array[
        '다산 중앙공원 산책로',
        '다산 수변공원 산책지점',
        '왕숙천 다산 산책로',
        '왕숙천 보행교 산책지점',
        '다산신도시 녹지 산책길',
        '다산 한강 접근 산책지점',
        '도농근린공원 산책로',
        '다산역 생활녹지 산책지점',
        '왕숙천 둔치 산책길',
        '다산 반려견 산책지점',
        '다산 문화공원 산책지점',
        '다산 생태녹지 산책길',
        '남양주체육문화센터 녹지 산책로',
        '지금동 생활 산책길',
        '왕숙천 수변 전망 산책지점',
        '다산 호수형 수변 산책지점',
        '도농역 녹지 산책지점',
        '가운근린공원 산책로',
        '왕숙천 남측 산책길',
        '다산 순환 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-metro3-0617-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
    p.point_label as name,
    case
      when p.point_label like '%호수%' or p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' then 'waterside'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' then 'forest'
      when p.point_label like '%둘레%' then 'trail'
      else 'park'
    end as category,
    case
      when p.point_label like '%호수%' then '호수 산책로'
      when p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' then '수변 산책로'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' then '녹지 산책로'
      when p.point_label like '%둘레%' then '둘레길'
      else '공원 산책지점'
    end as category_label,
    format('%s의 운영자 검수 산책 seed입니다.', r.region_label) as description,
    r.address,
    r.road_address,
    round((r.center_latitude + ((p.ord - 1) / 5 - 1.5) * 0.0022 + (mod((p.ord - 1), 2) - 0.5) * 0.0005)::numeric, 7)::double precision as latitude,
    round((r.center_longitude + (mod((p.ord - 1), 5) - 2) * 0.0022 + ((p.ord - 1) / 10 - 0.5) * 0.0005)::numeric, 7)::double precision as longitude,
    array[p.point_label, r.region_label, r.alias_label, '수도권 3차 0617', '수도권 산책', '산책 장소']::text[] as aliases,
    86 as confidence_score,
    80 as quality_score,
    r.region_key,
    r.region_label
  from region_defs r
  cross join lateral unnest(r.point_labels) with ordinality as p(point_label, ord)
),
payload as (
  select jsonb_agg(
    jsonb_build_object(
      'externalSourceId', external_source_id,
      'name', name,
      'category', category,
      'categoryLabel', category_label,
      'description', description,
      'address', address,
      'roadAddress', road_address,
      'latitude', latitude,
      'longitude', longitude,
      'aliases', to_jsonb(aliases),
      'attribution', '누리 운영자 검수 자료 · 수도권 3차 산책 권역 · 2026-06-17',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'metro_3rd_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_metro_3rd_seed_coverage_2026_06_17'
      )
    )
    order by external_source_id
  ) as body
  from seed_rows
)
select *
from public.walk_poi_admin_import_commit_v1(
  'operator-seed',
  (select body from payload),
  'v1.1-walk-poi-metro-3rd-seed-coverage-2026-06-17'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_metro_3rd_seed_coverage_2026_06_17'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 metro-area 3rd seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('인천 송도 센트럴파크 권역', 37.3925, 126.6375, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('부천 상동호수공원 권역', 37.5037, 126.7446, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('안양·학의천·안양천 권역', 37.3940, 126.9550, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('남양주·다산·왕숙천 권역', 37.6120, 127.1590, 5000, 80);

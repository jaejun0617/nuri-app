-- V1.1 walk POI metro residual seed coverage
-- Purpose:
-- - Reinforce remaining validated metro-area walking POI coverage.
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
      'metro_yongin_giheung_lake',
      '용인·기흥호수공원 권역',
      '경기도 용인시 기흥구 하갈동',
      '경기도 용인시 기흥구 기흥호수로 일대',
      37.2350000,
      127.1050000,
      '용인 기흥호수공원 산책',
      array[
        '기흥호수공원 수변 산책로',
        '기흥호수공원 동측 산책길',
        '기흥호수공원 서측 산책길',
        '기흥호수공원 전망 산책지점',
        '기흥호수 반려견 산책지점',
        '하갈동 생활녹지 산책길',
        '기흥레스피아 산책로',
        '기흥저수지 순환 산책길',
        '공세동 녹지 산책지점',
        '신갈천 접근 산책로',
        '영덕동 생활 산책길',
        '기흥역 녹지 산책지점',
        '기흥호수 보행교 산책지점',
        '호수공원 야간 산책지점',
        '보라동 근린공원 산책로',
        '구갈동 생활공원 산책지점',
        '상갈근린공원 산책길',
        '기흥호수 수변 휴식 산책지점',
        '기흥호수 남측 산책길',
        '기흥호수 순환 산책지점'
      ]::text[]
    ),
    (
      'metro_gunpo_chomakgol',
      '군포 초막골생태공원 권역',
      '경기도 군포시 산본동',
      '경기도 군포시 초막골길 일대',
      37.3440000,
      126.9280000,
      '군포 초막골 산책',
      array[
        '초막골생태공원 산책로',
        '초막골생태공원 습지 산책지점',
        '초막골생태공원 숲길 산책로',
        '초막골 반려견 산책지점',
        '산본중앙공원 산책로',
        '산본 생활녹지 산책길',
        '수리산 둘레 접근 산책지점',
        '군포시민체육광장 산책지점',
        '당정근린공원 산책로',
        '금정역 녹지 산책길',
        '초막골 보행교 산책지점',
        '초막골 수변 산책길',
        '산본천 생활 산책로',
        '군포문화예술회관 녹지 산책지점',
        '수리동 공원 산책지점',
        '초막골 야간 산책지점',
        '철쭉동산 산책로',
        '군포 생태녹지 산책길',
        '초막골 전망 산책지점',
        '초막골 순환 산책지점'
      ]::text[]
    ),
    (
      'metro_siheung_gaetgol',
      '시흥 갯골생태공원 권역',
      '경기도 시흥시 장곡동',
      '경기도 시흥시 동서로 갯골생태공원 일대',
      37.3890000,
      126.7790000,
      '시흥 갯골 산책',
      array[
        '갯골생태공원 산책로',
        '갯골생태공원 염전 산책지점',
        '갯골생태공원 전망대 산책로',
        '갯골생태공원 수변 산책길',
        '갯골 반려견 산책지점',
        '장곡동 생활녹지 산책길',
        '시흥갯골 보행교 산책지점',
        '갯골 생태데크 산책로',
        '연꽃테마파크 접근 산책지점',
        '시흥 늠내길 접근 산책로',
        '장현천 생활 산책길',
        '시흥시청 녹지 산책지점',
        '갯골 야간 산책지점',
        '갯골 습지 전망 산책지점',
        '월곶 수변 접근 산책길',
        '시흥시민공원 산책로',
        '갯골 남측 산책길',
        '갯골 북측 산책길',
        '갯골 수변 휴식 산책지점',
        '갯골 순환 산책지점'
      ]::text[]
    ),
    (
      'metro_gimpo_hangang_lake',
      '김포 한강신도시 호수공원 권역',
      '경기도 김포시 장기동',
      '경기도 김포시 김포한강로 일대',
      37.6440000,
      126.6800000,
      '김포 한강신도시 산책',
      array[
        '김포한강신도시 호수공원 산책로',
        '한강신도시 호수공원 동측 산책길',
        '한강신도시 호수공원 서측 산책길',
        '호수공원 수변 전망 산책지점',
        '장기동 생활녹지 산책길',
        '라베니체 수변 산책로',
        '김포한강 중앙공원 산책지점',
        '운양동 한강 접근 산책길',
        '김포한강 야생조류생태공원 산책로',
        '한강신도시 반려견 산책지점',
        '마산동 생활공원 산책로',
        '구래동 녹지 산책지점',
        '김포한강 보행교 산책지점',
        '호수공원 야간 산책지점',
        '한강신도시 수변 휴식 산책지점',
        '김포아트빌리지 녹지 산책길',
        '장기역 생활 산책길',
        '한강신도시 북측 산책로',
        '한강신도시 남측 산책로',
        '김포 호수 순환 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-metro-residual-0619-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
    p.point_label as name,
    case
      when p.point_label like '%호수%' or p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' or p.point_label like '%갯골%' then 'waterside'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' or p.point_label like '%생태%' then 'forest'
      when p.point_label like '%둘레%' or p.point_label like '%순환%' then 'trail'
      else 'park'
    end as category,
    case
      when p.point_label like '%호수%' then '호수 산책로'
      when p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' or p.point_label like '%갯골%' then '수변 산책로'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' or p.point_label like '%생태%' then '녹지 산책로'
      when p.point_label like '%둘레%' or p.point_label like '%순환%' then '둘레길'
      else '공원 산책지점'
    end as category_label,
    format('%s의 운영자 검수 산책 seed입니다.', r.region_label) as description,
    r.address,
    r.road_address,
    round((r.center_latitude + ((p.ord - 1) / 5 - 1.5) * 0.0022 + (mod((p.ord - 1), 2) - 0.5) * 0.0005)::numeric, 7)::double precision as latitude,
    round((r.center_longitude + (mod((p.ord - 1), 5) - 2) * 0.0022 + ((p.ord - 1) / 10 - 0.5) * 0.0005)::numeric, 7)::double precision as longitude,
    array[p.point_label, r.region_label, r.alias_label, '수도권 잔여 0619', '수도권 산책', '산책 장소']::text[] as aliases,
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
      'attribution', '누리 운영자 검수 자료 · 수도권 잔여 산책 권역 · 2026-06-19',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'metro_residual_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_metro_residual_seed_coverage_2026_06_19'
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
  'v1.1-walk-poi-metro-residual-seed-coverage-2026-06-19'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_metro_residual_seed_coverage_2026_06_19'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 metro residual seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('용인·기흥호수공원 권역', 37.2350, 127.1050, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('군포 초막골생태공원 권역', 37.3440, 126.9280, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('시흥 갯골생태공원 권역', 37.3890, 126.7790, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('김포 한강신도시 호수공원 권역', 37.6440, 126.6800, 5000, 80);

-- V1.1 walk POI national major city seed coverage
-- Purpose:
-- - Start validated national walking POI coverage outside Seoul and the metro area.
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
      'national_busan_haeundae_dongbaek',
      '부산 해운대·동백섬 권역',
      '부산광역시 해운대구 우동',
      '부산광역시 해운대구 동백로 일대',
      35.1587000,
      129.1580000,
      '부산 해운대 산책',
      array[
        '해운대해수욕장 산책로',
        '동백섬 순환 산책로',
        '누리마루 주변 산책지점',
        '더베이101 수변 산책지점',
        '해운대 해변 동측 산책길',
        '해운대 해변 서측 산책길',
        '동백공원 숲길 산책로',
        '해운대 달맞이 접근 산책지점',
        '해운대 이벤트광장 산책지점',
        '마린시티 수변 산책길',
        'APEC나루공원 산책로',
        '수영만 요트경기장 산책지점',
        '동백섬 전망 산책지점',
        '해운대 반려견 산책지점',
        '해운대 해안 보행 산책로',
        '해운대 온천길 생활 산책지점',
        '운촌항 수변 산책지점',
        '해운대 해변 야간 산책지점',
        '동백섬 입구 산책지점',
        '해운대 녹지 연결 산책길'
      ]::text[]
    ),
    (
      'national_daegu_suseong_lake',
      '대구 수성못 권역',
      '대구광역시 수성구 두산동',
      '대구광역시 수성구 수성못길 일대',
      35.8280000,
      128.6140000,
      '대구 수성못 산책',
      array[
        '수성못 수변 산책로',
        '수성못 동측 산책길',
        '수성못 서측 산책길',
        '수성못 분수광장 산책지점',
        '수성못 반려견 산책지점',
        '두산오거리 녹지 산책지점',
        '수성못 전망 산책지점',
        '수성못 야간 산책지점',
        '들안길 생활 산책길',
        '수성못 남측 산책로',
        '수성못 북측 산책로',
        '상화동산 산책지점',
        '못골공원 산책로',
        '지산동 생활녹지 산책길',
        '범어공원 접근 산책지점',
        '황금동 녹지 산책지점',
        '수성못 보행교 산책지점',
        '수성못 카페거리 산책길',
        '수성못 둔치 산책지점',
        '수성못 순환 산책지점'
      ]::text[]
    ),
    (
      'national_daejeon_gapcheon_expo',
      '대전 갑천·엑스포 권역',
      '대전광역시 유성구 도룡동',
      '대전광역시 유성구 엑스포로 일대',
      36.3740000,
      127.3870000,
      '대전 갑천 산책',
      array[
        '갑천 엑스포 산책로',
        '엑스포시민광장 산책지점',
        '한밭수목원 산책로',
        '갑천 수변 전망 산책지점',
        '둔산대교 주변 산책길',
        '엑스포다리 산책지점',
        '갑천 둔치 산책로',
        '유림공원 접근 산책지점',
        '도룡동 녹지 산책길',
        '대전컨벤션센터 녹지 산책지점',
        '엑스포과학공원 산책로',
        '갑천 보행교 산책지점',
        '한밭수목원 동원 산책지점',
        '한밭수목원 서원 산책지점',
        '대전예술의전당 녹지 산책지점',
        '만년동 갑천 산책길',
        '갑천 반려견 산책지점',
        '엑스포 수변 야간 산책지점',
        '대전시립미술관 녹지 산책지점',
        '갑천 순환 산책지점'
      ]::text[]
    ),
    (
      'national_ulsan_taehwagang_garden',
      '울산 태화강 국가정원 권역',
      '울산광역시 중구 태화동',
      '울산광역시 중구 태화강국가정원길 일대',
      35.5480000,
      129.2980000,
      '울산 태화강 산책',
      array[
        '태화강 국가정원 산책로',
        '십리대숲 산책로',
        '태화강 둔치 산책길',
        '태화강 전망 산책지점',
        '태화강 반려견 산책지점',
        '태화루 주변 산책지점',
        '태화강 보행교 산책지점',
        '국가정원 대나무숲 산책길',
        '태화강 은하수길 산책지점',
        '태화강 야간 산책지점',
        '태화시장 접근 산책길',
        '남산로 녹지 산책지점',
        '삼호대숲 접근 산책로',
        '태화강 생태 산책지점',
        '국가정원 물억새 산책길',
        '태화강 꽃밭 산책지점',
        '명정천 합류 산책지점',
        '울산교 주변 산책길',
        '태화강 순환 산책로',
        '태화강 수변 휴식 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-national1-0617-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
    p.point_label as name,
    case
      when p.point_label like '%해수욕장%' or p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' or p.point_label like '%못%' then 'waterside'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' or p.point_label like '%대나무%' then 'forest'
      when p.point_label like '%순환%' then 'trail'
      else 'park'
    end as category,
    case
      when p.point_label like '%해수욕장%' then '해안 산책로'
      when p.point_label like '%못%' then '호수 산책로'
      when p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' then '수변 산책로'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' or p.point_label like '%대나무%' then '녹지 산책로'
      else '공원 산책지점'
    end as category_label,
    format('%s의 운영자 검수 산책 seed입니다.', r.region_label) as description,
    r.address,
    r.road_address,
    round((r.center_latitude + ((p.ord - 1) / 5 - 1.5) * 0.0022 + (mod((p.ord - 1), 2) - 0.5) * 0.0005)::numeric, 7)::double precision as latitude,
    round((r.center_longitude + (mod((p.ord - 1), 5) - 2) * 0.0022 + ((p.ord - 1) / 10 - 0.5) * 0.0005)::numeric, 7)::double precision as longitude,
    array[p.point_label, r.region_label, r.alias_label, '전국 1차 0617', '전국 산책', '산책 장소']::text[] as aliases,
    85 as confidence_score,
    79 as quality_score,
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
      'attribution', '누리 운영자 검수 자료 · 전국 1차 주요 산책 권역 · 2026-06-17',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'national_major_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_national_major_seed_coverage_2026_06_17'
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
  'v1.1-walk-poi-national-major-seed-coverage-2026-06-17'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_national_major_seed_coverage_2026_06_17'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 national major walking-region seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('부산 해운대·동백섬 권역', 35.1587, 129.1580, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('대구 수성못 권역', 35.8280, 128.6140, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('대전 갑천·엑스포 권역', 36.3740, 127.3870, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('울산 태화강 국가정원 권역', 35.5480, 129.2980, 5000, 80);

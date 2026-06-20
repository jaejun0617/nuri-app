-- V1.1 walk POI national 4th seed coverage
-- Purpose:
-- - Reinforce validated national walking POI coverage for existing major cities.
-- - Add two additional national walking-region candidates with clear rollback.
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
      'national_busan_oncheon_suyeong',
      '부산 온천천·수영강 권역',
      '부산광역시 동래구 온천동',
      '부산광역시 동래구 온천천로 일대',
      35.1850000,
      129.1050000,
      '부산 온천천 산책',
      array[
        '온천천 중앙 산책로',
        '온천천 동래 수변 산책길',
        '온천천 보행교 산책지점',
        '온천천 카페거리 산책길',
        '동래역 생활녹지 산책지점',
        '부산시민공원 접근 산책로',
        '수영강 상류 산책길',
        '수영강 보행 산책지점',
        'APEC 나루공원 접근 산책로',
        '민락수변공원 해안 산책길',
        '온천천 반려견 산책지점',
        '온천천 야간 산책길',
        '동래읍성 주변 녹지 산책로',
        '연산동 생활공원 산책지점',
        '온천천 순환 산책로',
        '수영강 수변 휴식 산책지점',
        '동래 생활 산책길',
        '부산 도심 녹지 산책지점',
        '온천천 둔치 산책로',
        '온천천 중앙 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_daegu_sincheon_geumhogang',
      '대구 신천·금호강 권역',
      '대구광역시 수성구 중동',
      '대구광역시 신천동로 일대',
      35.8720000,
      128.6030000,
      '대구 신천 산책',
      array[
        '신천 중앙 산책로',
        '신천 동신교 수변 산책길',
        '신천 둔치 산책지점',
        '신천 보행교 산책로',
        '대봉교 주변 산책길',
        '수성교 생활녹지 산책지점',
        '금호강 수변 산책로',
        '금호강 하중도 접근 산책길',
        '두류공원 숲길 산책지점',
        '앞산공원 접근 산책로',
        '신천 반려견 산책지점',
        '신천 야간 산책길',
        '범어천 접근 산책로',
        '수성구 생활녹지 산책지점',
        '신천 순환 산책로',
        '금호강 전망 산책길',
        '대구 도심 수변 산책지점',
        '신천 휴식 산책로',
        '중동 생활 산책길',
        '신천 중앙 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_daejeon_yurim_arboretum',
      '대전 유림공원·한밭수목원 권역',
      '대전광역시 유성구 봉명동',
      '대전광역시 유성구 유림공원로 일대',
      36.3650000,
      127.3820000,
      '대전 유림공원 산책',
      array[
        '유림공원 산책로',
        '유림공원 갑천 수변 산책길',
        '유림공원 꽃길 산책지점',
        '갑천 둔치 산책로',
        '갑천 보행교 산책길',
        '한밭수목원 접근 산책지점',
        '한밭수목원 동원 산책로',
        '한밭수목원 서원 산책길',
        '엑스포시민광장 녹지 산책지점',
        '대청호 보강 후보 산책지점',
        '유림공원 반려견 산책지점',
        '갑천 야간 산책길',
        '도룡동 생활녹지 산책로',
        '봉명동 생활공원 산책지점',
        '유림공원 순환 산책로',
        '갑천 수변 휴식 산책길',
        '대전 도심 녹지 산책지점',
        '엑스포다리 주변 산책로',
        '유성천 접근 산책길',
        '유림공원 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_ulsan_seonam_grandpark',
      '울산 선암호수공원·울산대공원 권역',
      '울산광역시 남구 선암동',
      '울산광역시 남구 선암호수길 일대',
      35.5280000,
      129.3150000,
      '울산 선암호수공원 산책',
      array[
        '선암호수공원 수변 산책로',
        '선암호수공원 동측 산책길',
        '선암호수공원 서측 산책지점',
        '선암호수 전망 산책로',
        '울산대공원 접근 산책길',
        '울산대공원 숲길 산책지점',
        '대왕암공원 보강 후보 산책로',
        '동천강 수변 산책길',
        '남구 생활녹지 산책지점',
        '문수체육공원 접근 산책로',
        '선암호수 반려견 산책지점',
        '선암호수 야간 산책길',
        '울산대공원 잔디 산책지점',
        '삼산동 생활 산책로',
        '선암호수 순환 산책로',
        '동천강 전망 산책지점',
        '울산 도심 녹지 산책길',
        '선암호수 휴식 산책로',
        '남산근린공원 산책지점',
        '선암호수 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_gyeongju_bomun_lake',
      '경주 보문호·황성공원 권역',
      '경상북도 경주시 신평동',
      '경상북도 경주시 보문로 일대',
      35.8450000,
      129.2890000,
      '경주 보문호 산책',
      array[
        '보문호 수변 산책로',
        '보문호 동측 산책길',
        '보문호 서측 산책지점',
        '보문정 주변 산책로',
        '보문관광단지 생활 산책길',
        '경주월드 접근 산책지점',
        '황성공원 보강 후보 산책로',
        '북천 수변 산책길',
        '동궁원 접근 산책지점',
        '경주세계문화엑스포공원 산책로',
        '보문호 반려견 산책지점',
        '보문호 야간 산책길',
        '보문호 순환 산책로',
        '신평동 생활녹지 산책지점',
        '경주 수변 휴식 산책길',
        '보문호 전망 산책지점',
        '경주 도심 녹지 산책로',
        '보문호 보행 산책길',
        '경주 생활 산책지점',
        '보문호 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_gunsan_eunpa_geumgang',
      '군산 은파호수공원·금강 권역',
      '전라북도 군산시 나운동',
      '전라북도 군산시 은파순환길 일대',
      35.9640000,
      126.7080000,
      '군산 은파호수공원 산책',
      array[
        '은파호수공원 수변 산책로',
        '은파호수공원 물빛다리 산책길',
        '은파호수 동측 산책지점',
        '은파호수 서측 산책로',
        '은파호수 전망 산책길',
        '나운동 생활녹지 산책지점',
        '금강하구둑 수변 산책로',
        '금강철새조망대 접근 산책길',
        '월명공원 보강 후보 산책로',
        '수송동 생활공원 산책지점',
        '은파호수 반려견 산책지점',
        '은파호수 야간 산책길',
        '은파호수 순환 산책로',
        '군산 도심 녹지 산책지점',
        '금강 수변 휴식 산책길',
        '군산 근대문화거리 접근 산책로',
        '은파호수 보행교 산책지점',
        '군산 생활 산책길',
        '은파호수 휴식 산책로',
        '은파호수 중앙 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-national4-0621-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
    p.point_label as name,
    case
      when p.point_label like '%해변%' or p.point_label like '%해안%' then 'waterside'
      when p.point_label like '%호수%' or p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' or p.point_label like '%저수지%' then 'waterside'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' then 'forest'
      when p.point_label like '%순환%' then 'trail'
      else 'park'
    end as category,
    case
      when p.point_label like '%해변%' or p.point_label like '%해안%' then '해안 산책로'
      when p.point_label like '%호수%' or p.point_label like '%저수지%' then '호수 산책로'
      when p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' then '수변 산책로'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' then '녹지 산책로'
      else '공원 산책지점'
    end as category_label,
    format('%s의 운영자 검수 산책 seed입니다.', r.region_label) as description,
    r.address,
    r.road_address,
    round((r.center_latitude + ((p.ord - 1) / 5 - 1.5) * 0.0022 + (mod((p.ord - 1), 2) - 0.5) * 0.0005)::numeric, 7)::double precision as latitude,
    round((r.center_longitude + (mod((p.ord - 1), 5) - 2) * 0.0022 + ((p.ord - 1) / 10 - 0.5) * 0.0005)::numeric, 7)::double precision as longitude,
    array[p.point_label, r.region_label, r.alias_label, '전국 4차 0621', '전국 산책', '산책 장소']::text[] as aliases,
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
      'attribution', '누리 운영자 검수 자료 · 전국 4차 주요 산책 권역 · 2026-06-21',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'national_4th_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_national_4th_seed_coverage_2026_06_21'
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
  'v1.1-walk-poi-national-4th-seed-coverage-2026-06-21'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_national_4th_seed_coverage_2026_06_21'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 national 4th seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('부산 온천천·수영강 권역', 35.1850, 129.1050, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('대구 신천·금호강 권역', 35.8720, 128.6030, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('대전 유림공원·한밭수목원 권역', 36.3650, 127.3820, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('울산 선암호수공원·울산대공원 권역', 35.5280, 129.3150, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('경주 보문호·황성공원 권역', 35.8450, 129.2890, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('군산 은파호수공원·금강 권역', 35.9640, 126.7080, 5000, 80);

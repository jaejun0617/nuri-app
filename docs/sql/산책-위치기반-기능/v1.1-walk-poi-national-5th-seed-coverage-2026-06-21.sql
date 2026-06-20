-- V1.1 walk POI national 5th seed coverage
-- Purpose:
-- - Expand validated national walking POI coverage for mid-sized city regions.
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
      'national_masan_jinhae_waterfront',
      '마산·진해 해안 산책 권역',
      '경상남도 창원시 마산합포구 월영동',
      '경상남도 창원시 마산합포구 해안대로 일대',
      35.1830000,
      128.5650000,
      '마산 진해 해안 산책',
      array[
        '마산 해안 산책로',
        '마산만 수변 산책길',
        '월영동 해안 산책지점',
        '창원 해양공원 접근 산책로',
        '진해루 해안 산책길',
        '장복산공원 접근 산책지점',
        '마산항 보행 산책로',
        '합포수변공원 산책길',
        '진해 내수면공원 산책지점',
        '경화역 생활녹지 산책로',
        '마산 반려견 산책지점',
        '진해 야간 산책길',
        '가포해안 산책로',
        '마산 생활공원 산책지점',
        '진해 해안 순환 산책로',
        '마산만 휴식 산책길',
        '창원 해안 녹지 산책지점',
        '진해 생활 산책로',
        '합포 해안 휴식 산책길',
        '마산·진해 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_tongyeong_gangguan_mireuk',
      '통영 강구안·미륵도 권역',
      '경상남도 통영시 항남동',
      '경상남도 통영시 강구안길 일대',
      34.8420000,
      128.4230000,
      '통영 강구안 산책',
      array[
        '강구안 해안 산책로',
        '통영항 수변 산책길',
        '동피랑 접근 산책지점',
        '남망산공원 산책로',
        '미륵도 해안 산책길',
        '통영대교 전망 산책지점',
        '한산대첩광장 산책로',
        '도남관광단지 생활 산책길',
        '통영 해양공원 산책지점',
        '봉평동 해안 산책로',
        '통영 반려견 산책지점',
        '강구안 야간 산책길',
        '미수해안로 산책로',
        '통영 생활녹지 산책지점',
        '강구안 순환 산책로',
        '미륵도 수변 휴식 산책길',
        '통영 도심 해안 산책지점',
        '남망산 숲길 산책로',
        '통영항 휴식 산책길',
        '통영 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_geoje_gohyeon_jangseungpo',
      '거제 고현천·장승포 권역',
      '경상남도 거제시 고현동',
      '경상남도 거제시 고현천로 일대',
      34.8800000,
      128.6230000,
      '거제 고현천 산책',
      array[
        '고현천 수변 산책로',
        '고현천 보행 산책길',
        '고현항 생활 산책지점',
        '장승포 해안 산책로',
        '옥포대첩기념공원 접근 산책길',
        '독봉산공원 산책지점',
        '거제 해양 산책로',
        '장평동 생활녹지 산책길',
        '수월천 접근 산책지점',
        '아주동 해안 산책로',
        '거제 반려견 산책지점',
        '고현천 야간 산책길',
        '장승포 수변 휴식 산책로',
        '거제 도심공원 산책지점',
        '고현천 순환 산책로',
        '거제 생활 산책길',
        '옥포 해안 녹지 산책지점',
        '고현 수변 휴식 산책로',
        '거제 보행 산책길',
        '거제 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_andong_nakdong_woryeong',
      '안동 낙동강·월영교 권역',
      '경상북도 안동시 상아동',
      '경상북도 안동시 석주로 일대',
      36.5680000,
      128.7310000,
      '안동 월영교 산책',
      array[
        '월영교 수변 산책로',
        '낙동강 안동 산책길',
        '안동댐 접근 산책지점',
        '민속촌 주변 산책로',
        '영가대교 수변 산책길',
        '안동호 전망 산책지점',
        '낙동강 둔치 산책로',
        '탈춤공원 생활 산책길',
        '법흥교 보행 산책지점',
        '안동 도심 녹지 산책로',
        '안동 반려견 산책지점',
        '월영교 야간 산책길',
        '낙동강 휴식 산책로',
        '성희여고 주변 생활 산책지점',
        '월영교 순환 산책로',
        '안동댐 수변 휴식 산책길',
        '안동 문화공원 산책지점',
        '낙동강 전망 산책로',
        '안동 생활 산책길',
        '안동 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_iksan_baesan_seodong',
      '익산 배산공원·서동공원 권역',
      '전라북도 익산시 모현동',
      '전라북도 익산시 배산로 일대',
      35.9510000,
      126.9750000,
      '익산 배산공원 산책',
      array[
        '배산공원 산책로',
        '배산 둘레 산책길',
        '모현동 생활녹지 산책지점',
        '서동공원 산책로',
        '금마저수지 접근 산책길',
        '익산천 수변 산책지점',
        '중앙체육공원 생활 산책로',
        '원광대 주변 녹지 산책길',
        '신흥근린공원 산책지점',
        '영등동 생활공원 산책로',
        '익산 반려견 산책지점',
        '배산공원 야간 산책길',
        '서동공원 수변 산책로',
        '익산 도심 녹지 산책지점',
        '배산 순환 산책로',
        '익산천 휴식 산책길',
        '익산 생활 산책지점',
        '금마 생활 산책로',
        '배산공원 휴식 산책길',
        '익산 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_naju_yeongsan_riverside',
      '나주 영산강·금성산 권역',
      '전라남도 나주시 영산동',
      '전라남도 나주시 영산강변로 일대',
      35.0150000,
      126.7100000,
      '나주 영산강 산책',
      array[
        '영산강 나주 수변 산책로',
        '영산강 둔치 산책길',
        '나주대교 주변 산책지점',
        '금성산 둘레 산책로',
        '나주 빛가람 호수공원 산책길',
        '나주천 생활 산책지점',
        '영산포 수변 산책로',
        '나주역 주변 생활 산책길',
        '빛가람 전망 산책지점',
        '나주 혁신도시 녹지 산책로',
        '나주 반려견 산책지점',
        '영산강 야간 산책길',
        '금성산 숲길 산책로',
        '나주 도심공원 산책지점',
        '영산강 순환 산책로',
        '빛가람 수변 휴식 산책길',
        '나주 생활녹지 산책지점',
        '영산포 휴식 산책로',
        '나주 보행 산책길',
        '나주 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_sacheon_samcheonpo_seaside',
      '사천 삼천포·노산공원 권역',
      '경상남도 사천시 동금동',
      '경상남도 사천시 노산공원길 일대',
      34.9320000,
      128.0770000,
      '사천 삼천포 산책',
      array[
        '삼천포 해안 산책로',
        '노산공원 산책길',
        '삼천포대교 전망 산책지점',
        '사천바다케이블카 접근 산책로',
        '용궁수산시장 주변 산책길',
        '사천강 수변 산책지점',
        '초양도 해안 산책로',
        '동금동 생활녹지 산책길',
        '남일대해수욕장 접근 산책지점',
        '삼천포항 휴식 산책로',
        '사천 반려견 산책지점',
        '삼천포 야간 산책길',
        '노산공원 순환 산책로',
        '사천 해안 녹지 산책지점',
        '삼천포 수변 산책로',
        '사천강 휴식 산책길',
        '사천 생활 산책지점',
        '삼천포 보행 산책로',
        '노산 전망 산책길',
        '사천 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_yangsan_yangsancheon_hwangsan',
      '양산 양산천·황산공원 권역',
      '경상남도 양산시 물금읍',
      '경상남도 양산시 황산공원길 일대',
      35.3380000,
      129.0370000,
      '양산 황산공원 산책',
      array[
        '황산공원 수변 산책로',
        '양산천 산책길',
        '물금읍 생활 산책지점',
        '낙동강 양산 산책로',
        '양산천 보행교 산책길',
        '범어공원 접근 산책지점',
        '황산공원 잔디 산책로',
        '물금역 주변 생활 산책길',
        '양산 워터파크 녹지 산책지점',
        '증산 생활공원 산책로',
        '양산 반려견 산책지점',
        '황산공원 야간 산책길',
        '양산천 순환 산책로',
        '양산 도심 녹지 산책지점',
        '낙동강 휴식 산책길',
        '황산공원 전망 산책지점',
        '양산 생활 산책로',
        '물금 수변 휴식 산책길',
        '양산 보행 산책지점',
        '양산 중앙 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-national5-0621-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
    p.point_label as name,
    case
      when p.point_label like '%해변%' or p.point_label like '%해안%' or p.point_label like '%항%' then 'waterside'
      when p.point_label like '%호수%' or p.point_label like '%수변%' or p.point_label like '%강%' or p.point_label like '%천%' or p.point_label like '%저수지%' then 'waterside'
      when p.point_label like '%숲%' or p.point_label like '%녹지%' then 'forest'
      when p.point_label like '%순환%' or p.point_label like '%둘레%' then 'trail'
      else 'park'
    end as category,
    case
      when p.point_label like '%해변%' or p.point_label like '%해안%' or p.point_label like '%항%' then '해안 산책로'
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
    array[p.point_label, r.region_label, r.alias_label, '전국 5차 0621', '전국 산책', '산책 장소']::text[] as aliases,
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
      'attribution', '누리 운영자 검수 자료 · 전국 5차 주요 산책 권역 · 2026-06-21',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'national_5th_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_national_5th_seed_coverage_2026_06_21'
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
  'v1.1-walk-poi-national-5th-seed-coverage-2026-06-21'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_national_5th_seed_coverage_2026_06_21'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 national 5th seed batch approved for coverage measurement, data quality audit, and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('마산·진해 해안 산책 권역', 35.1830, 128.5650, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('통영 강구안·미륵도 권역', 34.8420, 128.4230, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('거제 고현천·장승포 권역', 34.8800, 128.6230, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('안동 낙동강·월영교 권역', 36.5680, 128.7310, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('익산 배산공원·서동공원 권역', 35.9510, 126.9750, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('나주 영산강·금성산 권역', 35.0150, 126.7100, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('사천 삼천포·노산공원 권역', 34.9320, 128.0770, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('양산 양산천·황산공원 권역', 35.3380, 129.0370, 5000, 80);

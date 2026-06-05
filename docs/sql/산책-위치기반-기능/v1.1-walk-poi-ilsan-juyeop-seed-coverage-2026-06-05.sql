-- V1.1 walk POI Ilsan/Juyeop seed coverage expansion
-- Purpose:
-- - Expand approved/public/active POI coverage around the Android smoke coordinate
--   37.676492, 126.767888 without bulk importing national data.
-- - Use admin import commit/review RPCs so source, review, and audit trails are preserved.
-- Usage condition:
-- - Run from an admin/super_admin authenticated SQL/API context.
-- - Do not run as an anonymous or normal authenticated user.
-- - This script is idempotent for the source_provider/externalSourceId conflict key.

begin;

with seed_rows (
  external_source_id,
  name,
  category,
  category_label,
  description,
  address,
  road_address,
  latitude,
  longitude,
  aliases,
  confidence_score,
  quality_score
) as (
  values
    ('nuri-v1.1-ilsan-0605-juyeop-park', '주엽공원', 'park', '근린공원', '일산 주엽 생활권 산책 seed입니다.', '경기도 고양시 일산서구 주엽동', '경기도 고양시 일산서구 주엽동', 37.6709000, 126.7589000, array['주엽공원', '주엽 공원', 'ilsan0605'], 91, 84),
    ('nuri-v1.1-ilsan-0605-munchon-park', '문촌공원', 'park', '근린공원', '문촌마을 인근 산책 seed입니다.', '경기도 고양시 일산서구 주엽동', '경기도 고양시 일산서구 주엽동', 37.6718000, 126.7509000, array['문촌공원', '문촌 공원', 'ilsan0605'], 90, 82),
    ('nuri-v1.1-ilsan-0605-hugok-park', '후곡공원', 'park', '근린공원', '후곡마을 인근 산책 seed입니다.', '경기도 고양시 일산서구 일산동', '경기도 고양시 일산서구 일산동', 37.6760000, 126.7563000, array['후곡공원', '후곡 공원', 'ilsan0605'], 90, 82),
    ('nuri-v1.1-ilsan-0605-hansu-park', '한수공원', 'park', '근린공원', '일산 호수공원 북서 생활권 산책 seed입니다.', '경기도 고양시 일산서구 주엽동', '경기도 고양시 일산서구 주엽동', 37.6711000, 126.7746000, array['한수공원', '한수 공원', 'ilsan0605'], 89, 81),
    ('nuri-v1.1-ilsan-0605-singing-fountain-plaza', '노래하는분수대 산책광장', 'walkway', '산책광장', '일산호수공원 노래하는분수대 주변 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6640000, 126.7688000, array['노래하는분수대', '일산 노래하는 분수대', 'ilsan0605'], 89, 81),
    ('nuri-v1.1-ilsan-0605-ilsan-culture-park', '일산문화공원', 'park', '도시공원', '일산 중심 상권 인근 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6576000, 126.7720000, array['일산문화공원', '문화공원', 'ilsan0605'], 89, 81),
    ('nuri-v1.1-ilsan-0605-jeongbalsan-park', '정발산공원', 'forest', '숲공원', '정발산 녹지 산책 seed입니다.', '경기도 고양시 일산동구 마두동', '경기도 고양시 일산동구 마두동', 37.6625000, 126.7765000, array['정발산공원', '정발산 산책로', 'ilsan0605'], 90, 83),
    ('nuri-v1.1-ilsan-0605-madu-park', '마두공원', 'park', '근린공원', '마두 생활권 산책 seed입니다.', '경기도 고양시 일산동구 마두동', '경기도 고양시 일산동구 마두동', 37.6557000, 126.7781000, array['마두공원', '마두 공원', 'ilsan0605'], 88, 80),
    ('nuri-v1.1-ilsan-0605-jangchon-park', '장촌공원', 'park', '근린공원', '주엽 북측 생활권 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6814000, 126.7630000, array['장촌공원', '장촌 공원', 'ilsan0605'], 88, 80),
    ('nuri-v1.1-ilsan-0605-daehwa-park', '대화공원', 'park', '근린공원', '대화역 생활권 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6737000, 126.7404000, array['대화공원', '대화 공원', 'ilsan0605'], 88, 80),
    ('nuri-v1.1-ilsan-0605-tanhyeon-neighborhood-park', '탄현근린공원', 'park', '근린공원', '탄현 생활권 산책 seed입니다.', '경기도 고양시 일산서구 탄현동', '경기도 고양시 일산서구 탄현동', 37.6955000, 126.7627000, array['탄현근린공원', '탄현 공원', 'ilsan0605'], 87, 79),
    ('nuri-v1.1-ilsan-0605-daehwa-sports-park', '대화레포츠공원', 'park', '체육공원', '대화 생활권 야외 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6748000, 126.7367000, array['대화레포츠공원', '대화 레포츠 공원', 'ilsan0605'], 87, 79),
    ('nuri-v1.1-ilsan-0605-lake-park-rose-garden', '일산호수공원 장미원', 'park', '수변공원', '일산호수공원 장미원 주변 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6587000, 126.7646000, array['장미원', '일산호수공원 장미원', 'ilsan0605'], 91, 84),
    ('nuri-v1.1-ilsan-0605-lake-park-metasequoia', '일산호수공원 메타세쿼이아길', 'trail', '산책로', '일산호수공원 메타세쿼이아길 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6596000, 126.7669000, array['메타세쿼이아길', '호수공원 메타세쿼이아길', 'ilsan0605'], 91, 84),
    ('nuri-v1.1-ilsan-0605-goyang-stadium-walkway', '고양종합운동장 산책로', 'walkway', '산책로', '고양종합운동장 주변 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6752000, 126.7416000, array['고양종합운동장 산책로', '종합운동장 산책로', 'ilsan0605'], 87, 79),
    ('nuri-v1.1-ilsan-0605-kintex-onnuri-park', '킨텍스온누리공원', 'park', '근린공원', '킨텍스 인근 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6675000, 126.7440000, array['킨텍스온누리공원', '킨텍스 공원', 'ilsan0605'], 87, 79),
    ('nuri-v1.1-ilsan-0605-onemount-waterside-walkway', '원마운트 수변산책로', 'waterside', '수변산책로', '원마운트 주변 수변 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6629000, 126.7569000, array['원마운트 수변산책로', '원마운트 산책로', 'ilsan0605'], 87, 79)
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
      'attribution', 'NURI operator seed · Ilsan/Juyeop coverage · 2026-06-05',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-approved-seed',
        'scope', 'ilsan_juyeop_lakepark_living_area',
        'createdFor', 'v1.1_walk_poi_seed_coverage_expansion_2026_06_05'
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
  'v1.1-walk-poi-ilsan-juyeop-seed-coverage-2026-06-05'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.external_source_id like 'nuri-v1.1-ilsan-0605-%'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Ilsan/Juyeop coverage expansion approved for Android smoke and fallback gate measurement.'
  ) as r
)
select
  (select count(*) from review_result) as approved_count;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('ilsan0605', 37.676492, 126.767888, 7000, 50);
-- select count(*) from public.walk_poi_public_nearby_v1(37.676492, 126.767888, 5000, 50);

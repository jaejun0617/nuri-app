-- V1.1 walk POI Goyang seed coverage expansion
-- Purpose:
-- - Expand Goyang-si approved/public/active POI coverage after the Ilsan/Juyeop
--   coverage gate.
-- - Use walk_poi_admin_import_commit_v1 and walk_poi_admin_review_v1 so import,
--   source, review, and audit provenance remain intact.
-- - Do not insert directly into walk_pois.
-- Source/attribution:
-- - OSM/Nominatim lookup was used only as an admin seed candidate aid.
-- - Final public exposure is NURI operator reviewed.
-- Usage condition:
-- - Run from a service/admin SQL context. This script sets request.jwt.claim.role
--   to service_role inside the transaction for admin RPC execution.
-- - This script is idempotent for the source_provider/externalSourceId conflict key.

begin;

set local request.jwt.claim.role = 'service_role';

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
  quality_score,
  osm_type,
  osm_id
) as (
  values
    ('osm:way:550236299', '도래울바람물공원', 'park', '공원', '덕양구 도래울 생활권 산책 seed입니다.', '경기도 고양시 덕양구 도내동', '경기도 고양시 덕양구 도내동', 37.6286404, 126.8748493, array['도래울바람물공원', '도래울 바람물공원', 'goyang0606', 'deogyang0606'], 88, 82, 'way', '550236299'),
    ('osm:relation:11207787', '성라공원', 'park', '공원', '화정/성사 생활권 산책 seed입니다.', '경기도 고양시 덕양구 화정동', '경기도 고양시 덕양구 화정동', 37.6500704, 126.8387528, array['성라공원', '성라 공원', 'goyang0606', 'deogyang0606'], 88, 82, 'relation', '11207787'),
    ('osm:way:468974355', '식사중앙공원', 'park', '공원', '일산동구 식사 생활권 산책 seed입니다.', '경기도 고양시 일산동구 식사동', '경기도 고양시 일산동구 식사동', 37.6779705, 126.8139220, array['식사중앙공원', '식사 중앙공원', 'goyang0606', 'ilsandong0606'], 88, 82, 'way', '468974355'),
    ('osm:way:1017094861', '안곡습지공원', 'waterside', '습지공원', '중산/안곡 생활권 수변 산책 seed입니다.', '경기도 고양시 일산동구 중산동', '경기도 고양시 일산동구 중산동', 37.6846223, 126.7831184, array['안곡습지공원', '안곡 습지공원', 'goyang0606', 'ilsandong0606'], 88, 82, 'way', '1017094861'),
    ('osm:way:468972436', '중산공원', 'park', '공원', '일산동구 중산 생활권 산책 seed입니다.', '경기도 고양시 일산동구 중산동', '경기도 고양시 일산동구 중산동', 37.6915065, 126.7786796, array['중산공원', '중산 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '468972436'),
    ('osm:way:1021541896', '풍동공원', 'park', '공원', '일산동구 풍동 생활권 산책 seed입니다.', '경기도 고양시 일산동구 풍동', '경기도 고양시 일산동구 풍동', 37.6645041, 126.8035068, array['풍동공원', '풍동 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '1021541896'),
    ('osm:way:470872912', '백마공원', 'park', '공원', '마두/백마 생활권 산책 seed입니다.', '경기도 고양시 일산동구 마두동', '경기도 고양시 일산동구 마두동', 37.6568221, 126.7909717, array['백마공원', '백마 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '470872912'),
    ('osm:way:997811514', '강촌공원', 'park', '공원', '마두2동 강촌마을 생활권 산책 seed입니다.', '경기도 고양시 일산동구 마두동', '경기도 고양시 일산동구 마두동', 37.6532528, 126.7819602, array['강촌공원', '강촌 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '997811514'),
    ('osm:way:610105804', '낙민공원', 'park', '공원', '장항2동 생활권 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6511965, 126.7755422, array['낙민공원', '낙민 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '610105804'),
    ('osm:way:1013279736', '황룡산공원', 'forest', '숲공원', '탄현/황룡산 생활권 산책 seed입니다.', '경기도 고양시 일산서구 탄현동', '경기도 고양시 일산서구 탄현동', 37.6975861, 126.7714592, array['황룡산공원', '황룡산 산책', 'goyang0606', 'ilsanseo0606'], 87, 81, 'way', '1013279736'),
    ('osm:node:11266135007', '고봉산 산책지점', 'forest', '숲길', '고봉산 생활권 산책 seed입니다.', '경기도 고양시 일산동구 고봉동', '경기도 고양시 일산동구 고봉동', 37.6925016, 126.7901793, array['고봉산', '고봉산 산책', 'goyang0606', 'ilsandong0606'], 86, 80, 'node', '11266135007'),
    ('osm:way:468972928', '한뫼공원', 'park', '공원', '일산서구 일산동 생활권 산책 seed입니다.', '경기도 고양시 일산서구 일산동', '경기도 고양시 일산서구 일산동', 37.6929556, 126.7765257, array['한뫼공원', '한뫼 공원', 'goyang0606', 'ilsanseo0606'], 87, 81, 'way', '468972928'),
    ('osm:relation:8370103', '화정공원', 'park', '공원', '덕양구 화정 생활권 산책 seed입니다.', '경기도 고양시 덕양구 화정동', '경기도 고양시 덕양구 화정동', 37.6313569, 126.8386535, array['화정공원', '화정 공원', 'goyang0606', 'deogyang0606'], 88, 82, 'relation', '8370103'),
    ('osm:way:469918939', '지도공원', 'park', '공원', '덕양구 행주/능곡 생활권 산책 seed입니다.', '경기도 고양시 덕양구 행주동', '경기도 고양시 덕양구 행주동', 37.6239799, 126.8271181, array['지도공원', '지도 공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '469918939'),
    ('osm:way:589574637', '은빛공원', 'park', '공원', '덕양구 화정1동 생활권 산책 seed입니다.', '경기도 고양시 덕양구 화정동', '경기도 고양시 덕양구 화정동', 37.6402229, 126.8376960, array['은빛공원', '은빛 공원', 'goyang0606', 'deogyang0606'], 84, 78, 'way', '589574637'),
    ('osm:way:589494523', '별빛공원', 'park', '공원', '덕양구 화정2동 생활권 산책 seed입니다.', '경기도 고양시 덕양구 화정동', '경기도 고양시 덕양구 화정동', 37.6325629, 126.8253554, array['별빛공원', '별빛 공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '589494523'),
    ('osm:way:985411653', '무원공원', 'park', '공원', '행신2동 생활권 산책 seed입니다.', '경기도 고양시 덕양구 행신동', '경기도 고양시 덕양구 행신동', 37.6178745, 126.8326094, array['무원공원', '무원 공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '985411653'),
    ('osm:way:475603725', '소만공원', 'park', '공원', '행신/강매 생활권 산책 seed입니다.', '경기도 고양시 덕양구 강매동', '경기도 고양시 덕양구 강매동', 37.6149291, 126.8441617, array['소만공원', '소만 공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '475603725'),
    ('osm:way:550980786', '도래울석탄공원', 'forest', '숲공원', '도래울 생활권 녹지 산책 seed입니다.', '경기도 고양시 덕양구 도내동', '경기도 고양시 덕양구 도내동', 37.6321127, 126.8667172, array['도래울석탄공원', '도래울 석탄공원', 'goyang0606', 'deogyang0606'], 85, 79, 'way', '550980786'),
    ('osm:way:461454926', '창릉천 산책로', 'waterside', '수변산책로', '덕양구 창릉천 수변 산책 seed입니다.', '경기도 고양시 덕양구 창릉천', '경기도 고양시 덕양구 창릉천', 37.6482373, 126.9094234, array['창릉천', '창릉천 산책로', 'goyang0606', 'deogyang0606'], 84, 78, 'way', '461454926'),
    ('osm:way:607690481', '성사체육공원', 'park', '체육공원', '성사동 생활권 야외 산책 seed입니다.', '경기도 고양시 덕양구 성사동', '경기도 고양시 덕양구 성사동', 37.6621773, 126.8436593, array['성사체육공원', '성사 체육공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '607690481'),
    ('osm:way:558471388', '밤가시공원', 'park', '공원', '정발산동 생활권 산책 seed입니다.', '경기도 고양시 일산동구 정발산동', '경기도 고양시 일산동구 정발산동', 37.6691285, 126.7828724, array['밤가시공원', '밤가시 공원', 'goyang0606', 'ilsandong0606'], 88, 82, 'way', '558471388'),
    ('osm:way:469078299', '장항공원', 'park', '공원', '장항/정발산 생활권 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6663590, 126.7754971, array['장항공원', '장항 공원', 'goyang0606', 'ilsandong0606'], 87, 81, 'way', '469078299'),
    ('osm:way:652806778', '장항습지 산책지점', 'waterside', '습지 산책지점', '장항습지 주변 산책 seed입니다.', '경기도 고양시 일산동구 장항동', '경기도 고양시 일산동구 장항동', 37.6361328, 126.7557333, array['장항습지', '장항습지 산책', 'goyang0606', 'ilsandong0606'], 84, 78, 'way', '652806778'),
    ('osm:relation:15479926', '행주산성 산책지점', 'forest', '역사 산책지점', '행주산성 주변 산책 seed입니다.', '경기도 고양시 덕양구 행주동', '경기도 고양시 덕양구 행주동', 37.5965356, 126.8252228, array['행주산성', '행주산성 산책', 'goyang0606', 'deogyang0606'], 84, 78, 'relation', '15479926'),
    ('osm:way:472263752', '신원공원', 'park', '공원', '덕양구 신원동 생활권 산책 seed입니다.', '경기도 고양시 덕양구 신원동', '경기도 고양시 덕양구 신원동', 37.6663406, 126.8875802, array['신원공원', '신원 공원', 'goyang0606', 'deogyang0606'], 87, 81, 'way', '472263752'),
    ('osm:way:279831027', '고양생태공원', 'park', '생태공원', '일산서구 대화 생활권 생태 산책 seed입니다.', '경기도 고양시 일산서구 대화동', '경기도 고양시 일산서구 대화동', 37.6844267, 126.7437480, array['고양생태공원', '고양 생태공원', 'goyang0606', 'ilsanseo0606'], 88, 82, 'way', '279831027'),
    ('osm:way:903979740', '송포공원', 'park', '공원', '일산서구 송포동 생활권 산책 seed입니다.', '경기도 고양시 일산서구 송포동', '경기도 고양시 일산서구 송포동', 37.6704148, 126.7303226, array['송포공원', '송포 공원', 'goyang0606', 'ilsanseo0606'], 87, 81, 'way', '903979740'),
    ('osm:way:468591016', '가좌근린공원', 'forest', '근린공원', '일산서구 가좌동 생활권 산책 seed입니다.', '경기도 고양시 일산서구 가좌동', '경기도 고양시 일산서구 가좌동', 37.6871632, 126.7212968, array['가좌근린공원', '가좌 공원', 'goyang0606', 'ilsanseo0606'], 86, 80, 'way', '468591016'),
    ('osm:node:5554521222', '서삼릉 산책지점', 'forest', '역사 산책지점', '서삼릉 주변 산책 seed입니다.', '경기도 고양시 덕양구 원당동', '경기도 고양시 덕양구 원당동', 37.6632444, 126.8610966, array['서삼릉', '서삼릉 산책', 'goyang0606', 'deogyang0606'], 84, 78, 'node', '5554521222'),
    ('osm:way:1408682205', '북한산둘레길 효자길', 'trail', '둘레길', '덕양구 효자동 북한산둘레길 산책 seed입니다.', '경기도 고양시 덕양구 효자동', '경기도 고양시 덕양구 효자동', 37.6754016, 126.9604269, array['북한산둘레길', '효자길', '북한산둘레길 고양', 'goyang0606', 'deogyang0606'], 83, 77, 'way', '1408682205'),
    ('osm:node:8645684717', '서오릉 산책지점', 'forest', '역사 산책지점', '서오릉 주변 산책 seed입니다.', '경기도 고양시 덕양구 용두동', '경기도 고양시 덕양구 용두동', 37.6257368, 126.8978057, array['서오릉', '서오릉 산책', 'goyang0606', 'deogyang0606'], 84, 78, 'node', '8645684717'),
    ('osm:node:9013396106', '알미공원', 'park', '공원', '백석2동 생활권 산책 seed입니다.', '경기도 고양시 일산동구 백석동', '경기도 고양시 일산동구 백석동', 37.6462461, 126.7835055, array['알미공원', '알미 공원', 'goyang0606', 'ilsandong0606'], 82, 76, 'node', '9013396106')
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
      'attribution', 'OpenStreetMap contributors (ODbL) · NURI operator review · Goyang coverage · 2026-06-06',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'osm-nominatim-admin-seed-aid',
        'osmType', osm_type,
        'osmId', osm_id,
        'license', 'ODbL',
        'scope', 'goyang_city_first_coverage_batch',
        'createdFor', 'v1.1_walk_poi_goyang_seed_coverage_2026_06_06'
      )
    )
    order by external_source_id
  ) as body
  from seed_rows
)
select *
from public.walk_poi_admin_import_commit_v1(
  'osm',
  (select body from payload),
  'v1.1-walk-poi-goyang-seed-coverage-2026-06-06'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'osm'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_goyang_seed_coverage_2026_06_06'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Goyang first coverage batch approved for regional coverage measurement and Android smoke.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('goyang0606', 37.676492, 126.767888, 15000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.634900, 126.831100, 5000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.619000, 126.835600, 5000, 120);

-- V1.1 walk POI Seoul major walking-region seed coverage expansion
-- Purpose:
-- - Start Seoul major walking-region coverage after the Goyang first batch.
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
    ('osm:relation:7550666', '여의도한강공원', 'waterside', '한강공원', '여의도 한강 수변 산책 seed입니다.', '서울특별시 영등포구 여의도동', '서울특별시 영등포구 여의도동', 37.5256731, 126.9360586, array['여의도한강공원', '여의도 한강공원', '한강공원 여의도', 'seoul0606', 'hangang0606', 'yeouido0606'], 89, 83, 'relation', '7550666'),
    ('osm:way:330666503', '망원한강공원', 'waterside', '한강공원', '망원 한강 수변 산책 seed입니다.', '서울특별시 마포구 합정동', '서울특별시 마포구 합정동', 37.5501926, 126.9021613, array['망원한강공원', '망원 한강공원', '한강공원 망원', 'seoul0606', 'hangang0606', 'mapo0606'], 89, 83, 'way', '330666503'),
    ('osm:way:474183720', '난지한강공원', 'waterside', '한강공원', '난지 한강 수변 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5664459, 126.8768605, array['난지한강공원', '난지 한강공원', '한강공원 난지', 'seoul0606', 'hangang0606', 'mapo0606'], 89, 83, 'way', '474183720'),
    ('osm:way:418249072', '반포한강공원', 'waterside', '한강공원', '반포 한강 수변 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5088730, 126.9939435, array['반포한강공원', '반포 한강공원', '한강공원 반포', 'seoul0606', 'hangang0606', 'banpo0606'], 89, 83, 'way', '418249072'),
    ('osm:way:981963451', '잠원한강공원', 'waterside', '한강공원', '잠원 한강 수변 산책 seed입니다.', '서울특별시 강남구 신사동', '서울특별시 강남구 신사동', 37.5250679, 127.0159854, array['잠원한강공원', '잠원 한강공원', '한강공원 잠원', 'seoul0606', 'hangang0606', 'jamwon0606'], 88, 82, 'way', '981963451'),
    ('osm:way:172203046', '뚝섬한강공원', 'waterside', '한강공원', '뚝섬 한강 수변 산책 seed입니다.', '서울특별시 광진구 자양동', '서울특별시 광진구 자양동', 37.5298288, 127.0681098, array['뚝섬한강공원', '뚝섬 한강공원', '한강공원 뚝섬', 'seoul0606', 'hangang0606', 'ttukseom0606'], 89, 83, 'way', '172203046'),
    ('osm:way:954120866', '광나루한강공원', 'waterside', '한강공원', '광나루 한강 수변 산책 seed입니다.', '서울특별시 송파구 풍납동', '서울특별시 송파구 풍납동', 37.5408713, 127.1156828, array['광나루한강공원', '광나루 한강공원', '한강공원 광나루', 'seoul0606', 'hangang0606', 'songpa0606'], 88, 82, 'way', '954120866'),
    ('osm:way:416763235', '이촌한강공원', 'waterside', '한강공원', '이촌 한강 수변 산책 seed입니다.', '서울특별시 용산구 이촌동', '서울특별시 용산구 이촌동', 37.5185070, 126.9673584, array['이촌한강공원', '이촌 한강공원', '한강공원 이촌', 'seoul0606', 'hangang0606', 'yongsan0606'], 88, 82, 'way', '416763235'),
    ('osm:relation:14696524', '월드컵공원', 'park', '공원', '상암 월드컵공원 생활권 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5735977, 126.8703674, array['월드컵공원', '상암 월드컵공원', 'seoul0606', 'mapo0606', 'worldcup0606'], 89, 83, 'relation', '14696524'),
    ('osm:way:474196879', '하늘공원', 'park', '공원', '월드컵공원 하늘공원 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5680640, 126.8849778, array['하늘공원', '월드컵공원 하늘공원', 'seoul0606', 'mapo0606', 'worldcup0606'], 89, 83, 'way', '474196879'),
    ('osm:way:38170879', '노을공원', 'park', '공원', '월드컵공원 노을공원 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5738821, 126.8759094, array['노을공원', '월드컵공원 노을공원', 'seoul0606', 'mapo0606', 'worldcup0606'], 88, 82, 'way', '38170879'),
    ('osm:way:286555214', '보라매공원', 'park', '공원', '동작/관악 생활권 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4932422, 126.9204740, array['보라매공원', '보라매 공원', 'seoul0606', 'dongjak0606'], 89, 83, 'way', '286555214'),
    ('osm:relation:9856886', '석촌호수', 'waterside', '호수 산책', '송파 석촌호수 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5100884, 127.1040775, array['석촌호수', '석촌 호수', 'seoul0606', 'songpa0606', 'lake0606'], 88, 82, 'relation', '9856886'),
    ('osm:relation:8549518', '선유도공원', 'waterside', '수변공원', '선유도 수변 산책 seed입니다.', '서울특별시 영등포구 양평동', '서울특별시 영등포구 양평동', 37.5434158, 126.9003166, array['선유도공원', '선유도 공원', 'seoul0606', 'hangang0606', 'yeongdeungpo0606'], 88, 82, 'relation', '8549518'),
    ('osm:way:202365904', '서울어린이대공원', 'park', '공원', '광진구 대형 공원 산책 seed입니다.', '서울특별시 광진구 능동', '서울특별시 광진구 능동', 37.5488862, 127.0804753, array['서울어린이대공원', '어린이대공원', 'seoul0606', 'gwangjin0606'], 89, 83, 'way', '202365904'),
    ('osm:way:244397333', '남산공원', 'forest', '숲공원', '남산 숲길 산책 seed입니다.', '서울특별시 중구 남산동', '서울특별시 중구 남산동', 37.5505231, 126.9916145, array['남산공원', '남산 산책', 'seoul0606', 'jungguseoul0606'], 88, 82, 'way', '244397333'),
    ('osm:way:192743564', '도산공원', 'park', '공원', '강남 도산공원 산책 seed입니다.', '서울특별시 강남구 신사동', '서울특별시 강남구 신사동', 37.5242213, 127.0352168, array['도산공원', '도산 공원', 'seoul0606', 'gangnam0606'], 88, 82, 'way', '192743564'),
    ('osm:way:303550179', '서리풀공원', 'forest', '숲공원', '서초 서리풀 숲길 산책 seed입니다.', '서울특별시 서초구 서초동', '서울특별시 서초구 서초동', 37.4882590, 127.0019812, array['서리풀공원', '서리풀 산책', 'seoul0606', 'seocho0606'], 87, 81, 'way', '303550179'),
    ('osm:way:308073794', '몽마르뜨공원', 'park', '공원', '서초 몽마르뜨공원 산책 seed입니다.', '서울특별시 서초구 서초동', '서울특별시 서초구 서초동', 37.4955415, 127.0038788, array['몽마르뜨공원', '몽마르뜨 공원', 'seoul0606', 'seocho0606'], 87, 81, 'way', '308073794'),
    ('osm:way:672784475', '길동생태공원', 'park', '생태공원', '강동 길동생태공원 산책 seed입니다.', '서울특별시 강동구 길동', '서울특별시 강동구 길동', 37.5402898, 127.1553837, array['길동생태공원', '길동 생태공원', 'seoul0606', 'gangdong0606'], 88, 82, 'way', '672784475'),
    ('osm:way:419130759', '천호공원', 'park', '공원', '강동 천호공원 산책 seed입니다.', '서울특별시 강동구 천호동', '서울특별시 강동구 천호동', 37.5444164, 127.1264014, array['천호공원', '천호 공원', 'seoul0606', 'gangdong0606'], 87, 81, 'way', '419130759'),
    ('osm:relation:12570381', '양재천 산책로', 'waterside', '수변산책로', '양재천 수변 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4576682, 127.0244001, array['양재천', '양재천 산책로', 'seoul0606', 'yangjaecheon0606'], 87, 81, 'relation', '12570381'),
    ('osm:way:26084930', '중랑천 산책로', 'waterside', '수변산책로', '중랑천 수변 산책 seed입니다.', '서울특별시 성동구 중랑천', '서울특별시 성동구 중랑천', 37.5529870, 127.0489110, array['중랑천', '중랑천 산책로', 'seoul0606', 'jungnangcheon0606'], 87, 81, 'way', '26084930'),
    ('osm:way:769631455', '청계천 산책로', 'waterside', '수변산책로', '청계천 도심 수변 산책 seed입니다.', '서울특별시 종로구 청계천', '서울특별시 종로구 청계천', 37.5722855, 127.0367290, array['청계천', '청계천 산책로', 'seoul0606', 'cheonggyecheon0606'], 88, 82, 'way', '769631455'),
    ('osm:way:779883035', '불광천 산책로', 'waterside', '수변산책로', '불광천 수변 산책 seed입니다.', '서울특별시 서대문구 불광천', '서울특별시 서대문구 불광천', 37.5805988, 126.9068682, array['불광천', '불광천 산책로', 'seoul0606', 'bulgwangcheon0606'], 87, 81, 'way', '779883035'),
    ('osm:way:1214479818', '홍제천 산책로', 'waterside', '수변산책로', '홍제천 수변 산책 seed입니다.', '서울특별시 서대문구 홍제천', '서울특별시 서대문구 홍제천', 37.5959553, 126.9550403, array['홍제천', '홍제천 산책로', 'seoul0606', 'hongjecheon0606'], 87, 81, 'way', '1214479818'),
    ('osm:way:682334253', '여의도공원', 'park', '공원', '여의도 도심 공원 산책 seed입니다.', '서울특별시 영등포구 여의도동', '서울특별시 영등포구 여의도동', 37.5255357, 126.9215857, array['여의도공원', '여의도 공원', 'seoul0606', 'yeouido0606'], 88, 82, 'way', '682334253'),
    ('osm:relation:180886', '평화의공원', 'park', '공원', '상암 평화의공원 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5627729, 126.8942962, array['평화의공원', '평화 공원', 'seoul0606', 'mapo0606', 'worldcup0606'], 88, 82, 'relation', '180886'),
    ('osm:way:253472727', '서서울호수공원', 'waterside', '호수공원', '양천 서서울호수공원 산책 seed입니다.', '서울특별시 양천구 신월동', '서울특별시 양천구 신월동', 37.5278871, 126.8303419, array['서서울호수공원', '서서울 호수공원', 'seoul0606', 'yangcheon0606'], 87, 81, 'way', '253472727'),
    ('osm:relation:8616724', '경의선숲길', 'trail', '도심숲길', '마포 경의선숲길 산책 seed입니다.', '서울특별시 마포구 대흥동', '서울특별시 마포구 대흥동', 37.5522075, 126.9353166, array['경의선숲길', '경의선 숲길', 'seoul0606', 'mapo0606'], 88, 82, 'relation', '8616724'),
    ('osm:way:1390441667', '매봉산공원', 'forest', '숲공원', '중구 매봉산 숲길 산책 seed입니다.', '서울특별시 중구 약수동', '서울특별시 중구 약수동', 37.5449627, 127.0076628, array['매봉산공원', '매봉산 공원', 'seoul0606', 'jungguseoul0606'], 86, 80, 'way', '1390441667'),
    ('osm:way:921902039', '용산가족공원', 'park', '공원', '용산 가족공원 산책 seed입니다.', '서울특별시 용산구 서빙고동', '서울특별시 용산구 서빙고동', 37.5226926, 126.9835274, array['용산가족공원', '용산 가족공원', 'seoul0606', 'yongsan0606'], 88, 82, 'way', '921902039'),
    ('osm:way:25979109', '서래섬 산책지점', 'waterside', '수변산책지점', '반포 서래섬 수변 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5081610, 126.9902472, array['서래섬', '서래섬 산책', 'seoul0606', 'banpo0606'], 86, 80, 'way', '25979109')
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
      'attribution', 'OpenStreetMap contributors (ODbL) · NURI operator review · Seoul coverage · 2026-06-06',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'osm-nominatim-admin-seed-aid',
        'osmType', osm_type,
        'osmId', osm_id,
        'license', 'ODbL',
        'scope', 'seoul_major_walking_regions_first_batch',
        'createdFor', 'v1.1_walk_poi_seoul_seed_coverage_2026_06_06'
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
  'v1.1-walk-poi-seoul-seed-coverage-2026-06-06'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'osm'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_seoul_seed_coverage_2026_06_06'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Seoul first walking-region coverage batch approved for coverage measurement and Android smoke.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('seoul0606', 37.5256731, 126.9360586, 30000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.5522075, 126.9353166, 5000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.5088730, 126.9939435, 5000, 120);

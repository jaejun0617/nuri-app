-- V1.1 walk POI Seoul second seed coverage expansion
-- Purpose:
-- - Densify Seoul major walking-region coverage after the first broad Seoul batch.
-- - Keep the user runtime on Supabase walk POI RPC first, with Kakao fallback only
--   where coverage gates are not ready.
-- - Use walk_poi_admin_import_commit_v1 and walk_poi_admin_review_v1 so source,
--   review, and audit provenance remain intact.
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
  coverage_region
) as (
  values
    ('nuri-v1.1-seoul-0615-worldcup-sky-park-reed-trail', '하늘공원 억새 산책로', 'trail', '공원 산책로', '월드컵공원 하늘공원 억새길 중심 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5683600, 126.8846200, array['하늘공원 억새길', '하늘공원 산책로', 'seoul0615', 'worldcup0615', 'mapo0615'], 88, 82, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-worldcup-noeul-metasequoia', '노을공원 메타세쿼이아길', 'trail', '공원 산책로', '노을공원 메타세쿼이아 산책축 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5734300, 126.8763200, array['노을공원 메타세쿼이아길', '노을공원 산책로', 'seoul0615', 'worldcup0615', 'mapo0615'], 88, 82, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-worldcup-peace-central-walk', '평화의공원 중앙산책로', 'walkway', '공원 산책로', '평화의공원 중앙 녹지 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5628900, 126.8940500, array['평화의공원 중앙산책로', '평화의공원 산책', 'seoul0615', 'worldcup0615', 'mapo0615'], 88, 82, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-nanjicheon-waterside-walk', '난지천공원 수변산책로', 'waterside', '수변산책로', '난지천공원 수변 녹지 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5755400, 126.8852500, array['난지천공원 산책로', '난지천 수변산책로', 'seoul0615', 'worldcup0615', 'nanji0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-nanji-hangang-riverwalk-west', '난지한강공원 서측 산책로', 'waterside', '한강 산책로', '난지한강공원 서측 수변 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5692600, 126.8667200, array['난지한강공원 서측', '난지한강공원 산책로', 'seoul0615', 'hangang0615', 'nanji0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-nanji-hangang-riverwalk-east', '난지한강공원 동측 산책로', 'waterside', '한강 산책로', '난지한강공원 동측 수변 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5661800, 126.8783400, array['난지한강공원 동측', '난지한강공원 산책', 'seoul0615', 'hangang0615', 'nanji0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-mangwon-hangang-central-walk', '망원한강공원 중앙 산책로', 'waterside', '한강 산책로', '망원한강공원 중심 수변 산책 seed입니다.', '서울특별시 마포구 망원동', '서울특별시 마포구 망원동', 37.5534300, 126.8991200, array['망원한강공원 중앙', '망원 한강 산책', 'seoul0615', 'hangang0615', 'mangwon0615'], 88, 82, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-mangwonjeong-riverside-point', '망원정 수변 산책지점', 'waterside', '수변 산책지점', '망원정 인근 한강 수변 산책 seed입니다.', '서울특별시 마포구 망원동', '서울특별시 마포구 망원동', 37.5521200, 126.9043600, array['망원정', '망원정 산책', 'seoul0615', 'hangang0615', 'mangwon0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-seonyudo-riverside-loop', '선유도공원 수변순환길', 'waterside', '수변공원 산책로', '선유도공원 내부 수변 순환 산책 seed입니다.', '서울특별시 영등포구 양평동', '서울특별시 영등포구 양평동', 37.5438000, 126.9003800, array['선유도공원 순환길', '선유도 산책로', 'seoul0615', 'hangang0615', 'seonyudo0615'], 88, 82, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-yanghwa-hangang-west-walk', '양화한강공원 서측 산책로', 'waterside', '한강 산책로', '양화한강공원 서측 수변 산책 seed입니다.', '서울특별시 영등포구 당산동', '서울특별시 영등포구 당산동', 37.5447600, 126.8956200, array['양화한강공원 서측', '양화 한강 산책', 'seoul0615', 'hangang0615', 'yanghwa0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-yanghwa-hangang-east-walk', '양화한강공원 동측 산책로', 'waterside', '한강 산책로', '양화한강공원 동측 수변 산책 seed입니다.', '서울특별시 영등포구 당산동', '서울특별시 영등포구 당산동', 37.5409500, 126.9064800, array['양화한강공원 동측', '양화 한강공원 산책', 'seoul0615', 'hangang0615', 'yanghwa0615'], 87, 81, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-bulgwangcheon-sangam-walk', '불광천 상암 산책로', 'waterside', '하천 산책로', '상암 생활권 불광천 산책 seed입니다.', '서울특별시 마포구 상암동', '서울특별시 마포구 상암동', 37.5781200, 126.8978300, array['불광천 상암', '불광천 산책로', 'seoul0615', 'mapo0615', 'bulgwangcheon0615'], 86, 80, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-hongjecheon-seongsan-walk', '홍제천 성산 산책로', 'waterside', '하천 산책로', '성산 생활권 홍제천 산책 seed입니다.', '서울특별시 마포구 성산동', '서울특별시 마포구 성산동', 37.5669600, 126.9120800, array['홍제천 성산', '홍제천 산책로', 'seoul0615', 'mapo0615', 'hongjecheon0615'], 86, 80, 'seoul_worldcup_nanji_mangwon'),
    ('nuri-v1.1-seoul-0615-seongsan-bridge-north-walk', '성산대교 북단 산책지점', 'waterside', '한강 산책지점', '성산대교 북단 한강 접근 산책 seed입니다.', '서울특별시 마포구 망원동', '서울특별시 마포구 망원동', 37.5492000, 126.8965000, array['성산대교 북단', '망원 한강 접근로', 'seoul0615', 'mangwon0615'], 86, 80, 'seoul_worldcup_nanji_mangwon'),

    ('nuri-v1.1-seoul-0615-banpo-seorae-island-loop', '서래섬 순환 산책로', 'waterside', '수변 산책로', '반포 서래섬 내부 순환 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5081700, 126.9902200, array['서래섬 순환길', '서래섬 산책', 'seoul0615', 'banpo0615', 'hangang0615'], 88, 82, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-banpo-floating-island-walk', '세빛섬 수변 산책지점', 'waterside', '한강 산책지점', '세빛섬 인근 수변 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5128500, 126.9957800, array['세빛섬 산책', '세빛섬 수변', 'seoul0615', 'banpo0615', 'hangang0615'], 87, 81, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-banpo-moonlight-fountain-walk', '달빛무지개분수 산책지점', 'waterside', '한강 산책지점', '반포 달빛무지개분수 주변 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5139300, 126.9968200, array['달빛무지개분수', '반포대교 산책', 'seoul0615', 'banpo0615', 'hangang0615'], 87, 81, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-jamsu-bridge-south-walk', '잠수교 남단 산책지점', 'waterside', '한강 산책지점', '잠수교 남단 한강 접근 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5133400, 126.9978800, array['잠수교 남단', '잠수교 산책', 'seoul0615', 'banpo0615'], 86, 80, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-jamsu-bridge-north-walk', '잠수교 북단 산책지점', 'waterside', '한강 산책지점', '잠수교 북단 이촌 접근 산책 seed입니다.', '서울특별시 용산구 서빙고동', '서울특별시 용산구 서빙고동', 37.5166200, 126.9989600, array['잠수교 북단', '이촌 잠수교 산책', 'seoul0615', 'ichon0615'], 86, 80, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-jamwon-hangang-central-walk', '잠원한강공원 중앙 산책로', 'waterside', '한강 산책로', '잠원한강공원 중심 수변 산책 seed입니다.', '서울특별시 강남구 신사동', '서울특별시 강남구 신사동', 37.5236800, 127.0154400, array['잠원한강공원 중앙', '잠원 한강 산책', 'seoul0615', 'jamwon0615', 'hangang0615'], 88, 82, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-jamwon-shinsa-access-walk', '신사나들목 한강 산책지점', 'waterside', '한강 산책지점', '신사나들목 인근 잠원한강공원 접근 산책 seed입니다.', '서울특별시 강남구 신사동', '서울특별시 강남구 신사동', 37.5232500, 127.0202600, array['신사나들목', '잠원 한강 접근로', 'seoul0615', 'jamwon0615'], 86, 80, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-ichon-hangang-west-walk', '이촌한강공원 서측 산책로', 'waterside', '한강 산책로', '이촌한강공원 서측 수변 산책 seed입니다.', '서울특별시 용산구 이촌동', '서울특별시 용산구 이촌동', 37.5176800, 126.9639000, array['이촌한강공원 서측', '이촌 한강 산책', 'seoul0615', 'ichon0615', 'hangang0615'], 87, 81, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-ichon-hangang-east-walk', '이촌한강공원 동측 산책로', 'waterside', '한강 산책로', '이촌한강공원 동측 수변 산책 seed입니다.', '서울특별시 용산구 이촌동', '서울특별시 용산구 이촌동', 37.5213500, 126.9802600, array['이촌한강공원 동측', '이촌 한강공원 산책', 'seoul0615', 'ichon0615', 'hangang0615'], 87, 81, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-hangang-bridge-south-walk', '한강대교 남단 산책지점', 'waterside', '한강 산책지점', '한강대교 남단 노들섬 인접 산책 seed입니다.', '서울특별시 동작구 노량진동', '서울특별시 동작구 노량진동', 37.5163500, 126.9550000, array['한강대교 남단', '노들섬 한강 산책', 'seoul0615', 'ichon0615'], 86, 80, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-dongjak-bridge-south-walk', '동작대교 남단 산책지점', 'waterside', '한강 산책지점', '동작대교 남단 한강 수변 산책 seed입니다.', '서울특별시 동작구 동작동', '서울특별시 동작구 동작동', 37.5079800, 126.9807000, array['동작대교 남단', '동작 한강 산책', 'seoul0615', 'banpo0615'], 86, 80, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-nodeulseom-loop', '노들섬 산책로', 'waterside', '수변 산책로', '노들섬 내부 수변 산책 seed입니다.', '서울특별시 용산구 이촌동', '서울특별시 용산구 이촌동', 37.5170500, 126.9588200, array['노들섬 산책로', '노들섬', 'seoul0615', 'ichon0615'], 87, 81, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-yongsan-family-park-trail', '용산가족공원 산책로', 'park', '공원 산책로', '용산가족공원 내부 녹지 산책 seed입니다.', '서울특별시 용산구 서빙고동', '서울특별시 용산구 서빙고동', 37.5226900, 126.9835300, array['용산가족공원 산책로', '용산가족공원', 'seoul0615', 'yongsan0615'], 88, 82, 'seoul_banpo_jamwon_ichon'),
    ('nuri-v1.1-seoul-0615-seorae-park-neighborhood-walk', '서래마을 근린산책길', 'walkway', '생활권 산책길', '서래마을과 반포 생활권을 잇는 근린 산책 seed입니다.', '서울특별시 서초구 반포동', '서울특별시 서초구 반포동', 37.5007200, 126.9989000, array['서래마을 산책길', '서래 근린산책', 'seoul0615', 'banpo0615'], 84, 78, 'seoul_banpo_jamwon_ichon'),

    ('nuri-v1.1-seoul-0615-seoulforest-ginkgo-walk', '서울숲 은행나무길', 'trail', '공원 산책로', '서울숲 은행나무길 산책 seed입니다.', '서울특별시 성동구 성수동1가', '서울특별시 성동구 성수동1가', 37.5446000, 127.0376500, array['서울숲 은행나무길', '서울숲 산책로', 'seoul0615', 'seoulforest0615', 'ttukseom0615'], 89, 83, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-seoulforest-family-yard', '서울숲 가족마당 산책지점', 'park', '공원 산책지점', '서울숲 가족마당 주변 산책 seed입니다.', '서울특별시 성동구 성수동1가', '서울특별시 성동구 성수동1가', 37.5454200, 127.0391500, array['서울숲 가족마당', '서울숲 산책', 'seoul0615', 'seoulforest0615'], 88, 82, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-seoulforest-wetland-eco-walk', '서울숲 습지생태원 산책로', 'park', '생태공원 산책로', '서울숲 습지생태원 인근 산책 seed입니다.', '서울특별시 성동구 성수동1가', '서울특별시 성동구 성수동1가', 37.5432300, 127.0417500, array['서울숲 습지생태원', '서울숲 생태산책', 'seoul0615', 'seoulforest0615'], 88, 82, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-seoulforest-dog-park', '서울숲 반려견 놀이터', 'pet_playground', '반려견 놀이터', '서울숲 반려견 놀이터 주변 산책 seed입니다.', '서울특별시 성동구 성수동1가', '서울특별시 성동구 성수동1가', 37.5463900, 127.0380200, array['서울숲 반려견 놀이터', '서울숲 강아지 놀이터', 'seoul0615', 'seoulforest0615', 'pet0615'], 88, 82, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-ttukseom-jabeolle-walk', '뚝섬한강공원 자벌레 산책지점', 'waterside', '한강 산책지점', '뚝섬 자벌레 주변 수변 산책 seed입니다.', '서울특별시 광진구 자양동', '서울특별시 광진구 자양동', 37.5298500, 127.0662500, array['뚝섬 자벌레', '뚝섬한강공원 산책', 'seoul0615', 'ttukseom0615'], 87, 81, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-ttukseom-hangang-central-walk', '뚝섬한강공원 중앙 산책로', 'waterside', '한강 산책로', '뚝섬한강공원 중심 수변 산책 seed입니다.', '서울특별시 광진구 자양동', '서울특별시 광진구 자양동', 37.5307300, 127.0697800, array['뚝섬한강공원 중앙', '뚝섬 한강 산책', 'seoul0615', 'ttukseom0615', 'hangang0615'], 87, 81, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-seongsu-bridge-north-walk', '성수대교 북단 산책지점', 'waterside', '한강 산책지점', '성수대교 북단 한강 접근 산책 seed입니다.', '서울특별시 성동구 성수동1가', '서울특별시 성동구 성수동1가', 37.5396500, 127.0354200, array['성수대교 북단', '서울숲 한강 접근로', 'seoul0615', 'seoulforest0615'], 86, 80, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-jungnangcheon-seongsu-walk', '중랑천 성수 산책로', 'waterside', '하천 산책로', '성수 생활권 중랑천 수변 산책 seed입니다.', '서울특별시 성동구 성수동2가', '서울특별시 성동구 성수동2가', 37.5488000, 127.0552400, array['중랑천 성수', '중랑천 산책로', 'seoul0615', 'jungnangcheon0615'], 86, 80, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-yongdap-cheonggyecheon-walk', '용답 청계천 산책로', 'waterside', '하천 산책로', '용답 생활권 청계천 산책 seed입니다.', '서울특별시 성동구 용답동', '서울특별시 성동구 용답동', 37.5618500, 127.0544000, array['용답 청계천', '청계천 성동 산책', 'seoul0615', 'cheonggyecheon0615'], 85, 79, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-eungbong-mountain-park', '응봉산공원 산책로', 'forest', '숲공원 산책로', '응봉산공원 조망 산책 seed입니다.', '서울특별시 성동구 응봉동', '서울특별시 성동구 응봉동', 37.5480200, 127.0296400, array['응봉산공원', '응봉산 산책', 'seoul0615', 'seoulforest0615'], 86, 80, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-salim-garden-walk', '서울숲 살곶이다리 산책지점', 'waterside', '수변 산책지점', '서울숲과 중랑천을 잇는 살곶이다리 생활권 산책 seed입니다.', '서울특별시 성동구 행당동', '서울특별시 성동구 행당동', 37.5507500, 127.0412600, array['살곶이다리 산책', '서울숲 중랑천 산책', 'seoul0615', 'seoulforest0615'], 85, 79, 'seoul_ttukseom_seoulforest'),
    ('nuri-v1.1-seoul-0615-konkuk-lake-walk', '일감호 주변 산책지점', 'waterside', '호수 산책지점', '건국대 일감호 주변 생활권 산책 seed입니다.', '서울특별시 광진구 화양동', '서울특별시 광진구 화양동', 37.5404300, 127.0752500, array['일감호 산책', '건국대 호수 산책', 'seoul0615', 'ttukseom0615'], 84, 78, 'seoul_ttukseom_seoulforest'),

    ('nuri-v1.1-seoul-0615-songpa-olympic-fortress-walk', '올림픽공원 몽촌토성 산책로', 'trail', '공원 산책로', '올림픽공원 몽촌토성 둘레 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5191200, 127.1228500, array['몽촌토성 산책로', '올림픽공원 산책', 'seoul0615', 'songpa0615', 'olympic0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-songpa-olympic-peace-gate', '올림픽공원 평화의문 산책지점', 'park', '공원 산책지점', '올림픽공원 평화의문 주변 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5207600, 127.1220900, array['평화의문 산책', '올림픽공원 평화의문', 'seoul0615', 'songpa0615', 'olympic0615'], 87, 81, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-seokchon-lake-east-loop', '석촌호수 동호 산책로', 'waterside', '호수 산책로', '석촌호수 동호 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5104500, 127.1097500, array['석촌호수 동호', '석촌호수 산책로', 'seoul0615', 'songpa0615', 'lake0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-seokchon-lake-west-loop', '석촌호수 서호 산책로', 'waterside', '호수 산책로', '석촌호수 서호 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5097600, 127.1000600, array['석촌호수 서호', '송파나루공원 산책', 'seoul0615', 'songpa0615', 'lake0615'], 88, 82, 'seoul_songpa_olympic_lake')
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
      'attribution', 'NURI operator seed · Seoul second coverage · 2026-06-15',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-approved-seed',
        'scope', 'seoul_major_walking_regions_second_batch',
        'coverageRegion', coverage_region,
        'createdFor', 'v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15'
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
  'v1.1-walk-poi-seoul-2nd-seed-coverage-2026-06-15'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Seoul second walking-region coverage batch approved for coverage measurement, fallback gate extension, and Android smoke.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('seoul0615', 37.5647, 126.8872, 30000, 150);
-- select count(*) from public.walk_poi_public_search_v1('worldcup0615', 37.5647, 126.8872, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('banpo0615', 37.5146, 126.9919, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('seoulforest0615', 37.5392, 127.0479, 10000, 80);
-- select count(*) from public.walk_poi_public_nearby_v1(37.5647, 126.8872, 5000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.5146, 126.9919, 5000, 120);
-- select count(*) from public.walk_poi_public_nearby_v1(37.5392, 127.0479, 5000, 120);

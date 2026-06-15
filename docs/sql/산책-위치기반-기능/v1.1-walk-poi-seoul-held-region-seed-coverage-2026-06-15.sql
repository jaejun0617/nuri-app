-- V1.1 walk POI Seoul held-region seed reinforcement
-- Purpose:
-- - Reinforce Seoul coverage regions that remained below fallback-gate threshold
--   after the first and second Seoul batches.
-- - Keep Seoul-wide Kakao fallback disabled only by region gates, never globally.
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
    ('nuri-v1.1-seoul-0615-held-songpa-olympic-wildflower-hill', '올림픽공원 들꽃마루 산책로', 'trail', '공원 산책로', '올림픽공원 들꽃마루 주변 녹지 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5202000, 127.1256000, array['올림픽공원 들꽃마루', '들꽃마루 산책로', 'seoulheld0615', 'songpaheld0615', 'olympicheld0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-olympic-lawn-loop', '올림픽공원 88잔디마당 둘레길', 'trail', '공원 산책로', '올림픽공원 88잔디마당 주변 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5209000, 127.1181000, array['88잔디마당 둘레길', '올림픽공원 산책', 'seoulheld0615', 'songpaheld0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-rose-square-walk', '올림픽공원 장미광장 산책지점', 'park', '공원 산책지점', '올림픽공원 장미광장 주변 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5174000, 127.1238000, array['장미광장 산책', '올림픽공원 장미광장', 'seoulheld0615', 'songpaheld0615'], 87, 81, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-mongchon-lake-loop', '몽촌호 산책로', 'waterside', '호수 산책로', '올림픽공원 몽촌호 수변 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5181000, 127.1163000, array['몽촌호 산책', '몽촌호수 산책로', 'seoulheld0615', 'songpaheld0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-lone-tree-point', '올림픽공원 나홀로나무 산책지점', 'park', '공원 산책지점', '올림픽공원 나홀로나무 인근 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5228000, 127.1216000, array['나홀로나무 산책', '올림픽공원 나홀로나무', 'seoulheld0615', 'songpaheld0615'], 87, 81, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-seongnaecheon-olympic-walk', '성내천 올림픽공원 산책로', 'waterside', '하천 산책로', '성내천과 올림픽공원 생활권을 잇는 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5245000, 127.1300000, array['성내천 올림픽공원', '성내천 산책로', 'seoulheld0615', 'songpaheld0615'], 86, 80, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-bangi-wetland-walk', '방이습지 산책로', 'waterside', '습지 산책로', '방이습지 주변 생태 산책 seed입니다.', '서울특별시 송파구 방이동', '서울특별시 송파구 방이동', 37.5124000, 127.1315000, array['방이습지 산책', '방이습지', 'seoulheld0615', 'songpaheld0615'], 86, 80, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-seokchon-west-south-walk', '석촌호수 서호 남측 산책로', 'waterside', '호수 산책로', '석촌호수 서호 남측 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5078000, 127.0985000, array['석촌호수 서호 남측', '석촌호수 산책', 'seoulheld0615', 'songpaheld0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-seokchon-east-north-walk', '석촌호수 동호 북측 산책로', 'waterside', '호수 산책로', '석촌호수 동호 북측 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5123000, 127.1108000, array['석촌호수 동호 북측', '석촌호수 산책로', 'seoulheld0615', 'songpaheld0615'], 88, 82, 'seoul_songpa_olympic_lake'),
    ('nuri-v1.1-seoul-0615-held-songpa-naru-park-link', '송파나루공원 연결 산책로', 'waterside', '호수 산책로', '송파나루공원과 석촌호수 연결 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5088000, 127.1049000, array['송파나루공원 산책', '석촌호수 연결로', 'seoulheld0615', 'songpaheld0615'], 87, 81, 'seoul_songpa_olympic_lake'),

    ('nuri-v1.1-seoul-0615-held-yangjae-citizen-forest-stream', '양재천 시민의숲 산책로', 'waterside', '하천 산책로', '양재천 시민의숲 인근 수변 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4706000, 127.0355000, array['양재천 시민의숲', '양재천 산책로', 'seoulheld0615', 'yangjaeheld0615'], 88, 82, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-metasequoia-walk', '양재시민의숲 메타세쿼이아길', 'trail', '숲길 산책로', '양재시민의숲 메타세쿼이아길 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4717000, 127.0350000, array['양재시민의숲 메타세쿼이아길', '양재 숲길', 'seoulheld0615', 'yangjaeheld0615'], 88, 82, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-yeongdong1-bridge-walk', '양재천 영동1교 산책로', 'waterside', '하천 산책로', '양재천 영동1교 인근 산책 seed입니다.', '서울특별시 강남구 도곡동', '서울특별시 강남구 도곡동', 37.4860000, 127.0371000, array['양재천 영동1교', '양재천 도곡 산책', 'seoulheld0615', 'yangjaeheld0615'], 87, 81, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-dogok-stream-walk', '양재천 도곡 산책로', 'waterside', '하천 산책로', '양재천 도곡 생활권 산책 seed입니다.', '서울특별시 강남구 도곡동', '서울특별시 강남구 도곡동', 37.4910000, 127.0430000, array['양재천 도곡', '도곡 양재천 산책', 'seoulheld0615', 'yangjaeheld0615'], 87, 81, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-maebong-walk', '양재천 매봉 산책로', 'waterside', '하천 산책로', '양재천 매봉역 인근 산책 seed입니다.', '서울특별시 강남구 도곡동', '서울특별시 강남구 도곡동', 37.4865000, 127.0466000, array['양재천 매봉', '매봉 양재천 산책', 'seoulheld0615', 'yangjaeheld0615'], 87, 81, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-daechi-stream-walk', '양재천 대치 산책로', 'waterside', '하천 산책로', '양재천 대치 생활권 산책 seed입니다.', '서울특별시 강남구 대치동', '서울특별시 강남구 대치동', 37.4935000, 127.0588000, array['양재천 대치', '대치 양재천 산책', 'seoulheld0615', 'yangjaeheld0615'], 87, 81, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-tancheon-daechi-bridge-walk', '탄천 대치교 산책로', 'waterside', '하천 산책로', '탄천 대치교 인근 산책 seed입니다.', '서울특별시 강남구 대치동', '서울특별시 강남구 대치동', 37.4967000, 127.0667000, array['탄천 대치교', '탄천 산책로', 'seoulheld0615', 'tancheonheld0615'], 87, 81, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-tancheon-yangjae-confluence', '탄천 양재천 합류부 산책지점', 'waterside', '하천 산책지점', '탄천과 양재천 합류부 주변 산책 seed입니다.', '서울특별시 강남구 대치동', '서울특별시 강남구 대치동', 37.4979000, 127.0718000, array['탄천 양재천 합류부', '탄천 양재천 산책', 'seoulheld0615', 'tancheonheld0615'], 86, 80, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-tancheon-samseong-bridge-walk', '탄천 삼성교 산책로', 'waterside', '하천 산책로', '탄천 삼성교 인근 산책 seed입니다.', '서울특별시 강남구 삼성동', '서울특별시 강남구 삼성동', 37.5092000, 127.0675000, array['탄천 삼성교', '삼성동 탄천 산책', 'seoulheld0615', 'tancheonheld0615'], 86, 80, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-tancheon-jamsil-stadium-south', '탄천 잠실운동장 남측 산책로', 'waterside', '하천 산책로', '탄천 잠실운동장 남측 수변 산책 seed입니다.', '서울특별시 송파구 잠실동', '서울특별시 송파구 잠실동', 37.5140000, 127.0737000, array['탄천 잠실운동장 남측', '잠실 탄천 산책', 'seoulheld0615', 'tancheonheld0615'], 86, 80, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-yangjae-neighborhood-park', '양재근린공원 산책로', 'park', '근린공원 산책로', '양재근린공원 내부 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4762000, 127.0422000, array['양재근린공원', '양재 공원 산책', 'seoulheld0615', 'yangjaeheld0615'], 86, 80, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-maljuk-neighborhood-park', '말죽거리근린공원 산책지점', 'park', '근린공원 산책지점', '말죽거리근린공원 주변 생활권 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4825000, 127.0343000, array['말죽거리근린공원', '말죽거리 산책', 'seoulheld0615', 'yangjaeheld0615'], 85, 79, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-dogok-neighborhood-park', '도곡근린공원 산책로', 'park', '근린공원 산책로', '도곡근린공원 녹지 산책 seed입니다.', '서울특별시 강남구 도곡동', '서울특별시 강남구 도곡동', 37.4888000, 127.0438000, array['도곡근린공원', '도곡 공원 산책', 'seoulheld0615', 'yangjaeheld0615'], 85, 79, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-neulbeot-park-point', '늘벗근린공원 산책지점', 'park', '근린공원 산책지점', '늘벗근린공원 생활권 산책 seed입니다.', '서울특별시 서초구 양재동', '서울특별시 서초구 양재동', 37.4787000, 127.0502000, array['늘벗근린공원', '늘벗공원 산책', 'seoulheld0615', 'yangjaeheld0615'], 84, 78, 'seoul_yangjae_tancheon'),
    ('nuri-v1.1-seoul-0615-held-gaepo-neighborhood-park', '개포근린공원 산책로', 'park', '근린공원 산책로', '개포근린공원 녹지 산책 seed입니다.', '서울특별시 강남구 개포동', '서울특별시 강남구 개포동', 37.4770000, 127.0570000, array['개포근린공원', '개포 공원 산책', 'seoulheld0615', 'yangjaeheld0615'], 84, 78, 'seoul_yangjae_tancheon'),

    ('nuri-v1.1-seoul-0615-held-jungnang-jangan-bridge-walk', '중랑천 장안교 산책로', 'waterside', '하천 산책로', '중랑천 장안교 인근 산책 seed입니다.', '서울특별시 동대문구 장안동', '서울특별시 동대문구 장안동', 37.5682000, 127.0735000, array['중랑천 장안교', '장안동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 86, 80, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-imun-walk', '중랑천 이문 산책로', 'waterside', '하천 산책로', '중랑천 이문 생활권 산책 seed입니다.', '서울특별시 동대문구 이문동', '서울특별시 동대문구 이문동', 37.5950000, 127.0637000, array['중랑천 이문', '이문동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 87, 81, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-junghwa-walk', '중랑천 중화 산책로', 'waterside', '하천 산책로', '중랑천 중화 생활권 산책 seed입니다.', '서울특별시 중랑구 중화동', '서울특별시 중랑구 중화동', 37.6018000, 127.0730000, array['중랑천 중화', '중화동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 87, 81, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-mukdong-walk', '중랑천 묵동 산책로', 'waterside', '하천 산책로', '중랑천 묵동 생활권 산책 seed입니다.', '서울특별시 중랑구 묵동', '서울특별시 중랑구 묵동', 37.6125000, 127.0775000, array['중랑천 묵동', '묵동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 87, 81, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-wolneung-bridge', '중랑천 월릉교 산책지점', 'waterside', '하천 산책지점', '중랑천 월릉교 인근 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6175000, 127.0710000, array['중랑천 월릉교', '월릉교 산책', 'seoulheld0615', 'jungnangheld0615'], 87, 81, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-taereung-walk', '중랑천 태릉입구 산책로', 'waterside', '하천 산책로', '중랑천 태릉입구 생활권 산책 seed입니다.', '서울특별시 노원구 공릉동', '서울특별시 노원구 공릉동', 37.6182000, 127.0768000, array['중랑천 태릉입구', '태릉입구 중랑천', 'seoulheld0615', 'jungnangheld0615'], 86, 80, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-sanggye-walk', '중랑천 상계 산책로', 'waterside', '하천 산책로', '중랑천 상계 생활권 산책 seed입니다.', '서울특별시 노원구 상계동', '서울특별시 노원구 상계동', 37.6460000, 127.0635000, array['중랑천 상계', '상계동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 85, 79, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-nokcheon-bridge', '중랑천 녹천교 산책지점', 'waterside', '하천 산책지점', '중랑천 녹천교 인근 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6420000, 127.0545000, array['중랑천 녹천교', '녹천교 산책', 'seoulheld0615', 'jungnangheld0615'], 85, 79, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-changdong-walk', '중랑천 창동 산책로', 'waterside', '하천 산책로', '중랑천 창동 생활권 산책 seed입니다.', '서울특별시 도봉구 창동', '서울특별시 도봉구 창동', 37.6530000, 127.0480000, array['중랑천 창동', '창동 중랑천 산책', 'seoulheld0615', 'jungnangheld0615'], 84, 78, 'seoul_jungnangcheon'),
    ('nuri-v1.1-seoul-0615-held-jungnang-bridge-point', '중랑천 중랑교 산책지점', 'waterside', '하천 산책지점', '중랑천 중랑교 인근 산책 seed입니다.', '서울특별시 중랑구 중화동', '서울특별시 중랑구 중화동', 37.5888000, 127.0713000, array['중랑천 중랑교', '중랑교 산책', 'seoulheld0615', 'jungnangheld0615'], 86, 80, 'seoul_jungnangcheon'),

    ('nuri-v1.1-seoul-0615-held-dreamforest-moonlake-walk', '북서울꿈의숲 월영지 산책로', 'waterside', '공원 산책로', '북서울꿈의숲 월영지 주변 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6226000, 127.0427000, array['북서울꿈의숲 월영지', '월영지 산책', 'seoulheld0615', 'dreamforestheld0615'], 88, 82, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-dreamforest-visitor-center', '북서울꿈의숲 방문자센터 산책지점', 'park', '공원 산책지점', '북서울꿈의숲 방문자센터 주변 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6210000, 127.0400000, array['북서울꿈의숲 방문자센터', '북서울꿈의숲 산책', 'seoulheld0615', 'dreamforestheld0615'], 87, 81, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-dreamforest-waterfall-walk', '북서울꿈의숲 칠폭지 산책로', 'park', '공원 산책로', '북서울꿈의숲 칠폭지 인근 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6234000, 127.0452000, array['북서울꿈의숲 칠폭지', '칠폭지 산책', 'seoulheld0615', 'dreamforestheld0615'], 87, 81, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-dreamforest-iris-garden', '북서울꿈의숲 창포원 산책지점', 'park', '공원 산책지점', '북서울꿈의숲 창포원 주변 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6208000, 127.0465000, array['북서울꿈의숲 창포원', '창포원 산책', 'seoulheld0615', 'dreamforestheld0615'], 87, 81, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-odong-park-forest', '오동근린공원 숲길', 'forest', '숲길 산책로', '오동근린공원 숲길 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6230000, 127.0370000, array['오동근린공원 숲길', '오동공원 산책', 'seoulheld0615', 'dreamforestheld0615'], 86, 80, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-beondong-solbat-park', '번동 솔밭근린공원 산책로', 'park', '근린공원 산책로', '번동 솔밭근린공원 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6310000, 127.0400000, array['번동 솔밭근린공원', '솔밭근린공원 산책', 'seoulheld0615', 'dreamforestheld0615'], 85, 79, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-gangbuk-culture-green', '강북문화예술회관 녹지 산책지점', 'park', '녹지 산책지점', '강북문화예술회관 인근 녹지 산책 seed입니다.', '서울특별시 강북구 수유동', '서울특별시 강북구 수유동', 37.6370000, 127.0260000, array['강북문화예술회관 녹지', '강북구 녹지 산책', 'seoulheld0615', 'dreamforestheld0615'], 84, 78, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-ui-stream-beondong', '우이천 번동 산책로', 'waterside', '하천 산책로', '우이천 번동 생활권 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6315000, 127.0342000, array['우이천 번동', '우이천 산책로', 'seoulheld0615', 'dreamforestheld0615'], 85, 79, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-opaesan-forest-trail', '오패산 숲길', 'forest', '숲길 산책로', '오패산 생활권 숲길 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6275000, 127.0298000, array['오패산 숲길', '오패산 산책', 'seoulheld0615', 'dreamforestheld0615'], 84, 78, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-held-wolgye-neighborhood-park', '월계근린공원 산책로', 'park', '근린공원 산책로', '월계근린공원 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6285000, 127.0570000, array['월계근린공원', '월계 공원 산책', 'seoulheld0615', 'dreamforestheld0615'], 84, 78, 'seoul_dreamforest'),

    ('nuri-v1.1-seoul-0615-held-anyangcheon-mokdong-bridge', '안양천 목동교 산책로', 'waterside', '하천 산책로', '안양천 목동교 인근 산책 seed입니다.', '서울특별시 양천구 목동', '서울특별시 양천구 목동', 37.5364000, 126.8829000, array['안양천 목동교', '목동 안양천 산책', 'seoulheld0615', 'anyangcheonheld0615'], 87, 81, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-omok-bridge', '안양천 오목교 산책로', 'waterside', '하천 산책로', '안양천 오목교 인근 산책 seed입니다.', '서울특별시 양천구 목동', '서울특별시 양천구 목동', 37.5234000, 126.8752000, array['안양천 오목교', '오목교 안양천 산책', 'seoulheld0615', 'anyangcheonheld0615'], 87, 81, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-sinjeong-bridge', '안양천 신정교 산책로', 'waterside', '하천 산책로', '안양천 신정교 인근 산책 seed입니다.', '서울특별시 양천구 신정동', '서울특별시 양천구 신정동', 37.5173000, 126.8685000, array['안양천 신정교', '신정교 산책', 'seoulheld0615', 'anyangcheonheld0615'], 87, 81, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-yangpyeong-bridge', '안양천 양평교 산책지점', 'waterside', '하천 산책지점', '안양천 양평교 인근 산책 seed입니다.', '서울특별시 영등포구 양평동', '서울특별시 영등포구 양평동', 37.5280000, 126.8860000, array['안양천 양평교', '양평교 산책', 'seoulheld0615', 'anyangcheonheld0615'], 86, 80, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-guil-walk', '안양천 구일역 산책로', 'waterside', '하천 산책로', '안양천 구일역 인근 산책 seed입니다.', '서울특별시 구로구 구로동', '서울특별시 구로구 구로동', 37.4950000, 126.8715000, array['안양천 구일역', '구일역 안양천 산책', 'seoulheld0615', 'anyangcheonheld0615'], 86, 80, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-gocheok-bridge', '안양천 고척교 산책로', 'waterside', '하천 산책로', '안양천 고척교 인근 산책 seed입니다.', '서울특별시 구로구 고척동', '서울특별시 구로구 고척동', 37.5035000, 126.8675000, array['안양천 고척교', '고척교 산책', 'seoulheld0615', 'anyangcheonheld0615'], 86, 80, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-dorimcheon-confluence', '안양천 도림천 합류부 산책지점', 'waterside', '하천 산책지점', '안양천과 도림천 합류부 주변 산책 seed입니다.', '서울특별시 영등포구 문래동', '서울특별시 영등포구 문래동', 37.5122000, 126.8902000, array['안양천 도림천 합류부', '도림천 안양천 산책', 'seoulheld0615', 'anyangcheonheld0615'], 85, 79, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-mokdong-stadium-walk', '안양천 목동운동장 산책지점', 'waterside', '하천 산책지점', '목동운동장 인근 안양천 산책 seed입니다.', '서울특별시 양천구 목동', '서울특별시 양천구 목동', 37.5302000, 126.8812000, array['목동운동장 안양천', '목동 산책', 'seoulheld0615', 'anyangcheonheld0615'], 86, 80, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-gyenam-park-link', '안양천 계남근린공원 연결 산책로', 'walkway', '생활권 산책로', '계남근린공원과 안양천 접근 생활권 산책 seed입니다.', '서울특별시 양천구 신정동', '서울특별시 양천구 신정동', 37.5095000, 126.8558000, array['계남근린공원 안양천', '계남공원 산책', 'seoulheld0615', 'anyangcheonheld0615'], 84, 78, 'seoul_anyangcheon'),
    ('nuri-v1.1-seoul-0615-held-anyangcheon-sindorim-walk', '안양천 신도림 산책로', 'waterside', '하천 산책로', '안양천 신도림 생활권 산책 seed입니다.', '서울특별시 구로구 신도림동', '서울특별시 구로구 신도림동', 37.5076000, 126.8871000, array['안양천 신도림', '신도림 안양천 산책', 'seoulheld0615', 'anyangcheonheld0615'], 86, 80, 'seoul_anyangcheon'),

    ('nuri-v1.1-seoul-0615-held-boramae-central-lawn', '보라매공원 중앙잔디 산책로', 'park', '공원 산책로', '보라매공원 중앙잔디 주변 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4932000, 126.9198000, array['보라매공원 중앙잔디', '보라매공원 산책', 'seoulheld0615', 'boramaeheld0615'], 88, 82, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-boramae-pond-walk', '보라매공원 연못 산책로', 'waterside', '공원 산책로', '보라매공원 연못 주변 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4905000, 126.9208000, array['보라매공원 연못', '보라매 연못 산책', 'seoulheld0615', 'boramaeheld0615'], 88, 82, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-boramae-fountain-point', '보라매공원 음악분수 산책지점', 'park', '공원 산책지점', '보라매공원 음악분수 주변 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4916000, 126.9185000, array['보라매공원 음악분수', '보라매 산책', 'seoulheld0615', 'boramaeheld0615'], 87, 81, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-boramae-dog-park', '보라매공원 반려견 놀이터', 'pet_playground', '반려견 놀이터', '보라매공원 반려견 놀이터 주변 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4936000, 126.9167000, array['보라매공원 반려견 놀이터', '보라매 강아지 놀이터', 'seoulheld0615', 'boramaeheld0615', 'petheld0615'], 87, 81, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-boramae-loop-trail', '보라매공원 둘레길', 'trail', '공원 둘레길', '보라매공원 내부 둘레 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4924000, 126.9228000, array['보라매공원 둘레길', '보라매 둘레 산책', 'seoulheld0615', 'boramaeheld0615'], 88, 82, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-boramae-sillimline-green', '신림선 보라매공원 연결녹지', 'walkway', '생활권 산책로', '신림선 보라매공원 연결 녹지 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4890000, 126.9185000, array['신림선 보라매공원', '보라매 연결녹지', 'seoulheld0615', 'boramaeheld0615'], 84, 78, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-dorimcheon-sindaebang-walk', '도림천 신대방 산책로', 'waterside', '하천 산책로', '도림천 신대방 생활권 산책 seed입니다.', '서울특별시 동작구 신대방동', '서울특별시 동작구 신대방동', 37.4875000, 126.9085000, array['도림천 신대방', '신대방 도림천 산책', 'seoulheld0615', 'boramaeheld0615'], 86, 80, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-dorimcheon-gurodigital-walk', '도림천 구로디지털단지 산책로', 'waterside', '하천 산책로', '도림천 구로디지털단지 생활권 산책 seed입니다.', '서울특별시 구로구 구로동', '서울특별시 구로구 구로동', 37.4840000, 126.9007000, array['도림천 구로디지털단지', '구로디지털 도림천 산책', 'seoulheld0615', 'boramaeheld0615'], 85, 79, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-dorimcheon-sillim-walk', '도림천 신림 산책로', 'waterside', '하천 산책로', '도림천 신림 생활권 산책 seed입니다.', '서울특별시 관악구 신림동', '서울특별시 관악구 신림동', 37.4832000, 126.9302000, array['도림천 신림', '신림 도림천 산책', 'seoulheld0615', 'boramaeheld0615'], 85, 79, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-gwanak-dorimcheon-entry', '관악산 도림천 진입 산책지점', 'walkway', '생활권 산책지점', '관악산 방향 도림천 진입 생활권 산책 seed입니다.', '서울특별시 관악구 신림동', '서울특별시 관악구 신림동', 37.4795000, 126.9400000, array['관악산 도림천 진입', '도림천 관악 산책', 'seoulheld0615', 'boramaeheld0615'], 84, 78, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-sangdo-neighborhood-park', '상도근린공원 산책로', 'park', '근린공원 산책로', '상도근린공원 녹지 산책 seed입니다.', '서울특별시 동작구 상도동', '서울특별시 동작구 상도동', 37.5000000, 126.9395000, array['상도근린공원', '상도 공원 산책', 'seoulheld0615', 'boramaeheld0615'], 84, 78, 'seoul_boramae_dorimcheon'),
    ('nuri-v1.1-seoul-0615-held-guksabong-forest-trail', '국사봉 숲길', 'forest', '숲길 산책로', '국사봉 생활권 숲길 산책 seed입니다.', '서울특별시 동작구 상도동', '서울특별시 동작구 상도동', 37.5005000, 126.9275000, array['국사봉 숲길', '국사봉 산책', 'seoulheld0615', 'boramaeheld0615'], 84, 78, 'seoul_boramae_dorimcheon')
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
      'attribution', 'NURI operator seed · Seoul held-region reinforcement · 2026-06-15',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-approved-seed',
        'scope', 'seoul_held_region_reinforcement',
        'coverageRegion', coverage_region,
        'createdFor', 'v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15'
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
  'v1.1-walk-poi-seoul-held-region-reinforcement-2026-06-15'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Seoul held-region reinforcement batch approved for coverage measurement, fallback gate re-evaluation, and Android smoke.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('seoulheld0615', 37.5165, 127.1160, 30000, 200);
-- select count(*) from public.walk_poi_public_search_v1('songpaheld0615', 37.5165, 127.1160, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('yangjaeheld0615', 37.4805, 127.0405, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('jungnangheld0615', 37.6080, 127.0670, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('anyangcheonheld0615', 37.5185, 126.8810, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('dreamforestheld0615', 37.6200, 127.0410, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('boramaeheld0615', 37.4920, 126.9190, 10000, 80);

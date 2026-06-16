-- V1.1 walk POI metro-area 2nd seed coverage
-- Purpose:
-- - Expand validated metro-area walking POI coverage after the first
--   Seongnam/Bundang/Pangyo/Tancheon batch.
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
    ('nuri-v1.1-metro-0616-hanam-misa-hangang-central-walk', '미사한강공원 중앙 산책로', 'waterside', '한강 산책로', '하남·미사한강공원 권역 중앙 한강변 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변대로 일대', 37.5665000, 127.1900000, array['미사한강공원 중앙 산책로', '하남·미사한강공원 권역', '미사한강공원 산책', '하남 산책', '수도권 2차 0616'], 88, 82, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-hangang-silvergrass', '미사한강변 억새 산책로', 'waterside', '한강 산책로', '미사 한강변 억새 구간 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변한강로 일대', 37.5688000, 127.1855000, array['미사한강변 억새 산책로', '하남·미사한강공원 권역', '미사한강공원 산책', '한강 산책', '수도권 2차 0616'], 86, 80, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-riverside-lookout', '미사 한강 전망 산책지점', 'waterside', '한강 산책지점', '미사 한강 전망 생활권 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변한강로 일대', 37.5715000, 127.1905000, array['미사 한강 전망 산책지점', '하남·미사한강공원 권역', '미사 산책', '한강 산책', '수도권 2차 0616'], 85, 79, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-hangang-access', '미사 한강 접근 산책지점', 'walkway', '한강 접근 산책지점', '미사 생활권에서 한강으로 접근하는 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변한강로 일대', 37.5700000, 127.1970000, array['미사 한강 접근 산책지점', '하남·미사한강공원 권역', '미사 산책', '하남 한강 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-lake-park-loop', '미사호수공원 수변 산책로', 'waterside', '호수 산책로', '미사호수공원 수변 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변중앙로 일대', 37.5585000, 127.1880000, array['미사호수공원 수변 산책로', '하남·미사한강공원 권역', '미사호수공원 산책', '하남 산책', '수도권 2차 0616'], 88, 82, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-lake-neighborhood-green', '미사호수공원 생활녹지 산책길', 'park', '생활권 녹지 산책길', '미사호수공원 주변 생활녹지 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변중앙로 일대', 37.5598000, 127.1838000, array['미사호수공원 생활녹지 산책길', '하남·미사한강공원 권역', '미사호수공원 산책', '미사 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-mangwolcheon-central', '망월천 미사 산책로', 'waterside', '하천 산책로', '망월천 미사 생활권 하천 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 망월동', 37.5620000, 127.1810000, array['망월천 미사 산책로', '하남·미사한강공원 권역', '망월천 산책', '미사 산책', '수도권 2차 0616'], 86, 80, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-mangwolcheon-footbridge', '망월천 보행교 산책지점', 'walkway', '하천 보행 산책지점', '망월천 보행교 주변 생활 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 망월동', 37.5642000, 127.1842000, array['망월천 보행교 산책지점', '하남·미사한강공원 권역', '망월천 산책', '미사 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-greenbelt-walk', '미사강변도시 녹지 산책로', 'walkway', '생활권 녹지 산책로', '미사강변도시 녹지 보행 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 망월동', 37.5610000, 127.1935000, array['미사강변도시 녹지 산책로', '하남·미사한강공원 권역', '미사 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-pungsan-park-walk', '풍산근린공원 산책로', 'park', '근린공원 산책로', '하남 풍산근린공원 생활권 산책 seed입니다.', '경기도 하남시 풍산동', '경기도 하남시 풍산동', 37.5525000, 127.1855000, array['풍산근린공원 산책로', '하남·미사한강공원 권역', '풍산동 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-deokpungcheon-hangang', '덕풍천 한강합류부 산책로', 'waterside', '하천 산책로', '덕풍천 한강합류부 주변 산책 seed입니다.', '경기도 하남시 덕풍동', '경기도 하남시 덕풍동', 37.5485000, 127.2010000, array['덕풍천 한강합류부 산책로', '하남·미사한강공원 권역', '덕풍천 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-unionpark-green-walk', '하남유니온파크 녹지 산책로', 'park', '생활권 녹지 산책로', '하남유니온파크 주변 녹지 산책 seed입니다.', '경기도 하남시 신장동', '경기도 하남시 신장동', 37.5435000, 127.2055000, array['하남유니온파크 녹지 산책로', '하남·미사한강공원 권역', '하남유니온파크 산책', '하남 산책', '수도권 2차 0616'], 83, 77, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-rowing-waterside', '미사리 조정경기장 수변 산책로', 'waterside', '수변 산책로', '미사리 조정경기장 주변 수변 산책 seed입니다.', '경기도 하남시 미사동', '경기도 하남시 미사동', 37.5585000, 127.2150000, array['미사리 조정경기장 수변 산책로', '하남·미사한강공원 권역', '미사리 산책', '하남 산책', '수도권 2차 0616'], 86, 80, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-rowing-east-walk', '미사경정공원 산책로', 'park', '수변공원 산책로', '미사경정공원 주변 산책 seed입니다.', '경기도 하남시 미사동', '경기도 하남시 미사동', 37.5560000, 127.2140000, array['미사경정공원 산책로', '하남·미사한강공원 권역', '미사경정공원 산책', '하남 산책', '수도권 2차 0616'], 86, 80, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-seondong-bank-walk', '선동둔치 한강 산책지점', 'waterside', '한강 산책지점', '선동둔치 한강변 산책 seed입니다.', '경기도 하남시 선동', '경기도 하남시 선동', 37.5730000, 127.2040000, array['선동둔치 한강 산책지점', '하남·미사한강공원 권역', '선동 한강 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-namugowon-walk', '하남 나무고아원 산책지점', 'park', '녹지 산책지점', '하남 나무고아원 주변 산책 seed입니다.', '경기도 하남시 미사동', '경기도 하남시 미사동', 37.5490000, 127.2160000, array['하남 나무고아원 산책지점', '하남·미사한강공원 권역', '나무고아원 산책', '하남 산책', '수도권 2차 0616'], 83, 77, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-sinjang-park-walk', '신장근린공원 산책로', 'park', '근린공원 산책로', '하남 신장근린공원 생활권 산책 seed입니다.', '경기도 하남시 신장동', '경기도 하남시 신장동', 37.5380000, 127.2140000, array['신장근린공원 산책로', '하남·미사한강공원 권역', '신장동 산책', '하남 산책', '수도권 2차 0616'], 82, 76, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-cityhall-green-walk', '하남시청 생활녹지 산책지점', 'walkway', '생활권 녹지 산책지점', '하남시청 주변 생활녹지 산책 seed입니다.', '경기도 하남시 신장동', '경기도 하남시 신장동', 37.5390000, 127.2140000, array['하남시청 생활녹지 산책지점', '하남·미사한강공원 권역', '하남시청 산책', '하남 산책', '수도권 2차 0616'], 82, 76, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-riverside-pet-walk', '미사한강공원 반려견 산책지점', 'walkway', '반려견 산책지점', '미사한강공원 반려견 동반 산책 후보 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 미사강변한강로 일대', 37.5672000, 127.1932000, array['미사한강공원 반려견 산책지점', '하남·미사한강공원 권역', '반려견 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),
    ('nuri-v1.1-metro-0616-hanam-misa-west-walk', '미사 서측 한강 산책길', 'waterside', '한강 산책길', '미사 서측 한강변 산책 seed입니다.', '경기도 하남시 망월동', '경기도 하남시 망월동', 37.5650000, 127.1800000, array['미사 서측 한강 산책길', '하남·미사한강공원 권역', '미사 한강 산책', '하남 산책', '수도권 2차 0616'], 84, 78, 'metro_hanam_misa_hangang'),

    ('nuri-v1.1-metro-0616-suwon-gwanggyo-woncheon-loop', '광교호수공원 원천호수 산책로', 'waterside', '호수 산책로', '수원·광교호수공원 권역 원천호수 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2850000, 127.0665000, array['광교호수공원 원천호수 산책로', '수원·광교호수공원 권역', '광교호수공원 산책', '수원 산책', '수도권 2차 0616'], 89, 83, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-sindae-loop', '광교호수공원 신대호수 산책로', 'waterside', '호수 산책로', '신대호수 주변 수변 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2915000, 127.0700000, array['광교호수공원 신대호수 산책로', '수원·광교호수공원 권역', '광교호수공원 산책', '수원 산책', '수도권 2차 0616'], 89, 83, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-urban-levee', '광교호수공원 어반레비 산책로', 'walkway', '호수 산책로', '광교호수공원 어반레비 구간 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2825000, 127.0705000, array['광교호수공원 어반레비 산책로', '수원·광교호수공원 권역', '광교호수공원 산책', '수원 산책', '수도권 2차 0616'], 86, 80, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-plaza-walk', '광교호수공원 마당극장 산책지점', 'walkway', '공원 산책지점', '광교호수공원 마당극장 주변 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2875000, 127.0645000, array['광교호수공원 마당극장 산책지점', '수원·광교호수공원 권역', '광교호수공원 산책', '광교 산책', '수도권 2차 0616'], 86, 80, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-woncheoncheon-walk', '원천천 광교 산책로', 'waterside', '하천 산책로', '원천천 광교 생활권 산책 seed입니다.', '경기도 수원시 영통구 원천동', '경기도 수원시 영통구 원천동', 37.2790000, 127.0550000, array['원천천 광교 산책로', '수원·광교호수공원 권역', '원천천 산책', '광교 산책', '수도권 2차 0616'], 85, 79, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-woncheon-view-walk', '원천호수 전망 산책지점', 'waterside', '호수 산책지점', '원천호수 전망 생활권 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2820000, 127.0665000, array['원천호수 전망 산책지점', '수원·광교호수공원 권역', '원천호수 산책', '광교 산책', '수도권 2차 0616'], 86, 80, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-sindae-north-walk', '신대호수 북측 산책지점', 'waterside', '호수 산책지점', '신대호수 북측 생활권 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2955000, 127.0690000, array['신대호수 북측 산책지점', '수원·광교호수공원 권역', '신대호수 산책', '광교 산책', '수도권 2차 0616'], 86, 80, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-dog-walk', '광교호수공원 반려견 산책지점', 'walkway', '반려견 산책지점', '광교호수공원 반려견 동반 산책 후보 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2890000, 127.0680000, array['광교호수공원 반려견 산책지점', '수원·광교호수공원 권역', '반려견 산책', '광교 산책', '수도권 2차 0616'], 84, 78, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-camping-walk', '광교호수공원 가족캠핑장 산책지점', 'walkway', '공원 산책지점', '광교호수공원 가족캠핑장 주변 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2805000, 127.0750000, array['광교호수공원 가족캠핑장 산책지점', '수원·광교호수공원 권역', '광교호수공원 산책', '수원 산책', '수도권 2차 0616'], 84, 78, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-convention-green', '수원컨벤션센터 녹지 산책지점', 'walkway', '생활권 녹지 산책지점', '수원컨벤션센터 주변 녹지 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교중앙로 일대', 37.2855000, 127.0590000, array['수원컨벤션센터 녹지 산책지점', '수원·광교호수공원 권역', '광교 산책', '수원 산책', '수도권 2차 0616'], 83, 77, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-cafe-street', '광교카페거리 생활 산책길', 'walkway', '생활권 산책길', '광교카페거리 주변 보행 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.2925000, 127.0635000, array['광교카페거리 생활 산책길', '수원·광교호수공원 권역', '광교카페거리 산책', '광교 산책', '수도권 2차 0616'], 83, 77, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-central-park', '광교중앙공원 산책로', 'park', '공원 산책로', '광교중앙공원 생활권 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.2870000, 127.0485000, array['광교중앙공원 산책로', '수원·광교호수공원 권역', '광교중앙공원 산책', '광교 산책', '수도권 2차 0616'], 85, 79, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-history-park', '광교역사공원 산책지점', 'park', '공원 산책지점', '광교역사공원 주변 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.2940000, 127.0515000, array['광교역사공원 산책지점', '수원·광교호수공원 권역', '광교역사공원 산책', '광교 산책', '수도권 2차 0616'], 84, 78, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-hyeryeong-park-walk', '혜령공원 산책로', 'park', '근린공원 산책로', '광교 생활권 혜령공원 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.2910000, 127.0580000, array['혜령공원 산책로', '수원·광교호수공원 권역', '혜령공원 산책', '광교 산책', '수도권 2차 0616'], 83, 77, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-dasan-park-walk', '광교 다산공원 산책지점', 'park', '근린공원 산책지점', '광교 생활권 다산공원 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.2860000, 127.0550000, array['광교 다산공원 산책지점', '수원·광교호수공원 권역', '다산공원 산책', '광교 산책', '수도권 2차 0616'], 83, 77, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-technovalley-green', '광교테크노밸리 녹지 산책로', 'walkway', '생활권 녹지 산책로', '광교테크노밸리 주변 녹지 보행 산책 seed입니다.', '경기도 수원시 영통구 이의동', '경기도 수원시 영통구 이의동', 37.3005000, 127.0435000, array['광교테크노밸리 녹지 산책로', '수원·광교호수공원 권역', '광교테크노밸리 산책', '광교 산책', '수도권 2차 0616'], 82, 76, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-ajou-green-walk', '아주대 생활녹지 산책로', 'walkway', '생활권 녹지 산책로', '아주대 주변 생활녹지 산책 seed입니다.', '경기도 수원시 영통구 원천동', '경기도 수원시 영통구 원천동', 37.2790000, 127.0435000, array['아주대 생활녹지 산책로', '수원·광교호수공원 권역', '아주대 산책', '수원 산책', '수도권 2차 0616'], 82, 76, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-woncheon-merge-walk', '원천리천 합류 산책지점', 'waterside', '하천 산책지점', '원천리천 합류부 주변 산책 seed입니다.', '경기도 수원시 영통구 원천동', '경기도 수원시 영통구 원천동', 37.2745000, 127.0565000, array['원천리천 합류 산책지점', '수원·광교호수공원 권역', '원천천 산책', '수원 산책', '수도권 2차 0616'], 82, 76, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-maetan-park-walk', '매탄공원 산책로', 'park', '근린공원 산책로', '수원 매탄공원 생활권 산책 seed입니다.', '경기도 수원시 영통구 매탄동', '경기도 수원시 영통구 매탄동', 37.2670000, 127.0450000, array['매탄공원 산책로', '수원·광교호수공원 권역', '매탄공원 산책', '수원 산책', '수도권 2차 0616'], 82, 76, 'metro_suwon_gwanggyo_lake'),
    ('nuri-v1.1-metro-0616-suwon-gwanggyo-east-ridge', '광교호수공원 동측 산책길', 'walkway', '호수 산책길', '광교호수공원 동측 보행 산책 seed입니다.', '경기도 수원시 영통구 하동', '경기도 수원시 영통구 광교호수로 일대', 37.2868000, 127.0735000, array['광교호수공원 동측 산책길', '수원·광교호수공원 권역', '광교호수공원 산책', '수원 산책', '수도권 2차 0616'], 84, 78, 'metro_suwon_gwanggyo_lake'),

    ('nuri-v1.1-metro-0616-gwacheon-seoulgrandpark-lake-walk', '서울대공원 호수 산책로', 'waterside', '호수 산책로', '과천·서울대공원 권역 호수 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4330000, 127.0140000, array['서울대공원 호수 산책로', '과천·서울대공원 권역', '서울대공원 산책', '과천 산책', '수도권 2차 0616'], 89, 83, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-seoulgrandpark-dulle', '서울대공원 둘레길', 'trail', '공원 둘레길', '서울대공원 둘레길 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4360000, 127.0160000, array['서울대공원 둘레길', '과천·서울대공원 권역', '서울대공원 산책', '과천 산책', '수도권 2차 0616'], 89, 83, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-seoulgrandpark-fountain', '서울대공원 분수대 산책지점', 'walkway', '공원 산책지점', '서울대공원 분수대 주변 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4350000, 127.0180000, array['서울대공원 분수대 산책지점', '과천·서울대공원 권역', '서울대공원 산책', '과천 산책', '수도권 2차 0616'], 86, 80, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-seoulgrandpark-forest', '서울대공원 숲속 산책로', 'forest', '숲길 산책로', '서울대공원 숲속 구간 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4390000, 127.0200000, array['서울대공원 숲속 산책로', '과천·서울대공원 권역', '서울대공원 산책', '과천 숲길', '수도권 2차 0616'], 87, 81, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-seoulland-entry-walk', '서울랜드 입구 산책지점', 'walkway', '공원 접근 산책지점', '서울랜드 입구 주변 보행 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4355000, 127.0115000, array['서울랜드 입구 산책지점', '과천·서울대공원 권역', '서울대공원 산책', '과천 산책', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-grandpark-station-walk', '대공원역 산책지점', 'walkway', '공원 접근 산책지점', '대공원역에서 서울대공원으로 이어지는 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4358000, 127.0068000, array['대공원역 산책지점', '과천·서울대공원 권역', '대공원역 산책', '과천 산책', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-camping-forest-walk', '서울대공원 캠핑장 숲길', 'forest', '숲길 산책로', '서울대공원 캠핑장 주변 숲길 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4365000, 127.0260000, array['서울대공원 캠핑장 숲길', '과천·서울대공원 권역', '서울대공원 산책', '과천 숲길', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-reservoir-walk', '과천저수지 수변 산책로', 'waterside', '수변 산책로', '과천저수지 주변 수변 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 막계동', 37.4430000, 127.0250000, array['과천저수지 수변 산책로', '과천·서울대공원 권역', '과천저수지 산책', '과천 산책', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-racepark-edge', '렛츠런파크 둘레 산책로', 'walkway', '생활권 산책로', '렛츠런파크 둘레 생활권 산책 seed입니다.', '경기도 과천시 주암동', '경기도 과천시 경마공원대로 일대', 37.4420000, 127.0050000, array['렛츠런파크 둘레 산책로', '과천·서울대공원 권역', '과천 산책', '경마공원 산책', '수도권 2차 0616'], 83, 77, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-central-park-walk', '과천 중앙공원 산책로', 'park', '공원 산책로', '과천 중앙공원 생활권 산책 seed입니다.', '경기도 과천시 중앙동', '경기도 과천시 중앙동', 37.4290000, 126.9915000, array['과천 중앙공원 산책로', '과천·서울대공원 권역', '과천 중앙공원 산책', '과천 산책', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-civic-green', '과천 시민회관 녹지 산책지점', 'walkway', '생활권 녹지 산책지점', '과천 시민회관 주변 녹지 산책 seed입니다.', '경기도 과천시 중앙동', '경기도 과천시 중앙동', 37.4295000, 126.9935000, array['과천 시민회관 녹지 산책지점', '과천·서울대공원 권역', '과천 산책', '중앙동 산책', '수도권 2차 0616'], 82, 76, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-gwanmun-sports-park', '관문체육공원 산책로', 'park', '공원 산책로', '관문체육공원 생활권 산책 seed입니다.', '경기도 과천시 중앙동', '경기도 과천시 중앙동', 37.4370000, 126.9955000, array['관문체육공원 산책로', '과천·서울대공원 권역', '관문체육공원 산책', '과천 산책', '수도권 2차 0616'], 84, 78, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-hyanggyo-valley', '과천향교 계곡 산책로', 'trail', '계곡 산책로', '과천향교 인근 계곡 산책 seed입니다.', '경기도 과천시 중앙동', '경기도 과천시 중앙동', 37.4415000, 126.9970000, array['과천향교 계곡 산책로', '과천·서울대공원 권역', '과천향교 산책', '과천 산책', '수도권 2차 0616'], 83, 77, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-yangjaecheon-walk', '양재천 과천 산책로', 'waterside', '하천 산책로', '과천 구간 양재천 산책 seed입니다.', '경기도 과천시 별양동', '경기도 과천시 별양동', 37.4300000, 126.9980000, array['양재천 과천 산책로', '과천·서울대공원 권역', '양재천 과천 산책', '과천 산책', '수도권 2차 0616'], 83, 77, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-seonbawi-green-walk', '선바위역 녹지 산책로', 'walkway', '생활권 녹지 산책로', '선바위역 주변 녹지 산책 seed입니다.', '경기도 과천시 과천동', '경기도 과천시 과천동', 37.4510000, 126.9990000, array['선바위역 녹지 산책로', '과천·서울대공원 권역', '선바위역 산책', '과천 산책', '수도권 2차 0616'], 82, 76, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-knowledge-town-green', '과천지식정보타운 녹지 산책로', 'walkway', '생활권 녹지 산책로', '과천지식정보타운 주변 보행 산책 seed입니다.', '경기도 과천시 갈현동', '경기도 과천시 갈현동', 37.4180000, 126.9970000, array['과천지식정보타운 녹지 산책로', '과천·서울대공원 권역', '과천지식정보타운 산책', '과천 산책', '수도권 2차 0616'], 82, 76, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-munwon-sports-park', '문원체육공원 산책로', 'park', '공원 산책로', '문원체육공원 생활권 산책 seed입니다.', '경기도 과천시 문원동', '경기도 과천시 문원동', 37.4305000, 127.0140000, array['문원체육공원 산책로', '과천·서울대공원 권역', '문원체육공원 산책', '과천 산책', '수도권 2차 0616'], 83, 77, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-cheonggyesan-entry', '청계산 원터골 입구 산책지점', 'trail', '숲길 접근 산책지점', '청계산 원터골 입구 주변 숲길 접근 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 막계동', 37.4260000, 127.0470000, array['청계산 원터골 입구 산책지점', '과천·서울대공원 권역', '청계산 산책', '과천 숲길', '수도권 2차 0616'], 82, 76, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-makgye-green-point', '막계동 생활녹지 산책지점', 'walkway', '생활권 녹지 산책지점', '막계동 생활녹지 산책 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 막계동', 37.4320000, 127.0200000, array['막계동 생활녹지 산책지점', '과천·서울대공원 권역', '막계동 산책', '과천 산책', '수도권 2차 0616'], 82, 76, 'metro_gwacheon_seoul_grand_park'),
    ('nuri-v1.1-metro-0616-gwacheon-grandpark-pet-walk', '서울대공원 반려견 산책지점', 'walkway', '반려견 산책지점', '서울대공원 주변 반려견 동반 산책 후보 seed입니다.', '경기도 과천시 막계동', '경기도 과천시 대공원광장로 일대', 37.4342000, 127.0155000, array['서울대공원 반려견 산책지점', '과천·서울대공원 권역', '반려견 산책', '과천 산책', '수도권 2차 0616'], 83, 77, 'metro_gwacheon_seoul_grand_park')
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
      'attribution', '누리 운영자 검수 자료 · 수도권 2차 산책 권역 · 2026-06-16',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'metro_2nd_seed_coverage',
        'coverageRegion', coverage_region,
        'createdFor', 'v1.1_walk_poi_metro_2nd_seed_coverage_2026_06_16'
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
  'v1.1-walk-poi-metro-2nd-seed-coverage-2026-06-16'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_metro_2nd_seed_coverage_2026_06_16'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 metro-area 2nd seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('하남·미사한강공원 권역', 37.5665, 127.1900, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('수원·광교호수공원 권역', 37.2850, 127.0660, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('과천·서울대공원 권역', 37.4350, 127.0140, 5000, 80);

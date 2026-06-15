-- V1.1 walk POI Korean alias normalization + Bukseoul/metro first seed coverage
-- Purpose:
-- - Keep public/admin display values Korean-first while preserving internal
--   source ids, coverage keys, and rollback traceability.
-- - Add Korean search aliases to existing approved seed batches without deleting
--   existing English smoke aliases.
-- - Reinforce Bukseoul Dream Forest coverage and start the first metro-area
--   seed batch for Seongnam/Bundang/Pangyo/Tancheon.
-- - Use walk_poi_admin_import_commit_v1 and walk_poi_admin_review_v1 for new
--   seed rows. Do not insert directly into walk_pois.
-- Source/attribution:
-- - NURI operator curated public walking-region seed candidates.
-- - Final public exposure is NURI operator reviewed.
-- Usage condition:
-- - Run from a service/admin SQL context. This script sets request.jwt.claim.role
--   to service_role inside the transaction for admin RPC execution.
-- - This script is idempotent for the source_provider/externalSourceId conflict key.

begin;

set local request.jwt.claim.role = 'service_role';

-- Existing public display fields are already Korean. This block adds Korean
-- search/display aliases while keeping existing English smoke aliases for
-- historical QA traceability.
with alias_rules (created_for, coverage_region, aliases) as (
  values
    ('v1.1_walk_poi_goyang_seed_coverage_2026_06_06', null, array['고양시 산책', '고양시 공원', '고양 산책 0606']),
    ('v1.1_walk_poi_seoul_seed_coverage_2026_06_06', null, array['서울 산책', '서울 공원', '서울 산책 0606']),
    ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_worldcup_nanji_mangwon', array['서울 월드컵공원·난지·망원 권역', '월드컵공원·난지·망원 산책', '서울 산책 0615']),
    ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_banpo_jamwon_ichon', array['서울 반포·잠원·이촌 권역', '반포·잠원·이촌 한강 산책', '서울 산책 0615']),
    ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_ttukseom_seoulforest', array['서울 뚝섬·서울숲 권역', '뚝섬·서울숲 산책', '서울 산책 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_songpa_olympic_lake', array['서울 송파·올림픽공원·석촌호수 권역', '송파·올림픽공원·석촌호수 산책', '서울 보류권역 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_yangjae_tancheon', array['서울 양재천·탄천 권역', '양재천·탄천 산책', '서울 보류권역 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_jungnangcheon', array['서울 중랑천 권역', '중랑천 산책', '서울 보류권역 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_anyangcheon', array['서울 안양천 권역', '안양천 산책', '서울 보류권역 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_dreamforest', array['서울 북서울꿈의숲 권역', '북서울꿈의숲 산책', '서울 보류권역 0615']),
    ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_boramae_dorimcheon', array['서울 보라매·도림천 권역', '보라매·도림천 산책', '서울 보류권역 0615'])
),
alias_targets as (
  select distinct on (s.walk_poi_id, alias_value)
    s.walk_poi_id,
    s.id as source_record_id,
    alias_value
  from public.walk_poi_source_records s
  join public.walk_pois p on p.id = s.walk_poi_id
  join alias_rules r
    on r.created_for = s.raw_payload ->> 'createdFor'
   and (
     r.coverage_region is null
     or r.coverage_region = s.raw_payload ->> 'coverageRegion'
   )
  cross join lateral unnest(r.aliases) as alias_value
  where p.review_status = 'approved'
    and p.visibility_status = 'public'
    and p.lifecycle_status = 'active'
),
inserted_aliases as (
  insert into public.walk_poi_search_aliases (
    walk_poi_id,
    alias,
    normalized_alias
  )
  select
    t.walk_poi_id,
    t.alias_value,
    public.walk_poi_admin_normalize_text_v1(t.alias_value)
  from alias_targets t
  on conflict (walk_poi_id, normalized_alias) do nothing
  returning walk_poi_id
),
audit_targets as (
  select distinct
    t.walk_poi_id,
    t.source_record_id
  from alias_targets t
  where exists (
    select 1
    from inserted_aliases i
    where i.walk_poi_id = t.walk_poi_id
  )
)
insert into public.walk_poi_audit_logs (
  walk_poi_id,
  source_record_id,
  action_type,
  before_state,
  after_state,
  note
)
select
  t.walk_poi_id,
  t.source_record_id,
  'alias_localization',
  jsonb_build_object('aliasLocalization', 'before_ko_alias_addition'),
  jsonb_build_object('aliasLocalization', 'after_ko_alias_addition'),
  'V1.1 Korean search alias normalization. Existing internal English smoke aliases are retained.'
from audit_targets t;

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
    ('nuri-v1.1-seoul-0615-bukseoul-jangwi-forest-trail', '장위근린공원 숲길', 'forest', '숲길 산책로', '북서울꿈의숲 생활권 장위근린공원 숲길 seed입니다.', '서울특별시 성북구 장위동', '서울특별시 성북구 장위동', 37.6135000, 127.0475000, array['장위근린공원 숲길', '장위동 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 85, 79, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-ui-stream-wolgye', '우이천 월계 산책로', 'waterside', '하천 산책로', '우이천 월계 생활권 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6238000, 127.0578000, array['우이천 월계', '월계동 우이천 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 85, 79, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-seokgye-jungnang-walk', '석계역 중랑천 산책지점', 'waterside', '하천 산책지점', '석계역 인근 중랑천 접근 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6140000, 127.0650000, array['석계역 중랑천', '석계 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 84, 78, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-choansan-park-trail', '초안산근린공원 산책로', 'park', '근린공원 산책로', '초안산근린공원 생활권 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6340000, 127.0450000, array['초안산근린공원', '초안산 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 85, 79, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-opaesan-edge-trail', '오패산 자락 산책로', 'forest', '숲길 산책로', '오패산 자락 생활권 숲길 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6257000, 127.0322000, array['오패산 자락', '오패산 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 84, 78, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-beondong-green-point', '번동 생활녹지 산책지점', 'park', '녹지 산책지점', '번동 생활녹지 산책 seed입니다.', '서울특별시 강북구 번동', '서울특별시 강북구 번동', 37.6292000, 127.0412000, array['번동 생활녹지', '번동 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 83, 77, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-ui-jungnang-confluence', '월계동 우이천 합류부 산책로', 'waterside', '하천 산책로', '월계동 우이천 합류부 주변 산책 seed입니다.', '서울특별시 노원구 월계동', '서울특별시 노원구 월계동', 37.6270000, 127.0590000, array['월계동 우이천 합류부', '우이천 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 84, 78, 'seoul_dreamforest'),
    ('nuri-v1.1-seoul-0615-bukseoul-mia-solsaem-park', '미아동 솔샘근린공원 산책로', 'park', '근린공원 산책로', '미아동 솔샘근린공원 산책 seed입니다.', '서울특별시 강북구 미아동', '서울특별시 강북구 미아동', 37.6170000, 127.0300000, array['솔샘근린공원', '미아동 산책', '북서울꿈의숲 산책', '서울 북서울꿈의숲 권역', '서울 보강 0615'], 84, 78, 'seoul_dreamforest'),

    ('nuri-v1.1-metro-0615-seongnam-tancheon-pangyo-bridge-walk', '탄천 판교교 산책로', 'waterside', '하천 산책로', '성남·분당·판교·탄천 권역 판교교 산책 seed입니다.', '경기도 성남시 분당구 백현동', '경기도 성남시 분당구 백현동', 37.3941000, 127.1112000, array['탄천 판교교', '판교 탄천 산책', '성남·분당·판교·탄천 권역', '수도권 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-baekhyeon-bridge', '탄천 백현교 산책로', 'waterside', '하천 산책로', '백현교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 백현동', '경기도 성남시 분당구 백현동', 37.3885000, 127.1110000, array['탄천 백현교', '백현동 탄천 산책', '성남·분당·판교·탄천 권역', '수도권 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-seohyeon-bridge', '탄천 서현교 산책로', 'waterside', '하천 산책로', '서현교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 서현동', '경기도 성남시 분당구 서현동', 37.3822000, 127.1230000, array['탄천 서현교', '서현동 탄천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-sunae-bridge', '탄천 수내교 산책로', 'waterside', '하천 산책로', '수내교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3723000, 127.1180000, array['탄천 수내교', '수내동 탄천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-jeongja-bridge', '탄천 정자교 산책로', 'waterside', '하천 산책로', '정자교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 정자동', '경기도 성남시 분당구 정자동', 37.3660000, 127.1102000, array['탄천 정자교', '정자동 탄천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-migeum-walk', '탄천 미금 산책로', 'waterside', '하천 산책로', '미금 생활권 탄천 산책 seed입니다.', '경기도 성남시 분당구 구미동', '경기도 성남시 분당구 구미동', 37.3515000, 127.1115000, array['탄천 미금', '미금 탄천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-yatap-bridge', '탄천 야탑교 산책로', 'waterside', '하천 산책로', '야탑교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 야탑동', '경기도 성남시 분당구 야탑동', 37.4105000, 127.1295000, array['탄천 야탑교', '야탑 탄천 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-tancheon-imae-bridge', '탄천 이매교 산책로', 'waterside', '하천 산책로', '이매교 인근 탄천 산책 seed입니다.', '경기도 성남시 분당구 이매동', '경기도 성남시 분당구 이매동', 37.3973000, 127.1263000, array['탄천 이매교', '이매동 탄천 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 87, 81, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-hwarang-park-walk', '판교 화랑공원 산책로', 'park', '공원 산책로', '판교 화랑공원 산책 seed입니다.', '경기도 성남시 분당구 삼평동', '경기도 성남시 분당구 삼평동', 37.3949000, 127.1072000, array['판교 화랑공원', '화랑공원 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-alphadom-plaza-walk', '판교역 알파돔 산책광장', 'walkway', '생활권 산책지점', '판교역 알파돔 주변 보행 산책 seed입니다.', '경기도 성남시 분당구 백현동', '경기도 성남시 분당구 백현동', 37.3940000, 127.1119000, array['판교역 알파돔', '판교역 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-baekhyeon-cafe-street-walk', '백현동 카페거리 산책길', 'walkway', '생활권 산책로', '백현동 카페거리 주변 생활 산책 seed입니다.', '경기도 성남시 분당구 백현동', '경기도 성남시 분당구 백현동', 37.3830000, 127.1130000, array['백현동 카페거리 산책', '백현동 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-unjungcheon-walk', '운중천 판교 산책로', 'waterside', '하천 산책로', '운중천 판교 생활권 산책 seed입니다.', '경기도 성남시 분당구 운중동', '경기도 성남시 분당구 운중동', 37.3900000, 127.0830000, array['운중천 판교', '운중천 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 85, 79, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-naksaeng-park-walk', '낙생대공원 산책로', 'park', '공원 산책로', '낙생대공원 녹지 산책 seed입니다.', '경기도 성남시 분당구 판교동', '경기도 성남시 분당구 판교동', 37.3915000, 127.0885000, array['낙생대공원', '낙생대공원 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-techno-valley-green-walk', '판교테크노밸리 녹지 산책로', 'walkway', '생활권 산책로', '판교테크노밸리 녹지 보행 산책 seed입니다.', '경기도 성남시 분당구 삼평동', '경기도 성남시 분당구 삼평동', 37.4010000, 127.1080000, array['판교테크노밸리 녹지', '판교테크노밸리 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-botdeul-park-walk', '봇들공원 산책로', 'park', '공원 산책로', '봇들공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 삼평동', '경기도 성남시 분당구 삼평동', 37.4000000, 127.1140000, array['봇들공원', '봇들공원 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 85, 79, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bundang-central-park-lake', '분당 중앙공원 호수 산책로', 'waterside', '공원 산책로', '분당 중앙공원 호수 주변 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3768000, 127.1228000, array['분당 중앙공원 호수', '중앙공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bundang-central-park-forest', '분당 중앙공원 숲길', 'forest', '숲길 산책로', '분당 중앙공원 숲길 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3782000, 127.1252000, array['분당 중앙공원 숲길', '중앙공원 숲길', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seohyeon-neighborhood-park', '서현근린공원 산책로', 'park', '근린공원 산책로', '서현근린공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 서현동', '경기도 성남시 분당구 서현동', 37.3832000, 127.1282000, array['서현근린공원', '서현 공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 85, 79, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-sunae-yangji-village-park', '수내동 양지마을공원 산책로', 'park', '근린공원 산책로', '수내동 양지마을공원 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3732000, 127.1197000, array['양지마을공원', '수내동 공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bundang-hwangsaeul-park', '황새울공원 산책로', 'park', '공원 산책로', '황새울공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 서현동', '경기도 성남시 분당구 서현동', 37.3810000, 127.1187000, array['황새울공원', '황새울공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-jeongja-cafe-street-waterside', '정자동 카페거리 수변 산책로', 'walkway', '생활권 산책로', '정자동 카페거리와 탄천 접근 생활권 산책 seed입니다.', '경기도 성남시 분당구 정자동', '경기도 성남시 분당구 정자동', 37.3635000, 127.1082000, array['정자동 카페거리 산책', '정자동 탄천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-jeongja-neuti-village-park', '느티마을공원 산책지점', 'park', '근린공원 산책지점', '느티마을 생활권 공원 산책 seed입니다.', '경기도 성남시 분당구 정자동', '경기도 성남시 분당구 정자동', 37.3650000, 127.1150000, array['느티마을공원', '정자동 공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-gumi-tancheon-walk', '구미동 탄천 산책로', 'waterside', '하천 산책로', '구미동 탄천 생활권 산책 seed입니다.', '경기도 성남시 분당구 구미동', '경기도 성남시 분당구 구미동', 37.3400000, 127.1100000, array['구미동 탄천', '구미동 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bulgoksan-tancheon-link', '불곡산 탄천 연결 산책로', 'walkway', '생활권 산책로', '불곡산과 탄천 생활권을 잇는 산책 seed입니다.', '경기도 성남시 분당구 정자동', '경기도 성남시 분당구 정자동', 37.3425000, 127.1230000, array['불곡산 탄천 연결', '불곡산 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-yuldong-park-lake-walk', '율동공원 호수 산책로', 'waterside', '호수 산책로', '율동공원 호수 주변 산책 seed입니다.', '경기도 성남시 분당구 율동', '경기도 성남시 분당구 율동', 37.3838000, 127.1517000, array['율동공원 호수', '율동공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 88, 82, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bundang-reservoir-walk', '분당저수지 산책로', 'waterside', '호수 산책로', '분당저수지 생활권 수변 산책 seed입니다.', '경기도 성남시 분당구 율동', '경기도 성남시 분당구 율동', 37.3825000, 127.1512000, array['분당저수지', '율동공원 수변 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-yuldong-book-theme-trail', '율동공원 책테마파크 산책길', 'trail', '공원 산책로', '율동공원 책테마파크 주변 산책 seed입니다.', '경기도 성남시 분당구 율동', '경기도 성남시 분당구 율동', 37.3802000, 127.1505000, array['율동공원 책테마파크', '율동공원 산책길', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 86, 80, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-taejae-neighborhood-trail', '태재고개 근린 산책길', 'trail', '생활권 산책로', '태재고개 생활권 근린 산책 seed입니다.', '경기도 성남시 분당구 분당동', '경기도 성남시 분당구 분당동', 37.3655000, 127.1450000, array['태재고개 산책', '분당동 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 82, 76, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-yatap-maengsan-ecology-walk', '야탑 맹산생태학습원 산책로', 'forest', '생태 산책로', '야탑 맹산생태학습원 생활권 산책 seed입니다.', '경기도 성남시 분당구 야탑동', '경기도 성남시 분당구 야탑동', 37.4055000, 127.1470000, array['맹산생태학습원', '야탑 생태 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-yatap-tancheon-bank-walk', '야탑동 탄천 둔치 산책로', 'waterside', '하천 산책로', '야탑동 탄천 둔치 산책 seed입니다.', '경기도 성남시 분당구 야탑동', '경기도 성남시 분당구 야탑동', 37.4120000, 127.1280000, array['야탑 탄천 둔치', '야탑동 탄천 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 85, 79, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-imae-maesong-park-walk', '이매동 매송공원 산책로', 'park', '근린공원 산책로', '이매동 매송공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 이매동', '경기도 성남시 분당구 이매동', 37.3960000, 127.1290000, array['매송공원', '이매동 공원 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seongnam-cityhall-green-walk', '성남시청 녹지 산책로', 'walkway', '생활권 산책로', '성남시청 주변 녹지 보행 산책 seed입니다.', '경기도 성남시 중원구 여수동', '경기도 성남시 중원구 여수동', 37.4203000, 127.1266000, array['성남시청 녹지', '성남시청 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-yeosu-stream-yatap-walk', '여수천 야탑 산책로', 'waterside', '하천 산책로', '여수천 야탑 생활권 산책 seed입니다.', '경기도 성남시 중원구 여수동', '경기도 성남시 중원구 여수동', 37.4150000, 127.1320000, array['여수천 야탑', '여수천 산책', '성남·분당·판교·탄천 권역', '성남 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-bundangcheon-sunae-walk', '분당천 수내 산책로', 'waterside', '하천 산책로', '분당천 수내 생활권 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3740000, 127.1190000, array['분당천 수내', '수내 분당천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-dongmakcheon-jeongja-walk', '동막천 정자 산책로', 'waterside', '하천 산책로', '동막천 정자 생활권 산책 seed입니다.', '경기도 성남시 분당구 정자동', '경기도 성남시 분당구 정자동', 37.3635000, 127.1050000, array['동막천 정자', '정자 동막천 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 83, 77, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-ssangyong-park-point', '판교 쌍용공원 산책지점', 'park', '근린공원 산책지점', '판교 쌍용공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 판교동', '경기도 성남시 분당구 판교동', 37.3975000, 127.0985000, array['판교 쌍용공원', '쌍용공원 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 82, 76, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-pangyo-nakwon-childrens-park', '낙원어린이공원 산책지점', 'park', '어린이공원 산책지점', '판교 생활권 낙원어린이공원 산책 seed입니다.', '경기도 성남시 분당구 백현동', '경기도 성남시 분당구 백현동', 37.3860000, 127.1145000, array['낙원어린이공원', '백현동 공원 산책', '성남·분당·판교·탄천 권역', '판교 산책', '수도권 1차 0615'], 82, 76, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-seohyeon-culture-park-walk', '서현문화공원 산책로', 'park', '문화공원 산책로', '서현문화공원 생활권 산책 seed입니다.', '경기도 성남시 분당구 서현동', '경기도 성남시 분당구 서현동', 37.3855000, 127.1235000, array['서현문화공원', '서현 문화공원 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 84, 78, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-migeum-tancheon-access', '미금역 탄천 접근 산책지점', 'walkway', '하천 접근 산책지점', '미금역에서 탄천으로 접근하는 생활권 산책 seed입니다.', '경기도 성남시 분당구 구미동', '경기도 성남시 분당구 구미동', 37.3502000, 127.1085000, array['미금역 탄천 접근', '미금역 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 82, 76, 'metro_bundang_pangyo_tancheon'),
    ('nuri-v1.1-metro-0615-sunae-tancheon-access', '수내역 탄천 접근 산책지점', 'walkway', '하천 접근 산책지점', '수내역에서 탄천으로 접근하는 생활권 산책 seed입니다.', '경기도 성남시 분당구 수내동', '경기도 성남시 분당구 수내동', 37.3785000, 127.1160000, array['수내역 탄천 접근', '수내역 산책', '성남·분당·판교·탄천 권역', '분당 산책', '수도권 1차 0615'], 82, 76, 'metro_bundang_pangyo_tancheon')
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
      'attribution', 'NURI operator seed · Korean display normalization · Bukseoul and metro first coverage · 2026-06-15',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-approved-seed',
        'scope', 'bukseoul_and_metro_first_seed_coverage',
        'coverageRegion', coverage_region,
        'createdFor', 'v1.1_walk_poi_korean_normalization_bukseoul_metro_seed_coverage_2026_06_15'
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
  'v1.1-walk-poi-korean-normalization-bukseoul-metro-seed-coverage-2026-06-15'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_korean_normalization_bukseoul_metro_seed_coverage_2026_06_15'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 Korean-normalized Bukseoul reinforcement and metro first seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select
  count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('북서울꿈의숲 산책', 37.6226, 127.0427, 10000, 80);
-- select count(*) from public.walk_poi_public_search_v1('성남·분당·판교·탄천 권역', 37.3820, 127.1180, 12000, 120);
-- select count(*) from public.walk_poi_public_search_v1('수도권 1차 0615', 37.3820, 127.1180, 12000, 120);

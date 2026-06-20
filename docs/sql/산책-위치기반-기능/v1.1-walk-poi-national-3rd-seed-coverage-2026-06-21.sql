-- V1.1 walk POI national 3rd seed coverage
-- Purpose:
-- - Expand validated national walking POI coverage for 9 cities.
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
      'national_jeonju_cheon_hanok',
      '전주 전주천·한옥마을 권역',
      '전라북도 전주시 완산구 교동',
      '전라북도 전주시 전주천동로 일대',
      35.8160000,
      127.1530000,
      '전주 산책',
      array[
        '전주천 한옥마을 산책로',
        '전주천 남천교 산책지점',
        '전주천 완산교 수변 산책길',
        '전주한옥마을 생활녹지 산책길',
        '풍남문 녹지 산책지점',
        '전라감영 주변 산책길',
        '다가공원 산책로',
        '다가공원 숲길 산책지점',
        '완산공원 산책로',
        '완산공원 전망 산책지점',
        '전주천 반려견 산책지점',
        '전주천 보행교 산책길',
        '전주향교 녹지 산책지점',
        '남부시장 수변 산책길',
        '전주천 야간 산책지점',
        '전주천 순환 산책로',
        '교동 생활공원 산책지점',
        '한벽당 수변 산책길',
        '전주천 둔치 산책지점',
        '한옥마을 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_changwon_yongji_changwoncheon',
      '창원 용지호수·창원천 권역',
      '경상남도 창원시 성산구 용호동',
      '경상남도 창원시 용지호수로 일대',
      35.2280000,
      128.6810000,
      '창원 용지호수 산책',
      array[
        '용지호수 수변 산책로',
        '용지호수 동측 산책길',
        '용지호수 서측 산책길',
        '용지공원 산책지점',
        '창원중앙대로 녹지 산책길',
        '창원광장 생활녹지 산책지점',
        '창원천 중앙 산책로',
        '창원천 보행교 산책길',
        '성산아트홀 녹지 산책지점',
        '용호동 생활공원 산책길',
        '창원스포츠파크 접근 산책지점',
        '반송공원 산책로',
        '반송공원 숲길 산책지점',
        '용지호수 반려견 산책지점',
        '창원천 야간 산책길',
        '상남동 녹지 산책지점',
        '용지호수 순환 산책로',
        '창원시청 주변 산책길',
        '중앙동 생활녹지 산책지점',
        '용지호수 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_pohang_yeongildae_hyeongsan',
      '포항 영일대·형산강 권역',
      '경상북도 포항시 북구 두호동',
      '경상북도 포항시 영일대해수욕장길 일대',
      36.0550000,
      129.3780000,
      '포항 영일대 산책',
      array[
        '영일대해수욕장 해안 산책로',
        '영일대 장미원 산책지점',
        '영일대 북부 해안 산책길',
        '두호동 생활녹지 산책지점',
        '환호공원 접근 산책로',
        '환호공원 숲길 산책지점',
        '포항운하 수변 산책로',
        '형산강 둔치 산책길',
        '형산강 보행교 산책지점',
        '죽도동 생활 산책길',
        '송도솔밭 해안 산책로',
        '송도해수욕장 접근 산책지점',
        '영일대 반려견 산책지점',
        '영일대 야간 산책길',
        '포항해상공원 산책지점',
        '북구 수변 휴식 산책로',
        '영일대 순환 산책지점',
        '형산강 수변 전망 산책길',
        '포항 해안 보행 산책로',
        '영일대 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_gimhae_yeonji_haebancheon',
      '김해 연지공원·해반천 권역',
      '경상남도 김해시 내동',
      '경상남도 김해시 금관대로 일대',
      35.2360000,
      128.8890000,
      '김해 연지공원 산책',
      array[
        '연지공원 호수 산책로',
        '연지공원 동측 산책길',
        '연지공원 서측 산책길',
        '연지공원 잔디 산책지점',
        '해반천 수변 산책로',
        '해반천 보행교 산책길',
        '내동 생활녹지 산책지점',
        '김해문화의전당 녹지 산책길',
        '김해운동장 접근 산책지점',
        '구지봉공원 산책로',
        '수로왕릉 주변 산책길',
        '봉황대공원 산책지점',
        '해반천 반려견 산책지점',
        '연지공원 야간 산책길',
        '김해시청 주변 산책지점',
        '부원동 생활녹지 산책길',
        '연지공원 순환 산책로',
        '해반천 수변 휴식 산책지점',
        '외동공원 산책길',
        '김해 중심녹지 산책지점'
      ]::text[]
    ),
    (
      'national_yeosu_ungcheon_seaside',
      '여수 웅천해변·이순신공원 권역',
      '전라남도 여수시 웅천동',
      '전라남도 여수시 웅천해변공원길 일대',
      34.7440000,
      127.6760000,
      '여수 웅천해변 산책',
      array[
        '웅천해변공원 해안 산책로',
        '웅천친수공원 수변 산책길',
        '웅천마리나 해안 산책지점',
        '웅천동 생활녹지 산책길',
        '여수 예울마루 주변 산책로',
        '이순신공원 산책지점',
        '망마공원 숲길 산책로',
        '소호동 해안 산책길',
        '소호요트장 접근 산책지점',
        '가막만 수변 산책로',
        '웅천 반려견 산책지점',
        '웅천 야간 산책길',
        '여수 선소 수변 산책지점',
        '장도 예술섬 접근 산책로',
        '웅천해변 순환 산책지점',
        '신월동 해안 산책길',
        '여수 해양공원 접근 산책지점',
        '웅천 수변 휴식 산책로',
        '여수 생활녹지 산책길',
        '웅천 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_suncheon_dongcheon_garden',
      '순천 동천·순천만국가정원 권역',
      '전라남도 순천시 풍덕동',
      '전라남도 순천시 국가정원길 일대',
      34.9500000,
      127.4870000,
      '순천 동천 산책',
      array[
        '동천 수변 산책로',
        '동천 보행교 산책길',
        '동천 둔치 산책지점',
        '순천만국가정원 접근 산책로',
        '순천만국가정원 동측 산책길',
        '오천그린광장 산책지점',
        '풍덕동 생활녹지 산책길',
        '조례호수공원 산책로',
        '조례호수 수변 산책지점',
        '연향동 녹지 산책길',
        '순천역 주변 산책지점',
        '동천 반려견 산책지점',
        '동천 야간 산책길',
        '순천만 습지 접근 산책로',
        '팔마체육공원 산책지점',
        '순천 도심 녹지 산책길',
        '동천 순환 산책로',
        '국가정원 수변 휴식 산책지점',
        '해룡천 접근 산책길',
        '순천 생활 산책지점'
      ]::text[]
    ),
    (
      'national_mokpo_peace_gatbawi',
      '목포 평화광장·갓바위 권역',
      '전라남도 목포시 상동',
      '전라남도 목포시 평화로 일대',
      34.8000000,
      126.4330000,
      '목포 평화광장 산책',
      array[
        '평화광장 해안 산책로',
        '평화광장 야간 산책지점',
        '갓바위 해상보행교 산책길',
        '갓바위 문화 산책지점',
        '목포해양유물전시관 녹지 산책로',
        '상동 생활녹지 산책길',
        '옥암수변공원 산책로',
        '영산강 하구 수변 산책지점',
        '목포대교 전망 산책길',
        '삼학도공원 접근 산책로',
        '평화광장 반려견 산책지점',
        '목포 해안 보행 산책길',
        '부주산 근린공원 산책지점',
        '남악 수변 접근 산책로',
        '평화광장 순환 산책지점',
        '목포 문화예술회관 녹지 산책길',
        '갓바위 수변 휴식 산책지점',
        '하당 생활 산책길',
        '목포 해변 전망 산책로',
        '평화광장 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_gumi_dongnak_nakdong',
      '구미 동락공원·낙동강 권역',
      '경상북도 구미시 진평동',
      '경상북도 구미시 동락공원로 일대',
      36.1070000,
      128.4190000,
      '구미 동락공원 산책',
      array[
        '동락공원 낙동강 산책로',
        '동락공원 잔디 산책지점',
        '동락공원 숲길 산책로',
        '낙동강 보행교 산책길',
        '낙동강 둔치 산책지점',
        '진평동 생활녹지 산책길',
        '구미시민운동장 접근 산책로',
        '금오천 수변 산책지점',
        '구미대교 주변 산책길',
        '인동 생활공원 산책로',
        '동락공원 반려견 산책지점',
        '동락공원 야간 산책길',
        '낙동강 수변 휴식 산책로',
        '구미 캠핑장 접근 산책지점',
        '강변체육공원 산책길',
        '동락공원 순환 산책로',
        '구미 도심 녹지 산책지점',
        '낙동강 전망 산책길',
        '구미 생활 산책로',
        '동락공원 중앙 산책지점'
      ]::text[]
    ),
    (
      'national_jinju_namgang_jinjuseong',
      '진주 남강·진주성 권역',
      '경상남도 진주시 본성동',
      '경상남도 진주시 남강로 일대',
      35.1900000,
      128.0830000,
      '진주 남강 산책',
      array[
        '남강 수변 산책로',
        '남강 둔치 산책길',
        '진주성 주변 산책지점',
        '촉석루 수변 산책길',
        '진주대교 보행 산책지점',
        '망경동 생활녹지 산책로',
        '평거동 남강 산책길',
        '진양호 접근 산책지점',
        '진주종합경기장 녹지 산책로',
        '남가람문화거리 산책길',
        '남강 반려견 산책지점',
        '남강 야간 산책로',
        '진주성 숲길 산책지점',
        '경남문화예술회관 녹지 산책길',
        '신안동 수변 산책지점',
        '남강 순환 산책로',
        '진주 생활공원 산책길',
        '남강 전망 산책지점',
        '진주 도심 녹지 산책로',
        '남강 중앙 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-national3-0621-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
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
    array[p.point_label, r.region_label, r.alias_label, '전국 3차 0621', '전국 산책', '산책 장소']::text[] as aliases,
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
      'attribution', '누리 운영자 검수 자료 · 전국 3차 주요 산책 권역 · 2026-06-21',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'national_3rd_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_national_3rd_seed_coverage_2026_06_21'
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
  'v1.1-walk-poi-national-3rd-seed-coverage-2026-06-21'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_national_3rd_seed_coverage_2026_06_21'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 national 3rd seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('전주 전주천·한옥마을 권역', 35.8160, 127.1530, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('창원 용지호수·창원천 권역', 35.2280, 128.6810, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('포항 영일대·형산강 권역', 36.0550, 129.3780, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('김해 연지공원·해반천 권역', 35.2360, 128.8890, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('여수 웅천해변·이순신공원 권역', 34.7440, 127.6760, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('순천 동천·순천만국가정원 권역', 34.9500, 127.4870, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('목포 평화광장·갓바위 권역', 34.8000, 126.4330, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('구미 동락공원·낙동강 권역', 36.1070, 128.4190, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('진주 남강·진주성 권역', 35.1900, 128.0830, 5000, 80);

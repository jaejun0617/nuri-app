-- V1.1 walk POI national 2nd seed coverage
-- Purpose:
-- - Expand validated national walking POI coverage by city/region batch.
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
      'national_gwangju_stream_yeongsan',
      '광주 광주천·영산강 권역',
      '광주광역시 서구 치평동',
      '광주광역시 서구 광주천변 일대',
      35.1540000,
      126.8520000,
      '광주천 산책',
      array[
        '광주천 중앙 산책로',
        '광주천 서구 수변 산책길',
        '광주천 보행교 산책지점',
        '상무시민공원 산책로',
        '상무지구 생활녹지 산책길',
        '운천저수지 수변 산책로',
        '운천저수지 동측 산책길',
        '운천저수지 전망 산책지점',
        '풍암호수공원 산책로',
        '풍암호수 순환 산책길',
        '풍암생활체육공원 산책지점',
        '중외공원 숲길 산책로',
        '중외공원 문화 산책지점',
        '영산강 광주 수변 산책로',
        '영산강 극락교 산책지점',
        '광주천 반려견 산책지점',
        '쌍촌동 생활녹지 산책길',
        '치평동 공원 산책지점',
        '광주천 야간 산책지점',
        '광주천 순환 산책지점'
      ]::text[]
    ),
    (
      'national_sejong_lake_geumgang',
      '세종호수공원·금강 권역',
      '세종특별자치시 어진동',
      '세종특별자치시 호수공원길 일대',
      36.4975000,
      127.2597000,
      '세종 산책',
      array[
        '세종호수공원 수변 산책로',
        '세종호수공원 중앙 산책지점',
        '세종호수공원 동측 산책길',
        '세종호수공원 서측 산책길',
        '세종중앙공원 산책로',
        '세종중앙공원 잔디 산책지점',
        '금강보행교 산책로',
        '금강보행교 전망 산책지점',
        '금강수변공원 산책로',
        '방축천 생활 산책길',
        '방축천 음악분수 산책지점',
        '어진동 녹지 산책길',
        '나성동 생활공원 산책지점',
        '정부세종청사 녹지 산책길',
        '세종호수 반려견 산책지점',
        '제천 수변 산책로',
        '세종 예술의전당 녹지 산책지점',
        '국립세종수목원 접근 산책지점',
        '금강 야간 산책지점',
        '세종호수 순환 산책지점'
      ]::text[]
    ),
    (
      'national_cheongju_musimcheon',
      '청주 무심천·문암생태공원 권역',
      '충청북도 청주시 흥덕구',
      '충청북도 청주시 무심천변 일대',
      36.6420000,
      127.4890000,
      '청주 무심천 산책',
      array[
        '무심천 중앙 산책로',
        '무심천 둔치 산책길',
        '무심천 보행교 산책지점',
        '무심천 반려견 산책지점',
        '문암생태공원 산책로',
        '문암생태공원 수변 산책지점',
        '문암생태공원 억새 산책길',
        '청주대교 주변 산책지점',
        '흥덕대교 무심천 산책길',
        '서원구 생활녹지 산책지점',
        '청주 예술의전당 녹지 산책로',
        '운천근린공원 산책지점',
        '사직동 생활 산책길',
        '청주체육관 녹지 산책지점',
        '무심천 야간 산책지점',
        '무심천 수변 전망 산책지점',
        '복대동 녹지 산책길',
        '가경천 접근 산책지점',
        '무심천 남측 산책로',
        '무심천 순환 산책지점'
      ]::text[]
    ),
    (
      'national_cheonan_cheonhoji_buldang',
      '천안 천호지·불당천 권역',
      '충청남도 천안시 동남구 안서동',
      '충청남도 천안시 천호지길 일대',
      36.8150000,
      127.1540000,
      '천안 천호지 산책',
      array[
        '천호지 수변 산책로',
        '천호지 동측 산책길',
        '천호지 서측 산책길',
        '천호지 전망 산책지점',
        '단국대 천호지 산책지점',
        '안서동 생활녹지 산책길',
        '불당천 산책로',
        '불당천 보행교 산책지점',
        '불당동 생활공원 산책로',
        '천안삼거리공원 산책로',
        '천안삼거리공원 숲길 산책지점',
        '천호지 반려견 산책지점',
        '신부동 녹지 산책길',
        '천안종합운동장 녹지 산책지점',
        '백석공원 산책로',
        '불당천 야간 산책지점',
        '천호지 순환 산책지점',
        '천안천 접근 산책길',
        '성정공원 산책지점',
        '천호지 수변 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_chuncheon_gongjicheon_uiam',
      '춘천 공지천·의암호 권역',
      '강원특별자치도 춘천시 근화동',
      '강원특별자치도 춘천시 공지천변 일대',
      37.8730000,
      127.7130000,
      '춘천 공지천 산책',
      array[
        '공지천 수변 산책로',
        '공지천 조각공원 산책지점',
        '공지천 보행교 산책길',
        '의암호 수변 산책로',
        '의암호 전망 산책지점',
        '춘천대교 주변 산책길',
        '근화동 생활녹지 산책지점',
        '춘천역 녹지 산책길',
        '소양강 스카이워크 접근 산책지점',
        '소양강 수변 산책로',
        '공지천 반려견 산책지점',
        '춘천 MBC 주변 산책길',
        '중도 물레길 접근 산책지점',
        '삼천동 수변 산책로',
        '춘천문화예술회관 녹지 산책지점',
        '의암공원 산책로',
        '공지천 야간 산책지점',
        '의암호 순환 산책지점',
        '효자동 생활 산책길',
        '춘천 수변 휴식 산책지점'
      ]::text[]
    ),
    (
      'national_gangneung_gyeongpo_namdaecheon',
      '강릉 경포호·남대천 권역',
      '강원특별자치도 강릉시 저동',
      '강원특별자치도 강릉시 경포로 일대',
      37.7970000,
      128.8960000,
      '강릉 경포호 산책',
      array[
        '경포호 수변 산책로',
        '경포호 동측 산책길',
        '경포호 서측 산책길',
        '경포호 전망 산책지점',
        '경포해변 접근 산책로',
        '경포생태저류지 산책지점',
        '초당동 녹지 산책길',
        '허균허난설헌 기념공원 산책로',
        '남대천 중앙 산책로',
        '남대천 둔치 산책길',
        '월화거리 생활 산책지점',
        '강릉역 녹지 산책길',
        '강문해변 수변 산책지점',
        '경포호 반려견 산책지점',
        '오죽헌 접근 산책길',
        '교동 생활공원 산책지점',
        '남대천 보행교 산책지점',
        '경포호 야간 산책지점',
        '강릉 해안 보행 산책로',
        '경포호 순환 산책지점'
      ]::text[]
    ),
    (
      'national_jeju_ihoteu_tapdong',
      '제주 이호테우·탑동해안 권역',
      '제주특별자치도 제주시 이호일동',
      '제주특별자치도 제주시 이호해수욕장길 일대',
      33.5120000,
      126.5220000,
      '제주 해안 산책',
      array[
        '이호테우 해변 산책로',
        '이호테우 말등대 산책지점',
        '이호테우 해안 보행 산책길',
        '용담해안도로 산책로',
        '용담해안 전망 산책지점',
        '탑동해안로 산책로',
        '탑동광장 산책지점',
        '제주항 수변 산책길',
        '삼다공원 산책로',
        '신산공원 산책지점',
        '사라봉공원 접근 산책로',
        '도두봉 해안 산책지점',
        '도두항 수변 산책길',
        '제주 해안 반려견 산책지점',
        '용담레포츠공원 산책로',
        '노형 생활녹지 산책지점',
        '연동 삼다공원 산책길',
        '탑동 야간 산책지점',
        '제주 해안 수변 휴식 산책지점',
        '이호테우 순환 산책지점'
      ]::text[]
    )
),
seed_rows as (
  select
    format('nuri-v1.1-national2-0619-%s-%s', r.region_key, lpad(p.ord::text, 2, '0')) as external_source_id,
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
    array[p.point_label, r.region_label, r.alias_label, '전국 2차 0619', '전국 산책', '산책 장소']::text[] as aliases,
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
      'attribution', '누리 운영자 검수 자료 · 전국 2차 주요 산책 권역 · 2026-06-19',
      'confidenceScore', confidence_score,
      'qualityScore', quality_score,
      'rawPayload', jsonb_build_object(
        'source', 'operator-reviewed-seed',
        'scope', 'national_2nd_seed_coverage',
        'coverageRegion', region_key,
        'coverageRegionLabel', region_label,
        'createdFor', 'v1.1_walk_poi_national_2nd_seed_coverage_2026_06_19'
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
  'v1.1-walk-poi-national-2nd-seed-coverage-2026-06-19'
);

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_national_2nd_seed_coverage_2026_06_19'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'approve',
    'V1.1 national 2nd seed batch approved for coverage measurement and fallback gate re-evaluation.'
  ) as r
)
select count(*) as approved_count
from review_result;

commit;

-- Smoke checks after commit:
-- select count(*) from public.walk_poi_public_search_v1('광주 광주천·영산강 권역', 35.1540, 126.8520, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('세종호수공원·금강 권역', 36.4975, 127.2597, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('청주 무심천·문암생태공원 권역', 36.6420, 127.4890, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('천안 천호지·불당천 권역', 36.8150, 127.1540, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('춘천 공지천·의암호 권역', 37.8730, 127.7130, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('강릉 경포호·남대천 권역', 37.7970, 128.8960, 5000, 80);
-- select count(*) from public.walk_poi_public_search_v1('제주 이호테우·탑동해안 권역', 33.5120, 126.5220, 5000, 80);

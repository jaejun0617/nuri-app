-- V1.1 walk POI Korean alias normalization + Bukseoul/metro first seed rollback
-- Purpose:
-- - Remove the 2026-06-15 Bukseoul/metro first seed batch from public projection
--   by moving rows to held/hidden through the admin review RPC.
-- - Keep destructive deletes out of normal operations.
-- - Korean alias rollback is exact-match only and should be used only if a bad
--   alias causes a verified search/display regression.

begin;

set local request.jwt.claim.role = 'service_role';

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_korean_normalization_bukseoul_metro_seed_coverage_2026_06_15'
),
held_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'held',
    'Rollback: hold V1.1 Korean-normalized Bukseoul/metro seed batch from public projection.'
  ) as r
)
select count(*) as held_count
from held_result;

-- Optional exact alias rollback. Execute only if Korean alias normalization is
-- proven to create a bad search/display regression; otherwise keep aliases for
-- Korean search quality. Existing English aliases are not touched.
--
-- with alias_rules (created_for, coverage_region, aliases) as (
--   values
--     ('v1.1_walk_poi_goyang_seed_coverage_2026_06_06', null, array['고양시 산책', '고양시 공원', '고양 산책 0606']),
--     ('v1.1_walk_poi_seoul_seed_coverage_2026_06_06', null, array['서울 산책', '서울 공원', '서울 산책 0606']),
--     ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_worldcup_nanji_mangwon', array['서울 월드컵공원·난지·망원 권역', '월드컵공원·난지·망원 산책', '서울 산책 0615']),
--     ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_banpo_jamwon_ichon', array['서울 반포·잠원·이촌 권역', '반포·잠원·이촌 한강 산책', '서울 산책 0615']),
--     ('v1.1_walk_poi_seoul_2nd_seed_coverage_2026_06_15', 'seoul_ttukseom_seoulforest', array['서울 뚝섬·서울숲 권역', '뚝섬·서울숲 산책', '서울 산책 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_songpa_olympic_lake', array['서울 송파·올림픽공원·석촌호수 권역', '송파·올림픽공원·석촌호수 산책', '서울 보류권역 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_yangjae_tancheon', array['서울 양재천·탄천 권역', '양재천·탄천 산책', '서울 보류권역 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_jungnangcheon', array['서울 중랑천 권역', '중랑천 산책', '서울 보류권역 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_anyangcheon', array['서울 안양천 권역', '안양천 산책', '서울 보류권역 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_dreamforest', array['서울 북서울꿈의숲 권역', '북서울꿈의숲 산책', '서울 보류권역 0615']),
--     ('v1.1_walk_poi_seoul_held_region_reinforcement_2026_06_15', 'seoul_boramae_dorimcheon', array['서울 보라매·도림천 권역', '보라매·도림천 산책', '서울 보류권역 0615'])
-- ),
-- alias_targets as (
--   select distinct
--     s.walk_poi_id,
--     alias_value
--   from public.walk_poi_source_records s
--   join public.walk_pois p on p.id = s.walk_poi_id
--   join alias_rules r
--     on r.created_for = s.raw_payload ->> 'createdFor'
--    and (
--      r.coverage_region is null
--      or r.coverage_region = s.raw_payload ->> 'coverageRegion'
--    )
--   cross join lateral unnest(r.aliases) as alias_value
--   where p.review_status = 'approved'
--      or p.review_status = 'held'
-- )
-- delete from public.walk_poi_search_aliases a
-- using alias_targets t
-- where a.walk_poi_id = t.walk_poi_id
--   and a.normalized_alias = public.walk_poi_admin_normalize_text_v1(t.alias_value);

commit;

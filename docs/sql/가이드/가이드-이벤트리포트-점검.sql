-- 집사 꿀팁 가이드 이벤트 리포트/운영 점검용 SQL
-- 목적:
-- 1. 홈 노출/클릭/상세 조회 기본 퍼널 확인
-- 2. 추천 전략별 반응 비교
-- 3. 종/세부 종/시즌별 소비 경향 확인
-- 주의:
-- - 운영 입력 수단이 아니라 점검/분석용 보조 SQL이다.
-- - 기간은 필요에 따라 where occurred_at 조건을 조정한다.

-- 1) 최근 14일 이벤트 기본 현황
select
  event_type,
  placement,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '14 days'
group by 1, 2
order by 1, 2;

-- 2) 최근 14일 가이드별 홈 노출 -> 클릭 -> 상세 조회
with base as (
  select
    guide_id,
    event_type,
    count(*) as event_count
  from pet_care_guide_events
  where occurred_at >= now() - interval '14 days'
  group by 1, 2
)
select
  g.id,
  g.title,
  coalesce(max(case when b.event_type = 'home_impression' then b.event_count end), 0) as home_impressions,
  coalesce(max(case when b.event_type = 'list_click' then b.event_count end), 0) as clicks,
  coalesce(max(case when b.event_type = 'detail_view' then b.event_count end), 0) as detail_views
from pet_care_guides g
left join base b on b.guide_id = g.id
where g.deleted_at is null
group by g.id, g.title
order by home_impressions desc, clicks desc, detail_views desc, g.title asc;

-- 3) strategy version / source별 반응 비교
select
  metadata ->> 'strategyVersion' as strategy_version,
  metadata ->> 'source' as source,
  event_type,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '30 days'
group by 1, 2, 3
order by 1 nulls last, 2 nulls last, 3;

-- 4) pet 대표 종 기준 클릭/상세 분포
select
  metadata ->> 'petRepresentativeLabel' as pet_representative_label,
  event_type,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '30 days'
  and event_type in ('list_click', 'detail_view')
group by 1, 2
order by event_count desc, pet_representative_label asc nulls last;

-- 5) 시즌 버킷 기준 반응 분포
select
  metadata ->> 'seasonBucket' as season_bucket,
  metadata ->> 'guideCategory' as guide_category,
  event_type,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '30 days'
group by 1, 2, 3
order by season_bucket asc nulls last, guide_category asc nulls last, event_type asc;

-- 6) 검색 source / 검색어 길이 기준 반응
select
  metadata ->> 'searchSource' as search_source,
  metadata ->> 'source' as source,
  avg(nullif((metadata ->> 'queryLength')::int, 0)) as avg_query_length,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '30 days'
  and event_type = 'list_click'
group by 1, 2
order by event_count desc, search_source asc nulls last;

-- 7) memorial 펫에서 일반 추천이 들어오지 않는지 점검
select
  event_type,
  placement,
  count(*) as event_count
from pet_care_guide_events
where occurred_at >= now() - interval '30 days'
  and coalesce((metadata ->> 'isMemorialPet')::boolean, false) = true
group by 1, 2
order by 1, 2;

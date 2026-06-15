-- V1.1 walk POI Seoul second seed coverage rollback
-- Purpose:
-- - Remove the 2026-06-15 Seoul second seed batch from public projection
--   without destructive deletes.
-- - Keep source/review/audit provenance intact for operations review.
-- Usage condition:
-- - Run from a service/admin SQL context.

begin;

set local request.jwt.claim.role = 'service_role';

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
    'held',
    'Rollback: hold V1.1 Seoul second walking-region coverage batch from public projection.'
  ) as r
)
select
  count(*) as held_count
from review_result;

commit;

-- Post-check:
-- select count(*) from public.walk_poi_public_search_v1('seoul0615', 37.5647, 126.8872, 30000, 150);

-- V1.1 walk POI metro residual seed rollback
-- Purpose:
-- - Remove the 2026-06-19 metro residual seed batch from public projection
--   without deleting source/review/audit history.
-- - Use admin review held action rather than destructive delete.
-- Usage condition:
-- - Run from a service/admin SQL context only when this batch needs to be
--   hidden from the public app because of source, coordinate, UX, or coverage
--   quality issues.

begin;

set local request.jwt.claim.role = 'service_role';

with target_sources as (
  select distinct s.walk_poi_id
  from public.walk_poi_source_records s
  join public.walk_pois p on p.id = s.walk_poi_id
  where s.source_provider = 'operator-seed'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_metro_residual_seed_coverage_2026_06_19'
    and p.review_status = 'approved'
    and p.visibility_status = 'public'
    and p.lifecycle_status = 'active'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'held',
    'Rollback: hide V1.1 metro residual seed batch from public projection while preserving audit/source history.'
  ) as r
)
select count(*) as held_count
from review_result;

commit;

-- Post-rollback check:
-- select count(*)
-- from public.walk_poi_source_records s
-- join public.walk_pois p on p.id = s.walk_poi_id
-- where s.source_provider = 'operator-seed'
--   and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_metro_residual_seed_coverage_2026_06_19'
--   and p.review_status = 'approved'
--   and p.visibility_status = 'public'
--   and p.lifecycle_status = 'active';

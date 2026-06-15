-- Rollback/safety script for V1.1 Seoul held-region reinforcement seed.
-- This intentionally does not delete rows. It reviews the target seed rows as
-- held, which removes them from public projection while preserving source,
-- review, and audit history.

begin;

set local request.jwt.claim.role = 'service_role';

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
    'held',
    'Rollback: hold V1.1 Seoul held-region reinforcement seed from public projection without deleting provenance.'
  ) as r
)
select
  count(*) as held_count
from review_result;

commit;

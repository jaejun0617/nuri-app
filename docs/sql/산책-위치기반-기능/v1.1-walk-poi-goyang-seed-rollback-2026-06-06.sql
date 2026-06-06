-- V1.1 walk POI Goyang seed coverage rollback
-- Purpose:
-- - Remove the 2026-06-06 Goyang coverage batch from public projection while
--   preserving source/review/audit provenance.
-- - This is not a destructive delete script.
-- Usage condition:
-- - Run from a service/admin SQL context.
-- - Use when the expanded seed batch has provenance, duplicate, projection, or UX issues.

begin;

set local request.jwt.claim.role = 'service_role';

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'osm'
    and s.external_source_id like 'osm:%'
    and s.raw_payload ->> 'createdFor' = 'v1.1_walk_poi_goyang_seed_coverage_2026_06_06'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'held',
    'Rollback V1.1 Goyang seed coverage expansion from public projection; keep provenance and audit trail.'
  ) as r
)
select
  count(*) as held_count
from review_result;

commit;

-- Smoke check after rollback:
-- select count(*) from public.walk_poi_public_search_v1('goyang0606', 37.676492, 126.767888, 15000, 120);

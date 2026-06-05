-- V1.1 walk POI Ilsan/Juyeop seed coverage rollback
-- Purpose:
-- - Preserve source/review/audit provenance while removing the 2026-06-05
--   Ilsan/Juyeop seed coverage batch from public projection.
-- - This is not a destructive delete script.
-- Usage condition:
-- - Run from an admin/super_admin authenticated SQL/API context.
-- - Use when the expanded seed batch has provenance, duplicate, projection, or UX issues.

begin;

with target_sources as (
  select s.walk_poi_id
  from public.walk_poi_source_records s
  where s.source_provider = 'operator-seed'
    and s.external_source_id like 'nuri-v1.1-ilsan-0605-%'
),
review_result as (
  select r.*
  from target_sources t
  cross join lateral public.walk_poi_admin_review_v1(
    t.walk_poi_id,
    'held',
    'Rollback V1.1 Ilsan/Juyeop seed coverage expansion from public projection; keep provenance and audit trail.'
  ) as r
)
select
  count(*) as held_count
from review_result;

commit;

-- Smoke check after rollback:
-- select count(*) from public.walk_poi_public_search_v1('ilsan0605', 37.676492, 126.767888, 7000, 50);

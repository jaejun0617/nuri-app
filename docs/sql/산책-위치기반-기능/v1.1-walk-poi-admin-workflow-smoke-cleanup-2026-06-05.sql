-- V1.1 walk POI admin workflow smoke cleanup
-- Purpose:
-- - Keep audit/source provenance while removing admin smoke rows from public projection.
-- - This file is not a destructive delete script.
-- Usage condition:
-- - Run only when rows with external_source_id prefix `nuri-v1.1-admin-smoke-`
--   must be forced back to non-public held state after QA.

begin;

with smoke_sources as (
  select
    s.id as source_record_id,
    s.walk_poi_id
  from public.walk_poi_source_records s
  where s.external_source_id like 'nuri-v1.1-admin-smoke-%'
)
update public.walk_pois p
set
  review_status = 'held',
  visibility_status = 'hidden',
  lifecycle_status = 'active',
  updated_at = timezone('utc', now())
from smoke_sources s
where p.id = s.walk_poi_id;

update public.walk_poi_source_records s
set
  candidate_status = 'held',
  updated_at = timezone('utc', now())
where s.external_source_id like 'nuri-v1.1-admin-smoke-%';

commit;

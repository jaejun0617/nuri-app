begin;

set local search_path = public, extensions;

-- V1.1 walk POI admin read-only summary:
-- - Provides operational batch/review/audit/coverage status without exposing
--   source raw payload, provider tokens, or public projection internals.
-- - Write actions remain in walk_poi_admin_import_commit_v1 and
--   walk_poi_admin_review_v1.

create or replace function public.walk_poi_admin_read_summary_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_region_center geography :=
    st_setsrid(st_makepoint(126.767888, 37.676492), 4326)::geography;
  v_summary jsonb;
begin
  if not public.is_walk_poi_admin() then
    raise exception 'WALK_POI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generatedAt', timezone('utc', now()),
    'coverageRegion', jsonb_build_object(
      'id', 'ilsan_juyeop_lakepark',
      'label', '일산/주엽/호수공원 생활권',
      'center', jsonb_build_object(
        'latitude', 37.676492,
        'longitude', 126.767888
      ),
      'radiusMeters', 5000
    ),
    'coverageSummary', jsonb_build_object(
      'approvedTotalCount', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
      ),
      'approvedWithin3Km', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
          and st_dwithin(w.location, v_region_center, 3000)
      ),
      'approvedWithin5Km', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
          and st_dwithin(w.location, v_region_center, 5000)
      ),
      'gateReady', (
        select count(*) >= 20
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
          and st_dwithin(w.location, v_region_center, 5000)
      ),
      'nextBatchRegion', '고양시 전체',
      'thresholds', jsonb_build_object(
        'approvedWithin3Km', 10,
        'approvedWithin5Km', 20,
        'searchHitRatePercent', 70,
        'nearbyEmptyRateMaxPercent', 20,
        'fallbackRateMaxPercent', 30,
        'rpcErrorRateMaxPercent', 1,
        'publicLeakCount', 0
      )
    ),
    'canonicalStatusCounts', jsonb_build_object(
      'pending', (
        select count(*)::integer from public.walk_pois where review_status = 'pending'
      ),
      'approved', (
        select count(*)::integer from public.walk_pois where review_status = 'approved'
      ),
      'rejected', (
        select count(*)::integer from public.walk_pois where review_status = 'rejected'
      ),
      'held', (
        select count(*)::integer from public.walk_pois where review_status = 'held'
      )
    ),
    'publicProjectionCounts', jsonb_build_object(
      'publicActiveApproved', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
      ),
      'hiddenPending', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'pending'
          and w.visibility_status = 'hidden'
      ),
      'hiddenRejected', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'rejected'
          and w.visibility_status = 'hidden'
      ),
      'hiddenHeld', (
        select count(*)::integer
        from public.walk_pois w
        where w.review_status = 'held'
          and w.visibility_status = 'hidden'
      )
    ),
    'sourceProviderCounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sourceProvider', counts.source_provider,
          'approvedCount', counts.approved_count
        )
        order by counts.approved_count desc, counts.source_provider asc
      )
      from (
        select
          w.primary_source_provider as source_provider,
          count(*)::integer as approved_count
        from public.walk_pois w
        where w.review_status = 'approved'
          and w.visibility_status = 'public'
          and w.lifecycle_status = 'active'
        group by w.primary_source_provider
      ) counts
    ), '[]'::jsonb),
    'recentImportBatches', coalesce((
      select jsonb_agg(batch.payload order by batch.created_at desc)
      from (
        select
          b.created_at,
          jsonb_build_object(
            'id', b.id,
            'sourceProvider', b.source_provider,
            'importMode', b.import_mode,
            'importStatus', b.import_status,
            'sourceName', b.source_name,
            'summary', b.summary,
            'createdAt', b.created_at,
            'finishedAt', b.finished_at
          ) as payload
        from public.walk_poi_import_batches b
        order by b.created_at desc
        limit 8
      ) batch
    ), '[]'::jsonb),
    'recentReviewQueue', coalesce((
      select jsonb_agg(review.payload order by review.sort_at desc)
      from (
        select
          coalesce(latest_review.reviewed_at, w.updated_at, w.created_at) as sort_at,
          jsonb_build_object(
            'walkPoiId', w.id,
            'name', w.canonical_name,
            'categoryLabel', w.category_label,
            'address', coalesce(w.road_address, w.primary_address),
            'reviewStatus', w.review_status,
            'visibilityStatus', w.visibility_status,
            'lifecycleStatus', w.lifecycle_status,
            'sourceProvider', w.primary_source_provider,
            'externalSourceId', s.external_source_id,
            'createdAt', w.created_at,
            'reviewedAt', latest_review.reviewed_at,
            'reviewNote', latest_review.note
          ) as payload
        from public.walk_pois w
        left join public.walk_poi_source_records s
          on s.id = w.primary_source_record_id
        left join lateral (
          select r.reviewed_at, r.note
          from public.walk_poi_reviews r
          where r.walk_poi_id = w.id
          order by r.created_at desc
          limit 1
        ) latest_review on true
        order by
          case w.review_status
            when 'pending' then 0
            when 'held' then 1
            when 'rejected' then 2
            else 3
          end,
          coalesce(latest_review.reviewed_at, w.updated_at, w.created_at) desc
        limit 16
      ) review
    ), '[]'::jsonb),
    'recentAuditLogs', coalesce((
      select jsonb_agg(audit.payload order by audit.created_at desc)
      from (
        select
          l.created_at,
          jsonb_build_object(
            'id', l.id,
            'walkPoiId', l.walk_poi_id,
            'name', w.canonical_name,
            'actionType', l.action_type,
            'note', l.note,
            'createdAt', l.created_at
          ) as payload
        from public.walk_poi_audit_logs l
        left join public.walk_pois w on w.id = l.walk_poi_id
        order by l.created_at desc
        limit 16
      ) audit
    ), '[]'::jsonb),
    'fallbackGate', jsonb_build_object(
      'enabled', true,
      'limitedRegionId', 'ilsan_juyeop_lakepark',
      'limitedRegionLabel', '일산/주엽/호수공원 생활권',
      'blockedReason', 'poi_empty_in_coverage_region',
      'allowedReasons', jsonb_build_array(
        'poi_disabled',
        'coordinate_missing',
        'poi_rpc_error',
        'detail_not_found',
        'outside_coverage_region'
      ),
      'kakaoLocalRuntimeDeleted', false,
      'nextCoverageRegion', '고양시 전체'
    )
  )
  into v_summary;

  return v_summary;
end;
$$;

comment on function public.walk_poi_admin_read_summary_v1()
  is 'Admin-only read summary for V1.1 walk POI import/review/audit/coverage state. Does not expose source raw payloads.';

revoke all on function public.walk_poi_admin_read_summary_v1() from public;
grant execute on function public.walk_poi_admin_read_summary_v1()
  to authenticated, service_role;

commit;

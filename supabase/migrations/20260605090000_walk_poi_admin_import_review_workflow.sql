begin;

set local search_path = public, extensions;

-- V1.1 walk POI admin workflow:
-- - commit imports reviewed candidates into hidden/pending canonical rows.
-- - review promotes only approved/public/active rows into the public RPC projection.
-- - pending/rejected/held rows remain hidden from public runtime read paths.

alter table public.walk_poi_reviews
  drop constraint if exists walk_poi_reviews_status_check;

alter table public.walk_poi_reviews
  add constraint walk_poi_reviews_status_check
    check (review_status in ('pending', 'approved', 'rejected', 'held'));

create index if not exists idx_walk_poi_reviews_status_reviewed_at
  on public.walk_poi_reviews (review_status, reviewed_at desc);

create or replace function public.walk_poi_admin_normalize_text_v1(
  p_value text
)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g')), '');
$$;

comment on function public.walk_poi_admin_normalize_text_v1(text)
  is 'Normalizes admin import text for walk POI conflict and alias handling.';

create or replace function public.walk_poi_admin_import_commit_v1(
  p_source_provider text,
  p_payload jsonb,
  p_note text default null
)
returns table (
  import_batch_id uuid,
  created_count integer,
  duplicate_count integer,
  conflict_count integer,
  skipped_count integer,
  review_count integer,
  message text
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_payload_array jsonb;
  v_item jsonb;
  v_batch_id uuid;
  v_poi_id uuid;
  v_source_record_id uuid;
  v_external_source_id text;
  v_name text;
  v_normalized_name text;
  v_category text;
  v_category_label text;
  v_description text;
  v_address text;
  v_road_address text;
  v_lot_address text;
  v_latitude numeric(10, 7);
  v_longitude numeric(10, 7);
  v_source_updated_at timestamptz;
  v_attribution text;
  v_confidence_score numeric(5, 2);
  v_quality_score numeric(5, 2);
  v_raw_payload jsonb;
  v_aliases jsonb;
  v_alias text;
  v_conflicts jsonb;
  v_created_count integer := 0;
  v_duplicate_count integer := 0;
  v_conflict_count integer := 0;
  v_skipped_count integer := 0;
  v_review_count integer := 0;
begin
  if not public.is_walk_poi_admin() then
    raise exception 'WALK_POI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if p_source_provider not in (
    'public-data',
    'osm',
    'operator-seed',
    'kakao-local-admin',
    'manual'
  ) then
    raise exception 'WALK_POI_SOURCE_PROVIDER_INVALID'
      using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) not in ('array', 'object') then
    raise exception 'WALK_POI_IMPORT_PAYLOAD_INVALID'
      using errcode = '22023';
  end if;

  v_payload_array := case jsonb_typeof(p_payload)
    when 'array' then p_payload
    else jsonb_build_array(p_payload)
  end;

  if jsonb_array_length(v_payload_array) = 0 then
    raise exception 'WALK_POI_IMPORT_PAYLOAD_INVALID'
      using errcode = '22023';
  end if;

  insert into public.walk_poi_import_batches (
    source_provider,
    import_mode,
    import_status,
    source_name,
    summary,
    created_by,
    started_at
  )
  values (
    p_source_provider,
    'commit',
    'running',
    coalesce(nullif(btrim(p_note), ''), 'V1.1 walk POI admin import commit'),
    jsonb_build_object(
      'requestedCount',
      jsonb_array_length(v_payload_array),
      'sourceProvider',
      p_source_provider
    ),
    v_actor_id,
    timezone('utc', now())
  )
  returning id into v_batch_id;

  for v_item in
    select value
    from jsonb_array_elements(v_payload_array)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    v_external_source_id := nullif(btrim(coalesce(
      v_item ->> 'externalSourceId',
      v_item ->> 'external_source_id'
    )), '');
    v_name := nullif(btrim(coalesce(
      v_item ->> 'name',
      v_item ->> 'canonicalName',
      v_item ->> 'canonical_name'
    )), '');
    v_category := coalesce(nullif(btrim(coalesce(v_item ->> 'category', '')), ''), 'other');
    v_category_label := coalesce(nullif(btrim(coalesce(
      v_item ->> 'categoryLabel',
      v_item ->> 'category_label'
    )), ''), '산책 장소');
    v_description := nullif(btrim(coalesce(v_item ->> 'description', '')), '');
    v_address := nullif(btrim(coalesce(
      v_item ->> 'address',
      v_item ->> 'primaryAddress',
      v_item ->> 'primary_address'
    )), '');
    v_road_address := nullif(btrim(coalesce(
      v_item ->> 'roadAddress',
      v_item ->> 'road_address'
    )), '');
    v_lot_address := nullif(btrim(coalesce(
      v_item ->> 'lotAddress',
      v_item ->> 'lot_address'
    )), '');
    v_latitude := nullif(coalesce(v_item ->> 'latitude', v_item ->> 'lat', ''), '')::numeric;
    v_longitude := nullif(coalesce(v_item ->> 'longitude', v_item ->> 'lng', ''), '')::numeric;
    v_source_updated_at := nullif(coalesce(
      v_item ->> 'sourceUpdatedAt',
      v_item ->> 'source_updated_at',
      ''
    ), '')::timestamptz;
    v_attribution := coalesce(nullif(btrim(coalesce(v_item ->> 'attribution', '')), ''), p_source_provider);
    v_confidence_score := least(
      100,
      greatest(
        0,
        coalesce(nullif(coalesce(
          v_item ->> 'confidenceScore',
          v_item ->> 'confidence_score',
          ''
        ), '')::numeric, 0)
      )
    );
    v_quality_score := least(
      100,
      greatest(
        0,
        coalesce(nullif(coalesce(
          v_item ->> 'qualityScore',
          v_item ->> 'quality_score',
          ''
        ), '')::numeric, v_confidence_score)
      )
    );
    v_raw_payload := coalesce(v_item -> 'rawPayload', v_item -> 'raw_payload', v_item);
    v_aliases := case
      when jsonb_typeof(v_item -> 'aliases') = 'array' then v_item -> 'aliases'
      else '[]'::jsonb
    end;

    if v_name is null
      or v_latitude is null
      or v_longitude is null
      or v_latitude < -90
      or v_latitude > 90
      or v_longitude < -180
      or v_longitude > 180 then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    if v_category not in (
      'park',
      'trail',
      'walkway',
      'waterside',
      'forest',
      'pet-friendly-area',
      'other'
    ) then
      v_category := 'other';
    end if;

    v_normalized_name := public.walk_poi_admin_normalize_text_v1(v_name);

    if v_external_source_id is not null and exists (
      select 1
      from public.walk_poi_source_records s
      where s.source_provider = p_source_provider
        and s.external_source_id = v_external_source_id
    ) then
      v_duplicate_count := v_duplicate_count + 1;
      continue;
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          w.id,
          'name',
          w.canonical_name,
          'reviewStatus',
          w.review_status,
          'visibilityStatus',
          w.visibility_status,
          'distanceMeters',
          round(
            st_distance(
              w.location,
              st_setsrid(
                st_makepoint(v_longitude::double precision, v_latitude::double precision),
                4326
              )::geography
            )
          )::integer
        )
        order by st_distance(
          w.location,
          st_setsrid(
            st_makepoint(v_longitude::double precision, v_latitude::double precision),
            4326
          )::geography
        )
      ),
      '[]'::jsonb
    )
    into v_conflicts
    from public.walk_pois w
    where w.lifecycle_status <> 'archived'
      and (
        public.walk_poi_admin_normalize_text_v1(w.canonical_name) = v_normalized_name
        or (
          st_dwithin(
            w.location,
            st_setsrid(
              st_makepoint(v_longitude::double precision, v_latitude::double precision),
              4326
            )::geography,
            75
          )
          and (
            public.walk_poi_admin_normalize_text_v1(w.canonical_name) = v_normalized_name
            or coalesce(w.primary_address, '') = coalesce(v_address, '')
            or coalesce(w.road_address, '') = coalesce(v_road_address, '')
          )
        )
      );

    if jsonb_array_length(v_conflicts) > 0 then
      v_conflict_count := v_conflict_count + 1;
    end if;

    insert into public.walk_pois (
      canonical_name,
      normalized_name,
      category,
      category_label,
      description,
      primary_address,
      road_address,
      lot_address,
      latitude,
      longitude,
      lifecycle_status,
      visibility_status,
      review_status,
      quality_score,
      source_attribution,
      primary_source_provider,
      source_updated_at,
      metadata,
      created_by,
      updated_by
    )
    values (
      v_name,
      v_normalized_name,
      v_category,
      v_category_label,
      v_description,
      v_address,
      v_road_address,
      v_lot_address,
      v_latitude,
      v_longitude,
      'active',
      'hidden',
      'pending',
      v_quality_score,
      v_attribution,
      p_source_provider,
      v_source_updated_at,
      jsonb_build_object(
        'importBatchId',
        v_batch_id,
        'externalSourceId',
        v_external_source_id,
        'conflictCandidates',
        v_conflicts,
        'adminImportVersion',
        1
      ),
      v_actor_id,
      v_actor_id
    )
    returning id into v_poi_id;

    insert into public.walk_poi_source_records (
      import_batch_id,
      walk_poi_id,
      source_provider,
      external_source_id,
      source_name,
      source_category,
      source_address,
      source_road_address,
      latitude,
      longitude,
      source_updated_at,
      candidate_status,
      confidence_score,
      payload_hash,
      raw_payload
    )
    values (
      v_batch_id,
      v_poi_id,
      p_source_provider,
      v_external_source_id,
      v_name,
      v_category,
      v_address,
      v_road_address,
      v_latitude,
      v_longitude,
      v_source_updated_at,
      'pending',
      v_confidence_score,
      md5(v_item::text),
      case
        when jsonb_typeof(v_raw_payload) = 'object' then v_raw_payload
        else jsonb_build_object('value', v_raw_payload)
      end
    )
    returning id into v_source_record_id;

    update public.walk_pois
    set primary_source_record_id = v_source_record_id
    where id = v_poi_id;

    insert into public.walk_poi_reviews (
      walk_poi_id,
      source_record_id,
      review_status,
      reviewed_by,
      note,
      diff
    )
    values (
      v_poi_id,
      v_source_record_id,
      'pending',
      v_actor_id,
      nullif(btrim(coalesce(p_note, '')), ''),
      jsonb_build_object(
        'action',
        'import_commit_pending',
        'sourceProvider',
        p_source_provider,
        'externalSourceId',
        v_external_source_id,
        'conflictCandidates',
        v_conflicts
      )
    );

    insert into public.walk_poi_audit_logs (
      walk_poi_id,
      source_record_id,
      actor_id,
      action_type,
      before_state,
      after_state,
      note
    )
    values (
      v_poi_id,
      v_source_record_id,
      v_actor_id,
      'import_committed',
      null,
      jsonb_build_object(
        'reviewStatus',
        'pending',
        'visibilityStatus',
        'hidden',
        'sourceProvider',
        p_source_provider,
        'externalSourceId',
        v_external_source_id,
        'conflictCandidates',
        v_conflicts
      ),
      nullif(btrim(coalesce(p_note, '')), '')
    );

    for v_alias in
      select nullif(btrim(value), '')
      from jsonb_array_elements_text(v_aliases)
    loop
      if v_alias is null then
        continue;
      end if;

      insert into public.walk_poi_search_aliases (
        walk_poi_id,
        alias,
        normalized_alias,
        created_by
      )
      values (
        v_poi_id,
        v_alias,
        public.walk_poi_admin_normalize_text_v1(v_alias),
        v_actor_id
      )
      on conflict (walk_poi_id, normalized_alias) do nothing;
    end loop;

    v_created_count := v_created_count + 1;
    v_review_count := v_review_count + 1;
  end loop;

  update public.walk_poi_import_batches
  set
    import_status = 'completed',
    summary = jsonb_build_object(
      'requestedCount',
      jsonb_array_length(v_payload_array),
      'createdCount',
      v_created_count,
      'duplicateCount',
      v_duplicate_count,
      'conflictCount',
      v_conflict_count,
      'skippedCount',
      v_skipped_count,
      'reviewCount',
      v_review_count
    ),
    finished_at = timezone('utc', now())
  where id = v_batch_id;

  return query
  select
    v_batch_id,
    v_created_count,
    v_duplicate_count,
    v_conflict_count,
    v_skipped_count,
    v_review_count,
    'commit_completed'::text;
end;
$$;

comment on function public.walk_poi_admin_import_commit_v1(text, jsonb, text)
  is 'Admin-only commit workflow that turns import payloads into hidden pending walk POI candidates with source, review, and audit records.';

create or replace function public.walk_poi_admin_review_v1(
  p_walk_poi_id uuid,
  p_action text,
  p_reason text default null,
  p_patch jsonb default '{}'::jsonb
)
returns table (
  walk_poi_id uuid,
  review_status text,
  visibility_status text,
  lifecycle_status text,
  source_record_id uuid,
  audit_log_id bigint
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_before public.walk_pois%rowtype;
  v_after public.walk_pois%rowtype;
  v_next_status text;
  v_next_visibility text;
  v_source_record_id uuid;
  v_audit_log_id bigint;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_alias text;
begin
  if not public.is_walk_poi_admin() then
    raise exception 'WALK_POI_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if jsonb_typeof(v_patch) <> 'object' then
    raise exception 'WALK_POI_REVIEW_PATCH_INVALID'
      using errcode = '22023';
  end if;

  if v_action not in ('approve', 'reject', 'held') then
    raise exception 'WALK_POI_REVIEW_ACTION_INVALID'
      using errcode = '22023';
  end if;

  if v_action in ('reject', 'held') and v_reason is null then
    raise exception 'WALK_POI_REVIEW_REASON_REQUIRED'
      using errcode = '22023';
  end if;

  select *
  into v_before
  from public.walk_pois
  where id = p_walk_poi_id
  for update;

  if not found then
    raise exception 'WALK_POI_NOT_FOUND'
      using errcode = '02000';
  end if;

  v_source_record_id := v_before.primary_source_record_id;
  v_next_status := case v_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'held'
  end;
  v_next_visibility := case v_action
    when 'approve' then 'public'
    else 'hidden'
  end;

  update public.walk_pois
  set
    canonical_name = coalesce(nullif(btrim(v_patch ->> 'name'), ''), canonical_name),
    normalized_name = public.walk_poi_admin_normalize_text_v1(
      coalesce(nullif(btrim(v_patch ->> 'name'), ''), canonical_name)
    ),
    category = case
      when nullif(btrim(v_patch ->> 'category'), '') in (
        'park',
        'trail',
        'walkway',
        'waterside',
        'forest',
        'pet-friendly-area',
        'other'
      ) then nullif(btrim(v_patch ->> 'category'), '')
      else category
    end,
    category_label = coalesce(nullif(btrim(v_patch ->> 'categoryLabel'), ''), category_label),
    description = coalesce(nullif(btrim(v_patch ->> 'description'), ''), description),
    primary_address = coalesce(nullif(btrim(v_patch ->> 'address'), ''), primary_address),
    road_address = coalesce(nullif(btrim(v_patch ->> 'roadAddress'), ''), road_address),
    lot_address = coalesce(nullif(btrim(v_patch ->> 'lotAddress'), ''), lot_address),
    latitude = coalesce(nullif(v_patch ->> 'latitude', '')::numeric, latitude),
    longitude = coalesce(nullif(v_patch ->> 'longitude', '')::numeric, longitude),
    lifecycle_status = 'active',
    visibility_status = v_next_visibility,
    review_status = v_next_status,
    quality_score = least(
      100,
      greatest(0, coalesce(nullif(v_patch ->> 'qualityScore', '')::numeric, quality_score))
    ),
    source_attribution = coalesce(nullif(btrim(v_patch ->> 'attribution'), ''), source_attribution),
    last_reviewed_at = timezone('utc', now()),
    updated_by = v_actor_id,
    metadata = metadata || jsonb_build_object(
      'lastReviewAction',
      v_action,
      'lastReviewReason',
      v_reason,
      'lastReviewedAt',
      timezone('utc', now())
    )
  where id = p_walk_poi_id
  returning * into v_after;

  if v_source_record_id is not null then
    update public.walk_poi_source_records
    set candidate_status = case v_action
      when 'approve' then 'linked'
      when 'reject' then 'rejected'
      else 'held'
    end
    where id = v_source_record_id;
  end if;

  insert into public.walk_poi_reviews (
    walk_poi_id,
    source_record_id,
    review_status,
    reviewed_by,
    note,
    diff
  )
  values (
    p_walk_poi_id,
    v_source_record_id,
    v_next_status,
    v_actor_id,
    v_reason,
    jsonb_build_object(
      'action',
      v_action,
      'before',
      jsonb_build_object(
        'reviewStatus',
        v_before.review_status,
        'visibilityStatus',
        v_before.visibility_status,
        'lifecycleStatus',
        v_before.lifecycle_status
      ),
      'after',
      jsonb_build_object(
        'reviewStatus',
        v_after.review_status,
        'visibilityStatus',
        v_after.visibility_status,
        'lifecycleStatus',
        v_after.lifecycle_status
      ),
      'patch',
      v_patch
    )
  );

  insert into public.walk_poi_audit_logs (
    walk_poi_id,
    source_record_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    note
  )
  values (
    p_walk_poi_id,
    v_source_record_id,
    v_actor_id,
    'review_' || v_action,
    jsonb_build_object(
      'reviewStatus',
      v_before.review_status,
      'visibilityStatus',
      v_before.visibility_status,
      'lifecycleStatus',
      v_before.lifecycle_status
    ),
    jsonb_build_object(
      'reviewStatus',
      v_after.review_status,
      'visibilityStatus',
      v_after.visibility_status,
      'lifecycleStatus',
      v_after.lifecycle_status
    ),
    v_reason
  )
  returning id into v_audit_log_id;

  if jsonb_typeof(v_patch -> 'aliases') = 'array' then
    for v_alias in
      select nullif(btrim(value), '')
      from jsonb_array_elements_text(v_patch -> 'aliases')
    loop
      if v_alias is null then
        continue;
      end if;

      insert into public.walk_poi_search_aliases (
        walk_poi_id,
        alias,
        normalized_alias,
        created_by
      )
      values (
        p_walk_poi_id,
        v_alias,
        public.walk_poi_admin_normalize_text_v1(v_alias),
        v_actor_id
      )
      on conflict (walk_poi_id, normalized_alias) do nothing;
    end loop;
  end if;

  return query
  select
    v_after.id,
    v_after.review_status,
    v_after.visibility_status,
    v_after.lifecycle_status,
    v_source_record_id,
    v_audit_log_id;
end;
$$;

comment on function public.walk_poi_admin_review_v1(uuid, text, text, jsonb)
  is 'Admin-only review workflow for approving, rejecting, or holding walk POI candidates. Only approved/public/active rows are visible through public RPCs.';

revoke all on function public.walk_poi_admin_normalize_text_v1(text) from public;
grant execute on function public.walk_poi_admin_normalize_text_v1(text) to authenticated, service_role;

revoke all on function public.walk_poi_admin_import_commit_v1(text, jsonb, text) from public;
grant execute on function public.walk_poi_admin_import_commit_v1(text, jsonb, text) to authenticated, service_role;

revoke all on function public.walk_poi_admin_review_v1(uuid, text, text, jsonb) from public;
grant execute on function public.walk_poi_admin_review_v1(uuid, text, text, jsonb) to authenticated, service_role;

commit;

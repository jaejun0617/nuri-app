begin;

-- V1.1 walk/location discovery POI RPC Android smoke seed adjustment.
-- 목적: 실기기 현재 위치(일산3동/주엽동) 주변에서 자체 POI public RPC 결과를 확인한다.
-- 기존 서울시청 fallback seed는 보존하되 public projection에서는 제외한다.

do $$
declare
  v_batch_id uuid;
  v_poi_id uuid;
  v_seed record;
  v_alias text;
begin
  update public.walk_pois w
  set
    lifecycle_status = 'archived',
    visibility_status = 'hidden',
    review_status = 'held',
    updated_at = timezone('utc', now())
  from public.walk_poi_source_records s
  where s.walk_poi_id = w.id
    and s.source_provider = 'operator-seed'
    and s.external_source_id in (
      'nuri-v1.1-smoke-seoul-plaza',
      'nuri-v1.1-smoke-deoksugung-stonewall',
      'nuri-v1.1-smoke-cheonggyecheon'
    );

  select id
    into v_batch_id
  from public.walk_poi_import_batches
  where source_provider = 'operator-seed'
    and source_name = 'v1.1-walk-poi-smoke-seed-current-location-2026-06-04'
  order by created_at desc
  limit 1;

  if v_batch_id is null then
    insert into public.walk_poi_import_batches (
      source_provider,
      import_mode,
      import_status,
      source_name,
      summary,
      started_at,
      finished_at
    )
    values (
      'operator-seed',
      'commit',
      'completed',
      'v1.1-walk-poi-smoke-seed-current-location-2026-06-04',
      '{"purpose":"v1.1_android_smoke","scope":"ilsan3dong_current_location_radius","row_count":3}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now())
    )
    returning id into v_batch_id;
  end if;

  for v_seed in
    select *
    from jsonb_to_recordset(
      '[
        {
          "externalSourceId":"nuri-v1.1-smoke-ilsan-culture-park",
          "name":"문화공원 오거리공원",
          "category":"park",
          "categoryLabel":"도시근린공원",
          "description":"일산3동 현재 위치 smoke 기준 주변 산책 공원입니다.",
          "address":"경기도 고양시 일산서구 주엽동 34",
          "roadAddress":"경기도 고양시 일산서구 주엽동 34",
          "latitude":37.676492,
          "longitude":126.767888,
          "qualityScore":82,
          "aliases":["문화공원", "오거리공원", "일산 문화공원", "smoke"]
        },
        {
          "externalSourceId":"nuri-v1.1-smoke-gangseon-park",
          "name":"강선공원",
          "category":"park",
          "categoryLabel":"근린공원",
          "description":"일산3동 인근 산책 smoke를 위한 운영자 승인 seed입니다.",
          "address":"경기도 고양시 일산서구 주엽동",
          "roadAddress":"경기도 고양시 일산서구 주엽동",
          "latitude":37.672900,
          "longitude":126.762700,
          "qualityScore":78,
          "aliases":["강선 공원", "주엽동 강선공원", "smoke"]
        },
        {
          "externalSourceId":"nuri-v1.1-smoke-ilsan-lake-park",
          "name":"일산호수공원",
          "category":"waterside",
          "categoryLabel":"수변공원",
          "description":"일산권 산책 smoke를 위한 수변 공원 seed입니다.",
          "address":"경기도 고양시 일산동구 호수로 595",
          "roadAddress":"경기도 고양시 일산동구 호수로 595",
          "latitude":37.660350,
          "longitude":126.765550,
          "qualityScore":84,
          "aliases":["호수공원", "일산 호수공원", "smoke"]
        }
      ]'::jsonb
    ) as seed(
      "externalSourceId" text,
      name text,
      category text,
      "categoryLabel" text,
      description text,
      address text,
      "roadAddress" text,
      latitude numeric,
      longitude numeric,
      "qualityScore" numeric,
      aliases jsonb
    )
  loop
    select s.walk_poi_id
      into v_poi_id
    from public.walk_poi_source_records s
    where s.source_provider = 'operator-seed'
      and s.external_source_id = v_seed."externalSourceId"
    limit 1;

    if v_poi_id is null then
      insert into public.walk_pois (
        canonical_name,
        normalized_name,
        category,
        category_label,
        description,
        primary_address,
        road_address,
        latitude,
        longitude,
        lifecycle_status,
        visibility_status,
        review_status,
        quality_score,
        source_attribution,
        primary_source_provider,
        source_updated_at,
        last_reviewed_at,
        metadata
      )
      values (
        v_seed.name,
        lower(v_seed.name),
        v_seed.category,
        v_seed."categoryLabel",
        v_seed.description,
        v_seed.address,
        v_seed."roadAddress",
        v_seed.latitude,
        v_seed.longitude,
        'active',
        'public',
        'approved',
        v_seed."qualityScore",
        'NURI 운영자 승인 seed · 2026-06-04',
        'operator-seed',
        timezone('utc', now()),
        timezone('utc', now()),
        jsonb_build_object('seedPurpose', 'v1.1_android_smoke_current_location')
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
        candidate_status,
        confidence_score,
        raw_payload
      )
      values (
        v_batch_id,
        v_poi_id,
        'operator-seed',
        v_seed."externalSourceId",
        v_seed.name,
        v_seed."categoryLabel",
        v_seed.address,
        v_seed."roadAddress",
        v_seed.latitude,
        v_seed.longitude,
        'linked',
        90,
        '{"source":"operator-approved-android-smoke-seed"}'::jsonb
      );

      insert into public.walk_poi_reviews (walk_poi_id, review_status, note)
      values (v_poi_id, 'approved', 'V1.1 Android current-location smoke seed approved.');

      insert into public.walk_poi_audit_logs (
        walk_poi_id,
        action_type,
        after_state,
        note
      )
      values (
        v_poi_id,
        'operator_seed_inserted',
        jsonb_build_object('review_status', 'approved', 'visibility_status', 'public'),
        'V1.1 Android current-location smoke seed inserted.'
      );
    else
      update public.walk_pois
      set
        lifecycle_status = 'active',
        visibility_status = 'public',
        review_status = 'approved',
        quality_score = v_seed."qualityScore",
        last_reviewed_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      where id = v_poi_id;
    end if;

    for v_alias in
      select value
      from jsonb_array_elements_text(v_seed.aliases)
    loop
      insert into public.walk_poi_search_aliases (
        walk_poi_id,
        alias,
        normalized_alias
      )
      values (
        v_poi_id,
        v_alias,
        lower(v_alias)
      )
      on conflict (walk_poi_id, normalized_alias) do nothing;
    end loop;
  end loop;
end $$;

commit;

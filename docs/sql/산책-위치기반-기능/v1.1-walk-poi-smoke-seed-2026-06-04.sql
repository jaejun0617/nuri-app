begin;

-- V1.1 walk/location discovery POI RPC smoke seed.
-- 목적: 앱 read path 병행 전환 실기기 QA에서 public RPC 반환을 확인하기 위한 최소 approved seed.
-- 범위: 서울시청 fallback 좌표 주변 3건, operator-seed source, rollback 가능.

do $$
declare
  v_batch_id uuid;
  v_poi_id uuid;
begin
  select id
    into v_batch_id
  from public.walk_poi_import_batches
  where source_provider = 'operator-seed'
    and source_name = 'v1.1-walk-poi-smoke-seed-2026-06-04'
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
      'v1.1-walk-poi-smoke-seed-2026-06-04',
      '{"purpose":"v1.1_android_smoke","scope":"seoul_city_hall_fallback_radius","row_count":3}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now())
    )
    returning id into v_batch_id;
  end if;

  if not exists (
    select 1
    from public.walk_poi_source_records
    where source_provider = 'operator-seed'
      and external_source_id = 'nuri-v1.1-smoke-seoul-plaza'
  ) then
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
      '서울광장',
      lower('서울광장'),
      'park',
      '광장',
      '서울시청 앞에서 가볍게 걷기 좋은 공개 광장입니다.',
      '서울특별시 중구 세종대로 110',
      '서울특별시 중구 세종대로 110',
      37.5662890,
      126.9779300,
      'active',
      'public',
      'approved',
      80,
      'NURI 운영자 승인 seed · 2026-06-04',
      'operator-seed',
      timezone('utc', now()),
      timezone('utc', now()),
      '{"seedPurpose":"v1.1_android_smoke"}'::jsonb
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
      'nuri-v1.1-smoke-seoul-plaza',
      '서울광장',
      '광장',
      '서울특별시 중구 세종대로 110',
      '서울특별시 중구 세종대로 110',
      37.5662890,
      126.9779300,
      'linked',
      90,
      '{"source":"operator-approved-smoke-seed"}'::jsonb
    );

    insert into public.walk_poi_search_aliases (walk_poi_id, alias, normalized_alias)
    values
      (v_poi_id, '서울 시청 광장', lower('서울 시청 광장')),
      (v_poi_id, '시청앞광장', lower('시청앞광장'));

    insert into public.walk_poi_reviews (walk_poi_id, review_status, note)
    values (v_poi_id, 'approved', 'V1.1 Android smoke seed approved.');

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
      'V1.1 Android smoke seed inserted.'
    );
  end if;

  if not exists (
    select 1
    from public.walk_poi_source_records
    where source_provider = 'operator-seed'
      and external_source_id = 'nuri-v1.1-smoke-deoksugung-stonewall'
  ) then
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
      '덕수궁 돌담길',
      lower('덕수궁 돌담길'),
      'walkway',
      '산책로',
      '도심에서 짧게 걷기 좋은 덕수궁 주변 산책로입니다.',
      '서울특별시 중구 정동길',
      '서울특별시 중구 정동길',
      37.5667500,
      126.9739700,
      'active',
      'public',
      'approved',
      78,
      'NURI 운영자 승인 seed · 2026-06-04',
      'operator-seed',
      timezone('utc', now()),
      timezone('utc', now()),
      '{"seedPurpose":"v1.1_android_smoke"}'::jsonb
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
      'nuri-v1.1-smoke-deoksugung-stonewall',
      '덕수궁 돌담길',
      '산책로',
      '서울특별시 중구 정동길',
      '서울특별시 중구 정동길',
      37.5667500,
      126.9739700,
      'linked',
      88,
      '{"source":"operator-approved-smoke-seed"}'::jsonb
    );

    insert into public.walk_poi_search_aliases (walk_poi_id, alias, normalized_alias)
    values
      (v_poi_id, '정동길 산책로', lower('정동길 산책로')),
      (v_poi_id, '덕수궁길', lower('덕수궁길'));

    insert into public.walk_poi_reviews (walk_poi_id, review_status, note)
    values (v_poi_id, 'approved', 'V1.1 Android smoke seed approved.');

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
      'V1.1 Android smoke seed inserted.'
    );
  end if;

  if not exists (
    select 1
    from public.walk_poi_source_records
    where source_provider = 'operator-seed'
      and external_source_id = 'nuri-v1.1-smoke-cheonggyecheon'
  ) then
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
      '청계천 산책로',
      lower('청계천 산책로'),
      'waterside',
      '수변 산책로',
      '도심 수변을 따라 걷기 좋은 청계천 주변 산책로입니다.',
      '서울특별시 종로구 청계천로',
      '서울특별시 종로구 청계천로',
      37.5690400,
      126.9786500,
      'active',
      'public',
      'approved',
      76,
      'NURI 운영자 승인 seed · 2026-06-04',
      'operator-seed',
      timezone('utc', now()),
      timezone('utc', now()),
      '{"seedPurpose":"v1.1_android_smoke"}'::jsonb
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
      'nuri-v1.1-smoke-cheonggyecheon',
      '청계천 산책로',
      '수변 산책로',
      '서울특별시 종로구 청계천로',
      '서울특별시 종로구 청계천로',
      37.5690400,
      126.9786500,
      'linked',
      86,
      '{"source":"operator-approved-smoke-seed"}'::jsonb
    );

    insert into public.walk_poi_search_aliases (walk_poi_id, alias, normalized_alias)
    values
      (v_poi_id, '청계천', lower('청계천')),
      (v_poi_id, '청계천로 산책', lower('청계천로 산책'));

    insert into public.walk_poi_reviews (walk_poi_id, review_status, note)
    values (v_poi_id, 'approved', 'V1.1 Android smoke seed approved.');

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
      'V1.1 Android smoke seed inserted.'
    );
  end if;
end $$;

commit;

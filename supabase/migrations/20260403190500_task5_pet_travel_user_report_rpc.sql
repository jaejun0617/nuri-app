begin;

drop function if exists public.submit_pet_travel_user_report(
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
);

create or replace function public.submit_pet_travel_user_report(
  p_primary_source_place_id text,
  p_canonical_name text,
  p_address text,
  p_latitude numeric,
  p_longitude numeric,
  p_place_type text,
  p_report_type text,
  p_report_note text default null,
  p_evidence_payload jsonb default '{}'::jsonb
)
returns table (
  place_id uuid,
  user_report_id uuid,
  policy_id uuid,
  report_status text,
  policy_status text,
  source_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_source_place_id text := nullif(btrim(coalesce(p_primary_source_place_id, '')), '');
  normalized_canonical_name text := nullif(btrim(coalesce(p_canonical_name, '')), '');
  normalized_address text := nullif(btrim(coalesce(p_address, '')), '');
  normalized_place_type text := nullif(btrim(coalesce(p_place_type, '')), '');
  normalized_report_type text := nullif(btrim(coalesce(p_report_type, '')), '');
  normalized_report_note text := nullif(btrim(coalesce(p_report_note, '')), '');
  normalized_evidence_payload jsonb := coalesce(p_evidence_payload, '{}'::jsonb);
  resolved_place_id uuid;
  resolved_user_report_id uuid;
  resolved_policy_id uuid;
  resolved_report_status text := 'submitted';
  resolved_policy_status text := 'unknown';
  resolved_policy_note text := null;
  resolved_confidence numeric(4, 3) := 0.15;
  resolved_evidence_summary text := null;
  active_report_count integer := 0;
  active_allowed_count integer := 0;
  active_restricted_count integer := 0;
  active_outdated_count integer := 0;
begin
  if actor_id is null then
    raise exception '로그인 후 제보를 남길 수 있어요.';
  end if;

  if normalized_source_place_id is null then
    raise exception 'TourAPI contentId가 없어 제보를 저장할 수 없어요.';
  end if;

  if normalized_canonical_name is null then
    raise exception '장소 이름이 없어 제보를 저장할 수 없어요.';
  end if;

  if normalized_address is null then
    raise exception '장소 주소가 없어 제보를 저장할 수 없어요.';
  end if;

  if normalized_place_type not in (
    'travel-attraction',
    'outdoor',
    'stay',
    'restaurant',
    'experience',
    'pet-venue',
    'shopping',
    'mixed'
  ) then
    raise exception '유효하지 않은 place_type이에요.';
  end if;

  if normalized_report_type not in (
    'pet_allowed',
    'pet_restricted',
    'info_outdated'
  ) then
    raise exception '유효하지 않은 report_type이에요.';
  end if;

  if jsonb_typeof(normalized_evidence_payload) is distinct from 'object' then
    raise exception 'evidence_payload는 object 형태여야 해요.';
  end if;

  if p_latitude is null or p_latitude < -90 or p_latitude > 90 then
    raise exception '유효하지 않은 위도예요.';
  end if;

  if p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception '유효하지 않은 경도예요.';
  end if;

  insert into public.pet_travel_places (
    canonical_name,
    address,
    latitude,
    longitude,
    place_type,
    primary_source,
    primary_source_place_id
  )
  values (
    normalized_canonical_name,
    normalized_address,
    p_latitude,
    p_longitude,
    normalized_place_type,
    'tour-api',
    normalized_source_place_id
  )
  on conflict (primary_source, primary_source_place_id)
    where primary_source <> 'system' and primary_source_place_id is not null
  do update
    set canonical_name = excluded.canonical_name,
        address = excluded.address,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        place_type = excluded.place_type,
        updated_at = timezone('utc', now())
  returning id into resolved_place_id;

  insert into public.pet_travel_user_reports (
    place_id,
    user_id,
    report_type,
    report_note,
    evidence_payload,
    report_status
  )
  values (
    resolved_place_id,
    actor_id,
    normalized_report_type,
    normalized_report_note,
    normalized_evidence_payload,
    'submitted'
  )
  on conflict (place_id, user_id, report_type)
  do update
    set report_note = excluded.report_note,
        evidence_payload = excluded.evidence_payload,
        report_status = 'submitted',
        updated_at = timezone('utc', now())
  returning id, report_status into resolved_user_report_id, resolved_report_status;

  select
    count(distinct user_id) filter (where report_status <> 'dismissed'),
    count(*) filter (where report_status <> 'dismissed' and report_type = 'pet_allowed'),
    count(*) filter (where report_status <> 'dismissed' and report_type = 'pet_restricted'),
    count(*) filter (where report_status <> 'dismissed' and report_type = 'info_outdated')
  into
    active_report_count,
    active_allowed_count,
    active_restricted_count,
    active_outdated_count
  from public.pet_travel_user_reports
  where place_id = resolved_place_id;

  if active_restricted_count > 0 and active_allowed_count > 0 then
    resolved_policy_status := 'unknown';
    resolved_confidence := 0.2;
    resolved_policy_note := '상반된 사용자 제보가 함께 접수되어 운영 확인이 필요해요.';
  elsif active_restricted_count > 0 then
    resolved_policy_status := 'restricted';
    resolved_confidence := least(0.65, 0.35 + active_restricted_count * 0.08);
    resolved_policy_note := '반려동물 동반 제한 제보가 접수되어 재확인이 필요해요.';
  elsif active_allowed_count > 0 then
    resolved_policy_status := 'allowed';
    resolved_confidence := least(0.45, 0.2 + active_allowed_count * 0.05);
    resolved_policy_note := '반려동물 동반 가능 제보가 접수되었지만 운영 검수 전 단계예요.';
  else
    resolved_policy_status := 'unknown';
    resolved_confidence := least(0.3, 0.15 + active_outdated_count * 0.03);
    resolved_policy_note := '정보 최신성 제보가 접수되어 재확인이 필요해요.';
  end if;

  resolved_evidence_summary := format('사용자 제보 %s건 접수', greatest(active_report_count, 1));

  insert into public.pet_travel_pet_policies (
    place_id,
    source_type,
    policy_status,
    policy_note,
    confidence,
    requires_onsite_check,
    evidence_summary,
    evidence_payload,
    actor_user_id,
    is_active
  )
  values (
    resolved_place_id,
    'user-report',
    resolved_policy_status,
    resolved_policy_note,
    resolved_confidence,
    true,
    resolved_evidence_summary,
    jsonb_build_object(
      'report_count', greatest(active_report_count, 1),
      'allowed_count', active_allowed_count,
      'restricted_count', active_restricted_count,
      'outdated_count', active_outdated_count,
      'latest_report_type', normalized_report_type,
      'review_state', 'pending_admin_review',
      'latest_submitted_at', timezone('utc', now())
    ),
    actor_id,
    true
  )
  on conflict (place_id, source_type)
    where is_active = true
  do update
    set policy_status = excluded.policy_status,
        policy_note = excluded.policy_note,
        confidence = excluded.confidence,
        requires_onsite_check = excluded.requires_onsite_check,
        evidence_summary = excluded.evidence_summary,
        evidence_payload = excluded.evidence_payload,
        actor_user_id = excluded.actor_user_id,
        updated_at = timezone('utc', now())
  returning id, policy_status into resolved_policy_id, resolved_policy_status;

  return query
  select
    resolved_place_id,
    resolved_user_report_id,
    resolved_policy_id,
    resolved_report_status,
    resolved_policy_status,
    'user-report'::text;
end;
$$;

revoke all on function public.submit_pet_travel_user_report(
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.submit_pet_travel_user_report(
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  jsonb
) to authenticated;

commit;

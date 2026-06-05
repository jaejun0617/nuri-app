begin;

set local search_path = public, extensions;

-- Corrective migration for 20260605090000:
-- Keep applied migration history intact and replace the review RPC with an
-- unambiguous alias insert path. The previous ON CONFLICT target could be
-- parsed as the RETURNS TABLE output variable `walk_poi_id` in PL/pgSQL lint.

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
  v_normalized_alias text;
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

      v_normalized_alias := public.walk_poi_admin_normalize_text_v1(v_alias);

      if not exists (
        select 1
        from public.walk_poi_search_aliases a
        where a.walk_poi_id = p_walk_poi_id
          and a.normalized_alias = v_normalized_alias
      ) then
        insert into public.walk_poi_search_aliases (
          walk_poi_id,
          alias,
          normalized_alias,
          created_by
        )
        values (
          p_walk_poi_id,
          v_alias,
          v_normalized_alias,
          v_actor_id
        );
      end if;
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

revoke all on function public.walk_poi_admin_review_v1(uuid, text, text, jsonb) from public;
grant execute on function public.walk_poi_admin_review_v1(uuid, text, text, jsonb) to authenticated, service_role;

commit;

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.claim_nuri_place_enrichment_worker_targets(
  p_provider text default 'google-places',
  p_limit integer default 10
)
returns table (
  domain text,
  place_key text,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  thumbnail_url text,
  external_place_id text,
  provider_place_url text,
  external_map_url text,
  requested_fields text[],
  candidate_reason text
)
language sql
security definer
set search_path = public
as $$
  with normalized_input as (
    select
      coalesce(nullif(btrim(p_provider), ''), 'google-places') as provider,
      greatest(coalesce(p_limit, 10), 1) as limit_count,
      timezone('utc', now()) as now_utc
  ),
  hospital_candidates as (
    select
      'animalHospital'::text as domain,
      h.id as place_key,
      h.canonical_name as name,
      h.primary_address as address,
      h.latitude::double precision as latitude,
      h.longitude::double precision as longitude,
      h.official_phone as phone,
      null::text as thumbnail_url,
      h.provider_place_id as external_place_id,
      h.provider_place_url as provider_place_url,
      h.provider_place_url as external_map_url,
      array_remove(
        array[
          case
            when nullif(btrim(coalesce(h.official_phone, '')), '') is null then 'phone'
            else null
          end,
          case
            when h.latitude is null or h.longitude is null then 'coordinates'
            else null
          end,
          'thumbnail'
        ]::text[],
        null
      ) as requested_fields,
      case
        when c.id is null then 'cache-miss'
        else 'cache-expired'
      end as candidate_reason,
      coalesce(c.cache_expires_at, h.canonical_updated_at) as freshness_order
    from public.animal_hospitals h
    cross join normalized_input i
    left join public.nuri_place_provider_cache c
      on c.domain = 'animalHospital'
     and c.place_key = h.id
     and c.provider = i.provider
    where h.is_active = true
      and h.is_hidden = false
      and (
        c.id is null
        or c.cache_expires_at is null
        or c.cache_expires_at <= i.now_utc
      )
  ),
  walk_candidates as (
    select
      'walk'::text as domain,
      c.place_key,
      coalesce(
        nullif(btrim(coalesce(c.matched_name, '')), ''),
        nullif(btrim(coalesce(c.raw_payload -> 'place' ->> 'name', '')), '')
      ) as name,
      coalesce(
        nullif(btrim(coalesce(c.matched_address, '')), ''),
        nullif(btrim(coalesce(c.raw_payload -> 'place' ->> 'formattedAddress', '')), '')
      ) as address,
      c.latitude::double precision as latitude,
      c.longitude::double precision as longitude,
      c.phone,
      c.photo_uri as thumbnail_url,
      c.provider_place_id as external_place_id,
      c.google_maps_uri as provider_place_url,
      c.google_maps_uri as external_map_url,
      case
        when array_length(c.attempted_fields, 1) is not null
          then c.attempted_fields
        else array['phone', 'thumbnail']::text[]
      end as requested_fields,
      'cache-expired'::text as candidate_reason,
      c.cache_expires_at as freshness_order
    from public.nuri_place_provider_cache c
    cross join normalized_input i
    where c.domain = 'walk'
      and c.provider = i.provider
      and (
        c.cache_expires_at is null
        or c.cache_expires_at <= i.now_utc
      )
      and coalesce(
        nullif(btrim(coalesce(c.matched_name, '')), ''),
        nullif(btrim(coalesce(c.raw_payload -> 'place' ->> 'name', '')), '')
      ) is not null
      and coalesce(
        nullif(btrim(coalesce(c.matched_address, '')), ''),
        nullif(btrim(coalesce(c.raw_payload -> 'place' ->> 'formattedAddress', '')), '')
      ) is not null
  )
  select
    candidate.domain,
    candidate.place_key,
    candidate.name,
    candidate.address,
    candidate.latitude,
    candidate.longitude,
    candidate.phone,
    candidate.thumbnail_url,
    candidate.external_place_id,
    candidate.provider_place_url,
    candidate.external_map_url,
    candidate.requested_fields,
    candidate.candidate_reason
  from (
    select * from hospital_candidates
    union all
    select * from walk_candidates
  ) candidate
  cross join normalized_input i
  where coalesce(array_length(candidate.requested_fields, 1), 0) > 0
  order by
    case candidate.candidate_reason
      when 'cache-miss' then 0
      else 1
    end,
    candidate.freshness_order asc,
    candidate.domain asc,
    candidate.name asc
  limit (select limit_count from normalized_input);
$$;

comment on function public.claim_nuri_place_enrichment_worker_targets(text, integer) is
  'Background cron worker가 stale/missing place enrichment 대상 row를 선택한다.';

create or replace function public.register_place_enrichment_worker_schedule(
  p_function_url text,
  p_cron_secret text,
  p_schedule text default '*/10 * * * *',
  p_limit integer default 10,
  p_max_units integer default 20
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url text := nullif(btrim(coalesce(p_function_url, '')), '');
  v_cron_secret text := nullif(btrim(coalesce(p_cron_secret, '')), '');
  v_schedule text := nullif(btrim(coalesce(p_schedule, '')), '');
  v_limit integer := greatest(coalesce(p_limit, 10), 1);
  v_max_units integer := greatest(coalesce(p_max_units, 20), 1);
  v_job_name constant text := 'place-enrichment-worker-every-10-min';
  v_job_id bigint;
  v_existing_job_id bigint;
  v_command text;
begin
  if v_function_url is null then
    raise exception 'place_enrichment_worker_url_required';
  end if;

  if v_cron_secret is null then
    raise exception 'place_enrichment_worker_cron_secret_required';
  end if;

  if v_schedule is null then
    v_schedule := '*/10 * * * *';
  end if;

  for v_existing_job_id in
    select jobid
    from cron.job
    where jobname = v_job_name
  loop
    perform cron.unschedule(v_existing_job_id);
  end loop;

  v_command := format(
    $fmt$
      select
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', %L
          ),
          body := jsonb_build_object(
            'source', 'pg_cron',
            'limit', %s,
            'maxUnits', %s
          )
        ) as request_id;
    $fmt$,
    v_function_url,
    v_cron_secret,
    v_limit,
    v_max_units
  );

  select cron.schedule(v_job_name, v_schedule, v_command)
    into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.unregister_place_enrichment_worker_schedule()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id bigint;
  v_removed integer := 0;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'place-enrichment-worker-every-10-min'
  loop
    perform cron.unschedule(v_job_id);
    v_removed := v_removed + 1;
  end loop;

  return v_removed;
end;
$$;

create or replace function public.cleanup_v1_release_garbage_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test_post_ids uuid[];
  v_test_target_ids text[];
  v_reports_deleted integer := 0;
  v_queue_deleted integer := 0;
  v_actions_deleted integer := 0;
  v_assets_deleted integer := 0;
  v_posts_deleted integer := 0;
  v_pets_deleted integer := 0;
begin
  select coalesce(array_agg(id order by created_at asc), '{}'::uuid[])
    into v_test_post_ids
  from public.posts
  where title like '[QA]%'
     or title = '테스트6';

  select coalesce(array_agg(post_id::text), '{}'::text[])
    into v_test_target_ids
  from unnest(v_test_post_ids) as post_id;

  if coalesce(array_length(v_test_target_ids, 1), 0) > 0 then
    delete from public.community_moderation_actions
    where target_id::text = any(v_test_target_ids);
    get diagnostics v_actions_deleted = row_count;

    delete from public.community_moderation_queue
    where target_id::text = any(v_test_target_ids);
    get diagnostics v_queue_deleted = row_count;

    delete from public.reports
    where target_type = 'post'
      and target_id::text = any(v_test_target_ids);
    get diagnostics v_reports_deleted = row_count;

    delete from public.community_image_assets
    where post_id = any(v_test_post_ids);
    get diagnostics v_assets_deleted = row_count;

    delete from public.posts
    where id = any(v_test_post_ids);
    get diagnostics v_posts_deleted = row_count;
  end if;

  delete from public.pets
  where id = '86ea4d55-602d-4540-9a66-bfae8b62e52e'::uuid;
  get diagnostics v_pets_deleted = row_count;

  return jsonb_build_object(
    'deletedReports', v_reports_deleted,
    'deletedModerationQueue', v_queue_deleted,
    'deletedModerationActions', v_actions_deleted,
    'deletedImageAssets', v_assets_deleted,
    'deletedPosts', v_posts_deleted,
    'deletedPets', v_pets_deleted
  );
end;
$$;

revoke all on function public.claim_nuri_place_enrichment_worker_targets(text, integer) from public, anon, authenticated, service_role;
revoke all on function public.register_place_enrichment_worker_schedule(text, text, text, integer, integer) from public, anon, authenticated, service_role;
revoke all on function public.unregister_place_enrichment_worker_schedule() from public, anon, authenticated, service_role;
revoke all on function public.cleanup_v1_release_garbage_data() from public, anon, authenticated, service_role;

grant execute on function public.claim_nuri_place_enrichment_worker_targets(text, integer) to service_role;
grant execute on function public.register_place_enrichment_worker_schedule(text, text, text, integer, integer) to service_role;
grant execute on function public.unregister_place_enrichment_worker_schedule() to service_role;
grant execute on function public.cleanup_v1_release_garbage_data() to service_role;

commit;

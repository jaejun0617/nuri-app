begin;

create or replace function public.search_pet_care_guides(
  p_query text,
  p_species_group public.pet_species_group default null,
  p_age_in_months integer default null,
  p_limit integer default 24
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  body_preview text,
  category text,
  tags text[],
  target_species text[],
  species_keywords text[],
  search_keywords text[],
  age_policy_type public.guide_age_policy_type,
  age_policy_life_stage public.guide_life_stage_key,
  age_policy_min_months integer,
  age_policy_max_months integer,
  status public.guide_content_status,
  is_active boolean,
  priority integer,
  sort_order integer,
  rotation_weight integer,
  thumbnail_image_url text,
  cover_image_url text,
  image_alt text,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  match_score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      nullif(regexp_replace(lower(coalesce(p_query, '')), '\s+', ' ', 'g'), '') as query,
      greatest(1, least(coalesce(p_limit, 24), 50)) as limit_count
  ),
  candidate_guides as (
    select
      g.*,
      n.query,
      plainto_tsquery('simple', n.query) as ts_query
    from public.pet_care_guides g
    cross join normalized n
    where n.query is not null
      and g.deleted_at is null
      and g.is_active = true
      and g.status = 'published'
      and (g.published_at is null or g.published_at <= timezone('utc', now()))
      and (
        p_species_group is null
        or g.target_species @> array[p_species_group::text]
        or g.target_species @> array['common']::text[]
      )
      and (
        p_age_in_months is null
        or g.age_policy_type = 'all'
        or (
          g.age_policy_type = 'lifeStage'
          and (
            (g.age_policy_life_stage = 'baby' and p_age_in_months < 12)
            or (g.age_policy_life_stage = 'adult' and p_age_in_months between 12 and 95)
            or (g.age_policy_life_stage = 'senior' and p_age_in_months >= 96)
          )
        )
        or (
          g.age_policy_type = 'ageRange'
          and (g.age_policy_min_months is null or p_age_in_months >= g.age_policy_min_months)
          and (g.age_policy_max_months is null or p_age_in_months <= g.age_policy_max_months)
        )
      )
  ),
  matched_guides as (
    select
      g.*,
      ts_rank_cd(g.search_document, g.ts_query, 32) as text_rank,
      greatest(
        similarity(lower(g.title), g.query),
        similarity(lower(g.summary), g.query),
        similarity(lower(g.body_preview), g.query),
        similarity(lower(array_to_string(coalesce(g.tags, '{}'::text[]), ' ')), g.query),
        similarity(lower(array_to_string(coalesce(g.search_keywords, '{}'::text[]), ' ')), g.query),
        similarity(lower(array_to_string(coalesce(g.species_keywords, '{}'::text[]), ' ')), g.query)
      ) as similarity_rank
    from candidate_guides g
    where g.search_document @@ g.ts_query
      or lower(g.title) % g.query
      or lower(g.summary) like '%' || g.query || '%'
      or lower(g.body_preview) like '%' || g.query || '%'
      or exists (
        select 1
        from unnest(coalesce(g.tags, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(g.search_keywords, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
      or exists (
        select 1
        from unnest(coalesce(g.species_keywords, '{}'::text[])) as keyword
        where lower(keyword) like '%' || g.query || '%'
      )
  )
  select
    g.id,
    g.slug,
    g.title,
    g.summary,
    g.body_preview,
    g.category,
    g.tags,
    g.target_species,
    g.species_keywords,
    g.search_keywords,
    g.age_policy_type,
    g.age_policy_life_stage,
    g.age_policy_min_months,
    g.age_policy_max_months,
    g.status,
    g.is_active,
    g.priority,
    g.sort_order,
    g.rotation_weight,
    g.thumbnail_image_url,
    g.cover_image_url,
    g.image_alt,
    g.published_at,
    g.created_at,
    g.updated_at,
    (
      (g.text_rank * 120)::real +
      (g.similarity_rank * 45)::real +
      (case when lower(g.title) = g.query then 80 else 0 end)::real +
      (case when lower(g.title) like g.query || '%' then 24 else 0 end)::real +
      (case when p_species_group is not null and g.target_species @> array[p_species_group::text] then 18 else 6 end)::real +
      (case
        when p_age_in_months is null or g.age_policy_type = 'all' then 8
        when g.age_policy_type = 'lifeStage' then 12
        when g.age_policy_type = 'ageRange' then 10
        else 0
      end)::real +
      (coalesce(g.priority, 0) * 0.8)::real -
      (coalesce(g.sort_order, 0) * 0.05)::real
    ) as match_score
  from matched_guides g
  order by
    match_score desc,
    g.priority desc,
    g.sort_order asc,
    g.published_at desc nulls last,
    g.updated_at desc
  limit (select limit_count from normalized);
$$;

grant execute on function public.search_pet_care_guides(text, public.pet_species_group, integer, integer)
to authenticated;

create or replace function public.get_pet_care_guide_popular_searches(
  p_species_group public.pet_species_group default null,
  p_limit integer default 8
)
returns table (
  keyword text,
  search_count bigint,
  source text
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select greatest(1, least(coalesce(p_limit, 8), 20)) as limit_count
  ),
  event_keywords as (
    select
      lower(regexp_replace(btrim(e.search_query), '\s+', ' ', 'g')) as keyword,
      count(*)::bigint as search_count,
      'event'::text as source,
      1 as source_priority
    from public.pet_care_guide_events e
    where e.search_query is not null
      and char_length(btrim(e.search_query)) between 2 and 32
      and e.occurred_at >= timezone('utc', now()) - interval '60 days'
      and (
        p_species_group is null
        or e.context_species_group = p_species_group
        or e.context_species_group is null
      )
    group by 1
  ),
  catalog_keywords as (
    select
      lower(keyword) as keyword,
      sum(weight)::bigint as search_count,
      'catalog'::text as source,
      2 as source_priority
    from (
      select
        unnest(coalesce(g.search_keywords, '{}'::text[])) as keyword,
        greatest(1, coalesce(g.priority, 0) + 4) as weight
      from public.pet_care_guides g
      where g.deleted_at is null
        and g.is_active = true
        and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (
          p_species_group is null
          or g.target_species @> array[p_species_group::text]
          or g.target_species @> array['common']::text[]
        )

      union all

      select
        unnest(coalesce(g.tags, '{}'::text[])) as keyword,
        greatest(1, coalesce(g.priority, 0) + 2) as weight
      from public.pet_care_guides g
      where g.deleted_at is null
        and g.is_active = true
        and g.status = 'published'
        and (g.published_at is null or g.published_at <= timezone('utc', now()))
        and (
          p_species_group is null
          or g.target_species @> array[p_species_group::text]
          or g.target_species @> array['common']::text[]
        )
    ) seed
    where char_length(btrim(keyword)) between 2 and 32
    group by 1
  ),
  combined as (
    select * from event_keywords
    union all
    select * from catalog_keywords
  ),
  deduped as (
    select
      c.keyword,
      c.search_count,
      c.source,
      row_number() over (
        partition by c.keyword
        order by c.source_priority asc, c.search_count desc, c.keyword asc
      ) as dedupe_rank
    from combined c
  )
  select
    d.keyword,
    d.search_count,
    d.source
  from deduped d
  where d.dedupe_rank = 1
  order by d.search_count desc, d.keyword asc
  limit (select limit_count from normalized);
$$;

grant execute on function public.get_pet_care_guide_popular_searches(public.pet_species_group, integer)
to authenticated;

commit;

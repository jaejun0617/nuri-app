-- 이 파일은 집사 꿀팁 가이드 도메인의 현재 최종본이다.
-- guide 본문/검색/이벤트/운영 상태/RLS helper를 관리하는 문서용 source of truth다.
-- 검색 RPC 실행 이력은 `docs/sql/가이드/레거시/집사꿀팁가이드-검색RPC-문서마이그레이션.sql`에 남아 있으므로, linked remote drift가 있으면 이 파일과 migration을 함께 비교해야 한다.
-- storage bucket/policy는 `가이드-이미지-스토리지-세팅.sql`이 별도 보조 SQL이므로, 이 파일만으로 storage 운영 상태를 대체하지 않는다.

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin', 'super_admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pet_species_group') then
    create type public.pet_species_group as enum ('dog', 'cat', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'guide_age_policy_type') then
    create type public.guide_age_policy_type as enum ('all', 'lifeStage', 'ageRange');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'guide_life_stage_key') then
    create type public.guide_life_stage_key as enum ('baby', 'adult', 'senior');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'guide_event_type') then
    create type public.guide_event_type as enum ('home_impression', 'list_click', 'detail_view');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'guide_content_status') then
    create type public.guide_content_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

alter table public.profiles
  add column if not exists role public.app_role not null default 'user';

alter table public.pets
  add column if not exists species_group public.pet_species_group not null default 'other',
  add column if not exists species_detail_key text,
  add column if not exists species_display_name text;

alter table public.pets
  drop constraint if exists pets_species_detail_key_length_check;

alter table public.pets
  add constraint pets_species_detail_key_length_check
  check (
    species_detail_key is null
    or char_length(btrim(species_detail_key)) between 1 and 40
  );

alter table public.pets
  drop constraint if exists pets_species_display_name_length_check;

alter table public.pets
  add constraint pets_species_display_name_length_check
  check (
    species_display_name is null
    or char_length(btrim(species_display_name)) between 1 and 60
  );

create index if not exists idx_pets_user_species_group
  on public.pets (user_id, species_group);

create table if not exists public.pet_care_guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body text not null,
  body_preview text not null,
  category text not null,
  tags text[] not null default '{}'::text[],
  target_species text[] not null default '{common}'::text[],
  species_keywords text[] not null default '{}'::text[],
  search_keywords text[] not null default '{}'::text[],
  age_policy_type public.guide_age_policy_type not null default 'all',
  age_policy_life_stage public.guide_life_stage_key,
  age_policy_min_months integer,
  age_policy_max_months integer,
  status public.guide_content_status not null default 'draft',
  is_active boolean not null default true,
  priority integer not null default 0,
  sort_order integer not null default 0,
  rotation_weight integer not null default 1,
  thumbnail_image_url text,
  cover_image_url text,
  image_alt text,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  search_document tsvector not null default ''::tsvector,
  constraint pet_care_guides_title_length_check
    check (char_length(btrim(title)) between 1 and 120),
  constraint pet_care_guides_summary_length_check
    check (char_length(btrim(summary)) between 1 and 400),
  constraint pet_care_guides_body_preview_length_check
    check (char_length(btrim(body_preview)) between 1 and 400),
  constraint pet_care_guides_category_check
    check (category in ('nutrition', 'health', 'behavior', 'daily-care', 'environment', 'safety', 'seasonal')),
  constraint pet_care_guides_target_species_check
    check (
      target_species <@ array['dog', 'cat', 'other', 'common']::text[]
      and cardinality(target_species) > 0
    ),
  constraint pet_care_guides_age_policy_range_check
    check (
      age_policy_type <> 'ageRange'
      or age_policy_min_months is not null
      or age_policy_max_months is not null
    ),
  constraint pet_care_guides_age_policy_min_max_check
    check (
      age_policy_min_months is null
      or age_policy_max_months is null
      or age_policy_min_months <= age_policy_max_months
    ),
  constraint pet_care_guides_life_stage_check
    check (
      age_policy_type <> 'lifeStage'
      or age_policy_life_stage is not null
    )
);

create index if not exists idx_pet_care_guides_publish_order
  on public.pet_care_guides (
    is_active,
    status,
    priority desc,
    sort_order asc,
    published_at desc nulls last
  )
  where deleted_at is null;

create index if not exists idx_pet_care_guides_target_species_gin
  on public.pet_care_guides using gin (target_species);

create index if not exists idx_pet_care_guides_tags_gin
  on public.pet_care_guides using gin (tags);

create index if not exists idx_pet_care_guides_search_keywords_gin
  on public.pet_care_guides using gin (search_keywords);

create index if not exists idx_pet_care_guides_search_document_gin
  on public.pet_care_guides using gin (search_document);

create index if not exists idx_pet_care_guides_title_trgm
  on public.pet_care_guides using gin (title gin_trgm_ops);

create table if not exists public.pet_care_guide_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,
  guide_id uuid not null references public.pet_care_guides(id) on delete cascade,
  event_type public.guide_event_type not null,
  placement text not null,
  rotation_window_key text,
  search_query text,
  context_species_group public.pet_species_group,
  context_species_detail_key text,
  context_age_in_months integer,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  constraint pet_care_guide_events_context_age_check
    check (context_age_in_months is null or context_age_in_months >= 0)
);

create index if not exists idx_pet_care_guide_events_user_occurred
  on public.pet_care_guide_events (user_id, occurred_at desc);

create index if not exists idx_pet_care_guide_events_pet_occurred
  on public.pet_care_guide_events (pet_id, occurred_at desc);

create index if not exists idx_pet_care_guide_events_guide_event_type
  on public.pet_care_guide_events (guide_id, event_type, occurred_at desc);

create index if not exists idx_pet_care_guide_events_search_query
  on public.pet_care_guide_events using gin (search_query gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.refresh_pet_care_guide_search_document()
returns trigger
language plpgsql
as $$
begin
  new.search_document :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.body_preview, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.species_keywords, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.search_keywords, '{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.category, '')), 'C');

  return new;
end;
$$;

drop trigger if exists trg_pet_care_guides_updated_at on public.pet_care_guides;
create trigger trg_pet_care_guides_updated_at
before update on public.pet_care_guides
for each row execute function public.set_updated_at();

drop trigger if exists trg_pet_care_guides_search_document on public.pet_care_guides;
create trigger trg_pet_care_guides_search_document
before insert or update of title, summary, body_preview, tags, species_keywords, search_keywords, category
on public.pet_care_guides
for each row execute function public.refresh_pet_care_guide_search_document();

update public.pet_care_guides
set search_document =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(summary, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(body_preview, '')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(tags, '{}'::text[]), ' ')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(species_keywords, '{}'::text[]), ' ')), 'B') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(search_keywords, '{}'::text[]), ' ')), 'C') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'C')
where search_document = ''::tsvector;

create or replace function public.is_guide_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

alter table public.pet_care_guides enable row level security;
alter table public.pet_care_guide_events enable row level security;

drop policy if exists "pet_care_guides_public_read" on public.pet_care_guides;
create policy "pet_care_guides_public_read"
on public.pet_care_guides
for select
to authenticated
using (
  deleted_at is null
  and is_active = true
  and status = 'published'
  and (published_at is null or published_at <= timezone('utc', now()))
);

drop policy if exists "pet_care_guides_admin_all" on public.pet_care_guides;
create policy "pet_care_guides_admin_all"
on public.pet_care_guides
for all
to authenticated
using (public.is_guide_admin())
with check (public.is_guide_admin());

drop policy if exists "pet_care_guide_events_insert_own" on public.pet_care_guide_events;
create policy "pet_care_guide_events_insert_own"
on public.pet_care_guide_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    pet_id is null
    or exists (
      select 1
      from public.pets p
      where p.id = pet_id
        and p.user_id = auth.uid()
    )
  )
);

drop policy if exists "pet_care_guide_events_select_own" on public.pet_care_guide_events;
create policy "pet_care_guide_events_select_own"
on public.pet_care_guide_events
for select
to authenticated
using (user_id = auth.uid() or public.is_guide_admin());

drop policy if exists "pet_care_guide_events_admin_manage" on public.pet_care_guide_events;
create policy "pet_care_guide_events_admin_manage"
on public.pet_care_guide_events
for all
to authenticated
using (public.is_guide_admin())
with check (public.is_guide_admin());

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

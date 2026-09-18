begin;

-- NURI-09 targeted hygiene contract.
-- The registry is server-maintained and excludes only the three canonical QA
-- identities from real public ranking rows. Synthetic ranking fixtures remain
-- explicit-opt-in and are governed by the existing fixture gate.
create table public.nuri_public_ranking_exclusions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  classification text not null check (classification = 'canonical_qa'),
  exclude_from_public_ranking boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.nuri_public_ranking_exclusions enable row level security;
revoke all on table public.nuri_public_ranking_exclusions
  from public, anon, authenticated, service_role;

-- Seed only identities that already exist in auth.users. This keeps a fresh
-- local replay safe without creating accounts; the canonical remote gate
-- separately requires all three approved identities to be present.
insert into public.nuri_public_ranking_exclusions (
  user_id,
  classification,
  exclude_from_public_ranking
)
select u.id, 'canonical_qa', true
from auth.users u
where u.id in (
  'b8ae4ccd-cf29-4fd5-8eb9-7e6e03c45a38'::uuid,
  '663967ed-b561-4ea9-97e1-b8eaebe00707'::uuid,
  '0017f0e6-e36c-41a0-9ca4-61687a164111'::uuid
);

create function public.is_nuri_public_ranking_excluded_user_v1(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.nuri_public_ranking_exclusions e
    where e.user_id = p_user_id
      and e.exclude_from_public_ranking
  );
$$;

revoke all on function public.is_nuri_public_ranking_excluded_user_v1(uuid)
  from public, anon, authenticated, service_role;

-- This definition is copied from the live catalog and changes only the
-- real_rows eligibility predicate. Existing status handling, fixture opt-in,
-- masking, ordering, limit clamp, signature, and result shape stay intact.
create or replace function public.get_activity_ranking_v1(
  p_category text default 'overall',
  p_limit integer default 20,
  p_include_qa_fixture boolean default false
)
returns table (
  rank_no integer,
  display_name text,
  score integer,
  level integer,
  total_xp integer,
  category text,
  is_current_user boolean,
  row_source text
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_category text := lower(nullif(btrim(coalesce(p_category, 'overall')), ''));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_include_qa boolean;
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  if v_category not in ('overall', 'walk', 'posts', 'comments', 'health', 'life', 'grooming') then
    v_category := 'overall';
  end if;

  v_include_qa := coalesce(p_include_qa_fixture, false)
    and public.is_nuri_qa_fixture_user_v1();

  return query
    with eligible_users as (
      select s.user_id, s.total_xp, s.level
      from public.user_level_summaries s
      where not public.is_nuri_public_ranking_excluded_user_v1(s.user_id)
        and not exists (
        select 1
        from public.account_deletion_requests r
        where r.user_id = s.user_id
          and r.status in (
            'requested',
            'in_progress',
            'db_deleted',
            'cleanup_pending',
            'completed',
            'completed_with_cleanup_pending',
            'unknown_pending_confirmation'
          )
      )
    ),
    ledger_scores as (
      select
        l.user_id,
        coalesce(sum(l.xp) filter (
          where l.event_type in (
            'walk_record',
            'walk_timeline_post',
            'streak_3_bonus',
            'streak_7_bonus',
            'streak_30_bonus'
          )
        ), 0)::integer as walk_score,
        count(*) filter (
          where l.event_type in ('timeline_post', 'walk_timeline_post', 'community_post')
        )::integer as post_score,
        count(*) filter (where l.event_type = 'comment')::integer as comment_score,
        count(*) filter (where l.event_type = 'health_record')::integer as health_score
      from public.user_xp_ledger l
      group by l.user_id
    ),
    memory_scores as (
      select
        m.user_id,
        count(*) filter (where m.category = 'other')::integer as life_score,
        count(*) filter (where m.sub_category = 'grooming')::integer as grooming_score
      from public.memories m
      group by m.user_id
    ),
    real_rows as (
      select
        case v_category
          when 'overall' then eu.total_xp
          when 'walk' then coalesce(ls.walk_score, 0)
          when 'posts' then coalesce(ls.post_score, 0)
          when 'comments' then coalesce(ls.comment_score, 0)
          when 'health' then coalesce(ls.health_score, 0)
          when 'life' then coalesce(ms.life_score, 0)
          when 'grooming' then coalesce(ms.grooming_score, 0)
          else eu.total_xp
        end::integer as score,
        eu.level::integer as level,
        eu.total_xp::integer as total_xp,
        v_category as category,
        (eu.user_id = v_actor_id) as is_current_user,
        'user'::text as row_source,
        null::text as fixture_name
      from eligible_users eu
      left join ledger_scores ls
        on ls.user_id = eu.user_id
      left join memory_scores ms
        on ms.user_id = eu.user_id
    ),
    fixture_rows as (
      select
        case v_category
          when 'overall' then f.total_xp
          when 'walk' then f.walk_score
          when 'posts' then f.post_score
          when 'comments' then f.comment_score
          when 'health' then f.health_score
          when 'life' then f.life_score
          when 'grooming' then f.grooming_score
          else f.total_xp
        end::integer as score,
        f.level::integer as level,
        f.total_xp::integer as total_xp,
        v_category as category,
        false as is_current_user,
        'qa_fixture'::text as row_source,
        f.display_name as fixture_name
      from public.activity_ranking_qa_fixtures f
      where v_include_qa = true
        and f.is_active = true
    ),
    union_rows as (
      select * from real_rows
      union all
      select * from fixture_rows
    ),
    ranked as (
      select
        row_number() over (
          order by union_rows.score desc,
                   union_rows.total_xp desc,
                   union_rows.level desc,
                   union_rows.row_source asc,
                   coalesce(union_rows.fixture_name, '') asc
        )::integer as rank_no,
        union_rows.score,
        union_rows.level,
        union_rows.total_xp,
        union_rows.category,
        union_rows.is_current_user,
        union_rows.row_source,
        union_rows.fixture_name
      from union_rows
      where union_rows.score > 0
    )
    select
      ranked.rank_no,
      case
        when ranked.is_current_user then '나'
        when ranked.row_source = 'qa_fixture' then ranked.fixture_name
        else '누리 친구 ' || ranked.rank_no::text
      end as display_name,
      ranked.score,
      ranked.level,
      ranked.total_xp,
      ranked.category,
      ranked.is_current_user,
      ranked.row_source
    from ranked
    order by ranked.rank_no
    limit v_limit;
end;
$function$;

revoke all on function public.get_activity_ranking_v1(text, integer, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.get_activity_ranking_v1(text, integer, boolean)
  to authenticated;

commit;

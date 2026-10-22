-- Remote migration identity: 20261022104018, created by the approved MCP apply.
-- One read-only ranking snapshot: public top ten plus the caller outside it.
-- Scores, account exclusions and the existing rank ordering remain unchanged.
begin;

create or replace function public.get_activity_ranking_snapshot_v1(
  p_category text default 'overall'
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
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_category text := lower(nullif(btrim(coalesce(p_category, 'overall')), ''));
begin
  if v_actor_id is null then
    raise exception 'NURI_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_category is null or v_category not in ('overall', 'walk', 'posts', 'comments', 'health', 'life', 'grooming') then
    v_category := 'overall';
  end if;

  return query
    with eligible_users as (
      select s.user_id, s.total_xp, s.level
      from public.user_level_summaries s
      where not public.is_nuri_public_ranking_excluded_user_v1(s.user_id)
        and not exists (
          select 1 from public.account_deletion_requests r
          where r.user_id = s.user_id
            and r.status in (
              'requested', 'in_progress', 'db_deleted', 'cleanup_pending',
              'completed', 'completed_with_cleanup_pending', 'unknown_pending_confirmation'
            )
        )
    ), ledger_scores as (
      select l.user_id,
        coalesce(sum(l.xp) filter (
          where l.event_type in ('walk_record', 'walk_timeline_post', 'streak_3_bonus', 'streak_7_bonus', 'streak_30_bonus')
        ), 0)::integer as walk_score,
        count(*) filter (where l.event_type in ('timeline_post', 'walk_timeline_post', 'community_post'))::integer as post_score,
        count(*) filter (where l.event_type = 'comment')::integer as comment_score,
        count(*) filter (where l.event_type = 'health_record')::integer as health_score
      from public.user_xp_ledger l group by l.user_id
    ), memory_scores as (
      select m.user_id,
        count(*) filter (where m.category = 'other')::integer as life_score,
        count(*) filter (where m.sub_category = 'grooming')::integer as grooming_score
      from public.memories m group by m.user_id
    ), real_rows as (
      select eu.user_id,
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
        eu.total_xp::integer as total_xp
      from eligible_users eu
      left join ledger_scores ls on ls.user_id = eu.user_id
      left join memory_scores ms on ms.user_id = eu.user_id
    ), ranked as materialized (
      select row_number() over (
        order by rr.score desc, rr.total_xp desc, rr.level desc
      )::integer as rank_no, rr.score, rr.level, rr.total_xp,
        (rr.user_id = v_actor_id) as is_current_user
      from real_rows rr where rr.score > 0
    )
    select ranked.rank_no,
      case when ranked.is_current_user then '나'
        else '누리 친구 ' || ranked.rank_no::text end,
      ranked.score, ranked.level, ranked.total_xp, v_category,
      ranked.is_current_user, 'user'::text
    from ranked
    where ranked.rank_no <= 10 or ranked.is_current_user
    order by ranked.rank_no;
end;
$function$;

revoke all on function public.get_activity_ranking_snapshot_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_activity_ranking_snapshot_v1(text) to authenticated;
comment on function public.get_activity_ranking_snapshot_v1(text) is
  'Authenticated read-only masked top ten and own rank from one snapshot; no QA fixtures or public avatars.';
notify pgrst, 'reload schema';
commit;

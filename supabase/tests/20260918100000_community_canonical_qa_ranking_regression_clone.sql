-- NURI-09 bounded ranking regression clone.
--
-- The executable body is derived from the actual live RPC definition at test
-- time. Only the five production source relations and the synthetic fixture
-- caller gate are redirected to pg_temp; the real exclusion helper and
-- auth.uid() remain in the execution path. This is session-local and rolls
-- back without changing production data.

begin;

create temporary table nuri_mock_user_level_summaries (
  user_id uuid primary key,
  total_xp integer not null,
  level integer not null
) on commit drop;

create temporary table nuri_mock_user_xp_ledger (
  user_id uuid not null,
  event_type text not null,
  xp integer not null
) on commit drop;

create temporary table nuri_mock_memories (
  user_id uuid not null,
  category text,
  sub_category text
) on commit drop;

create temporary table nuri_mock_account_deletion_requests (
  user_id uuid not null,
  status text not null
) on commit drop;

create temporary table nuri_mock_activity_ranking_qa_fixtures (
  fixture_key text primary key,
  display_name text not null,
  total_xp integer not null,
  level integer not null,
  walk_score integer not null,
  post_score integer not null,
  comment_score integer not null,
  health_score integer not null,
  life_score integer not null,
  grooming_score integer not null,
  is_active boolean not null
) on commit drop;

create temporary table nuri_mock_labels (
  label text primary key,
  user_id uuid not null unique
) on commit drop;

insert into nuri_mock_labels (label, user_id)
values
  ('current', gen_random_uuid()),
  ('pending', gen_random_uuid()),
  ('terminal', gen_random_uuid()),
  ('walk_high', gen_random_uuid()),
  ('walk_tie_a', gen_random_uuid()),
  ('walk_tie_b', gen_random_uuid()),
  ('posts_high', gen_random_uuid()),
  ('posts_tie_a', gen_random_uuid()),
  ('posts_tie_b', gen_random_uuid()),
  ('comments_high', gen_random_uuid()),
  ('comments_tie_a', gen_random_uuid()),
  ('comments_tie_b', gen_random_uuid()),
  ('health_high', gen_random_uuid()),
  ('health_tie_a', gen_random_uuid()),
  ('health_tie_b', gen_random_uuid()),
  ('life_high', gen_random_uuid()),
  ('life_tie_a', gen_random_uuid()),
  ('life_tie_b', gen_random_uuid()),
  ('grooming_high', gen_random_uuid()),
  ('grooming_tie_a', gen_random_uuid()),
  ('grooming_tie_b', gen_random_uuid());

insert into nuri_mock_user_level_summaries (user_id, total_xp, level)
select l.user_id,
       case l.label
         when 'current' then 10000
         when 'pending' then 9000
         when 'terminal' then 20000
         when 'walk_high' then 100
         when 'walk_tie_a' then 80
         when 'walk_tie_b' then 70
         when 'posts_high' then 100
         when 'posts_tie_a' then 80
         when 'posts_tie_b' then 70
         when 'comments_high' then 100
         when 'comments_tie_a' then 80
         when 'comments_tie_b' then 70
         when 'health_high' then 100
         when 'health_tie_a' then 80
         when 'health_tie_b' then 70
         when 'life_high' then 100
         when 'life_tie_a' then 80
         when 'life_tie_b' then 70
         when 'grooming_high' then 100
         when 'grooming_tie_a' then 80
         when 'grooming_tie_b' then 70
         else 1
       end,
       case l.label
         when 'current' then 10
         when 'pending' then 9
         when 'terminal' then 12
       else 3
       end
from nuri_mock_labels l;

insert into nuri_mock_user_level_summaries (user_id, total_xp, level)
values
  ('b8ae4ccd-cf29-4fd5-8eb9-7e6e03c45a38'::uuid, 15000, 5),
  ('663967ed-b561-4ea9-97e1-b8eaebe00707'::uuid, 14000, 5),
  ('0017f0e6-e36c-41a0-9ca4-61687a164111'::uuid, 13000, 4),
  ('a53f9c6c-5bce-4a37-94f7-ef5f683e538c'::uuid, 7500, 3);

insert into nuri_mock_user_level_summaries (user_id, total_xp, level)
select gen_random_uuid(), gs, 1 + (gs % 5)
from generate_series(1, 60) gs;

insert into nuri_mock_account_deletion_requests (user_id, status)
select user_id, 'pending_grace_period'
from nuri_mock_labels
where label = 'pending'
union all
select user_id, 'completed'
from nuri_mock_labels
where label = 'terminal';

insert into nuri_mock_user_xp_ledger (user_id, event_type, xp)
select l.user_id, 'walk_record',
       case l.label when 'walk_high' then 10 else 5 end
from nuri_mock_labels l
where l.label in ('walk_high', 'walk_tie_a', 'walk_tie_b')
union all
select l.user_id, 'community_post', 1
from nuri_mock_labels l
cross join lateral generate_series(
  1,
  case l.label
    when 'posts_high' then 3
    when 'posts_tie_a' then 2
    when 'posts_tie_b' then 2
    else 0
  end
) gs
where l.label in ('posts_high', 'posts_tie_a', 'posts_tie_b')
union all
select l.user_id, 'comment', 1
from nuri_mock_labels l
cross join lateral generate_series(
  1,
  case l.label
    when 'comments_high' then 3
    when 'comments_tie_a' then 2
    when 'comments_tie_b' then 2
    else 0
  end
) gs
where l.label in ('comments_high', 'comments_tie_a', 'comments_tie_b')
union all
select l.user_id, 'health_record', 1
from nuri_mock_labels l
cross join lateral generate_series(
  1,
  case l.label
    when 'health_high' then 3
    when 'health_tie_a' then 2
    when 'health_tie_b' then 2
    else 0
  end
) gs
where l.label in ('health_high', 'health_tie_a', 'health_tie_b');

insert into nuri_mock_memories (user_id, category, sub_category)
select l.user_id, 'other', null
from nuri_mock_labels l
cross join lateral generate_series(
  1,
  case l.label
    when 'life_high' then 3
    when 'life_tie_a' then 2
    when 'life_tie_b' then 2
    else 0
  end
) gs
where l.label in ('life_high', 'life_tie_a', 'life_tie_b')
union all
select l.user_id, null, 'grooming'
from nuri_mock_labels l
cross join lateral generate_series(
  1,
  case l.label
    when 'grooming_high' then 3
    when 'grooming_tie_a' then 2
    when 'grooming_tie_b' then 2
    else 0
  end
) gs
where l.label in ('grooming_high', 'grooming_tie_a', 'grooming_tie_b');

insert into nuri_mock_activity_ranking_qa_fixtures (
  fixture_key,
  display_name,
  total_xp,
  level,
  walk_score,
  post_score,
  comment_score,
  health_score,
  life_score,
  grooming_score,
  is_active
)
values
  ('clone_fixture_a', 'TEMP_FIXTURE_A', 999, 9, 20, 20, 20, 20, 20, 20, true),
  ('clone_fixture_b', 'TEMP_FIXTURE_B', 998, 8, 19, 19, 19, 19, 19, 19, true);

create or replace function pg_temp.nuri_mock_fixture_caller_allowed_v1()
returns boolean
language sql
stable
set search_path = pg_temp, pg_catalog
as $function$
  select coalesce(current_setting('nuri.mock_fixture_allowed', true), 'false') = 'true';
$function$;

do $definition$
declare
  v_live_definition text;
  v_clone_definition text;
begin
  select pg_get_functiondef(
    'public.get_activity_ranking_v1(text,integer,boolean)'::regprocedure
  )
  into v_live_definition;

  if v_live_definition is null
     or v_live_definition not like '%public.user_level_summaries%'
     or v_live_definition not like '%public.user_xp_ledger%'
     or v_live_definition not like '%public.memories%'
     or v_live_definition not like '%public.account_deletion_requests%'
     or v_live_definition not like '%public.activity_ranking_qa_fixtures%' then
    raise exception 'ranking_clone_live_definition_sources_missing';
  end if;

  v_clone_definition := replace(
    v_live_definition,
    'public.get_activity_ranking_v1',
    'pg_temp.nuri_ranking_under_test'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.user_level_summaries',
    'pg_temp.nuri_mock_user_level_summaries'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.user_xp_ledger',
    'pg_temp.nuri_mock_user_xp_ledger'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.memories',
    'pg_temp.nuri_mock_memories'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.account_deletion_requests',
    'pg_temp.nuri_mock_account_deletion_requests'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.activity_ranking_qa_fixtures',
    'pg_temp.nuri_mock_activity_ranking_qa_fixtures'
  );
  v_clone_definition := replace(
    v_clone_definition,
    'public.is_nuri_qa_fixture_user_v1()',
    'pg_temp.nuri_mock_fixture_caller_allowed_v1()'
  );

  execute v_clone_definition;
end;
$definition$;

do $auth_guard$
declare
  v_actor uuid;
  v_count integer;
begin
  select user_id into v_actor from nuri_mock_labels where label = 'current';
  perform set_config('request.jwt.claim.sub', '', false);

  begin
    select count(*) into v_count
    from pg_temp.nuri_ranking_under_test('overall', 1, false);
    raise exception 'ranking_clone_auth_guard_missing';
  exception
    when sqlstate '42501' then
      null;
  end;

  perform set_config('request.jwt.claim.sub', v_actor::text, false);
  perform set_config('nuri.mock_fixture_allowed', 'false', false);
end;
$auth_guard$;

do $assertions$
declare
  v_count integer;
  v_fixture_count integer;
  v_display_name text;
  v_score integer;
  v_total_xp integer;
  v_category text;
  v_signature text;
begin
  select pg_get_function_result(
    'pg_temp.nuri_ranking_under_test(text,integer,boolean)'::regprocedure
  )
  into v_signature;
  if v_signature not like '%rank_no integer%'
     or v_signature not like '%display_name text%'
     or v_signature not like '%row_source text%' then
    raise exception 'ranking_clone_output_shape_drifted:%', v_signature;
  end if;

  select display_name, score, total_xp
  into v_display_name, v_score, v_total_xp
  from pg_temp.nuri_ranking_under_test('overall', 1, false);
  if v_display_name <> '나' or v_score <> 10000 or v_total_xp <> 10000 then
    raise exception 'ranking_clone_current_user_masking_or_order_failed';
  end if;

  select category into v_category
  from pg_temp.nuri_ranking_under_test('all', 1, false);
  if v_category <> 'overall' then
    raise exception 'ranking_clone_all_alias_failed';
  end if;

  if exists (
    select 1
    from pg_temp.nuri_ranking_under_test('overall', 100, false)
    where total_xp in (15000, 14000, 13000)
  ) then
    raise exception 'ranking_clone_canonical_exclusion_failed';
  end if;

  select count(*) into v_count
  from pg_temp.nuri_ranking_under_test('overall', 100, false)
  where total_xp = 7500;
  if v_count <> 1 then
    raise exception 'ranking_clone_protected_operator_inclusion_failed';
  end if;

  select count(*) into v_count
  from pg_temp.nuri_ranking_under_test('overall', 100, false)
  where total_xp = 9000;
  if v_count <> 1 then
    raise exception 'ranking_clone_pending_grace_status_contract_changed';
  end if;

  select count(*) into v_count
  from pg_temp.nuri_ranking_under_test('overall', 100, false)
  where total_xp = 20000;
  if v_count <> 0 then
    raise exception 'ranking_clone_terminal_status_not_excluded';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test('overall', 100, false);
  if v_count <> 50 then
    raise exception 'ranking_clone_limit_100_not_clamped_to_50';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test('overall', -1, false);
  if v_count <> 1 then
    raise exception 'ranking_clone_negative_limit_not_clamped';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test('overall', 0, false);
  if v_count <> 1 then
    raise exception 'ranking_clone_zero_limit_not_clamped';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test('overall', 1, false);
  if v_count <> 1 then
    raise exception 'ranking_clone_limit_1_failed';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test('overall', 50, false);
  if v_count <> 50 then
    raise exception 'ranking_clone_limit_50_failed';
  end if;

  select count(*) into v_count from pg_temp.nuri_ranking_under_test();
  if v_count <> 20 then
    raise exception 'ranking_clone_default_limit_failed';
  end if;

  select count(*) into v_fixture_count
  from pg_temp.nuri_ranking_under_test('overall', 100, false);
  if v_fixture_count <> 50 then
    raise exception 'ranking_clone_fixture_default_contract_failed';
  end if;

  select count(*) into v_fixture_count
  from pg_temp.nuri_ranking_under_test('overall', 100, true)
  where row_source = 'qa_fixture';
  if v_fixture_count <> 0 then
    raise exception 'ranking_clone_non_opt_in_fixture_gate_failed';
  end if;

  perform set_config('nuri.mock_fixture_allowed', 'true', false);
  select count(*) into v_fixture_count
  from pg_temp.nuri_ranking_under_test('overall', 100, true)
  where row_source = 'qa_fixture';
  if v_fixture_count <> 2 then
    raise exception 'ranking_clone_opt_in_fixture_gate_failed';
  end if;

  perform set_config('nuri.mock_fixture_allowed', 'false', false);

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('walk', 1, false)
    where score = 10 and total_xp = 100
  ) then
    raise exception 'ranking_clone_walk_score_failed';
  end if;

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('posts', 1, false)
    where score = 3 and total_xp = 100
  ) then
    raise exception 'ranking_clone_posts_score_failed';
  end if;

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('comments', 1, false)
    where score = 3 and total_xp = 100
  ) then
    raise exception 'ranking_clone_comments_score_failed';
  end if;

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('health', 1, false)
    where score = 3 and total_xp = 100
  ) then
    raise exception 'ranking_clone_health_score_failed';
  end if;

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('life', 1, false)
    where score = 3 and total_xp = 100
  ) then
    raise exception 'ranking_clone_life_score_failed';
  end if;

  if not exists (
    select 1 from pg_temp.nuri_ranking_under_test('grooming', 1, false)
    where score = 3 and total_xp = 100
  ) then
    raise exception 'ranking_clone_grooming_score_failed';
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('walk', 3, false);
  if v_category <> '10:100,5:80,5:70' then
    raise exception 'ranking_clone_walk_tie_break_failed:%', v_category;
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('posts', 3, false);
  if v_category <> '3:100,2:80,2:70' then
    raise exception 'ranking_clone_posts_tie_break_failed:%', v_category;
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('comments', 3, false);
  if v_category <> '3:100,2:80,2:70' then
    raise exception 'ranking_clone_comments_tie_break_failed:%', v_category;
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('health', 3, false);
  if v_category <> '3:100,2:80,2:70' then
    raise exception 'ranking_clone_health_tie_break_failed:%', v_category;
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('life', 3, false);
  if v_category <> '3:100,2:80,2:70' then
    raise exception 'ranking_clone_life_tie_break_failed:%', v_category;
  end if;

  select string_agg(score::text || ':' || total_xp::text, ',' order by rank_no)
  into v_category
  from pg_temp.nuri_ranking_under_test('grooming', 3, false);
  if v_category <> '3:100,2:80,2:70' then
    raise exception 'ranking_clone_grooming_tie_break_failed:%', v_category;
  end if;
end;
$assertions$;

rollback;

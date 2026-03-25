-- scripts/verify_task2.sql
-- 사용 전:
-- 1. 아래 USER_EMAIL을 테스트 계정 이메일로 바꿔라.
-- 2. 삭제 전/삭제 후 각각 실행해서 비교해라.

\echo '=== 0. target user lookup ==='
select id, email
from auth.users
where email = 'TEST_USER_EMAIL';

\echo '=== 1. nullable check ==='
select
  table_name,
  column_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'reports' and column_name = 'reporter_id') or
    (table_name = 'pet_place_user_reports' and column_name = 'user_id') or
    (table_name = 'pet_travel_user_reports' and column_name = 'user_id')
  )
order by table_name, column_name;

\echo '=== 2. task2 tables exist ==='
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'account_deletion_requests',
    'account_deletion_cleanup_items'
  )
order by table_name;

\echo '=== 3. functions exist ==='
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_account_deletion_request',
    'delete_my_account',
    'mark_account_deletion_unknown',
    'claim_account_deletion_cleanup_items',
    'complete_account_deletion_cleanup_item'
  )
order by p.proname;

\echo '=== 4. indexes ==='
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('account_deletion_requests', 'account_deletion_cleanup_items')
order by tablename, indexname;

\echo '=== 5. target user id CTE ==='
with target_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select
  (select count(*) from public.profiles where user_id = (select id from target_user)) as profiles_count,
  (select count(*) from public.pets where user_id = (select id from target_user)) as pets_count,
  (select count(*) from public.memories where user_id = (select id from target_user)) as memories_count,
  (select count(*) from public.pet_schedules where user_id = (select id from target_user)) as schedules_count,
  (select count(*) from public.posts where user_id = (select id from target_user)) as posts_count,
  (select count(*) from public.comments where user_id = (select id from target_user)) as comments_count,
  (select count(*) from public.likes where user_id = (select id from target_user)) as likes_count,
  (select count(*) from public.comment_likes where user_id = (select id from target_user)) as comment_likes_count,
  (select count(*) from public.pet_place_bookmarks where user_id = (select id from target_user)) as bookmarks_count,
  (select count(*) from public.user_consent_history where user_id = (select id from target_user)) as consent_count,
  (select count(*) from public.reports where reporter_id = (select id from target_user)) as reports_count;

\echo '=== 6. optional report tables ==='
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'pet_place_user_reports'
  ) then
    raise notice 'pet_place_user_reports exists';
  else
    raise notice 'pet_place_user_reports missing';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'pet_travel_user_reports'
  ) then
    raise notice 'pet_travel_user_reports exists';
  else
    raise notice 'pet_travel_user_reports missing';
  end if;
end $$;

\echo '=== 7. storage path samples ==='
with target_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select 'pets.profile_image_url' as source, p.profile_image_url as path
from public.pets p
where p.user_id = (select id from target_user)
limit 10;

with target_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select 'memories.image_url' as source, m.image_url as path
from public.memories m
where m.user_id = (select id from target_user)
limit 10;

with target_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select 'memory_images.original_path' as source, mi.original_path as path
from public.memory_images mi
join public.memories m on m.id = mi.memory_id
where m.user_id = (select id from target_user)
limit 10;

with target_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select 'posts.image_url' as source, p.image_url as path
from public.posts p
where p.user_id = (select id from target_user)
limit 10;

\echo '=== 8. latest deletion requests ==='
select
  id,
  user_id,
  status,
  storage_cleanup_pending,
  cleanup_item_count,
  cleanup_completed_count,
  requested_at,
  completed_at,
  cleanup_completed_at,
  last_error_code,
  last_error_message
from public.account_deletion_requests
order by requested_at desc
limit 10;

\echo '=== 9. latest cleanup items ==='
select
  request_id,
  bucket_name,
  storage_path,
  status,
  claimed_at,
  completed_at,
  last_error_code,
  last_error_message
from public.account_deletion_cleanup_items
order by created_at desc
limit 30;

\echo '=== 10. cleanup summary ==='
select
  bucket_name,
  status,
  count(*) as item_count
from public.account_deletion_cleanup_items
group by bucket_name, status
order by bucket_name, status;

\echo '=== 11. consent anonymization check ==='
with deleted_user as (
  select id
  from auth.users
  where email = 'TEST_USER_EMAIL'
  limit 1
)
select
  count(*) filter (where user_id is not null) as direct_user_rows,
  count(*) filter (where anonymized_subject_id is not null) as anonymized_rows
from public.user_consent_history;

\echo '=== 12. storage.objects spot check ==='
select
  bucket_id,
  name,
  created_at
from storage.objects
where bucket_id in ('pet-profiles', 'memory-images', 'community-images')
order by created_at desc
limit 50;
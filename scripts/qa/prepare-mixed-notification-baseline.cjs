'use strict';

// Emit only repository definitions for the already provisioned N15 stack.
// No data import, scheduler, delivery triggers, or changes to migration history.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function slice(file, start, end) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const from = source.indexOf(start);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  if (from < 0 || to < 0) throw Error('Missing pinned SQL section: ' + file);
  return source.slice(from, to);
}
function migration(name, start, end) {
  return slice('supabase/migrations/' + name + '.sql', start, end);
}
const contract = '20261025030651_notification_contract_v3';
const boot = 'docs/sql/공용/누리-전체초기구성-부트스트랩.sql';
const sql = [
  'begin;',
  "do $$ begin if to_regclass('support_private.tickets') is null or to_regclass('public.user_notifications') is not null then raise exception 'Unexpected N15 baseline'; end if; end $$;",
  slice(boot, "do $$\nbegin\n  if not exists (select 1 from pg_type where typname = 'emotion_tag')", "do $$\nbegin\n  if not exists (select 1 from pg_type where typname = 'recall_mode')"),
  slice(boot, 'create table if not exists public.memories', 'create index if not exists idx_memories_user_id'),
  slice(boot, 'create table if not exists public.pet_schedules', 'create index if not exists idx_pet_schedules_'),
  migration('20260330140443_backfilled_baseline_history_account_deletion_consent', 'create table if not exists public.account_deletion_requests', 'create index'),
  migration('20260701090000_v11_second_mvp_activity_notifications_xp', 'create table if not exists public.announcements', 'create table if not exists public.user_xp_ledger'),
  migration('20260713190000_admin_final_operations_platform', 'create table if not exists public.user_notification_preferences', 'create table if not exists public.user_push_tokens'),
  migration('20260702030000_v11_notification_dismissals', 'alter table public.user_notifications', 'create or replace function public.get_user_notification_unread_count_v1'),
  migration('20260709120000_v111_rankings_notifications_level30', 'alter table public.user_notifications', 'alter table public.user_level_summaries'),
  migration('20261024044757_activity_title_catalog_v2', 'create schema title_private', 'create table title_private.nuri_title_legacy_receipts_v2'),
  'alter table title_private.nuri_title_catalog_v2 enable row level security; alter table title_private.nuri_title_policy_state_v2 enable row level security; alter table title_private.nuri_title_awards_v2 enable row level security;',
  migration(contract, 'create schema if not exists notification_private', 'create function notification_private.preferences_v3'),
  migration('20261105072331_notification_inbox_30_day_retention', 'create or replace function notification_private.inbox_v3', '-- Bounded maintenance'),
  migration('20261109064658_notification_preserve_first_user_read_v3', 'create or replace function notification_private.mark_read_v3'),
  migration('20261025040438_notification_dismissal_compatibility_v3', 'create function notification_private.dismiss_v3', 'commit;'),
  migration('20261105100451_notification_inbox_badge_snapshot', 'create function notification_private.badge_snapshot_v3', 'create or replace function notification_private.delivery_devices_v3'),
  migration('20260709120000_v111_rankings_notifications_level30', 'create or replace function public.is_nuri_notification_admin_v1', 'create or replace function public.is_nuri_qa_fixture_user_v1'),
  migration('20261025030905_notification_publish_delivery_v3_recovered', 'create function notification_private.publish_v3', '-- Revalidate the current source'),
  migration('20261025030905_notification_publish_delivery_v3_recovered', 'create function notification_private.publication_v3', 'create function notification_private.fanout_v3'),
  "alter table public.announcements enable row level security; alter table public.user_notifications enable row level security; alter table public.user_notification_reads enable row level security; alter table public.user_notification_preferences enable row level security; alter table public.account_deletion_requests enable row level security; alter table public.memories enable row level security; alter table public.pet_schedules enable row level security;",
  "revoke all on all functions in schema notification_private from public,anon,authenticated; revoke all on function public.get_user_notifications_v3(integer,timestamptz,uuid,text),public.get_user_notification_detail_v3(uuid,text),public.mark_all_user_notifications_read_v3(),public.mark_user_notification_read_v1(uuid,text),public.get_user_notification_unread_count_v1(),public.publish_nuri_announcement_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean) from public,anon;",
  'grant usage on schema notification_private to authenticated;',
  "grant execute on function notification_private.page_v3(integer,timestamptz,uuid,text),notification_private.detail_v3(uuid,text),notification_private.mark_read_v3(uuid,text,boolean),notification_private.dismiss_v3(uuid,text,boolean),notification_private.my_badge_v3(),notification_private.publish_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean),public.get_user_notifications_v3(integer,timestamptz,uuid,text),public.get_user_notification_detail_v3(uuid,text),public.mark_all_user_notifications_read_v3(),public.mark_user_notification_read_v1(uuid,text),public.get_user_notification_unread_count_v1(),public.publish_nuri_announcement_v3(uuid,text,text,boolean,timestamptz,timestamptz,jsonb,boolean) to authenticated;",
  "notify pgrst,'reload schema'; commit;",
];
process.stdout.write(sql.join('\n'));

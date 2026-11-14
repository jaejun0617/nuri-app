const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '../..');
const migration = readFileSync(join(root, 'supabase/migrations/20260701090000_v11_second_mvp_activity_notifications_xp.sql'), 'utf8');
const source = readFileSync(join(__dirname, 'scoped-notification-domains.sql'), 'utf8');
const marker = '-- PROVISION_PINNED_XP_LEDGER';
const start = migration.indexOf('create table if not exists public.user_xp_ledger (');
const end = migration.indexOf('create table if not exists public.user_level_summaries (');
if (start < 0 || end <= start || source.split(marker).length !== 2) {
  throw new Error('Isolated activity baseline no longer matches the pinned definition.');
}

process.stdout.write(source.replace(marker, () => `${migration.slice(start, end)}
alter table public.user_xp_ledger enable row level security;
revoke all on table public.user_xp_ledger from public,anon,authenticated;`));

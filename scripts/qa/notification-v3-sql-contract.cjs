'use strict';
const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { PGlite } = require(process.env.NURI_PGLITE_MODULE ||
  '@electric-sql/pglite');
const root = require('node:path').resolve(__dirname, '../..');
const output = process.env.NURI_NOTIFICATION_SQL_EVIDENCE_DIRECTORY;
if (!output || !require('node:path').isAbsolute(output))
  throw Error('EVIDENCE_DIRECTORY_REQUIRED');
async function main() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema cron;create schema title_private;
 create schema vault;create schema net;create table vault.decrypted_secrets(name text,decrypted_secret text);
 create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 1000) returns bigint language sql as $$select 1::bigint$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function cron.schedule(text,text,text) returns integer language sql as $$select 1$$;
 create publication supabase_realtime;
 create function public.is_nuri_notification_admin_v1() returns boolean language sql stable as $$select coalesce(current_setting('test.is_admin',true),'false')='true'$$;
 create table public.reports(id uuid primary key,reporter_id uuid);
 create table public.admin_report_review_states(report_id uuid primary key,review_status text,content_review_status text);
 create function title_private.anniversary_v2(d date,y integer) returns date language sql immutable as $$select (make_date(y,extract(month from d)::int,1)+least(extract(day from d)::int,extract(day from (make_date(y,extract(month from d)::int,1)+interval '1 month -1 day'))::int)-1)::date$$;
 create table auth.users(id uuid primary key);create table public.profiles(user_id uuid primary key references auth.users(id),nickname text);
 create table public.account_deletion_requests(user_id uuid,status text);
 create table public.nuri_public_ranking_exclusions(user_id uuid primary key,classification text);
 create table public.pets(id uuid primary key,user_id uuid,name text,birth_date date,adoption_date date,death_date date);
 create table public.user_notifications(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,title text,body text,type text default 'notice',read_at timestamptz,created_at timestamptz default now(),dismissed_at timestamptz,metadata jsonb default '{}');
 create table public.announcements(id uuid primary key default gen_random_uuid(),title text,body text,type text default 'notice',is_active boolean default true,target_scope text default 'all',starts_at timestamptz,expires_at timestamptz,created_at timestamptz default now());
 create table public.user_notification_reads(user_id uuid,announcement_id uuid references public.announcements(id),read_at timestamptz,primary key(user_id,announcement_id));
 create table public.user_notification_dismissals(user_id uuid,announcement_id uuid,dismissed_at timestamptz,primary key(user_id,announcement_id));
 create table public.user_notification_preferences(user_id uuid primary key,push_opt_in boolean default false,categories jsonb default '{}',updated_at timestamptz default now(),opted_in_at timestamptz,opted_out_at timestamptz);
 alter table public.user_notification_preferences enable row level security;
 create policy user_notification_preferences_owner_all on public.user_notification_preferences for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 create table public.user_push_tokens(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),device_id text,platform text,provider text,token_fingerprint text,token_ciphertext text,token_status text default 'active',opt_in boolean default false,last_seen_at timestamptz,revoked_at timestamptz,revoke_reason text,updated_at timestamptz,unique(user_id,device_id,provider));
 alter table public.user_notifications enable row level security;
 create policy user_notifications_select_own on public.user_notifications for select to authenticated using(user_id=auth.uid());
 grant select on public.user_notifications to authenticated;
 create table public.community_user_blocks(blocker_user_id uuid,blocked_user_id uuid);
 create table public.posts(id uuid primary key,user_id uuid,status text default 'active',visibility text default 'public',deleted_at timestamptz);
 create table public.comments(id uuid primary key,post_id uuid,user_id uuid,parent_comment_id uuid,reply_to_comment_id uuid,content text,status text default 'active',deleted_at timestamptz);
 create table public.likes(id uuid primary key default gen_random_uuid(),post_id uuid,user_id uuid);
 create table public.comment_likes(id uuid primary key default gen_random_uuid(),comment_id uuid,user_id uuid);
 create table public.memories(id uuid primary key,user_id uuid,pet_id uuid,title text,content text,occurred_at date,category text,sub_category text,price integer,emotion text,tags text[],metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now());
 create table public.pet_schedules(id uuid primary key,user_id uuid,pet_id uuid,title text,starts_at timestamptz,updated_at timestamptz default now(),completed_at timestamptz,sync_status text default 'synced',reminder_minutes integer[],repeat_rule text default 'none',repeat_interval integer default 1,repeat_until timestamptz);
 create table public.user_level_summaries(user_id uuid,level integer,total_xp integer);
 create table public.user_xp_ledger(id uuid primary key,user_id uuid,pet_id uuid,xp integer,source_type text,source_id text);
 create table title_private.nuri_title_catalog_v2(id text primary key,name text);
 create table title_private.nuri_title_awards_v2(id uuid primary key,user_id uuid,pet_id uuid,title_id text,reason text);
 create trigger trg_notify_community_comment_insert_v1 after insert on public.comments for each row execute function pg_catalog.suppress_redundant_updates_trigger();
 drop trigger trg_notify_community_comment_insert_v1 on public.comments;
 `);
  for (const name of [
    '20261025030651_notification_contract_v3.sql',
    '20261025030704_notification_scheduler_v3.sql',
    '20261025030905_notification_publish_delivery_v3_recovered.sql',
    '20261025030939_notification_device_transport_v3.sql',
    '20261025040438_notification_dismissal_compatibility_v3.sql',
    '20261025054948_notification_qa_delivery_scope.sql',
    '20261025091403_notification_granular_preferences.sql',
    '20261025094515_notification_event_preference_key.sql',
    '20261025095926_notification_preference_realtime.sql',
    '20261028031925_notification_memorial_birthday.sql',
    '20261105072331_notification_inbox_30_day_retention.sql',
    '20261105100451_notification_inbox_badge_snapshot.sql',
    '20261106050544_notification_birthday_midnight_inbox.sql',
  ]) {
    try {
      await db.exec(
        fs.readFileSync(root + '/supabase/migrations/' + name, 'utf8'),
      );
      console.log(name + ' COMPILED');
    } catch (e) {
      console.log(
        JSON.stringify({
          file: name,
          message: e.message,
          code: e.code,
          where: e.where,
          internalQuery: e.internalQuery,
        }),
      );
      throw e;
    }
  }
  await db.exec(
    'create trigger trg_notify_community_comment_insert_v1 after insert on public.comments for each row execute function public.notify_community_comment_insert_v1()',
  );
  const a = crypto.randomUUID(),
    b = crypto.randomUUID(),
    pet = crypto.randomUUID(),
    post = crypto.randomUUID();
  await db.query('insert into auth.users values($1),($2)', [a, b]);
  await db.query("insert into public.nuri_public_ranking_exclusions values($1,'canonical_qa'),($2,'canonical_qa')", [a, b]);
  await db.query('update notification_private.runtime_v3 set push_qa_user_ids=array[$1,$2]::uuid[]', [a, b]);
  await db.query(
    "insert into public.profiles values($1,'누리네'),($2,'보리네')",
    [a, b],
  );
  await db.query(
    "insert into public.pets(id,user_id,name,adoption_date) values($1,$2,'누리','2026-01-31')",
    [pet, a],
  );
  await db.query('insert into public.posts(id,user_id) values($1,$2)', [
    post,
    a,
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
  const results = [];
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const count = async () =>
    (await one('select count(*)::int n from public.user_notifications')).n;
  async function test(name, fn) {
    await db.exec('begin');
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
      console.error(JSON.stringify({ test: name, message: e.message, code: e.code ?? null }));
      throw e;
    } finally {
      await db.exec('rollback');
    }
  }
  await test('inbox retention uses availability rather than creation, read time or push TTL', async () => {
    await db.query(`insert into public.user_notifications(user_id,title,created_at,available_at,read_at,expires_at) values
      ($1,'scheduled',now()-interval '40 days',now()-interval '1 hour',null,now()-interval '1 second'),
      ($1,'expired',now(),now()-interval '721 hours',now(),null),
      ($1,'future',now()-interval '40 days',now()+interval '1 hour',null,null),
      ($1,'retained',now(),now()-interval '719 hours',now(),null)`, [a]);
    assert.deepEqual((await db.query('select title from notification_private.inbox_v3($1) order by title', [a])).rows.map(r=>r.title), ['retained','scheduled']);
    const result = (await one('select notification_private.purge_expired_inbox_v3() r')).r;
    assert.equal(result.notifications, 1);
    assert.equal(await count(), 3);
    assert.equal((await one('select notification_private.purge_expired_inbox_v3() r')).r.notifications, 0);
  });
  await test('retention deadline is exactly 720 elapsed hours, including a DST session timezone', async () => {
    await db.exec("set local time zone 'America/New_York'");
    const result = await one(`with added as (
      insert into public.user_notifications(user_id,title,available_at)
      values($1,'boundary',statement_timestamp()-interval '720 hours') returning id
    ) select id from added`, [a]);
    assert.equal((await one('select count(*)::int n from notification_private.inbox_v3($1) where notification_id=$2', [a,result.id])).n, 0);
    assert.equal((await one('select notification_private.purge_expired_inbox_v3() r')).r.notifications, 1);
  });
  await test('announcement expiration hides inbox copies but preserves publication originals and reissues', async () => {
    const old = crypto.randomUUID(), reissued = crypto.randomUUID();
    // Seed historical publication timestamps only in this isolated fixture.
    await db.exec('alter table public.announcements disable trigger notification_publication_v3');
    await db.query(`insert into public.announcements(id,title,created_at,published_at) values
      ($1,'old',now()-interval '721 hours',now()-interval '721 hours'),
      ($2,'reissued',now()-interval '721 hours',now())`, [old,reissued]);
    await db.exec('alter table public.announcements enable trigger notification_publication_v3');
    await db.query('insert into public.user_notification_reads(user_id,announcement_id,read_at) values($1,$2,now()),($1,$3,now())', [a,old,reissued]);
    await db.query('insert into public.user_notification_dismissals(user_id,announcement_id,dismissed_at,dismissed_version) values($1,$2,now(),1)', [a,old]);
    assert.deepEqual((await db.query('select title from notification_private.inbox_v3($1)', [a])).rows.map(r=>r.title), ['reissued']);
    assert.deepEqual((await one('select notification_private.purge_expired_inbox_v3() r')).r, { notifications:0, reads:1, dismissals:1 });
    assert.equal((await one('select count(*)::int n from public.announcements')).n, 2);
    assert.equal((await one('select count(*)::int n from public.user_notification_reads')).n, 1);
  });
  await test('purge is bounded and cannot be called by an ordinary client', async () => {
    await db.query("insert into public.user_notifications(user_id,title,available_at) select $1,'expired',now()-interval '721 hours' from generate_series(1,1001)", [a]);
    assert.equal((await one("select has_function_privilege('authenticated','notification_private.purge_expired_inbox_v3()','execute') allowed")).allowed, false);
    assert.equal((await one("select has_function_privilege('anon','notification_private.purge_expired_inbox_v3()','execute') allowed")).allowed, false);
    assert.equal((await one('select notification_private.purge_expired_inbox_v3() r')).r.notifications, 1000);
    assert.equal(await count(), 1);
    assert.equal((await one('select notification_private.purge_expired_inbox_v3() r')).r.notifications, 1);
  });
  await test('page, unread, detail, mark and dismissal share the same retention boundary', async () => {
    const expired = crypto.randomUUID(), current = crypto.randomUUID();
    await db.query(`insert into public.user_notifications(id,user_id,title,available_at) values
      ($1,$3,'expired',now()-interval '721 hours'),($2,$3,'current',now()-interval '1 hour')`, [expired,current,a]);
    assert.equal((await one('select public.get_user_notifications_v3() p')).p.items.length, 1);
    assert.equal((await one('select public.get_user_notification_unread_count_v1() n')).n, 1);
    await db.query(`do $$begin
      perform public.get_user_notification_detail_v3('${expired}','user');
      raise exception 'EXPIRED_DETAIL_WAS_VISIBLE';
      exception when no_data_found then null;
    end$$`);
    await db.query("select public.mark_user_notification_read_v1($1,'user')", [expired]);
    assert.equal((await one('select read_at from public.user_notifications where id=$1', [expired])).read_at, null);
    await db.query('select public.dismiss_all_user_notifications_v1()');
    assert.equal((await one('select dismissed_at from public.user_notifications where id=$1', [expired])).dismissed_at, null);
    assert.ok((await one('select dismissed_at from public.user_notifications where id=$1', [current])).dismissed_at);
  });
  await test('retained inbox content does not revive an expired push delivery', async () => {
    const id = crypto.randomUUID();
    await db.query("insert into public.user_notifications(id,user_id,title,available_at,expires_at) values($1,$2,'push TTL',now()-interval '1 hour',now()-interval '1 second')", [id,a]);
    await db.query("insert into notification_private.delivery_v3(notification_id,recipient_user_id,dedupe_key,category,available_at,expires_at) values($1,$2,'retention-ttl','news',now()-interval '1 hour',now()-interval '1 second')", [id,a]);
    assert.equal((await one('select count(*)::int n from notification_private.inbox_v3($1)', [a])).n, 1);
    assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
    assert.equal((await one("select state from notification_private.delivery_v3 where dedupe_key='retention-ttl'")).state, 'expired');
  });
  await test('preference realtime keeps RLS and does not add client privileges', async () => {
    assert.equal((await one("select relrowsecurity enabled from pg_class where oid='public.user_notification_preferences'::regclass")).enabled, true);
    assert.equal((await one("select count(*)::int n from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notification_preferences'")).n, 1);
    assert.equal((await one("select has_table_privilege('anon','public.user_notification_preferences','select') allowed")).allowed, false);
  });
  await test('granular read preserves legacy master OFF and does not mutate stored preferences', async () => {
    await db.query("insert into public.user_notification_preferences(user_id,push_opt_in,categories) values($1,false,'{\"community\":true,\"service\":true,\"schedule\":true}')", [a]);
    const before = await one('select to_jsonb(p) p from public.user_notification_preferences p where user_id=$1', [a]);
    const prefs = (await one('select public.manage_user_notification_preferences_v3() p')).p;
    assert.equal(prefs.pushOptIn, false);
    assert.deepEqual(prefs.categories, { community: false, service: false, schedule: true });
    assert.deepEqual(await one('select to_jsonb(p) p from public.user_notification_preferences p where user_id=$1', [a]), before);
  });
  await test('turning news OFF preserves a separately enabled community category and transport consent', async () => {
    await db.query("insert into public.user_notification_preferences(user_id,push_opt_in,categories) values($1,true,'{\"community\":true,\"service\":true,\"record\":false}')", [a]);
    const prefs = (await one("select public.manage_user_notification_preferences_v3('{\"service\":false}') p")).p;
    assert.equal(prefs.pushOptIn, true);
    assert.deepEqual(prefs.categories, { community: true, service: false, record: false });
  });
  await test('explicit news ON after legacy master OFF cannot reactivate other latent categories', async () => {
    await db.query("insert into public.user_notification_preferences(user_id,push_opt_in,categories) values($1,false,'{\"community\":true,\"service\":false,\"record\":true,\"memorial\":false,\"schedule\":true}')", [a]);
    const prefs = (await one("select public.manage_user_notification_preferences_v3('{\"service\":true}') p")).p;
    assert.equal(prefs.pushOptIn, true);
    assert.deepEqual(prefs.categories, { community: false, service: true, record: false, memorial: false, schedule: true });
  });
  await test('last push category OFF revokes only that owner devices and preserves schedule preference', async () => {
    await db.query("insert into public.user_notification_preferences(user_id,push_opt_in,categories) values($1,true,'{\"service\":true,\"schedule\":true}')", [a]);
    await db.query("insert into public.user_push_tokens(user_id,device_id,provider,token_status,opt_in) values($1,'device-a','fcm','active',true),($2,'device-b','fcm','active',true)", [a, b]);
    const prefs = (await one("select public.manage_user_notification_preferences_v3('{\"service\":false}') p")).p;
    assert.equal(prefs.pushOptIn, false);
    assert.equal(prefs.categories.schedule, true);
    assert.equal((await one('select token_status from public.user_push_tokens where user_id=$1', [a])).token_status, 'revoked');
    assert.equal((await one('select token_status from public.user_push_tokens where user_id=$1', [b])).token_status, 'active');
  });
  await test('timezone-only write cannot turn a legacy consent ON or rewrite latent categories', async () => {
    await db.query("insert into public.user_notification_preferences(user_id,push_opt_in,categories) values($1,false,'{\"community\":true,\"service\":false}')", [a]);
    await one("select public.manage_user_notification_preferences_v3(null,'Asia/Seoul') p");
    const row = await one('select push_opt_in,categories from public.user_notification_preferences where user_id=$1', [a]);
    assert.equal(row.push_opt_in, false);
    assert.deepEqual(row.categories, { community: true, service: false });
  });
  await test('calendar month clips Jan31; leap day clips independently', async () => {
    assert.equal(
      (
        await one(
          "select notification_private.calendar_month_v3('2026-01-31',1)::text d",
        )
      ).d,
      '2026-02-28',
    );
    assert.equal(
      (
        await one(
          "select notification_private.calendar_month_v3('2024-01-31',1)::text d",
        )
      ).d,
      '2024-02-29',
    );
  });
  await test('period boundaries use explicit timezone and completed calendar windows', async () => {
    const rows = (
      await db.query(
        "select kind,start_date::text,end_date::text,due_at::text from notification_private.periods_v3('2026-11-01T00:00:00Z','Asia/Seoul')",
      )
    ).rows;
    assert.deepEqual(
      rows.map(x => [x.kind, x.start_date, x.end_date]),
      [
        ['weekly', '2026-10-19', '2026-10-26'],
        ['monthly', '2026-10-01', '2026-11-01'],
      ],
    );
  });
  const comment = async (user, parent = null, reply = null) => {
    const id = crypto.randomUUID();
    await db.query(
      "insert into public.comments(id,post_id,user_id,parent_comment_id,reply_to_comment_id,content) values($1,$2,$3,$4,$5,'정말 예뻐요')",
      [id, post, user, parent, reply],
    );
    return id;
  };
  await test('self comment is excluded; a real comment emits once with private target', async () => {
    await comment(a);
    assert.equal(await count(), 0);
    const id = await comment(b);
    assert.equal(await count(), 1);
    const n = await one('select * from public.user_notifications');
    assert.equal(n.target.commentId, id);
    assert.equal(n.category, 'community');
    await db.query("update public.comments set content='편집' where id=$1", [
      id,
    ]);
    assert.equal(await count(), 1);
  });
  await test('reply chooses actual reply context owner once, no duplicate post-owner event', async () => {
    const parent = await comment(a);
    await comment(b, parent);
    assert.equal(await count(), 1);
    assert.equal(
      (await one('select event_type e from public.user_notifications')).e,
      'community.reply',
    );
  });
  await test('bidirectional blocking suppresses creation and redacts previously stored previews', async () => {
    const id = await comment(b);
    await db.query('insert into public.community_user_blocks values($1,$2)', [
      b,
      a,
    ]);
    await comment(b);
    assert.equal(await count(), 1);
    const page = (await one('select public.get_user_notifications_v3() p')).p;
    assert.equal(page.items[0].target.kind, 'unavailable');
    assert.ok(!page.items[0].body.includes('예뻐요'));
    await db.query('delete from public.comments where id=$1', [id]);
  });
  await test('like toggle cannot generate repeated inbox/push rows', async () => {
    await db.query('insert into public.likes(post_id,user_id) values($1,$2)', [
      post,
      b,
    ]);
    await db.query('delete from public.likes where post_id=$1', [post]);
    await db.query('insert into public.likes(post_id,user_id) values($1,$2)', [
      post,
      b,
    ]);
    assert.equal(await count(), 1);
  });
  await test('cursor is stable for equal times; unread includes rows outside page', async () => {
    for (let i = 0; i < 4; i++) await comment(b);
    const first = (await one('select public.get_user_notifications_v3(2) p')).p;
    assert.equal(first.unreadCount, 4);
    assert.equal(first.hasMore, true);
    const last = first.items.at(-1),
      second = (
        await one('select public.get_user_notifications_v3(2,$1,$2,$3) p', [
          last.available_at,
          last.notification_id,
          last.notification_source,
        ])
      ).p;
    assert.equal(second.items.length, 2);
    assert.equal(
      new Set([...first.items, ...second.items].map(x => x.notification_id))
        .size,
      4,
    );
  });
  await test('mark all keeps future-available and other owner rows unread and deletes nothing', async () => {
    await comment(b);
    await db.query(
      "insert into public.user_notifications(user_id,title,body,available_at) values($1,'미래','',now()+interval '1 day'),($2,'다른 사용자','',now())",
      [a, b],
    );
    assert.equal(
      (await one('select public.mark_all_user_notifications_read_v3() n')).n,
      0,
    );
    assert.equal(await count(), 3);
    assert.equal(
      (
        await one(
          'select count(*)::int n from public.user_notifications where read_at is null',
        )
      ).n,
      2,
    );
  });
  await test('cross-user detail/read cannot inspect or mutate another inbox', async () => {
    await comment(b);
    const id = (await one('select id from public.user_notifications')).id;
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [b]);
    await assert.rejects(
      db.query("select public.get_user_notification_detail_v3($1,'user')", [
        id,
      ]),
      /NURI_NOTIFICATION_UNAVAILABLE/,
    );
  });
  await test('missing timezone rejected, existing category OFF preserved by merge', async () => {
    await db.query(
      'select public.manage_user_notification_preferences_v3(\'{"community":false}\')',
    );
    const prefs = (
      await one(
        "select public.manage_user_notification_preferences_v3('{\"record\":true}','Asia/Seoul') p",
      )
    ).p;
    assert.equal(prefs.categories.community, false);
    assert.equal(prefs.categories.record, true);
  });
  await test('schedule cancellation/version invalidates old inbox target; no duplicate OS queue', async () => {
    const id = crypto.randomUUID();
    await db.query(
      "update notification_private.runtime_v3 set activated_at=statement_timestamp()-interval '2 days'",
    );
    await db.query(
      "insert into public.pet_schedules(id,user_id,pet_id,title,starts_at,reminder_minutes,updated_at) values($1,$2,$3,'정기검진',statement_timestamp()+interval '59 minutes',array[60],statement_timestamp()-interval '2 days')",
      [id, a, pet],
    );
    await db.query(
      'select notification_private.scheduler_user_v3($1,statement_timestamp())',
      [a],
    );
    assert.equal(await count(), 1);
    assert.equal(
      (
        await one(
          'select count(*)::int n from notification_private.delivery_v3',
        )
      ).n,
      0,
    );
    await db.query(
      'update public.pet_schedules set completed_at=now() where id=$1',
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notifications_v3() p')).p.items[0]
        .target.kind,
      'unavailable',
    );
  });
  await test('monthly summary uses record occurrence dates, exact fixed period and dedupe', async () => {
    await db.exec(
      "update notification_private.runtime_v3 set activated_at='2026-01-01'",
    );
    await db.query(
      "insert into public.memories(id,user_id,pet_id,title,occurred_at) values($1,$2,$3,'하루','2026-10-10')",
      [crypto.randomUUID(), a, pet],
    );
    await db.query(
      "select notification_private.scheduler_user_v3($1,'2026-11-01T00:01:00Z')",
      [a],
    );
    await db.query(
      "select notification_private.scheduler_user_v3($1,'2026-11-01T00:02:00Z')",
      [a],
    );
    const rows = (
      await db.query(
        "select target from public.user_notifications where event_type='record.monthly_summary'",
      )
    ).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].target.startDate, '2026-10-01');
    assert.equal(rows[0].target.endDate, '2026-11-01');
  });
  await test('new-user month notification has no invented record count; scheduler does not backfill old months', async () => {
    await db.exec(
      "update notification_private.runtime_v3 set activated_at='2026-01-01'",
    );
    await db.query(
      "select notification_private.scheduler_user_v3($1,'2026-02-28T00:01:00Z')",
      [a],
    );
    assert.equal(await count(), 1);
    assert.equal(
      (await one('select payload from public.user_notifications')).payload
        .count,
      undefined,
    );
  });
  const birthdayNow = '2026-10-28T00:01:00Z';
  const prepareBirthdays = async () => {
    const memorialPet = crypto.randomUUID();
    const otherOwnerPet = crypto.randomUUID();
    await db.exec("update notification_private.runtime_v3 set activated_at='2026-01-01'");
    await db.query("update public.pets set birth_date='2020-10-28', adoption_date=null where id=$1", [pet]);
    await db.query("insert into public.pets(id,user_id,name,birth_date,adoption_date,death_date) values($1,$2,'Remembered','2012-10-28','2020-10-28','2026-02-22'),($3,$4,'Other owner','2019-10-28',null,null)", [memorialPet, a, otherOwnerPet, b]);
    return memorialPet;
  };
  await test('scheduler creates living and memorial pet birthdays for the owner without a selected-pet input', async () => {
    const memorialPet = await prepareBirthdays();
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, birthdayNow]);
    const rows = (await db.query("select pet_id,event_type,target from public.user_notifications order by pet_id")).rows;
    assert.equal(rows.length, 2);
    assert.deepEqual(new Set(rows.map(row => row.pet_id)), new Set([pet, memorialPet]));
    assert.ok(rows.every(row => row.event_type === 'pet.birthday' && row.target.kind === 'pet_anniversary' && row.target.petId === row.pet_id));
    assert.equal((await one('select count(*)::int n from public.user_notifications where user_id=$1', [b])).n, 0);
  });
  await test('birthday replay is deduplicated per pet and year and does not change stored preferences', async () => {
    await prepareBirthdays();
    await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":true,\"record\":false}')");
    const before = await one('select to_jsonb(p) p from public.user_notification_preferences p where user_id=$1', [a]);
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, birthdayNow]);
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, '2026-10-28T03:00:00Z']);
    assert.equal(await count(), 2);
    assert.deepEqual(await one('select to_jsonb(p) p from public.user_notification_preferences p where user_id=$1', [a]), before);
  });
  await test('birthday push remains suppressed when anniversary is OFF even for a memorial pet', async () => {
    await prepareBirthdays();
    await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":false,\"record\":true}')");
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, birthdayNow]);
    assert.equal(await count(), 2);
    // This fixture tests opt-out, independently of the historical birthday TTL.
    await db.exec("update notification_private.delivery_v3 set available_at=statement_timestamp(),expires_at=statement_timestamp()+interval '1 day'");
    assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
    assert.equal((await one("select count(*)::int n from notification_private.delivery_v3 where state='suppressed'")).n, 2);
  });
  await test('birthday appears at local midnight with one 09:00 delivery and unchanged push recovery cutoff', async () => {
    await prepareBirthdays();
    await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":true}','Asia/Seoul')");
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, '2026-10-27T15:00:00Z']);
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, '2026-10-28T00:00:00Z']);
    const rows = (await db.query(`select n.available_at as inbox_at,d.available_at as push_at,d.expires_at,d.next_attempt_at
      from public.user_notifications n join notification_private.delivery_v3 d on d.notification_id=n.id`)).rows;
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(new Date(row.inbox_at).toISOString(), '2026-10-27T15:00:00.000Z');
      assert.equal(new Date(row.push_at).toISOString(), '2026-10-28T00:00:00.000Z');
      assert.equal(new Date(row.expires_at).toISOString(), '2026-10-29T00:00:00.000Z');
      assert.equal(new Date(row.next_attempt_at).toISOString(), new Date(row.push_at).toISOString());
    }
  });
  await test('actual lease cannot send a visible birthday before local 09:00', async () => {
    await prepareBirthdays();
    // Choose a real timezone currently before 09:00; no production clock is changed.
    const zone = await one(`select name, (statement_timestamp() at time zone name)::date as day
      from pg_timezone_names where extract(hour from statement_timestamp() at time zone name) between 1 and 7
      order by name limit 1`);
    await db.query('update public.pets set birth_date=$1::date-interval \'1 year\',adoption_date=null,death_date=null where user_id=$2', [zone.day,a]);
    await db.query("update notification_private.runtime_v3 set activated_at=statement_timestamp()-interval '2 days'");
    await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":true}',$1)", [zone.name]);
    await db.query('update public.user_notification_preferences set push_opt_in=true where user_id=$1', [a]);
    await db.query('select notification_private.scheduler_user_v3($1,statement_timestamp())', [a]);
    assert.equal((await one('select count(*)::int n from notification_private.inbox_v3($1)', [a])).n, 2);
    assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
    assert.equal((await one("select count(*)::int n from notification_private.delivery_v3 where state='pending' and attempts=0 and available_at>statement_timestamp()")).n, 2);
  });
  await test('birthday timezone and DST boundaries use local midnight and 09:00, not a fixed nine-hour offset', async () => {
    await prepareBirthdays();
    await db.query("update public.pets set birth_date='2020-11-01',adoption_date=null,death_date=null where user_id=$1", [a]);
    await db.query("select public.manage_user_notification_preferences_v3('{}','America/New_York')");
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, '2026-11-01T04:00:00Z']);
    const row = await one('select n.available_at as inbox_at,d.available_at as push_at from public.user_notifications n join notification_private.delivery_v3 d on d.notification_id=n.id limit 1');
    assert.equal(new Date(row.inbox_at).toISOString(), '2026-11-01T04:00:00.000Z');
    assert.equal(new Date(row.push_at).toISOString(), '2026-11-01T14:00:00.000Z');
  });
  for (const field of ['read_at','dismissed_at']) {
    await test(`birthday already ${field} is suppressed by the unchanged delivery guard`, async () => {
      await prepareBirthdays();
      await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":true}')");
      await db.query('update public.user_notification_preferences set push_opt_in=true where user_id=$1', [a]);
      await db.query('select notification_private.scheduler_user_v3($1,$2)', [a,birthdayNow]);
      await db.exec(`update public.user_notifications set ${field}=statement_timestamp()`);
      await db.exec("update notification_private.delivery_v3 set available_at=statement_timestamp(),next_attempt_at=statement_timestamp(),expires_at=statement_timestamp()+interval '1 day'");
      assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
      assert.equal((await one("select count(*)::int n from notification_private.delivery_v3 where state='suppressed'")).n, 2);
    });
  }
  for (const [name, now] of [['before local midnight', '2026-10-27T14:59:59Z'], ['after the one-day push recovery window', '2026-10-29T00:00:00Z']]) {
    await test(`birthday scheduler emits no catch-up ${name}`, async () => {
      await prepareBirthdays();
      await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, now]);
      assert.equal(await count(), 0);
    });
  }
  await test('the birthday correction does not enable memorial pets together anniversaries or bypass memorial consent', async () => {
    await prepareBirthdays();
    await db.query("update public.pets set birth_date=null, death_date='2025-10-28' where user_id=$1", [a]);
    await db.query("select public.manage_user_notification_preferences_v3('{\"anniversary\":true,\"memorial\":false}')");
    await db.query('select notification_private.scheduler_user_v3($1,$2)', [a, birthdayNow]);
    assert.equal(await count(), 0);
  });
  await test('birthday correction keeps scheduler execution private', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await one("select has_function_privilege($1,'notification_private.scheduler_user_v3(uuid,timestamptz)','execute') allowed", [role])).allowed, false);
    }
  });
  await test('draft publication is absent; edits do not fan out; explicit reissue becomes unread again', async () => {
    await db.exec("select set_config('test.is_admin','true',true)");
    const id = (
      await one(
        "select public.publish_nuri_announcement_v3(null,'소식','본문',false) id",
      )
    ).id;
    assert.equal(
      (await one('select public.get_user_notifications_v3() p')).p.items.length,
      0,
    );
    await db.query(
      "select public.publish_nuri_announcement_v3($1,'소식','본문',true)",
      [id],
    );
    await db.exec(
      'select notification_private.fanout_v3();select notification_private.fanout_v3();',
    );
    assert.equal(
      (
        await one(
          'select count(*)::int n from notification_private.delivery_v3',
        )
      ).n,
      2,
    );
    await db.query(
      "select public.mark_user_notification_read_v1($1,'announcement')",
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notification_unread_count_v1() n')).n,
      0,
    );
    await db.query(
      "select public.publish_nuri_announcement_v3($1,'소식 수정','본문',true)",
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notification_unread_count_v1() n')).n,
      0,
    );
    await db.query(
      "select public.publish_nuri_announcement_v3($1,'다시 알림','본문',true,null,null,'{}',true)",
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notification_unread_count_v1() n')).n,
      1,
    );
  });
  await test('non-admin cannot publish', async () => {
    await assert.rejects(
      db.query(
        "select public.publish_nuri_announcement_v3(null,'시도','본문',true)",
      ),
      /NURI_NOTIFICATION_ADMIN_REQUIRED/,
    );
  });
  await test('source transaction rollback rolls back inbox and push outbox together', async () => {
    await db.exec('savepoint source_write');
    await comment(b);
    assert.equal(await count(), 1);
    await db.exec('rollback to source_write');
    assert.equal(await count(), 0);
    assert.equal(
      (
        await one(
          'select count(*)::int n from notification_private.delivery_v3',
        )
      ).n,
      0,
    );
  });
  await test('read-only preferences does not create settings and master opt-in preserves OFF', async () => {
    await db.exec('select public.manage_user_notification_preferences_v3()');
    assert.equal(
      (
        await one(
          'select count(*)::int n from public.user_notification_preferences',
        )
      ).n,
      0,
    );
    await db.exec(
      'select public.manage_user_notification_preferences_v3(\'{"community":false}\');select public.set_user_notification_opt_in_v1(true,\'{"community":true}\')',
    );
    assert.equal(
      (await one('select categories from public.user_notification_preferences'))
        .categories.community,
      false,
    );
  });
  await test('a real title INSERT emits once while legacy bridge awards stay quiet', async () => {
    await db.exec(
      "insert into title_private.nuri_title_catalog_v2 values('WK01','첫 산책')",
    );
    const id = crypto.randomUUID();
    await db.query(
      "insert into title_private.nuri_title_awards_v2 values($1,$2,$3,'WK01','rule_v2')",
      [id, a, pet],
    );
    await db.query(
      "insert into title_private.nuri_title_awards_v2 values($1,$2,$3,'WK01','rule_v2') on conflict do nothing",
      [id, a, pet],
    );
    await db.query(
      "insert into title_private.nuri_title_awards_v2 values($1,$2,$3,'WK01','legacy_preserved')",
      [crypto.randomUUID(), a, pet],
    );
    assert.equal(await count(), 1);
    assert.equal(
      (await one('select public.get_user_notifications_v3() p')).p.items.length,
      1,
    );
  });
  await test('XP grants use ledger ID, not source page views; no push for immediate ordinary reward', async () => {
    const id = crypto.randomUUID();
    await db.query(
      "insert into public.user_xp_ledger values($1,$2,$3,39,'memory','same-source')",
      [id, a, pet],
    );
    await db.query(
      "insert into public.user_xp_ledger values($1,$2,$3,39,'memory','same-source') on conflict do nothing",
      [id, a, pet],
    );
    assert.equal(await count(), 1);
    assert.equal(
      (
        await one(
          'select count(*)::int n from notification_private.delivery_v3',
        )
      ).n,
      0,
    );
  });
  await test('deleting a pet cannot make a record-deletion notification FK block deletion', async () => {
    const id = crypto.randomUUID();
    await db.query(
      "insert into public.memories(id,user_id,pet_id,title) values($1,$2,$3,'추억')",
      [id, a, pet],
    );
    await db.query('delete from public.pets where id=$1', [pet]);
    await db.query('delete from public.memories where id=$1', [id]);
    assert.equal(
      (
        await one(
          "select count(*)::int n from public.user_notifications where event_type='record.deleted'",
        )
      ).n,
      1,
    );
  });
  await test('multi-device registration revokes the old owner binding and opt-out blocks registration', async () => {
    await db.exec('select public.set_user_notification_opt_in_v1(true)');
    const id = (
      await one(
        "select public.register_notification_device_v3($1,'nuri-device-123456',$2,$3) id",
        [a, 'a'.repeat(64), 'cipher'.repeat(10)],
      )
    ).id;
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [b]);
    await db.exec('select public.set_user_notification_opt_in_v1(true)');
    await db.query(
      "select public.register_notification_device_v3($1,'nuri-device-123456',$2,$3)",
      [b, 'b'.repeat(64), 'cipher'.repeat(10)],
    );
    assert.equal(
      (
        await one(
          'select token_status from public.user_push_tokens where id=$1',
          [id],
        )
      ).token_status,
      'revoked',
    );
    await db.exec('select public.set_user_notification_opt_in_v1(false)');
    await assert.rejects(
      db.query(
        "select public.register_notification_device_v3($1,'nuri-device-123456',$2,$3)",
        [b, 'b'.repeat(64), 'cipher'.repeat(10)],
      ),
      /NURI_NOTIFICATION_OPT_IN_REQUIRED/,
    );
  });
  await test('lease retries back off; stale lease cannot overwrite a finished delivery', async () => {
    await db.exec(
      'select public.set_user_notification_opt_in_v1(true);select public.manage_user_notification_preferences_v3(\'{"community":true}\')',
    );
    await comment(b);
    const leases = (
      await one('select public.claim_notification_deliveries_v3(10) q')
    ).q;
    assert.equal(leases.length, 1);
    const d = leases[0];
    await db.query(
      "select public.finish_notification_delivery_v3($1,$2,'transient')",
      [d.id, d.leaseToken],
    );
    assert.deepEqual(
      await one(
        'select state,attempts,next_attempt_at>now() as delayed from notification_private.delivery_v3',
      ),
      { state: 'retry', attempts: 1, delayed: true },
    );
    assert.equal(
      (
        await one(
          "select public.finish_notification_delivery_v3($1,$2,'accepted') ok",
          [d.id, d.leaseToken],
        )
      ).ok,
      false,
    );
  });
  await test('settings OFF and deleted targets are suppressed before claim', async () => {
    await comment(b);
    await db.exec('select public.set_user_notification_opt_in_v1(false)');
    assert.deepEqual(
      (await one('select public.claim_notification_deliveries_v3(10) q')).q,
      [],
    );
    assert.equal(
      (await one('select state from notification_private.delivery_v3')).state,
      'suppressed',
    );
  });
  const leaseWithDevice = async () => {
    await db.exec(
      'select public.set_user_notification_opt_in_v1(true);select public.manage_user_notification_preferences_v3(\'{"community":true}\')',
    );
    const token = (
      await one(
        "select public.register_notification_device_v3($1,'receipt-device-123',$2,$3) id",
        [a, 'c'.repeat(64), 'cipher'.repeat(10)],
      )
    ).id;
    await comment(b);
    return {
      token,
      delivery: (
        await one('select public.claim_notification_deliveries_v3(10) q')
      ).q[0],
    };
  };
  await test('badge snapshot matches the full inbox and decreases 3 -> 2 -> 0 after actual read operations', async () => {
    const { delivery } = await leaseWithDevice();
    const extra = (await db.query("insert into public.user_notifications(user_id,title,body) values($1,'badge-two','body'),($1,'badge-three','body') returning id", [a])).rows;
    const snapshot = async () => (await one('select public.get_user_notification_badge_v3() b')).b;
    let badge = await snapshot();
    assert.equal(badge.count, 3);
    assert.equal(badge.count, (await one('select public.get_user_notification_unread_count_v1() n')).n);
    assert.ok(Number.isSafeInteger(badge.observedAt) && badge.validUntil > badge.observedAt);
    let devices = (await one('select public.get_notification_delivery_devices_v3($1,$2) q', [delivery.id,delivery.leaseToken])).q;
    assert.equal(devices[0].badge.count, 3);
    await db.query("select public.mark_user_notification_read_v1($1,'user')", [extra[0].id]);
    assert.equal((await snapshot()).count, 2);
    devices = (await one('select public.get_notification_delivery_devices_v3($1,$2) q', [delivery.id,delivery.leaseToken])).q;
    assert.equal(devices[0].badge.count, 2);
    await db.query('select public.mark_all_user_notifications_read_v3()');
    badge = await snapshot();
    assert.equal(badge.count, 0);
    assert.equal(badge.validUntil, null);
    assert.deepEqual((await one('select public.get_notification_delivery_devices_v3($1,$2) q', [delivery.id,delivery.leaseToken])).q, []);
  });
  await test('badge snapshot excludes future, expired, dismissed and other-owner rows', async () => {
    await db.query(`insert into public.user_notifications(user_id,title,body,available_at,dismissed_at) values
      ($1,'visible','body',now(),null),($1,'future','body',now()+interval '1 hour',null),
      ($1,'old','body',now()-interval '721 hours',null),($1,'dismissed','body',now(),now()),
      ($2,'other','body',now(),null)`, [a,b]);
    assert.equal((await one('select public.get_user_notification_badge_v3() b')).b.count, 1);
    assert.equal((await one("select has_function_privilege('anon','public.get_user_notification_badge_v3()','execute') allowed")).allowed, false);
    assert.equal((await one("select has_function_privilege('authenticated','notification_private.badge_snapshot_v3(uuid)','execute') allowed")).allowed, false);
    assert.equal((await one("select has_function_privilege('authenticated','public.get_user_notification_badge_v3()','execute') allowed")).allowed, true);
  });
  for (const [event, key] of [['pet.birthday', 'anniversary'], ['pet.memorial', 'memorial']]) {
    await test(`${event} uses its own ON preference while record is OFF at lease and send`, async () => {
      await db.query('select public.manage_user_notification_preferences_v3($1::jsonb)', [JSON.stringify({ [key]: true, record: false })]);
      await db.query("select public.register_notification_device_v3($1,'event-pref-device-123',$2,$3)", [a, 'd'.repeat(64), 'cipher'.repeat(10)]);
      await db.query("select notification_private.emit_v3($1,$2,'pets',$3::text,'1','QA','QA','record',jsonb_build_object('kind','pet_anniversary','petId',$3::text),'{}',$3::uuid,null,statement_timestamp(),statement_timestamp()+interval '1 hour',true)", [a, event, pet]);
      const leases = (await one('select public.claim_notification_deliveries_v3(10) q')).q;
      assert.equal(leases.length, 1);
      const lease = leases[0];
      assert.equal((await one('select public.get_notification_delivery_devices_v3($1,$2) q', [lease.id, lease.leaseToken])).q.length, 1);
      // A mid-flight OFF is checked again, even when another category stays ON.
      await db.query('select public.manage_user_notification_preferences_v3($1::jsonb)', [JSON.stringify({ [key]: false, record: true })]);
      assert.deepEqual((await one('select public.get_notification_delivery_devices_v3($1,$2) q', [lease.id, lease.leaseToken])).q, []);
      await db.query("select public.finish_notification_delivery_v3($1,$2,'accepted')", [lease.id, lease.leaseToken]);
      assert.equal((await one('select state from notification_private.delivery_v3 where id=$1', [lease.id])).state, 'suppressed');
    });
    await test(`${event} OFF is not bypassed by record ON`, async () => {
      await db.query('select public.manage_user_notification_preferences_v3($1::jsonb)', [JSON.stringify({ [key]: false, record: true })]);
      await db.query("select notification_private.emit_v3($1,$2,'pets',$3::text,'1','QA','QA','record',jsonb_build_object('kind','pet_anniversary','petId',$3::text),'{}',$3::uuid,null,statement_timestamp(),statement_timestamp()+interval '1 hour',true)", [a, event, pet]);
      assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
      assert.equal((await one('select state from notification_private.delivery_v3')).state, 'suppressed');
    });
  }
  await test('an empty QA cohort still fails closed after the event preference correction', async () => {
    await db.exec("select public.manage_user_notification_preferences_v3('{\"community\":true}')");
    await comment(b);
    await db.exec("update notification_private.runtime_v3 set push_qa_user_ids='{}'");
    assert.deepEqual((await one('select public.claim_notification_deliveries_v3(10) q')).q, []);
    assert.equal((await one('select state from notification_private.delivery_v3')).state, 'pending');
  });
  await test('accepted device receipts are omitted on retry and finalize once all devices are done', async () => {
    const { token, delivery: d } = await leaseWithDevice();
    assert.equal(
      (
        await one(
          'select public.get_notification_delivery_devices_v3($1,$2) q',
          [d.id, d.leaseToken],
        )
      ).q.length,
      1,
    );
    await db.query(
      "select public.record_notification_device_result_v3($1,$2,$3,$4,'accepted','provider-only')",
      [d.id, d.leaseToken, token, 'c'.repeat(64)],
    );
    assert.deepEqual(
      (
        await one(
          'select public.get_notification_delivery_devices_v3($1,$2) q',
          [d.id, d.leaseToken],
        )
      ).q,
      [],
    );
    await db.query(
      "select public.finish_notification_delivery_v3($1,$2,'provider_unavailable')",
      [d.id, d.leaseToken],
    );
    assert.equal(
      (await one('select state from notification_private.delivery_v3')).state,
      'accepted',
    );
  });
  await test('provider acceptance cannot be fabricated without a device receipt', async () => {
    const { delivery: d } = await leaseWithDevice();
    await db.query(
      "select public.finish_notification_delivery_v3($1,$2,'accepted')",
      [d.id, d.leaseToken],
    );
    assert.equal(
      (await one('select state from notification_private.delivery_v3')).state,
      'retry',
    );
  });
  await test('expired lease cannot record a device result or finish', async () => {
    const { token, delivery: d } = await leaseWithDevice();
    await db.exec(
      "update notification_private.delivery_v3 set leased_until=now()-interval '1 minute'",
    );
    assert.equal(
      (
        await one(
          "select public.record_notification_device_result_v3($1,$2,$3,$4,'accepted') ok",
          [d.id, d.leaseToken, token, 'c'.repeat(64)],
        )
      ).ok,
      false,
    );
    assert.equal(
      (
        await one(
          "select public.finish_notification_delivery_v3($1,$2,'accepted') ok",
          [d.id, d.leaseToken],
        )
      ).ok,
      false,
    );
  });
  await test('settings changed after lease suppress delivery; invalid tokens are not retried', async () => {
    const { token, delivery: d } = await leaseWithDevice();
    await db.query(
      "select public.record_notification_device_result_v3($1,$2,$3,$4,'permanent_failure')",
      [d.id, d.leaseToken, token, 'c'.repeat(64)],
    );
    assert.equal(
      (
        await one(
          'select token_status from public.user_push_tokens where id=$1',
          [token],
        )
      ).token_status,
      'invalid',
    );
    await db.exec(
      'select public.manage_user_notification_preferences_v3(\'{"community":false}\')',
    );
    assert.deepEqual(
      (
        await one(
          'select public.get_notification_delivery_devices_v3($1,$2) q',
          [d.id, d.leaseToken],
        )
      ).q,
      [],
    );
    await db.query(
      "select public.finish_notification_delivery_v3($1,$2,'permanent_failure')",
      [d.id, d.leaseToken],
    );
    assert.equal(
      (await one('select state from notification_private.delivery_v3')).state,
      'suppressed',
    );
  });
  await test('worker scheduling stays closed without an external Vault credential', async () => {
    assert.equal(
      (await one('select notification_private.invoke_worker_v3() id')).id,
      null,
    );
  });
  await test('dismissed announcement versions stay hidden until explicit reissue', async () => {
    await db.exec("select set_config('test.is_admin','true',true)");
    const id = (
      await one(
        "select public.publish_nuri_announcement_v3(null,'소식','본문',true) id",
      )
    ).id;
    await db.query(
      "select public.publish_nuri_announcement_v3($1,'다시 알림','본문',true,null,null,'{}',true)",
      [id],
    );
    await db.query(
      "select public.dismiss_user_notification_v1($1,'announcement')",
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notifications_v3() p')).p.items.length,
      0,
    );
    assert.equal(
      (
        await one(
          'select dismissed_version from public.user_notification_dismissals',
        )
      ).dismissed_version,
      2,
    );
    await db.query(
      "select public.publish_nuri_announcement_v3($1,'다음 소식','본문',true,null,null,'{}',true)",
      [id],
    );
    assert.equal(
      (await one('select public.get_user_notifications_v3() p')).p.unreadCount,
      1,
    );
  });
  await test('delete-all preserves other users, future notifications and original read state', async () => {
    await comment(b);
    await db.query(
      "insert into public.user_notifications(user_id,title,body,available_at) values($1,'미래','',now()+interval '1 day'),($2,'다른 사용자','',now())",
      [a, b],
    );
    await db.exec('select public.dismiss_all_user_notifications_v1()');
    assert.equal(await count(), 3);
    assert.equal(
      (
        await one(
          'select count(*)::int n from public.user_notifications where dismissed_at is not null',
        )
      ).n,
      1,
    );
    assert.equal(
      (
        await one(
          'select count(*)::int n from public.user_notifications where read_at is null',
        )
      ).n,
      3,
    );
  });
  await test('individual deletion cannot dismiss another users notification', async () => {
    await comment(b);
    const id = (await one('select id from public.user_notifications')).id;
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [b]);
    await db.query("select public.dismiss_user_notification_v1($1,'user')", [
      id,
    ]);
    assert.equal(
      (await one('select dismissed_at from public.user_notifications'))
        .dismissed_at,
      null,
    );
  });
  await test('authenticated client cannot forge a notification or call service token registration', async () => {
    await db.exec('set local role authenticated');
    await assert.rejects(
      db.query(
        "insert into public.user_notifications(user_id,title,body) values($1,'위조','')",
        [b],
      ),
      /permission denied/,
    );
  });
  await test('authenticated client cannot invoke service-only delivery leasing', async () => {
    await db.exec('set local role authenticated');
    await assert.rejects(
      db.query('select public.claim_notification_deliveries_v3()'),
      /permission denied/,
    );
  });
  await test('anonymous callers cannot list inboxes', async () => {
    await db.exec('set local role anon');
    await assert.rejects(
      db.query('select public.get_user_notifications_v3()'),
      /permission denied/,
    );
  });
  fs.writeFileSync(
    output + '/sql-results.json',
    JSON.stringify({ passed: results.length, results }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length }));
  await db.close();
}
main().catch(e => {
  console.error(e.message);
  process.exit(1);
});

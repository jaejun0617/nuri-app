'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require(process.env.NURI_PGLITE_MODULE ||
  '@electric-sql/pglite');
const root = path.resolve(__dirname, '../..');
const migration =
  'supabase/migrations/20261113095012_support_notice_board_foundation.sql';

// Isolated PostgreSQL contract harness. Auth claim/session fixtures are not OAuth or API E2E.
async function main() {
  const db = new PGlite();
  const results = [];
  const admin = randomUUID(),
    otherAdmin = randomUUID(),
    user = randomUUID(),
    session = randomUUID();
  const command = (key, op, id = null, revision = null, content = null) =>
    db
      .query('select public.support_notice_command_v1($1,$2,$3,$4,$5) result', [
        key,
        op,
        id,
        revision,
        content,
      ])
      .then(r => r.rows[0].result);
  const list = (management = false, cursor = null, limit = 20) =>
    db
      .query('select public.support_notice_list_v1(null,$1,$2,$3) result', [
        cursor,
        limit,
        management,
      ])
      .then(r => r.rows[0].result);
  const detail = (id, read = false) =>
    db
      .query('select public.support_notice_detail_v1($1,$2) result', [id, read])
      .then(r => r.rows[0].result);
  const as = async id => {
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.session',$2,false)",
      [id, session],
    );
  };
  const test = async (name, run) => {
    await run();
    results.push(name);
  };
  const content = {
    title: '공지',
    body: '게시판 본문',
    category: 'guide',
    pinned: false,
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create table auth.sessions(id uuid,user_id uuid);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session',true))$$;
      create table public.announcements(id uuid primary key, body text);
      create table public.user_notifications(id uuid primary key, body text);
      create schema notification_private; create table notification_private.delivery_v3(id uuid primary key);
      insert into public.announcements values(gen_random_uuid(),'protected');
      insert into public.user_notifications values(gen_random_uuid(),'protected');`);
    for (const id of [admin, otherAdmin, user]) {
      await db.query('insert into auth.users values($1)', [id]);
      await db.query('insert into auth.sessions values($1,$2)', [session, id]);
    }
    await db.exec(fs.readFileSync(path.join(root, migration), 'utf8'));
    const protectedState = () =>
      db.query(`select
      (select jsonb_agg(to_jsonb(a)) from public.announcements a) announcements,
      (select jsonb_agg(to_jsonb(n)) from public.user_notifications n) notifications,
      (select count(*)::int from notification_private.delivery_v3) deliveries`);
    const before = (await protectedState()).rows;
    await as(admin);
    await test('closed by default', () =>
      assert.rejects(list(), /SUPPORT_UNAVAILABLE/));
    await db.exec('update support_private.runtime set board_enabled=true');
    await db.query(
      "insert into support_private.capabilities values($1,'notices.manage'),($2,'notices.manage'),($3,'faq.manage')",
      [admin, otherAdmin, user],
    );
    await db.exec('set role authenticated');
    await test('no direct client writes or capability escalation', async () => {
      await assert.rejects(
        db.exec('update support_private.runtime set board_enabled=true'),
        /permission denied/,
      );
      await assert.rejects(
        db.exec('select * from support_private.capabilities'),
        /permission denied/,
      );
      await assert.rejects(
        db.exec('select support_private.actor()'),
        /permission denied/,
      );
    });
    const key = randomUUID();
    const first = await command(key, 'save', null, null, content);
    await test('draft stays private, management sees it', async () => {
      assert.equal((await list()).count, 0);
      assert.equal((await list(true)).count, 1);
    });
    await test('idempotent replay and changed input conflict', async () => {
      assert.deepEqual(await command(key, 'save', null, null, content), first);
      await assert.rejects(
        command(key, 'save', null, null, { ...content, title: 'different' }),
        /SUPPORT_REQUEST_CONFLICT/,
      );
    });
    let published = await command(
      randomUUID(),
      'publish',
      first.id,
      first.revision,
    );
    const initial = await detail(first.id);
    await test('public detail does not mark read before display acknowledgment', async () => {
      assert.equal((await list()).items[0].read_at, null);
      await detail(first.id, true);
      assert((await list()).items[0].read_at);
    });
    const initialRead = (await list()).items[0].read_at;
    const draft = await command(
      randomUUID(),
      'save',
      first.id,
      published.revision,
      { ...content, title: '수정 작업본' },
    );
    await test('save leaves publication intact and stale editor is rejected', async () => {
      assert.equal((await detail(first.id)).title, content.title);
      await as(otherAdmin);
      await assert.rejects(
        command(randomUUID(), 'save', first.id, published.revision, content),
        /SUPPORT_REVISION_CONFLICT/,
      );
      await as(admin);
    });
    published = await command(
      randomUUID(),
      'publish',
      first.id,
      draft.revision,
    );
    await test('publish keeps first publication date and original read', async () => {
      assert.equal((await detail(first.id)).title, '수정 작업본');
      assert.equal(
        (await detail(first.id)).first_published_at,
        initial.first_published_at,
      );
      await detail(first.id, true);
      assert.equal((await list()).items[0].read_at, initialRead);
    });
    const pinnedDraft = await command(randomUUID(), 'save', null, null, {
      ...content,
      pinned: true,
    });
    const pinned = await command(
      randomUUID(),
      'publish',
      pinnedDraft.id,
      pinnedDraft.revision,
    );
    const oldPage = await list(false, null, 1);
    await test('malformed or future cursors return stable input errors', async () => {
      for (const cursor of [
        {},
        { ...oldPage.nextCursor, offset: 'text' },
        { ...oldPage.nextCursor, asOf: 'not-a-date' },
        { ...oldPage.nextCursor, asOf: '2100-01-01T00:00:00Z' },
      ]) {
        await assert.rejects(list(false, cursor, 1), /SUPPORT_INVALID_INPUT/);
      }
    });
    const replacementDraft = await command(randomUUID(), 'save', null, null, {
      ...content,
      pinned: true,
    });
    await command(
      randomUUID(),
      'publish',
      replacementDraft.id,
      replacementDraft.revision,
    );
    await test('single pin, old editorial revision and page generation invalidated', async () => {
      assert.equal((await list()).items.filter(item => item.pinned).length, 1);
      await assert.rejects(
        command(randomUUID(), 'stop', pinned.id, pinned.revision),
        /SUPPORT_REVISION_CONFLICT/,
      );
      await assert.rejects(
        list(false, oldPage.nextCursor, 1),
        /SUPPORT_CURSOR_STALE/,
      );
    });
    const stopped = await command(
      randomUUID(),
      'stop',
      first.id,
      published.revision,
    );
    await test('stop hides new reads, explicit reissue retains identity and read', async () => {
      await assert.rejects(detail(first.id), /SUPPORT_NOT_FOUND/);
      await command(randomUUID(), 'publish', first.id, stopped.revision);
      assert.equal(
        (await detail(first.id)).first_published_at,
        initial.first_published_at,
      );
      assert.equal(
        (await list()).items.find(item => item.id === first.id).read_at,
        initialRead,
      );
    });
    await test('future and expired publications are invisible', async () => {
      const future = await command(randomUUID(), 'save', null, null, {
        ...content,
        startsAt: '2100-01-01T00:00:00Z',
      });
      const expired = await command(randomUUID(), 'save', null, null, {
        ...content,
        expiresAt: '2000-01-01T00:00:00Z',
      });
      await command(randomUUID(), 'publish', future.id, future.revision);
      await command(randomUUID(), 'publish', expired.id, expired.revision);
      await assert.rejects(detail(future.id), /SUPPORT_NOT_FOUND/);
      await assert.rejects(detail(expired.id), /SUPPORT_NOT_FOUND/);
    });
    await as(user);
    await test('FAQ-only capability cannot manage notices; reads remain account-owned', async () => {
      await assert.rejects(
        command(randomUUID(), 'save', null, null, content),
        /SUPPORT_FORBIDDEN/,
      );
      await assert.rejects(list(true), /SUPPORT_FORBIDDEN/);
      assert.equal(
        (await list()).items.find(item => item.id === first.id).read_at,
        null,
      );
    });
    await db.exec('reset role');
    await db.query(
      'delete from support_private.capabilities where user_id=$1',
      [admin],
    );
    await as(admin);
    await db.exec('set role authenticated');
    await test('revoked capability also denies cached success', () =>
      assert.rejects(
        command(key, 'save', null, null, content),
        /SUPPORT_FORBIDDEN/,
      ));
    await db.exec('reset role');
    await db.query('delete from auth.sessions where user_id=$1', [user]);
    await as(user);
    await db.exec('set role authenticated');
    await test('revoked session is rejected with unchanged claims', () =>
      assert.rejects(list(), /SUPPORT_AUTH_REQUIRED/));
    await db.exec('set role anon');
    await test('anonymous RPC access denied', () =>
      assert.rejects(list(), /permission denied/));
    await db.exec('reset role');
    await test('existing announcements, inbox and delivery remain byte-equivalent', async () =>
      assert.deepEqual((await protectedState()).rows, before));
    console.log(
      JSON.stringify(
        {
          kind: 'isolated SQL contract, not Auth/API/app E2E',
          migration,
          passed: results.length,
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.close();
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

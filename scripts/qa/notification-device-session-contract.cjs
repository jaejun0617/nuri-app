'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.NURI_PGLITE_MODULE ||
  '@electric-sql/pglite');

async function main() {
  const db = new PGlite();
  const root = path.resolve(__dirname, '../..');
  await db.exec(`
    create role anon;create role authenticated;create role service_role;
    create schema auth;create schema notification_private;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz not null,not_after timestamptz);
    create table public.user_notification_preferences(user_id uuid primary key,push_opt_in boolean);
    create table public.user_push_tokens(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),device_id text,platform text,provider text,
      token_fingerprint text,token_ciphertext text,token_status text,opt_in boolean,last_seen_at timestamptz,updated_at timestamptz,revoked_at timestamptz,revoke_reason text,
      unique(user_id,device_id,provider));
    alter table public.user_push_tokens enable row level security;
    create policy user_push_tokens_owner_all on public.user_push_tokens for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant all on public.user_push_tokens to anon,authenticated,service_role;
    create function notification_private.can_receive_v3(uuid) returns boolean language sql as $$select true$$;
    create function notification_private.register_device_v3(uuid,text,text,text) returns uuid language sql as $$select gen_random_uuid()$$;
    create function public.register_notification_device_v3(p_user uuid,p_device text,p_hash text,p_cipher text) returns uuid language sql as $$select notification_private.register_device_v3(p_user,p_device,p_hash,p_cipher)$$;
  `);
  await db.exec(
    fs.readFileSync(
      path.join(
        root,
        'supabase/migrations/20261029070215_notification_device_session_fence.sql',
      ),
      'utf8',
    ),
  );
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  const a1 = 'aaaaaaaa-1111-4111-8111-111111111111';
  const b1 = 'bbbbbbbb-1111-4111-8111-111111111111';
  const a2 = 'aaaaaaaa-2222-4222-8222-222222222222';
  const b2 = 'bbbbbbbb-2222-4222-8222-222222222222';
  await db.query('insert into auth.users values($1),($2)', [a, b]);
  await db.query(
    'insert into public.user_notification_preferences values($1,true),($2,true)',
    [a, b],
  );
  await db.query(
    `insert into auth.sessions values($1,$2,'2026-10-29T01:00Z',null),($3,$4,'2026-10-29T02:00Z',null),
    ($5,$2,'2026-10-29T03:00Z',null),($6,$4,'2026-10-29T02:30Z',null)`,
    [a1, a, b1, b, a2, b2],
  );
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const register = (owner, session, device = 'fixture-device-main') =>
    db.query('select public.register_notification_device_v3($1,$2,$3,$4,$5)', [
      owner,
      device,
      'a'.repeat(64),
      'cipher'.repeat(10),
      session,
    ]);
  const revoke = (
    owner,
    session,
    device = 'fixture-device-main',
    reason = 'user_logout',
  ) =>
    one('select public.revoke_notification_device_v3($1,$2,$3,$4) n', [
      owner,
      device,
      session,
      reason,
    ]);
  const active = () =>
    one(
      "select user_id,registration_session_id from public.user_push_tokens where device_id='fixture-device-main' and provider='fcm' and token_status='active'",
    );
  const results = [];
  async function test(name, run) {
    await db.exec('begin');
    try {
      await run();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, code: error.code ?? null });
      throw error;
    } finally {
      await db.exec('rollback');
    }
  }
  // Expected failures use savepoints so subsequent assertions observe the same transaction.
  async function rejects(run, code) {
    await db.exec('savepoint expected_failure');
    await assert.rejects(run, error => error.code === code);
    await db.exec('rollback to savepoint expected_failure');
  }
  await test('late A register cannot replace B; repeating B after response loss is idempotent', async () => {
    await register(a, a1);
    await register(b, b1);
    await rejects(() => register(a, a1), '40001');
    const before = await active();
    await register(b, b1);
    assert.deepEqual(await active(), before);
    assert.equal(before.user_id, b);
  });
  await test('late A logout cannot revoke B or a newer A login', async () => {
    await register(a, a1);
    await register(b, b1);
    assert.equal((await revoke(a, a1)).n, 0);
    assert.equal((await active()).user_id, b);
    await register(a, a2);
    assert.equal((await revoke(a, a1)).n, 0);
    assert.equal((await active()).registration_session_id, a2);
  });
  await test('logout before register leaves a tombstone across retries and restarts', async () => {
    await revoke(a, a1);
    await rejects(() => register(a, a1), '40001');
    await revoke(a, a1);
    await rejects(() => register(a, a1), '40001');
    await register(b, b1);
    assert.equal((await active()).user_id, b);
  });
  await test('token invalidation does not erase the newest session watermark', async () => {
    await register(b, b1);
    await db.exec(
      "update public.user_push_tokens set token_status='invalid',opt_in=false,revoke_reason='provider_invalid_token'",
    );
    await rejects(() => register(a, a1), '40001');
    await register(b, b1);
    assert.equal((await active()).user_id, b);
  });
  await test('another installation remains registered when this one logs out', async () => {
    await register(b, b1);
    await register(b, b2, 'fixture-device-second');
    await revoke(b, b1);
    assert.equal(
      (
        await one(
          "select count(*)::int n from public.user_push_tokens where device_id='fixture-device-second' and token_status='active'",
        )
      ).n,
      1,
    );
  });
  await test('absent expired or wrong-owner sessions cannot register', async () => {
    await rejects(() => register(a, b1), '42501');
    await db.query('delete from auth.sessions where id=$1', [a1]);
    await rejects(() => register(a, a1), '42501');
    await db.query(
      "update auth.sessions set not_after=now()-interval '1 second' where id=$1",
      [b1],
    );
    await rejects(() => register(b, b1), '42501');
  });
  await test('old service signature and legacy FCM upsert cannot bypass the fence', async () => {
    await rejects(
      () =>
        db.query('select public.register_notification_device_v3($1,$2,$3,$4)', [
          a,
          'fixture-device-main',
          'a'.repeat(64),
          'cipher'.repeat(10),
        ]),
      '42501',
    );
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [a, JSON.stringify({ session_id: a1 })],
    );
    await rejects(
      () =>
        db.query(
          "select public.upsert_user_push_token_v1('fixture-device-main','android','fcm',$1,$2,true)",
          ['a'.repeat(64), 'cipher'.repeat(10)],
        ),
      '42501',
    );
  });
  await test('disabled fallback cannot turn a preference back on', async () => {
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [a, JSON.stringify({ session_id: a1 })],
    );
    await db.query(
      'update public.user_notification_preferences set push_opt_in=false where user_id=$1',
      [a],
    );
    await rejects(
      () =>
        db.exec(
          "select public.upsert_user_push_token_v1('fixture-device-main','android','disabled',null,null,true)",
        ),
      '42501',
    );
    assert.equal(
      (
        await one(
          'select push_opt_in from public.user_notification_preferences where user_id=$1',
          [a],
        )
      ).push_opt_in,
      false,
    );
  });
  await test('late duplicate opt-out cannot revoke a re-enabled registration', async () => {
    await register(a, a1);
    assert.equal(
      (await revoke(a, a1, 'fixture-device-main', 'user_opt_out')).n,
      0,
    );
    assert.equal((await active()).user_id, a);
  });
  await test('authenticated direct writes and service RPC execution are not exposed', async () => {
    for (const privilege of ['insert', 'update', 'delete'])
      assert.equal(
        (
          await one('select has_table_privilege($1,$2,$3) allowed', [
            'authenticated',
            'public.user_push_tokens',
            privilege,
          ])
        ).allowed,
        false,
      );
    assert.equal(
      (
        await one(
          "select has_function_privilege('authenticated','public.register_notification_device_v3(uuid,text,text,text,uuid)','execute') allowed",
        )
      ).allowed,
      false,
    );
    assert.equal(
      (
        await one(
          "select has_function_privilege('anon','public.revoke_user_push_token_v1(text,text,text)','execute') allowed",
        )
      ).allowed,
      false,
    );
    assert.equal(
      (
        await one(
          "select count(*)::int n from pg_policies where tablename='user_push_tokens' and cmd<>'SELECT'",
        )
      ).n,
      0,
    );
  });
  await db.close();
  const result = {
    at: new Date().toISOString(),
    passed: results.length,
    results,
    scope: 'isolated PostgreSQL contract; not concurrent network or device E2E',
  };
  if (process.env.NURI_NOTIFICATION_SESSION_EVIDENCE)
    fs.writeFileSync(
      process.env.NURI_NOTIFICATION_SESSION_EVIDENCE,
      JSON.stringify(result, null, 2),
      { flag: 'wx', mode: 0o600 },
    );
  console.log(JSON.stringify(result));
}
main().catch(error => {
  console.error(
    JSON.stringify({ code: error.code ?? null, message: error.message }),
  );
  process.exitCode = 1;
});

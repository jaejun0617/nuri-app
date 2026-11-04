'use strict';
// Runs only against a new loopback PostgreSQL cluster with synthetic identities.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn, execFileSync } = require('node:child_process');

async function main() {
  const tools = process.env.NURI_P0_TEST_TOOLS;
  const output = process.env.NURI_P0_TEST_OUTPUT;
  assert.ok(tools && output, 'Explicit isolated tool and evidence directories required');
  const { default: EmbeddedPostgres } = await import(pathToFileURL(require.resolve('embedded-postgres', { paths: [tools] })).href);
  const log = [];
  const dbDir = path.join(output, 'postgres-data');
  assert.ok(!fs.existsSync(dbDir), 'Do not overwrite or reuse an existing database');
  const pg = new EmbeddedPostgres({ databaseDir: dbDir, user: 'postgres', password: 'local-fixture-only',
    port: 55439, persistent: true, postgresFlags: ['-h', '127.0.0.1', '-c', 'log_line_prefix=%m [%p] %e ', '-c', 'log_min_error_statement=error'],
    onLog: value => log.push(String(value)), onError: value => log.push(String(value)) });
  let api;
  let client;
  let started = false;
  const results = [];
  try {
    await pg.initialise();
    await pg.start();
    started = true;
    await pg.createDatabase('nuri_p0_test');
    const url = 'postgresql://postgres:local-fixture-only@127.0.0.1:55439/nuri_p0_test';
    const child = execFileSync(process.execPath, [path.join(__dirname, 'notification-device-session-contract.cjs')], {
      env: { ...process.env, NURI_SESSION_TEST_DATABASE_URL: url,
        NURI_PGLITE_MODULE: require.resolve('@electric-sql/pglite', { paths: [tools] }),
        NURI_PG_MODULE: require.resolve('pg', { paths: [tools] }),
        NURI_NOTIFICATION_SESSION_EVIDENCE: path.join(output, 'postgres-sql-contract.json') }, encoding: 'utf8' });
    assert.equal(JSON.parse(child.trim()).passed, 13);
    const { Client } = require(require.resolve('pg', { paths: [tools] }));
    client = new Client({ connectionString: url });
    await client.connect();
    // Only the isolated fixture receives the minimal schema access normally provided by Supabase.
    await client.query('grant usage on schema notification_private to service_role');
    const version = execFileSync(path.join(tools, 'postgrest'), ['--version'], { encoding: 'utf8' }).trim();
    const apiLog = [];
    api = spawn(path.join(tools, 'postgrest'), [], { env: { ...process.env,
      PGRST_DB_URI: url, PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'service_role',
      PGRST_SERVER_HOST: '127.0.0.1', PGRST_SERVER_PORT: '55440', PGRST_DB_POOL: '2' }, stdio: ['ignore', 'pipe', 'pipe'] });
    api.stdout.on('data', chunk => apiLog.push(String(chunk)));
    api.stderr.on('data', chunk => apiLog.push(String(chunk)));
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { ready = (await fetch('http://127.0.0.1:55440/', { signal: AbortSignal.timeout(500) })).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, apiLog.join(''));
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    const a1 = 'aaaaaaaa-1111-4111-8111-111111111111';
    const a2 = 'aaaaaaaa-2222-4222-8222-222222222222';
    const b1 = 'bbbbbbbb-1111-4111-8111-111111111111';
    const b2 = 'bbbbbbbb-2222-4222-8222-222222222222';
    const register = (user, session, device = 'fixture-device-main') => ({ p_user: user, p_session: session,
      p_device: device, p_hash: 'a'.repeat(64), p_cipher: 'cipher'.repeat(10) });
    const snapshot = async () => (await client.query('select * from user_push_tokens order by id')).rows;
    const request = async (name, body, status) => {
      const start = performance.now();
      const r = await fetch('http://127.0.0.1:55440/rpc/' + name, { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
      const value = await r.json();
      assert.equal(r.status, status, JSON.stringify(value));
      results.push({ name, status, code: value?.code || null, elapsedMs: performance.now() - start });
      return value;
    };
    const reg = (body, status = 200) => request('register_notification_device_v3', body, status);
    const revoke = (user, session, device = 'fixture-device-main') => request('revoke_notification_device_v3',
      { p_user: user, p_session: session, p_device: device, p_reason: 'user_logout' }, 200);
    await reg(register(a, a1));
    await reg(register(b, b1));
    const before = await snapshot();
    const errorStart = log.length;
    for (let i = 0; i < 3; i++) {
      assert.equal((await reg(register(a, a1), 409)).code, 'PT409');
      assert.deepEqual(await snapshot(), before);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const staleErrors = log.slice(errorStart).join('').split('\n').filter(line => /PT409.*ERROR:.*NURI_NOTIFICATION_STALE_DEVICE_SESSION/.test(line));
    assert.equal(staleErrors.length, 3, 'One SQL error per HTTP request; no internal retry');
    const id = await reg(register(b, b1));
    assert.equal(await reg(register(b, b1)), id);
    await reg(register(b, b2, 'fixture-device-second'));
    assert.equal(await revoke(a, a1), 0);
    assert.equal(await revoke(b, b1), 1);
    assert.equal((await reg(register(b, b1), 409)).code, 'PT409');
    await reg(register(a, a2));
    const final = await snapshot();
    assert.equal(final.find(row => row.device_id === 'fixture-device-main' && row.token_status === 'active').registration_session_id, a2);
    assert.equal(final.find(row => row.device_id === 'fixture-device-second').token_status, 'active');
    fs.writeFileSync(path.join(output, 'postgrest-contract.json'), JSON.stringify({ at: new Date().toISOString(),
      postgres: '17.6', postgrest: version, requests: results, staleRequests: 3, staleSqlErrors: staleErrors.length,
      pass: true, scope: 'real local PostgreSQL and PostgREST; synthetic fixture, not physical app E2E' }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ pass: true, requests: results.length, staleRequests: 3, staleSqlErrors: staleErrors.length, version }));
  } finally {
    if (api && api.exitCode === null) {
      const exited = new Promise(resolve => api.once('exit', resolve));
      api.kill('SIGTERM');
      await exited;
    }
    await client?.end();
    if (started) await pg.stop();
    fs.writeFileSync(path.join(output, 'local-postgres.log'), log.join('\n'));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

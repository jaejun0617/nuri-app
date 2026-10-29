'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const babel = require('@babel/core');
async function main() {
  const root = path.resolve(__dirname, '../..');
  const shared = await import(
    'data:text/javascript;base64,' +
      Buffer.from(
        fs.readFileSync(
          path.join(
            root,
            'supabase/functions/_shared/notification-transport.js',
          ),
        ),
      ).toString('base64')
  );
  const source = fs.readFileSync(
    path.join(root, 'supabase/functions/notification-device-v3/index.js'),
    'utf8',
  );
  const code = babel.transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const owner = '11111111-1111-4111-8111-111111111111',
    session = 'aaaaaaaa-1111-4111-8111-111111111111';
  const calls = [];
  let claimsError = null,
    sub = owner,
    sessionId = session,
    configured = true,
    registrationError = null;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: owner, is_anonymous: false } },
        error: null,
      }),
      getClaims: async () => ({
        data: { claims: { sub, session_id: sessionId } },
        error: claimsError,
      }),
    },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return name === 'notification_push_qa_allowed_v3'
        ? { data: configured, error: null }
        : name === 'revoke_notification_device_v3'
        ? { data: 1, error: null }
        : { data: 'fixture-registration-id', error: registrationError };
    },
  };
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    Request,
    Response,
    crypto,
    TextEncoder,
    Uint8Array,
    atob,
    btoa,
    Deno: {
      serve: () => {},
      env: {
        get: name =>
          name === 'NURI_PUSH_TOKEN_KEY'
            ? Buffer.alloc(32, 7).toString('base64')
            : 'fixture-only',
      },
    },
    require: name => {
      if (name.startsWith('npm:@supabase/supabase-js@'))
        return { createClient: () => client };
      if (name === '../_shared/notification-transport.js') return shared;
      throw Error('UNEXPECTED_IMPORT');
    },
  };
  vm.runInNewContext(code, context);
  const handler = module.exports.handleNotificationDevice;
  const request = body =>
    handler(
      new Request('https://example.invalid', {
        method: 'POST',
        headers: { Authorization: 'Bearer fixture-only' },
        body: JSON.stringify(body),
      }),
    );
  const results = [];
  async function test(name, run) {
    calls.length = 0;
    claimsError = null;
    sub = owner;
    sessionId = session;
    configured = true;
    registrationError = null;
    await run();
    results.push({ name, pass: true });
  }
  await test('only verified JWT claims select the registration session', async () => {
    const response = await request({
      action: 'register',
      deviceId: 'fixture-device-main',
      token: 'fixture-provider-token-not-real',
      sessionId: 'untrusted-body-session',
      userId: 'untrusted-user',
    });
    assert.equal(response.status, 200);
    const call = calls.find(c => c.name === 'register_notification_device_v3');
    assert.equal(call.args.p_user, owner);
    assert.equal(call.args.p_session, session);
    assert.match(call.args.p_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(call.args.p_cipher, 'fixture-provider-token-not-real');
  });
  await test('missing session is rejected before any device mutation', async () => {
    sessionId = undefined;
    assert.equal(
      (
        await request({
          action: 'register',
          deviceId: 'fixture-device-main',
          token: 'fixture-provider-token-not-real',
        })
      ).status,
      401,
    );
    assert.equal(calls.filter(c => c.name.includes('device_v3')).length, 0);
  });
  await test('claims for a different user are rejected', async () => {
    sub = '22222222-2222-4222-8222-222222222222';
    assert.equal(
      (
        await request({
          action: 'revoke',
          deviceId: 'fixture-device-main',
          reason: 'user_logout',
        })
      ).status,
      401,
    );
  });
  await test('failed claims verification never registers a token', async () => {
    claimsError = new Error('invalid signature');
    assert.equal(
      (
        await request({
          action: 'register',
          deviceId: 'fixture-device-main',
          token: 'fixture-provider-token-not-real',
        })
      ).status,
      401,
    );
  });
  await test('server ordering rejection is not a retryable provider error', async () => {
    registrationError = {
      code: '40001',
      message: 'NURI_NOTIFICATION_STALE_DEVICE_SESSION',
    };
    const r = await request({
      action: 'register',
      deviceId: 'fixture-device-main',
      token: 'fixture-provider-token-not-real',
    });
    assert.equal(r.status, 409);
    assert.equal((await r.json()).code, 'DEVICE_SESSION_STALE');
  });
  await test('expired server session is reported as authentication failure', async () => {
    registrationError = {
      code: '42501',
      message: 'NURI_NOTIFICATION_SESSION_EXPIRED',
    };
    const r = await request({
      action: 'register',
      deviceId: 'fixture-device-main',
      token: 'fixture-provider-token-not-real',
    });
    assert.equal(r.status, 401);
  });
  await test('logout remains possible when the provider is not configured', async () => {
    configured = false;
    const r = await request({
      action: 'revoke',
      deviceId: 'fixture-device-main',
      reason: 'user_logout',
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).revoked, 1);
    assert.equal(
      calls.find(c => c.name === 'revoke_notification_device_v3').args
        .p_session,
      session,
    );
  });
  await test('unrecognized revoke reasons do not reach the database', async () => {
    const r = await request({
      action: 'revoke',
      deviceId: 'fixture-device-main',
      reason: 'revoke-everyone',
    });
    assert.equal(r.status, 400);
    assert.equal(
      calls.some(c => c.name === 'revoke_notification_device_v3'),
      false,
    );
  });
  const result = {
    at: new Date().toISOString(),
    passed: results.length,
    results,
    scope:
      'actual Edge handler with isolated auth/database substitutes; not deployed HTTP E2E',
  };
  if (process.env.NURI_NOTIFICATION_EDGE_EVIDENCE)
    fs.writeFileSync(
      process.env.NURI_NOTIFICATION_EDGE_EVIDENCE,
      JSON.stringify(result, null, 2),
      { flag: 'wx', mode: 0o600 },
    );
  console.log(JSON.stringify(result));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

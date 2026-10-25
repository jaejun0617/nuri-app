'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
async function main() {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '../../supabase/functions/_shared/notification-transport.js',
    ),
    'utf8',
  );
  const t = await import(
    'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
  );
  const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    'base64',
  );
  const encrypted = await t.encryptPushToken(
    'opaque-test-token',
    'owner',
    'device',
    key,
  );
  assert.notEqual(
    encrypted,
    await t.encryptPushToken('opaque-test-token', 'owner', 'device', key),
  );
  assert.equal(
    await t.decryptPushToken(encrypted, 'owner', 'device', key),
    'opaque-test-token',
  );
  await assert.rejects(
    t.decryptPushToken(encrypted, 'other-owner', 'device', key),
  );
  await assert.rejects(
    t.decryptPushToken(encrypted, 'owner', 'other-device', key),
  );
  await assert.rejects(
    t.encryptPushToken('token', 'owner', 'device', 'invalid-key'),
  );
  assert.match(await t.fingerprint('opaque-test-token'), /^[a-f0-9]{64}$/);
  assert.deepEqual(
    t.classifyPushResponse(200, { name: 'projects/test/messages/id' }),
    { result: 'accepted', messageId: 'projects/test/messages/id' },
  );
  assert.equal(t.classifyPushResponse(200, {}).result, 'permanent_failure');
  assert.deepEqual(
    t.classifyPushResponse(404, {
      error: { details: [{ errorCode: 'UNREGISTERED' }] },
    }),
    { result: 'permanent_failure', invalidToken: true },
  );
  assert.equal(t.classifyPushResponse(401, {}).result, 'provider_unavailable');
  assert.equal(t.classifyPushResponse(429, {}).result, 'transient');
  assert.equal(t.classifyPushResponse(503, {}).result, 'transient');
  assert.equal(
    t.collapseGroup('activity', '2026-10-25T00:00:01Z', 'a'),
    t.collapseGroup('activity', '2026-10-25T00:01:59Z', 'b'),
  );
  assert.notEqual(
    t.collapseGroup('news', '2026-10-25T00:00:01Z', 'a'),
    t.collapseGroup('news', '2026-10-25T00:00:01Z', 'b'),
  );
  assert.deepEqual(
    await t.boundedJson(
      new Request('https://example.invalid', {
        method: 'POST',
        body: '{"action":"status"}',
      }),
    ),
    { action: 'status' },
  );
  await assert.rejects(
    t.boundedJson(
      new Request('https://example.invalid', {
        method: 'POST',
        body: 'x'.repeat(8193),
      }),
    ),
    /BODY_TOO_LARGE/,
  );
  await assert.rejects(
    t.boundedJson(
      new Request('https://example.invalid', { method: 'POST', body: '[]' }),
    ),
    /INVALID_BODY/,
  );
  console.log(
    JSON.stringify({
      passed: 17,
      scope: 'transport primitives; no provider HTTP or production tokens',
    }),
  );
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

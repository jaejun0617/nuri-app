'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const [root, ticket, ...ids] = process.argv.slice(2);
  assert(
    root && ticket && ids.length,
    'Expected QA fixture folder, ticket ID and photo IDs',
  );
  const status = JSON.parse(
    readFileSync(join(root, 'status.private.json'), 'utf8'),
  );
  const accounts = JSON.parse(
    readFileSync(join(root, 'accounts.private.json'), 'utf8'),
  );
  assert.equal(status.API_URL, 'http://127.0.0.1:56321');
  const gateway = 'http://127.0.0.1:56323';
  const checks = [];
  async function post(path, body, bearer) {
    return fetch(gateway + path, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
      },
      body: JSON.stringify(body),
    });
  }
  async function withRole(role, run) {
    const account = accounts[role];
    const auth = await post('/auth/v1/token?grant_type=password', {
      email: account.email,
      password: account.password,
    });
    assert.equal(auth.status, 200, role + ' Auth');
    const { access_token: token } = await auth.json();
    assert.equal(typeof token, 'string');
    try {
      await run(token);
    } finally {
      assert.equal(
        (await post('/auth/v1/logout?scope=local', {}, token)).status,
        204,
      );
    }
  }
  const readThread = token =>
    post(
      '/rest/v1/rpc/support_ticket_read_photos_v1',
      {
        p_ticket: ticket,
        p_after: 0,
        p_limit: 50,
        p_ack: null,
      },
      token,
    );
  const hashes = new Map();
  for (const role of ['reader', 'editor', 'other']) {
    await withRole(role, async token => {
      const allowed = role !== 'other';
      const thread = await readThread(token);
      assert.equal(thread.status, allowed ? 200 : 404, role + ' thread access');
      if (allowed) {
        const result = await thread.json();
        assert.equal(result.id, ticket);
        for (const id of ids) {
          const message = result.messages.find(message =>
            message.photos.some(photo => photo.id === id),
          );
          assert(message, role + ' attachment metadata');
          assert.equal(message.body, '', role + ' photo-only message');
        }
      }
      checks.push(role + ': thread ' + thread.status);
      for (const id of ids) {
        const result = await post('/support/photos/read', { id }, token);
        assert.equal(
          result.status,
          allowed ? 200 : 404,
          role + ' photo access',
        );
        assert.match(result.headers.get('cache-control'), /no-store/);
        const body = await result.json();
        if (allowed) {
          const bytes = Buffer.from(body.base64, 'base64');
          assert(bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])));
          const digest = createHash('sha256').update(bytes).digest('hex');
          if (hashes.has(id))
            assert.equal(
              digest,
              hashes.get(id),
              'Same bytes for owner and admin',
            );
          else hashes.set(id, digest);
        } else
          assert.deepEqual(Object.keys(body).sort(), [
            'code',
            'details',
            'hint',
            'message',
          ]);
        for (const path of ['object/authenticated', 'object/sign']) {
          const direct = await fetch(
            status.API_URL +
              '/storage/v1/' +
              path +
              '/support-ticket-photos/' +
              id +
              '.jpg',
            {
              ...(path.endsWith('/sign')
                ? { method: 'POST', body: '{"expiresIn":60}' }
                : {}),
              headers: {
                apikey: status.ANON_KEY,
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(5000),
            },
          );
          assert.equal(
            direct.ok,
            false,
            role + ' direct Storage must deny ' + path,
          );
        }
      }
      checks.push(
        role +
          ': all photos ' +
          (allowed ? '200, same private bytes' : '404, no bytes') +
          '; direct read/sign denied',
      );
    });
  }
  console.log(JSON.stringify({ ticket, photos: ids, checks }, null, 2));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

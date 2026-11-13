'use strict';
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { setTimeout: wait } = require('node:timers/promises');
const { createClient } = require('@supabase/supabase-js');
function sql(query) {
  return execFileSync(
    '/Users/shinjaejun/.codex/nuri-c0-isolated-20261111-7ieTJM/docker/docker',
    [
      'exec',
      'supabase_db_n15-local',
      'psql',
      '-U',
      'postgres',
      '-XAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      query,
    ],
    {
      env: {
        ...process.env,
        DOCKER_HOST:
          'unix:///Users/shinjaejun/.codex/n15-local/colima/qa/docker.sock',
      },
      encoding: 'utf8',
    },
  ).trim();
}
async function main() {
  const [root, receipt] = process.argv.slice(2),
    s = JSON.parse(readFileSync(join(root, 'status.private.json')));
  assert.equal(s.API_URL, 'http://127.0.0.1:56321');
  const options = { auth: { persistSession: false, autoRefreshToken: false } },
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, options);
  const { processSupportReplies } = await import(
    pathToFileURL(
      join(
        __dirname,
        '../../supabase/functions/_shared/support-reply-worker.js',
      ),
    )
  );
  const users = [],
    result = {
      startedAt: new Date().toISOString(),
      checks: [],
      users: [],
      tickets: [],
    };
  const priorIds = JSON.parse(
    sql("select coalesce(jsonb_agg(id),'[]') from support_private.outbox"),
  );
  const protectedHash = () =>
    createHash('sha256')
      .update(
        sql(
          `select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]') from support_private.outbox t where id in (${
            priorIds.length
              ? priorIds.map(id => `'${id}'::uuid`).join(',')
              : 'null::uuid'
          })`,
        ),
      )
      .digest('hex');
  result.protectedBefore = protectedHash();
  const rpc = async (client, name, input) => {
    const response = await client.rpc(name, input);
    assert.ifError(response.error);
    return response.data;
  };
  try {
    for (let i = 0; i < 3; i++) {
      const email = `delivery-${randomUUID()}@nuri15.test`,
        password = randomUUID() + randomUUID();
      const made = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.ifError(made.error);
      const user = {
        id: made.data.user.id,
        client: createClient(s.API_URL, s.ANON_KEY, options),
      };
      users.push(user);
      result.users.push(user.id);
      assert.ifError(
        (await user.client.auth.signInWithPassword({ email, password })).error,
      );
      if (i === 1)
        sql(
          `insert into support_private.capabilities(user_id,capability) values('${user.id}','support.manage')`,
        );
    }
    const [owner, staff, other] = users;
    const command = (user, p_operation, input) =>
      rpc(user.client, 'support_ticket_command_v1', {
        p_key: randomUUID(),
        p_operation,
        ...input,
      });
    const read = (user, id) =>
      rpc(user.client, 'support_ticket_read_photos_v1', { p_ticket: id });
    const inbox = user => rpc(user.client, 'support_reply_inbox_v2', {});
    async function answeredTicket() {
      let t = await command(owner, 'message', {
        p_category: 'usage',
        p_body: 'Delivery boundary QA',
      });
      result.tickets.push(t.id);
      await command(staff, 'claim', { p_ticket: t.id, p_revision: t.revision });
      t = await read(staff, t.id);
      const reply = {
        p_key: randomUUID(),
        p_operation: 'reply',
        p_ticket: t.id,
        p_revision: t.revision,
        p_seen_user_seq: t.lastUserSeq,
        p_kind: 'answer',
        p_body: 'Durable response',
      };
      const first = await rpc(staff.client, 'support_ticket_command_v1', reply);
      assert.deepEqual(
        await rpc(staff.client, 'support_ticket_command_v1', reply),
        first,
      );
      const id = sql(
        `select id from support_private.outbox where ticket_id='${t.id}'`,
      );
      assert(id);
      return { id, ticket: t.id };
    }
    const a = await answeredTicket();
    assert.equal((await inbox(owner)).items.length, 0);
    assert(
      (
        await owner.client.rpc('support_reply_claim_v1', {
          p_lease: randomUUID(),
        })
      ).error,
    );
    const lease1 = randomUUID(),
      lease2 = randomUUID();
    const claims = await Promise.all(
      [lease1, lease2].map(p_lease =>
        rpc(admin, 'support_reply_claim_v1', { p_lease }),
      ),
    );
    assert.equal(claims.flat().filter(id => id === a.id).length, 1);
    const lease = claims[0].includes(a.id) ? lease1 : lease2;
    assert.equal(
      await rpc(admin, 'support_reply_deliver_v1', {
        p_event: a.id,
        p_lease: lease,
      }),
      true,
    );
    assert.equal(
      await rpc(admin, 'support_reply_deliver_v1', {
        p_event: a.id,
        p_lease: lease,
      }),
      true,
    );
    assert.equal(
      (await inbox(owner)).items.filter(row => row.id === a.id).length,
      1,
    );
    assert.equal((await inbox(other)).items.length, 0);
    assert.equal(
      sql(
        `select count(*) from support_private.reply_deliveries where event_id='${a.id}'`,
      ),
      '1',
    );
    result.checks.push(
      'Ordinary role cannot claim; concurrent workers claim once; duplicate delivery produces one current-owner inbox item',
    );
    const b = await answeredTicket();
    const wrapped = {
      rpc: async (name, input) => {
        const response = await admin.rpc(name, input);
        if (
          name === 'support_reply_deliver_v1' &&
          input.p_event === b.id &&
          !response.error
        )
          throw new Error('controlled lost committed response');
        return response;
      },
    };
    const lost = await processSupportReplies(wrapped);
    assert(lost.some(row => row.id === b.id && row.uncertain));
    assert.equal(
      sql(`select state from support_private.outbox where id='${b.id}'`),
      'delivered',
    );
    assert.equal(
      (await inbox(owner)).items.filter(row => row.id === b.id).length,
      1,
    );
    assert.equal((await processSupportReplies(admin)).length, 0);
    result.checks.push(
      'Lost committed delivery response does not undo result or add a second logical alert',
    );
    const c = await answeredTicket();
    const failing = {
      rpc: async (name, input) =>
        name === 'support_reply_deliver_v1'
          ? {
              data: null,
              error: { message: 'controlled worker transport failure' },
            }
          : admin.rpc(name, input),
    };
    for (let i = 1; i <= 5; i++) {
      const rows = await processSupportReplies(failing);
      assert(rows.some(row => row.id === c.id && row.recoveryRecorded));
      assert.equal(
        sql(`select attempts from support_private.outbox where id='${c.id}'`),
        String(i),
      );
      if (i < 5) {
        const next = Date.parse(
          sql(
            `select lease_until from support_private.outbox where id='${c.id}'`,
          ),
        );
        await wait(Math.max(0, next - Date.now()) + 150);
      }
    }
    assert.equal(
      sql(`select state from support_private.outbox where id='${c.id}'`),
      'failed',
    );
    assert.equal(
      (await read(owner, c.ticket)).messages.at(-1).body,
      'Durable response',
    );
    assert(!(await inbox(owner)).items.some(row => row.id === c.id));
    result.checks.push(
      'Five bounded failed delivery attempts retain reply body, expose final failure and never fabricate an inbox success',
    );
    const t = await read(owner, a.ticket);
    await rpc(owner.client, 'support_ticket_read_photos_v1', {
      p_ticket: a.ticket,
      p_ack: t.messageSeq,
    });
    assert.equal(
      (await inbox(owner)).items.find(row => row.id === a.id).unread,
      false,
    );
    const revoked = await answeredTicket();
    const token = randomUUID();
    assert(
      (await rpc(admin, 'support_reply_claim_v1', { p_lease: token })).includes(
        revoked.id,
      ),
    );
    assert.ifError((await admin.auth.admin.deleteUser(owner.id)).error);
    owner.deleted = true;
    assert.equal(
      await rpc(admin, 'support_reply_deliver_v1', {
        p_event: revoked.id,
        p_lease: token,
      }),
      false,
    );
    result.checks.push(
      'Actual displayed read cursor updates inbox; deleted recipient has no deliverable target',
    );
    result.protectedAfter = protectedHash();
    assert.equal(result.protectedAfter, result.protectedBefore);
    result.result = 'PASS';
  } finally {
    for (const user of users) {
      await user.client.auth.signOut({ scope: 'local' });
      if (!user.deleted)
        assert.ifError((await admin.auth.admin.deleteUser(user.id)).error);
    }
    result.cleanup =
      'New Auth users, own messages, outbox and delivery references removed by normal Auth cascade';
    result.finishedAt = new Date().toISOString();
    writeFileSync(receipt, JSON.stringify(result, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify(result));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

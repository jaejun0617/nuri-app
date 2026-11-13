'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const docker =
  '/Users/shinjaejun/.codex/nuri-c0-isolated-20261111-7ieTJM/docker/docker';
function sql(query) {
  return execFileSync(
    docker,
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
  const [root, receipt] = process.argv.slice(2);
  const status = JSON.parse(readFileSync(join(root, 'status.private.json')));
  assert.equal(status.API_URL, 'http://127.0.0.1:56321');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
  const users = [],
    result = { startedAt: new Date().toISOString(), checks: [], ids: [] };
  async function rpc(user, name, body, errorCode) {
    const response = await user.client.rpc('support_' + name + '_v1', body);
    if (errorCode) {
      assert.equal(response.error?.message, errorCode);
      return null;
    }
    assert.ifError(response.error);
    return response.data;
  }
  try {
    for (let i = 0; i < 3; i++) {
      const email = `lifecycle-${randomUUID()}@nuri15.test`,
        password = randomUUID() + randomUUID();
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.ifError(created.error);
      const client = createClient(status.API_URL, status.ANON_KEY, options),
        id = created.data.user.id;
      users.push({ client, id });
      result.ids.push(id);
      assert.ifError(
        (await client.auth.signInWithPassword({ email, password })).error,
      );
      if (i)
        sql(
          `insert into support_private.capabilities(user_id,capability) values('${id}','support.manage');`,
        );
    }
    const [owner, a, b] = users;
    const command = (user, p_operation, extras = {}, errorCode) =>
      rpc(
        user,
        'ticket_command',
        { p_key: randomUUID(), p_operation, ...extras },
        errorCode,
      );
    const created = await command(owner, 'message', {
      p_category: 'bug',
      p_body: 'Lifecycle isolated QA',
    });
    const p_ticket = created.id;
    result.ticketId = p_ticket;
    const thread = user => rpc(user, 'ticket_read_photos', { p_ticket });
    await rpc(owner, 'staff_members', {}, 'SUPPORT_FORBIDDEN');
    const claims = await Promise.all(
      [a, b].map(user =>
        user.client.rpc('support_ticket_command_v1', {
          p_key: randomUUID(),
          p_operation: 'claim',
          p_ticket,
          p_revision: created.revision,
        }),
      ),
    );
    assert.equal(claims.filter(row => !row.error).length, 1);
    assert.equal(claims.filter(row => row.error).length, 1);
    const first = claims[0].error ? b : a,
      second = first === a ? b : a;
    let t = await thread(first);
    assert.equal(t.nextActor, 'staff');
    const pending = sql(
      `select pending_since from support_private.tickets where id='${p_ticket}'`,
    );
    await command(owner, 'message', {
      p_ticket,
      p_body: 'Additional context while answering',
    });
    assert.equal(
      sql(
        `select pending_since from support_private.tickets where id='${p_ticket}'`,
      ),
      pending,
    );
    await command(
      first,
      'reply',
      {
        p_ticket,
        p_revision: t.revision,
        p_seen_user_seq: t.lastUserSeq,
        p_body: 'Stale reply',
        p_kind: 'answer',
      },
      'SUPPORT_REVISION_CONFLICT',
    );
    result.checks.push(
      'Concurrent claims: one winner; pending time retained; stale reply rejected',
    );
    t = await thread(first);
    const transfer = {
      p_key: randomUUID(),
      p_ticket,
      p_revision: t.revision,
      p_seen_user_seq: t.lastUserSeq,
      p_assignee: second.id,
    };
    const handed = await rpc(first, 'ticket_transfer', transfer);
    assert.deepEqual(await rpc(first, 'ticket_transfer', transfer), handed);
    await command(
      first,
      'close',
      { p_ticket, p_revision: t.revision, p_body: 'Stale close' },
      'SUPPORT_REVISION_CONFLICT',
    );
    t = await thread(second);
    assert.equal(t.assignment.assigneeId, second.id);
    assert.equal(t.nextActor, 'staff');
    await command(second, 'reply', {
      p_ticket,
      p_revision: t.revision,
      p_seen_user_seq: t.lastUserSeq,
      p_body: 'Please provide more details',
      p_kind: 'information',
    });
    t = await thread(owner);
    assert.equal(t.state, 'open');
    assert.equal(t.nextActor, 'user');
    await command(owner, 'message', { p_ticket, p_body: 'Requested details' });
    t = await thread(second);
    assert.equal(t.assignment.assigneeId, second.id);
    const reply = {
      p_key: randomUUID(),
      p_operation: 'reply',
      p_ticket,
      p_revision: t.revision,
      p_seen_user_seq: t.lastUserSeq,
      p_body: 'Confirmed resolution',
      p_kind: 'answer',
    };
    const answered = await rpc(second, 'ticket_command', reply);
    assert.deepEqual(await rpc(second, 'ticket_command', reply), answered);
    t = await thread(owner);
    assert.equal(t.state, 'open');
    assert.equal(t.nextActor, 'none');
    const revision = t.revision;
    await rpc(owner, 'ticket_read_photos', { p_ticket, p_ack: t.messageSeq });
    await rpc(owner, 'ticket_read_photos', { p_ticket, p_ack: 1 });
    t = await thread(owner);
    assert.equal(t.readSeq, t.messageSeq);
    assert.equal(t.revision, revision);
    result.checks.push(
      'Handoff preserves waiting state; stale close denied; information vs answer vs read remain distinct; idempotent reply',
    );
    await command(owner, 'close', {
      p_ticket,
      p_revision: t.revision,
      p_body: 'Resolved by owner',
    });
    t = await thread(second);
    assert.equal(t.state, 'closed');
    assert.equal(t.nextActor, 'none');
    await command(second, 'reopen', { p_ticket, p_revision: t.revision });
    t = await thread(second);
    assert.equal(t.state, 'open');
    assert.equal(t.nextActor, 'staff');
    await command(second, 'close', {
      p_ticket,
      p_revision: t.revision,
      p_body: 'Confirmed closure',
    });
    await command(owner, 'message', {
      p_ticket,
      p_body: 'New question reopens retained thread',
    });
    t = await thread(second);
    assert.equal(t.state, 'open');
    assert.equal(t.assignment.assigneeId, second.id);
    result.checks.push(
      'Explicit owner/staff close, reopen and follow-up message reopening with valid assignee',
    );
    result.result = 'PASS';
  } finally {
    for (const user of users) {
      await user.client.auth.signOut({ scope: 'local' });
      assert.ifError((await admin.auth.admin.deleteUser(user.id)).error);
    }
    result.cleanedNewAccounts = users.length;
    result.finishedAt = new Date().toISOString();
    writeFileSync(receipt, JSON.stringify(result, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify(result));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

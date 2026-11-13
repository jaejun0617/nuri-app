'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require(process.env.NURI_PGLITE_MODULE ||
  '@electric-sql/pglite');

// Claim fixtures test SQL contracts only; real Auth/API and app evidence are separate.
async function main() {
  const db = new PGlite();
  const root = path.resolve(__dirname, '../..');
  const users = Array.from({ length: 4 }, () => randomUUID());
  const [owner, stranger, staff, secondStaff] = users;
  const session = randomUUID();
  const checks = [];
  const as = id =>
    db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  const command = (
    op,
    ticket = null,
    revision = null,
    body = null,
    extra = {},
  ) => {
    const {
      key = randomUUID(),
      seen = null,
      category = null,
      kind = null,
    } = extra;
    return db
      .query(
        'select public.support_ticket_command_v1($1,$2,$3,$4,$5,$6,$7,$8) result',
        [key, op, ticket, revision, seen, body, category, kind],
      )
      .then(r => r.rows[0].result);
  };
  const read = (id, ack = null, limit = 50) =>
    db
      .query('select public.support_ticket_read_v1($1,0,$2,$3) result', [
        id,
        limit,
        ack,
      ])
      .then(r => r.rows[0].result);
  const test = async (name, run) => {
    await run();
    checks.push(name);
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key); create table auth.sessions(id uuid,user_id uuid);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session',true))$$;`);
    for (const id of users) {
      await db.query('insert into auth.users values($1)', [id]);
      await db.query('insert into auth.sessions values($1,$2)', [session, id]);
    }
    await db.query("select set_config('request.jwt.claim.session',$1,false)", [
      session,
    ]);
    for (const migration of [
      '20261113095012_support_notice_board_foundation.sql',
      '20261113100737_support_ticket_text_contract.sql',
    ]) {
      await db.exec(
        fs.readFileSync(
          path.join(root, 'supabase/migrations', migration),
          'utf8',
        ),
      );
    }
    await as(owner);
    await test('closed by default', () =>
      assert.rejects(
        command('message', null, null, 'hello', { category: 'bug' }),
        /SUPPORT_UNAVAILABLE/,
      ));
    await db.exec('update support_private.runtime set support_enabled=true');
    for (const id of [staff, secondStaff])
      await db.query(
        "insert into support_private.capabilities values($1,'support.manage')",
        [id],
      );
    await db.exec('set role authenticated');
    await test('no direct ticket or outbox writes', async () => {
      await assert.rejects(
        db.exec('select * from support_private.tickets'),
        /permission denied/,
      );
      await assert.rejects(
        db.exec("update support_private.outbox set state='delivered'"),
        /permission denied/,
      );
    });
    await test('empty first message rejected', () =>
      assert.rejects(
        command('message', null, null, '  ', { category: 'bug' }),
        /SUPPORT_INVALID_INPUT/,
      ));
    const key = randomUUID();
    let ticket = await command('message', null, null, 'First message', {
      key,
      category: 'bug',
    });
    const id = ticket.id,
      first = ticket;
    await test('first valid message creates one ticket and retry returns original result', async () => {
      assert.equal(ticket.messageSeq, 1);
      assert.deepEqual(
        await command('message', null, null, 'First message', {
          key,
          category: 'bug',
        }),
        first,
      );
      await assert.rejects(
        command('message', null, null, 'Changed', { key, category: 'bug' }),
        /SUPPORT_REQUEST_CONFLICT/,
      );
    });
    await test('another user cannot read or modify the ticket', async () => {
      await as(stranger);
      await assert.rejects(read(id), /SUPPORT_NOT_FOUND/);
      await assert.rejects(
        command('message', id, null, 'intrusion'),
        /SUPPORT_NOT_FOUND/,
      );
      await as(owner);
    });
    await test('read acknowledgment requires a previously returned page', async () => {
      await assert.rejects(read(id, 1), /SUPPORT_INVALID_INPUT/);
      assert.equal((await read(id)).readSeq, 0);
      assert.equal((await read(id, 1)).readSeq, 1);
      assert.equal((await read(id, 0)).readSeq, 1);
    });
    await as(staff);
    ticket = await command('claim', id, ticket.revision);
    await test('claim does not resolve waiting and competing claim is rejected', async () => {
      assert.equal(ticket.nextActor, 'staff');
      await as(secondStaff);
      await assert.rejects(
        command('claim', id, ticket.revision),
        /SUPPORT_CLAIM_CONFLICT/,
      );
      await as(staff);
    });
    const stale = ticket;
    await as(owner);
    ticket = await command('message', id, null, 'More context');
    await test('new user message invalidates stale answer', async () => {
      await as(staff);
      await assert.rejects(
        command('reply', id, stale.revision, 'Reply', {
          seen: 1,
          kind: 'answer',
        }),
        /SUPPORT_REVISION_CONFLICT/,
      );
      await assert.rejects(
        command('reply', id, ticket.revision, 'Reply', {
          seen: 1,
          kind: 'answer',
        }),
        /SUPPORT_MESSAGE_CONFLICT/,
      );
    });
    const replyKey = randomUUID(),
      beforeReply = ticket;
    ticket = await command(
      'reply',
      id,
      ticket.revision,
      'Please send details',
      { key: replyKey, seen: ticket.lastUserSeq, kind: 'information' },
    );
    await test('information request stays open, duplicate reply does not duplicate message', async () => {
      assert.equal(ticket.state, 'open');
      assert.equal(ticket.nextActor, 'user');
      assert.deepEqual(
        await command(
          'reply',
          id,
          beforeReply.revision,
          'Please send details',
          { key: replyKey, seen: beforeReply.lastUserSeq, kind: 'information' },
        ),
        ticket,
      );
      assert.equal((await read(id)).messages.length, 3);
    });
    await as(owner);
    ticket = await command('message', id, null, 'Details');
    await as(staff);
    ticket = await command('reply', id, ticket.revision, 'Answer', {
      seen: ticket.lastUserSeq,
      kind: 'answer',
    });
    await test('ordinary answer does not require user response or close ticket', async () => {
      assert.equal(ticket.state, 'open');
      assert.equal(ticket.nextActor, 'none');
    });
    await as(owner);
    ticket = await command('close', id, ticket.revision, 'Resolved');
    await test('explicit close preserves reason and owner can resume', async () => {
      assert.equal((await read(id)).closeReason, 'Resolved');
      ticket = await command('message', id, null, 'Follow-up');
      assert.equal(ticket.nextActor, 'staff');
      const detail = await read(id);
      assert.equal(detail.closeReason, null);
      assert.equal(detail.assignment, null);
      assert(detail.messages.every(m => !('author_id' in m)));
    });
    await db.exec('reset role');
    await test('durable intent exactly matches replies, no transport success manufactured', async () => {
      const result = await db.query(
        'select recipient_id,state from support_private.outbox',
      );
      assert.equal(result.rows.length, 2);
      assert(
        result.rows.every(
          r => r.recipient_id === owner && r.state === 'pending',
        ),
      );
      const counts = await db.query(
        'select count(*)::int n from support_private.tickets',
      );
      assert.equal(counts.rows[0].n, 1);
    });
    await db.query(
      'delete from support_private.capabilities where user_id=$1',
      [staff],
    );
    await db.exec('set role authenticated');
    await as(staff);
    await test('revoked capability denies cached reply and sensitive reads', async () => {
      await assert.rejects(read(id), /SUPPORT_NOT_FOUND/);
      await assert.rejects(
        command('reply', id, beforeReply.revision, 'Please send details', {
          key: replyKey,
          seen: beforeReply.lastUserSeq,
          kind: 'information',
        }),
        /SUPPORT_NOT_FOUND/,
      );
    });
    await db.exec('reset role');
    await db.query('delete from auth.sessions where user_id=$1', [owner]);
    await db.exec('set role authenticated');
    await as(owner);
    await test('revoked session denied', () =>
      assert.rejects(read(id), /SUPPORT_AUTH_REQUIRED/));
    await db.exec('reset role; set role anon');
    await test('anonymous RPC denied', () =>
      assert.rejects(read(id), /permission denied/));
    console.log(
      JSON.stringify(
        {
          kind: 'isolated SQL contract; not app E2E',
          passed: checks.length,
          checks,
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
  console.error(error);
  process.exitCode = 1;
});

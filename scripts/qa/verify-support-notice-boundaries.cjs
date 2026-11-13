'use strict';
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
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
  const [root, receipt] = process.argv.slice(2);
  const status = JSON.parse(readFileSync(join(root, 'status.private.json')));
  assert.equal(status.API_URL, 'http://127.0.0.1:56321');
  assert.equal(
    sql(
      'select count(*) from support_private.notice_publications where pinned',
    ),
    '0',
    'Do not replace a protected pin',
  );
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
  const users = [],
    notices = [];
  const beforeIds = JSON.parse(
    sql(
      "select coalesce(jsonb_agg(id),'[]') from support_private.notice_drafts",
    ),
  );
  const protectedState = () => {
    const ids = beforeIds.length
      ? beforeIds.map(id => `'${id}'::uuid`).join(',')
      : 'null::uuid';
    const bytes = sql(
      `select jsonb_build_object('drafts',(select jsonb_agg(to_jsonb(t) order by id) from support_private.notice_drafts t where id in (${ids})),'publications',(select jsonb_agg(to_jsonb(t) order by id) from support_private.notice_publications t where id in (${ids})),'reads',(select jsonb_agg(to_jsonb(t) order by user_id,notice_id) from support_private.notice_reads t where notice_id in (${ids})),'outbox',(select jsonb_agg(to_jsonb(t) order by id) from support_private.outbox t))`,
    );
    return createHash('sha256').update(bytes).digest('hex');
  };
  const result = {
    startedAt: new Date().toISOString(),
    checks: [],
    noticeIds: [],
    protectedBefore: protectedState(),
  };
  try {
    for (let i = 0; i < 2; i++) {
      const email = `notice-boundary-${randomUUID()}@nuri15.test`,
        password = randomUUID() + randomUUID();
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.ifError(created.error);
      const id = created.data.user.id,
        client = createClient(status.API_URL, status.ANON_KEY, options);
      users.push({ id, client });
      assert.ifError(
        (await client.auth.signInWithPassword({ email, password })).error,
      );
      if (i === 0)
        sql(
          `insert into support_private.capabilities(user_id,capability) values('${id}','notices.manage');`,
        );
    }
    const [editor, reader] = users;
    const rpc = async (user, name, input, error) => {
      const response = await user.client.rpc(
        'support_notice_' + name + '_v1',
        input,
      );
      if (error) {
        assert.equal(response.error?.message, error);
        return null;
      }
      assert.ifError(response.error);
      return response.data;
    };
    const content = {
      title: 'Boundary QA',
      body: 'Synthetic board only',
      category: 'guide',
      pinned: false,
    };
    const command = async (op, row, extra) => {
      const next = await rpc(editor, 'command', {
        p_key: randomUUID(),
        p_operation: op,
        ...(row ? { p_id: row.id, p_expected_revision: row.revision } : {}),
        ...(extra ? { p_content: extra } : {}),
      });
      const index = notices.findIndex(item => item.id === next.id);
      if (index < 0) notices.push(next);
      else notices[index] = next;
      return next;
    };
    let a = await command('save', null, { ...content, pinned: true });
    a = await command('publish', a);
    let b = await command('save', null, content);
    b = await command('publish', b);
    const page = await rpc(reader, 'list', { p_limit: 1 });
    assert.equal(page.items[0].id, a.id);
    const read = await rpc(reader, 'detail', { p_id: a.id, p_mark_read: true });
    const readAt = (await rpc(reader, 'list', { p_limit: 50 })).items.find(
      item => item.id === a.id,
    ).read_at;
    assert(readAt);
    b = await command('save', b, {
      ...content,
      category: 'update',
      pinned: true,
    });
    b = await command('publish', b);
    await rpc(
      reader,
      'list',
      { p_limit: 1, p_cursor: page.nextCursor },
      'SUPPORT_CURSOR_STALE',
    );
    const replaced = await rpc(reader, 'list', { p_limit: 50 });
    assert.equal(replaced.items[0].id, b.id);
    assert.equal(replaced.items.find(item => item.id === a.id).pinned, false);
    const guides = await rpc(reader, 'list', {
      p_category: 'guide',
      p_limit: 50,
    });
    assert(!guides.items.some(item => item.id === b.id));
    const retained = await rpc(reader, 'detail', { p_id: a.id });
    assert.equal(retained.first_published_at, read.first_published_at);
    assert.equal(replaced.items.find(item => item.id === a.id).read_at, readAt);
    result.checks.push(
      'Pin replacement and category invalidate cursor; rebuilt list accurate; first date and read retained',
    );
    a = await editor.client
      .rpc('support_notice_editor_v1', { p_id: a.id })
      .then(response => {
        assert.ifError(response.error);
        return response.data;
      });
    a = await command('stop', a);
    await rpc(reader, 'detail', { p_id: a.id }, 'SUPPORT_NOT_FOUND');
    a = await command('publish', a);
    const expiry = Date.now() + 2500;
    let c = await command('save', null, {
      ...content,
      expiresAt: new Date(expiry).toISOString(),
    });
    c = await command('publish', c);
    await rpc(reader, 'detail', { p_id: c.id });
    await wait(Math.max(0, expiry - Date.now()) + 150);
    await rpc(reader, 'detail', { p_id: c.id }, 'SUPPORT_NOT_FOUND');
    assert(
      !(await rpc(reader, 'list', { p_limit: 50 })).items.some(
        item => item.id === c.id,
      ),
    );
    result.checks.push(
      'Stopped and elapsed notices excluded by actual API without clock manipulation',
    );
    result.protectedAfter = protectedState();
    assert.equal(result.protectedAfter, result.protectedBefore);
    result.checks.push(
      'Existing board/read/outbox bytes unchanged; legacy notification/delivery tables absent here, production fanout NOT RUN',
    );
    result.result = 'PASS';
  } finally {
    for (const row of notices) {
      const current = await users[0].client.rpc('support_notice_editor_v1', {
        p_id: row.id,
      });
      assert.ifError(current.error);
      const removed = await users[0].client.rpc('support_notice_command_v1', {
        p_key: randomUUID(),
        p_operation: 'delete',
        p_id: row.id,
        p_expected_revision: current.data.revision,
      });
      assert.ifError(removed.error);
    }
    result.noticeIds = notices.map(row => row.id);
    for (const user of users) {
      await user.client.auth.signOut({ scope: 'local' });
      assert.ifError((await admin.auth.admin.deleteUser(user.id)).error);
    }
    result.cleanup =
      'Synthetic notices deleted through normal API; tombstone/audit retained; new accounts removed';
    result.finishedAt = new Date().toISOString();
    writeFileSync(receipt, JSON.stringify(result, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify(result));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');

async function main() {
  const [root, image] = process.argv.slice(2);
  const status = JSON.parse(readFileSync(join(root, 'status.private.json')));
  const accounts = JSON.parse(
    readFileSync(join(root, 'accounts.private.json')),
  );
  const origin = 'http://127.0.0.1:56323';
  assert.equal(status.API_URL, 'http://127.0.0.1:56321');
  async function post(path, body, token) {
    const result = await fetch(origin + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(16000),
    });
    return {
      status: result.status,
      body: result.status === 204 ? null : await result.json(),
    };
  }
  const users = {};
  const checks = [];
  let photoId, ticketId;
  const noticeIds = [];
  let faqId;
  async function rpc(name, params, role, expected = 200) {
    const result = await post(
      '/rest/v1/rpc/support_' + name + '_v1',
      params,
      users[role],
    );
    assert.equal(
      result.status,
      expected,
      name + ' (' + role + ') returned ' + result.body?.message,
    );
    return result.body;
  }
  const key = () => ({ p_key: randomUUID() });
  const faqList = async (role = 'reader', p_management = false) =>
    (await rpc('faq_list', { p_management }, role)).items;
  const noticeList = async (p_management = false) =>
    (
      await rpc(
        'notice_list',
        { p_management, p_limit: 50 },
        p_management ? 'editor' : 'reader',
      )
    ).items;
  try {
    for (const role of ['reader', 'editor', 'other']) {
      const { email, password, id } = accounts[role];
      const auth = await post('/auth/v1/token?grant_type=password', {
        email,
        password,
      });
      assert.equal(auth.status, 200, role + ' Auth');
      assert.equal(auth.body.user.id, id);
      users[role] = auth.body.access_token;
    }
    await rpc('faq_list', { p_management: true }, 'reader', 403);
    const content = {
      question: '격리 확인: 이전 기록이 안 보여요.',
      answer: '같은 계정과 선택한 반려동물을 확인해주세요.',
      category: 'account',
    };
    const saveFaq = (input, role = 'editor', expected = 200) =>
      rpc('faq_command', input, role, expected);
    await saveFaq(
      { ...key(), p_action: 'save', p_content: content },
      'reader',
      403,
    );
    let faq = await saveFaq({ ...key(), p_action: 'save', p_content: content });
    faqId = faq.id;
    const lookup = async () =>
      (await faqList()).find(item => item.id === faqId);
    assert.equal(await lookup(), undefined);
    const faqAction = (action, extras = {}) => ({
      ...key(),
      p_action: action,
      p_id: faq.id,
      p_revision: faq.revision,
      ...extras,
    });
    faq = await saveFaq(faqAction('publish'));
    assert.deepEqual(await lookup(), { id: faqId, published: content });
    const revised = {
      ...content,
      answer: '계정이 같다면 타임라인 필터도 확인해주세요.',
    };
    const saveRevision = faqAction('save', { p_content: revised });
    faq = await saveFaq(saveRevision);
    assert.deepEqual(await saveFaq(saveRevision), faq);
    assert.deepEqual((await lookup()).published, content);
    await saveFaq(
      faqAction('publish', { p_revision: faq.revision - 1 }),
      'editor',
      409,
    );
    faq = await saveFaq(faqAction('publish'));
    assert.deepEqual((await lookup()).published, revised);
    faq = await saveFaq(faqAction('stop'));
    assert.equal(await lookup(), undefined);
    assert.deepEqual(
      (await faqList('editor', true)).find(item => item.id === faqId).draft,
      revised,
    );
    checks.push(
      'FAQ role denial, hidden draft, publish, idempotent revision, old public snapshot, stale conflict, republish and stop',
    );

    const notice = (p_operation, extras = {}) =>
      rpc('notice_command', { ...key(), p_operation, ...extras }, 'editor');
    const contentNotice = {
      title: 'N15 isolated QA visibility',
      body: 'Public board visibility only.',
      category: 'guide',
      pinned: false,
    };
    let row = await notice('save', { p_content: contentNotice });
    noticeIds.push(row.id);
    const command = (action, value = row) =>
      notice(action, { p_id: value.id, p_expected_revision: value.revision });
    row = await command('publish');
    await rpc('notice_detail', { p_id: row.id, p_mark_read: true }, 'reader');
    const before = (await noticeList()).find(item => item.id === row.id);
    assert(before?.read_at);
    row = await command('stop');
    assert.equal(
      (await noticeList()).some(item => item.id === row.id),
      false,
    );
    await rpc('notice_detail', { p_id: row.id }, 'reader', 404);
    assert(
      (await noticeList(true)).some(
        item => item.id === row.id && item.state === 'stopped',
      ),
    );
    row = await command('publish');
    const republished = (await noticeList()).find(item => item.id === row.id);
    assert.equal(republished.first_published_at, before.first_published_at);
    assert.equal(republished.read_at, before.read_at);
    row = await command('delete');
    assert.equal(
      (await noticeList(true)).some(item => item.id === row.id),
      false,
    );
    const deadline = Date.now() + 5500;
    let expiring = await notice('save', {
      p_content: {
        ...contentNotice,
        expiresAt: new Date(deadline).toISOString(),
      },
    });
    noticeIds.push(expiring.id);
    expiring = await command('publish', expiring);
    assert((await noticeList()).some(item => item.id === expiring.id));
    await rpc('notice_detail', { p_id: expiring.id }, 'reader');
    await wait(Math.max(deadline - Date.now(), 0) + 250);
    assert.equal(
      (await noticeList()).some(item => item.id === expiring.id),
      false,
    );
    await rpc('notice_detail', { p_id: expiring.id }, 'reader', 404);
    await command('delete', expiring);
    checks.push(
      'Notice stop, retained read on republish, management excludes deletion, real-clock expiry without mutation',
    );

    photoId = randomUUID();
    const draft = randomUUID();
    const upload = {
      id: photoId,
      draft,
      ticket: null,
      base64: readFileSync(image).toString('base64'),
    };
    assert.equal(
      (await post('/support/photos/upload', upload, users.reader)).status,
      200,
    );
    assert.equal(
      (await post('/support/photos/upload', upload, users.reader)).status,
      200,
    );
    const photoRequest = {
      ...key(),
      p_ticket: null,
      p_category: 'bug',
      p_body: '',
      p_draft: draft,
      p_photos: [photoId],
    };
    let committed;
    // Drop only the response from the normal authenticated command, after reading its real upstream receipt.
    const fault = createServer(async (_request, response) => {
      try {
        committed = await rpc('ticket_photo_message', photoRequest, 'reader');
      } finally {
        response.destroy();
      }
    });
    await new Promise(resolve => fault.listen(0, '127.0.0.1', resolve));
    try {
      await assert.rejects(
        fetch('http://127.0.0.1:' + fault.address().port, {
          signal: AbortSignal.timeout(16000),
        }),
      );
    } finally {
      await new Promise(resolve => fault.close(resolve));
    }
    assert(committed?.id, 'command committed before response loss');
    ticketId = committed.id;
    assert.deepEqual(
      await rpc('ticket_photo_message', photoRequest, 'reader'),
      committed,
    );
    await rpc(
      'ticket_photo_message',
      { ...photoRequest, p_body: 'different' },
      'reader',
      409,
    );
    const thread = (role = 'reader', p_after = 0, p_ack = null) =>
      rpc(
        'ticket_read_photos',
        { p_ticket: ticketId, p_after, p_limit: 50, p_ack },
        role,
      );
    const opened = await thread();
    assert.equal(opened.messages.length, 1);
    assert.equal(opened.messages[0].photos[0].id, photoId);
    assert.equal(
      (await post('/support/photos/read', { id: photoId }, users.editor))
        .status,
      200,
    );
    assert.equal(
      (await post('/support/photos/read', { id: photoId }, users.other)).status,
      404,
    );
    checks.push(
      'Lost committed photo command response; identical receipt and exactly one photo message after retry',
    );

    const alerts = async role =>
      (await rpc('reply_inbox', { p_limit: 50 }, role)).items.filter(
        item => item.ticket_id === ticketId,
      );
    assert.equal((await alerts('reader')).length, 0);
    const claimed = await rpc(
      'ticket_command',
      {
        ...key(),
        p_operation: 'claim',
        p_ticket: ticketId,
        p_revision: opened.revision,
      },
      'editor',
    );
    const reply = {
      ...key(),
      p_operation: 'reply',
      p_ticket: ticketId,
      p_revision: claimed.revision,
      p_seen_user_seq: claimed.lastUserSeq,
      p_body: 'N15 isolated: attachment received.',
      p_kind: 'answer',
    };
    const answered = await rpc('ticket_command', reply, 'editor');
    assert.deepEqual(await rpc('ticket_command', reply, 'editor'), answered);
    const ownerAlerts = await alerts('reader');
    assert.equal(ownerAlerts.length, 1);
    assert.equal(ownerAlerts[0].unread, true);
    assert.equal((await alerts('other')).length, 0);
    const catchUp = await thread('reader', opened.messageSeq);
    assert.deepEqual(
      catchUp.messages.map(item => item.body),
      [reply.p_body],
    );
    assert.equal((await alerts('reader'))[0].unread, true);
    await thread('reader', answered.messageSeq, answered.messageSeq);
    assert.equal((await alerts('reader'))[0].unread, false);
    checks.push(
      'One private reply alert after same-key retry; incremental catch-up then explicit read',
    );
    console.log(
      JSON.stringify({ faqId, noticeIds, ticketId, photoId, checks }, null, 2),
    );
  } finally {
    for (const token of Object.values(users)) {
      const result = await post('/auth/v1/logout?scope=local', {}, token);
      assert.equal(result.status, 204);
    }
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

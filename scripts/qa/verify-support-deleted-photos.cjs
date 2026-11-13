'use strict';
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { createClient } = require('@supabase/supabase-js');
const { createSupportPhotoRoute } = require('./support-photo-route.cjs');

async function main() {
  const [root, image, receipt] = process.argv.slice(2);
  const status = JSON.parse(readFileSync(join(root, 'status.private.json')));
  assert.equal(status.API_URL, 'http://127.0.0.1:56321');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
  const { removeDeletedSupportPhoto, processDeletedSupportPhotos } =
    await import(
      pathToFileURL(
        join(
          __dirname,
          '../../supabase/functions/_shared/support-photo-deletion.js',
        ),
      )
    );
  const adapter = createSupportPhotoRoute(status);
  const record = {
    startedAt: new Date().toISOString(),
    environment: status.API_URL,
    checks: [],
    generated: {},
  };
  const check = label => record.checks.push(label);
  const existing = await admin.storage
    .from('support-ticket-photos')
    .list('', { limit: 1000 });
  assert.ifError(existing.error);
  assert(
    existing.data.length < 1000,
    'Complete protected file inventory required',
  );
  const hash = async name => {
    const result = await admin.storage
      .from('support-ticket-photos')
      .download(name);
    assert.ifError(result.error);
    return createHash('sha256')
      .update(Buffer.from(await result.data.arrayBuffer()))
      .digest('hex');
  };
  const protectedFiles = {};
  for (const item of existing.data)
    protectedFiles[item.name] = await hash(item.name);
  const password = randomUUID() + randomUUID();
  const email = `delete-${randomUUID()}@nuri15.test`;
  const user = createClient(status.API_URL, status.ANON_KEY, options);
  let id;
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(created.error);
    id = created.data.user.id;
    record.generated.userId = id;
    const session = await user.auth.signInWithPassword({ email, password });
    assert.ifError(session.error);
    const photo = randomUUID(),
      draft = randomUUID();
    record.generated.photoId = photo;
    const uploaded = await adapter(
      '/support/photos/upload',
      {
        id: photo,
        draft,
        ticket: null,
        base64: readFileSync(image).toString('base64'),
      },
      session.data.session.access_token,
    );
    assert.equal(uploaded.status, 200);
    const sent = await user.rpc('support_ticket_photo_message_v1', {
      p_key: randomUUID(),
      p_ticket: null,
      p_category: 'bug',
      p_body: '',
      p_draft: draft,
      p_photos: [photo],
    });
    assert.ifError(sent.error);
    record.generated.ticketId = sent.data.id;
    const originalPhoto = await admin.storage
      .from('support-ticket-photos')
      .download(photo + '.jpg');
    assert.ifError(originalPhoto.error);
    const originalBytes = Buffer.from(await originalPhoto.data.arrayBuffer());
    assert.equal(
      (
        await adapter(
          '/support/photos/read',
          { id: photo },
          session.data.session.access_token,
        )
      ).status,
      200,
    );
    assert(
      (
        await user.rpc('support_claim_deleted_photo_v1', {
          p_id: photo,
          p_lease: randomUUID(),
        })
      ).error,
    );
    assert.deepEqual(await removeDeletedSupportPhoto(admin, photo), {
      id: photo,
      removed: false,
    });
    check('Live owner and authenticated caller cannot authorize deletion');
    assert.ifError((await admin.auth.admin.deleteUser(id)).error);
    id = null;
    assert.equal(
      (
        await adapter(
          '/support/photos/read',
          { id: photo },
          session.data.session.access_token,
        )
      ).status,
      403,
    );
    assert(await hash(photo + '.jpg'));
    check(
      'Auth deletion cascades metadata but retains queued real object before worker',
    );
    assert.deepEqual(await removeDeletedSupportPhoto(admin, photo), {
      id: photo,
      removed: true,
    });
    assert(
      (
        await admin.storage
          .from('support-ticket-photos')
          .download(photo + '.jpg')
      ).error,
    );
    assert.deepEqual(await removeDeletedSupportPhoto(admin, photo), {
      id: photo,
      removed: false,
    });
    check('Official Storage removal, absence verification and repeat no-op');
    // A controlled late-upload fixture represents the independent Storage commit.
    assert.ifError(
      (
        await admin.storage
          .from('support-ticket-photos')
          .upload(photo + '.jpg', originalBytes, { contentType: 'image/jpeg' })
      ).error,
    );
    const reconciled = await processDeletedSupportPhotos(admin);
    assert(reconciled.some(result => result.id === photo && result.removed));
    assert(
      (
        await admin.storage
          .from('support-ticket-photos')
          .download(photo + '.jpg')
      ).error,
    );
    check(
      'Late Storage fixture after completed deletion is discovered and removed by next batch',
    );
    for (const [name, digest] of Object.entries(protectedFiles))
      assert.equal(await hash(name), digest);
    check('Every pre-existing protected file retains exact bytes');
    record.protectedFileCount = existing.data.length;
    record.result = 'PASS';
  } finally {
    if (id) {
      assert.ifError((await admin.auth.admin.deleteUser(id)).error);
      if (record.generated.photoId)
        await removeDeletedSupportPhoto(admin, record.generated.photoId);
    }
    await user.auth.signOut({ scope: 'local' });
    record.finishedAt = new Date().toISOString();
    writeFileSync(receipt, JSON.stringify(record, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify(record));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

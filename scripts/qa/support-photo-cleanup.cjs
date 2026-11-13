'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const origin = 'http://127.0.0.1:56321';
const bucket = '/storage/v1/object/support-ticket-photos';

async function cleanupExpiredPhoto(status, id) {
  if (status.API_URL !== origin || !status.SERVICE_ROLE_KEY || !uuid.test(id))
    throw new Error(
      'Expected the isolated Storage service and one exact photo ID',
    );
  const headers = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + status.SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
  const request = (path, method, body) =>
    fetch(origin + path, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  const rpc = async name => {
    const response = await request('/rest/v1/rpc/' + name, 'POST', {
      p_id: id,
    });
    if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
    const result = await response.json();
    if (typeof result !== 'boolean') throw new Error('Invalid cleanup result');
    return result;
  };
  if (!(await rpc('support_claim_expired_photo_v1')))
    return { id, removed: false };
  const deleted = await request(bucket, 'DELETE', { prefixes: [id + '.jpg'] });
  if (!deleted.ok) throw new Error('Storage DELETE: HTTP ' + deleted.status);
  if (!(await rpc('support_finish_expired_photo_v1')))
    throw new Error('Storage deletion not confirmed');
  return { id, removed: true };
}

module.exports = { cleanupExpiredPhoto };
if (require.main === module) {
  const [folder, id] = process.argv.slice(2);
  Promise.resolve()
    .then(() =>
      cleanupExpiredPhoto(
        JSON.parse(readFileSync(join(folder, 'status.private.json'), 'utf8')),
        id,
      ),
    )
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

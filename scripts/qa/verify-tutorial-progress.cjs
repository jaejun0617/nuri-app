'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const root = join(process.env.HOME, '.codex/n15-local');
const settings = require(join(root, 'status.private.json'));
const accounts = require(join(root, 'accounts.private.json'));
const docker = join(process.env.HOME, '.codex/nuri-c0-isolated-20261111-7ieTJM/docker/docker');
const sql = command => execFileSync(docker, ['exec', 'supabase_db_n15-local', 'psql', '-XAtq', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-c', command],
  { encoding: 'utf8', env: { ...process.env, DOCKER_HOST: 'unix://' + root + '/colima/qa/docker.sock' } }).trim();
assert.equal(settings.API_URL, 'http://127.0.0.1:56321');
const rpc = '/rest/v1/rpc/tutorial_progress_v1';
async function call(path, value, token, method = 'POST') {
  const result = await fetch(settings.API_URL + path, {
    method, headers: { apikey: settings.ANON_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(method === 'DELETE' ? {} : { body: JSON.stringify(value) }),
  });
  return { status: result.status, value: await result.json() };
}
async function login(credentials) {
  const result = await call('/auth/v1/token?grant_type=password', credentials);
  assert.equal(result.status, 200);
  return result.value.access_token;
}
async function run() {
  assert.equal(sql('select active_since is null from tutorial_private.activation where singleton'), 't');
  const existing = await login({ email: accounts.reader.email, password: accounts.reader.password });
  assert.deepEqual((await call(rpc, {}, existing)).value, { eligible: false, states: {} });
  assert([401,403].includes((await call(rpc, {})).status));
  const created = [];
  const activate = "update tutorial_private.activation set active_since=statement_timestamp() where singleton";
  sql(activate);
  try {
    const sessions = [];
    for (let i = 0; i < 2; i += 1) {
      const credentials = { email: 'tutorial-' + randomUUID() + '@example.test', password: randomUUID() };
      const auth = await call('/auth/v1/admin/users', { ...credentials, email_confirm: true }, settings.SERVICE_ROLE_KEY);
      assert.equal(auth.status, 200);
      assert.match(auth.value.id, /^[\da-f-]{36}$/);
      created.push(auth.value.id);
      sessions.push(await login(credentials));
    }
    const [a,b] = sessions;
    assert.deepEqual((await call(rpc, {}, a)).value, { eligible: true, states: {} });
    assert.deepEqual((await call(rpc, {}, existing)).value, { eligible: false, states: {} });
    assert.equal((await call(rpc, { p_topic:'font', p_state:'completed' }, a)).status,400);
    assert.equal((await call(rpc, { p_topic:'home', p_state:'skipped' }, a)).value.states.home,'skipped');
    assert.equal((await call(rpc, { p_topic:'home', p_state:'completed' }, a)).value.states.home,'completed');
    assert.equal((await call(rpc, { p_topic:'home', p_state:'skipped' }, a)).value.states.home,'completed');
    assert.deepEqual((await call(rpc, {}, b)).value, { eligible: true, states: {} });
    assert.deepEqual((await call(rpc, {}, existing)).value.states, {});
    assert([400,404].includes((await call(rpc, { p_user_id:created[0] }, b)).status));
    assert.equal(sql("select has_table_privilege('authenticated','tutorial_private.progress','SELECT')"), 'f');
  } finally {
    sql('update tutorial_private.activation set active_since=null where singleton');
    for (const id of created) assert.equal((await call('/auth/v1/admin/users/'+id, {}, settings.SERVICE_ROLE_KEY, 'DELETE')).status, 200);
  }
  console.log('Tutorial API: eligibility, anonymity, two actors, idempotency, completion priority and cleanup PASS');
}
run().catch(error => { console.error(error); process.exitCode = 1; });

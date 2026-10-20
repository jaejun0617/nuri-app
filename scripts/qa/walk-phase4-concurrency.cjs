#!/usr/bin/env node
'use strict';
// Independent Supabase CLI database processes, isolated workdir, synthetic scope
// only. No secrets, actor/pet IDs or payloads are printed in test receipts.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const [scratch, scopeFile, evidenceRoot] = process.argv.slice(2);
const remainingOnly = process.argv[5] === 'remaining';
if (!scratch || !scopeFile || !evidenceRoot) throw Error('WALK_TEST_ARGUMENTS_REQUIRED');
if (fs.readFileSync(path.join(scratch, 'supabase/.temp/project-ref'), 'utf8').trim() !== 'grmekesqoydylqmyvfke') throw Error('WALK_WRONG_PROJECT');
const ids = JSON.parse(fs.readFileSync(scopeFile, 'utf8'));
if (Object.values(ids).some(v => typeof v !== 'string' || !/^[0-9a-f-]{36}$/.test(v))) throw Error('WALK_INVALID_TEST_SCOPE');
let sequence = 0;
const evidence = { tests: [], cleanup: 'PENDING', syntheticAccounts: 1, syntheticPets: 2 };
function query(sql, label) {
  const file = path.join(evidenceRoot, 'phase4-' + (++sequence) + '-' + label + '.sql');
  fs.writeFileSync(file, sql, { mode: 0o600, flag: 'wx' });
  return new Promise((resolve, reject) => {
    const child = cp.spawn('supabase', ['db', 'query', '--linked', '--file', file, '--agent=yes'], { cwd: scratch, stdio: ['ignore', 'pipe', 'pipe'] });
    // Bound environmental connection stalls; always reach exact-scope cleanup.
    const deadline = setTimeout(() => child.kill('SIGTERM'), 60000);
    let out = '', err = '';
    child.stdout.on('data', b => { out += b; });
    child.stderr.on('data', b => { err += b; });
    child.on('error', () => reject(Error('WALK_CLI_UNAVAILABLE')));
    child.on('close', code => {
      clearTimeout(deadline);
      const safeCode = err.match(/ERROR:\s+([A-Z0-9_]+)/);
      if (code !== 0) {
        const kind = /timeout|timed out|connection|dial tcp|EOF|Circuit breaker|login role/i.test(err)
          ? 'CLI_CONNECTION_FAILURE' : 'CLI_FAILURE_WITHOUT_SQLSTATE';
        return reject(Error('WALK_SQL_FAILED:' + label + ':' + (safeCode ? safeCode[1] : kind)));
      }
      try { resolve(JSON.parse(out.slice(out.indexOf('{'))).rows); }
      catch { reject(Error('WALK_CLI_OUTPUT_INVALID:' + label)); }
    });
  });
}
const auth = "select set_config('request.jwt.claim.sub','" + ids.owner + "',true);set local role authenticated;";
function payload(id, pet, day = '13', mock = false) {
  return { payloadVersion: 1, clientSessionId: id, petId: pet,
    startedAt: '2026-10-' + day + 'T00:00:00.000Z', endedAt: '2026-10-' + day + 'T00:32:00.000Z',
    measuredDurationMs: '1920000', activeDurationMs: '1800000', measuredDistanceM: '2430',
    algorithmVersion: 1, qualitySchemaVersion: 1,
    qualitySummary: { schemaVersion: 1, totalFixCount: 20, acceptedFixCount: 15,
      rejectedAccuracyCount: 1, rejectedTimestampCount: 1, rejectedDuplicateCount: 1,
      rejectedJumpCount: 1, rejectedSpeedCount: 0, stationarySuppressedCount: 1, segmentCount: 1,
      gpsGapDurationMs: '1000', maxGapDurationMs: '1000', mockLocationObserved: mock },
    routeBackupChoice: 'LOCAL_ONLY' };
}
function finish(p) {
  const bytes = JSON.stringify(p), digest = crypto.createHash('sha256').update(bytes).digest('hex');
  return "public.finish_walk_v1('" + bytes + "'::jsonb,'" + digest + "')";
}
const reserve = (id, pet) => "public.start_walk_v1('" + id + "','" + pet + "')";
const cancel = (id, pet) => "public.cancel_walk_v1('" + id + "','" + pet + "')";
const remove = (id, pet) => "public.delete_walk_session_v1('" + id + "','" + pet + "')";
async function invoke(expression, label) {
  return query('begin;' + auth + "select " + expression + "->>'state' as state;commit;", label);
}
function transaction(expression, hold) {
  return 'begin;' + auth +
    'do $$ declare t timestamptz; r jsonb; detail text; begin ' +
    (hold ? "perform pg_advisory_xact_lock(hashtextextended('nuri-walk-owner:'||auth.uid()::text,0));perform pg_sleep(4);" : '') +
    't:=clock_timestamp();begin r:=' + expression + ";" +
    "perform set_config('nuri.walk.test.result',r->>'state',true);" +
    "exception when sqlstate '22023' then get stacked diagnostics detail=pg_exception_detail;perform set_config('nuri.walk.test.result',detail::jsonb->>'walkCode',true);end;" +
    "perform set_config('nuri.walk.test.ms',(extract(epoch from(clock_timestamp()-t))*1000)::text,true);end $$;" +
    "select current_setting('nuri.walk.test.result') as result,current_setting('nuri.walk.test.ms') as rpc_ms;commit;";
}
async function race(label, first, second, expected) {
  const a = query(transaction(first, true), label + '-holder');
  await new Promise(resolve => setTimeout(resolve, 600));
  const b = query(transaction(second, false), label + '-waiter');
  const result = await Promise.all([a, b]);
  const holder = result[0][0], waiter = result[1][0];
  if (holder.result !== expected[0] || waiter.result !== expected[1]) throw Error('WALK_RACE_RESULT:' + label);
  if (Number(waiter.rpc_ms) < 1000) throw Error('WALK_CONCURRENCY_NOT_OBSERVED:' + label);
  evidence.tests.push({ label, holder: holder.result, waiter: waiter.result, waiterMs: waiter.rpc_ms, pass: true });
}
async function main() {
  const owned = await query("select count(*) as n from auth.users where id='" + ids.owner
    + "' and raw_user_meta_data->>'nickname'='w'||left(replace('" + ids.owner + "','-',''),8);", 'scope');
  if (String(owned[0].n) !== '1') throw Error('WALK_SYNTHETIC_OWNER_NOT_FOUND');
  if (!remainingOnly) {
    await race('same_id_replay', finish(payload(ids.a, ids.pet)), finish(payload(ids.a, ids.pet)), ['ACCEPTED_SERVER', 'ACCEPTED_SERVER']);
    const conflict = payload(ids.a, ids.pet); conflict.measuredDistanceM = '2431';
    await race('same_id_conflict', finish(payload(ids.a, ids.pet)), finish(conflict), ['ACCEPTED_SERVER', 'WALK_PAYLOAD_CONFLICT']);
  }
  await invoke(reserve(ids.c, ids.pet), 'reserve-finish-wins');
  await race('finish_wins_cancel', finish(payload(ids.c, ids.pet, '17')), cancel(ids.c, ids.pet), ['ACCEPTED_SERVER', 'ACCEPTED_SERVER']);
  await invoke(reserve(ids.d, ids.pet), 'reserve-cancel-wins');
  await race('cancel_wins_finish', cancel(ids.d, ids.pet), finish(payload(ids.d, ids.pet, '18')), ['NOT_ACCEPTED_FINAL', 'WALK_SESSION_DELETED']);
  await race('cross_device_cross_pet_start', reserve(ids.e, ids.pet), reserve(ids.f, ids.pet2), ['ACTIVE', 'WALK_ALREADY_ACTIVE']);
  await invoke(finish(payload(ids.e, ids.pet, '19', true)), 'quality-ineligible');
  await invoke(reserve(ids.f, ids.pet2), 'reserve-other-pet');
  await race('ineligible_overlap_across_pets', finish(payload(ids.e, ids.pet, '19', true)), finish(payload(ids.f, ids.pet2, '19')), ['ACCEPTED_SERVER', 'REJECTED_SERVER']);
  await race('delete_wins_replay', remove(ids.a, ids.pet), finish(payload(ids.a, ids.pet)), ['DELETED', 'WALK_SESSION_DELETED']);
  const counts = await query("select count(*) as sessions,count(*) filter(where state='ACTIVE') as active,count(*) filter(where state='ACCEPTED_SERVER') as accepted from public.walk_sessions where user_id='" + ids.owner + "';", 'counts');
  evidence.finalFixtureState = counts[0];
}
(async () => {
  let failure;
  try { await main(); }
  catch (error) { failure = error.message; evidence.failure = failure; }
  finally {
    try {
      const cleanup = await query("begin;do $$ declare n integer;begin delete from auth.users where id='" + ids.owner
        + "' and raw_user_meta_data->>'nickname'='w'||left(replace('" + ids.owner + "','-',''),8);get diagnostics n=row_count;"
        + "if n<>1 then raise exception 'WALK_CLEANUP_SCOPE_MISMATCH';end if;end $$;commit;"
        + "select (select count(*) from auth.users where id='" + ids.owner + "') as users,"
        + "(select count(*) from public.pets where id in ('" + ids.pet + "','" + ids.pet2 + "')) as pets,"
        + "(select count(*) from public.walk_sessions where user_id='" + ids.owner + "') as sessions;", 'cleanup');
      if (Object.values(cleanup[0]).some(v => Number(v) !== 0)) throw Error('WALK_CLEANUP_INCOMPLETE');
      evidence.cleanup = 'PASS'; evidence.remainingOwnedFixtures = cleanup[0];
    } catch { evidence.cleanup = 'FAIL'; failure = failure || 'WALK_CLEANUP_FAILED'; }
    fs.writeFileSync(path.join(evidenceRoot, 'phase4-concurrency-result.json'), JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify(evidence));
    if (failure) process.exitCode = 1;
  }
})();

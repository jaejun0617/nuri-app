#!/usr/bin/env node
'use strict';
// Real independent database connections; one exact synthetic scope, no real IDs.
const fs = require('node:fs'),
  path = require('node:path'),
  cp = require('node:child_process'),
  crypto = require('node:crypto');
const [scratch, root] = process.argv.slice(2);
if (
  !scratch ||
  !root ||
  fs
    .readFileSync(path.join(scratch, 'supabase/.temp/project-ref'), 'utf8')
    .trim() !== 'grmekesqoydylqmyvfke'
)
  throw Error('WALK_C_PROJECT_GATE');
const ids = Object.fromEntries(
  ['owner', 'pet', 'pet2', 'a', 'b', 'c', 'd'].map(k => [
    k,
    crypto.randomUUID(),
  ]),
);
const token = crypto.randomUUID();
fs.writeFileSync(
  path.join(root, 'owned-synthetic-scope.json'),
  JSON.stringify({ ids, token }),
  { mode: 0o600, flag: 'wx' },
);
const result = {
  races: [],
  cleanup: 'PENDING',
  syntheticUsers: 1,
  syntheticPets: 2,
};
let seq = 0,
  created = false;
function query(sql, label) {
  const file = path.join(root, ++seq + '-' + label + '.sql');
  fs.writeFileSync(file, sql, { mode: 0o600, flag: 'wx' });
  return new Promise((resolve, reject) => {
    const child = cp.spawn(
      'supabase',
      ['db', 'query', '--linked', '--file', file, '--agent=yes'],
      { cwd: scratch, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const deadline = setTimeout(() => child.kill('SIGTERM'), 60000);
    let out = '',
      err = '';
    child.stdout.on('data', b => {
      out += b;
    });
    child.stderr.on('data', b => {
      err += b;
    });
    child.on('error', () => reject(Error('WALK_C_CLI_UNAVAILABLE')));
    child.on('close', code => {
      clearTimeout(deadline);
      if (code !== 0) {
        const sqlCode = err.match(/ERROR:\s+([A-Z0-9_]+)/);
        return reject(
          Error(
            'WALK_C_QUERY_FAILED:' +
              label +
              ':' +
              (sqlCode ? sqlCode[1] : 'CLI_CONNECTION_OR_TRANSPORT'),
          ),
        );
      }
      try {
        resolve(JSON.parse(out.slice(out.indexOf('{'))).rows);
      } catch {
        reject(Error('WALK_C_INVALID_CLI_RESPONSE'));
      }
    });
  });
}
const auth =
  "select set_config('request.jwt.claim.sub','" +
  ids.owner +
  "',true);set local role authenticated;";
const reserve = (id, pet) => "public.start_walk_v1('" + id + "','" + pet + "')";
const del = (id, pet) =>
  "public.delete_walk_session_v1('" + id + "','" + pet + "')";
const progression = pet => "public.get_pet_walk_progression_v1('" + pet + "')";
function finish(id, pet, day, distance, duration) {
  const end = duration === '14400000' ? '04:00:00.000Z' : '01:00:00.000Z';
  const p = {
    payloadVersion: 1,
    clientSessionId: id,
    petId: pet,
    startedAt: '2026-10-' + day + 'T00:00:00.000Z',
    endedAt: '2026-10-' + day + 'T' + end,
    measuredDurationMs: duration,
    activeDurationMs: duration,
    measuredDistanceM: distance,
    algorithmVersion: 1,
    qualitySchemaVersion: 1,
    qualitySummary: {
      schemaVersion: 1,
      totalFixCount: 20,
      acceptedFixCount: 15,
      rejectedAccuracyCount: 1,
      rejectedTimestampCount: 1,
      rejectedDuplicateCount: 1,
      rejectedJumpCount: 1,
      rejectedSpeedCount: 0,
      stationarySuppressedCount: 1,
      segmentCount: 1,
      gpsGapDurationMs: '0',
      maxGapDurationMs: '0',
      mockLocationObserved: false,
    },
    routeBackupChoice: 'LOCAL_ONLY',
  };
  const bytes = JSON.stringify(p),
    digest = crypto.createHash('sha256').update(bytes).digest('hex');
  return "public.finish_walk_v1('" + bytes + "'::jsonb,'" + digest + "')";
}
async function invoke(expr, label) {
  return query(
    'begin;' + auth + 'select ' + expr + ' as result;commit;',
    label,
  );
}
function raceSql(expr, key, hold) {
  return (
    'begin;' +
    auth +
    'do $$ declare t timestamptz;r jsonb;d text;begin ' +
    (hold
      ? "perform pg_advisory_xact_lock(hashtextextended('nuri-walk-owner:'||auth.uid()::text,0));perform pg_sleep(4);"
      : '') +
    't:=clock_timestamp();begin r:=' +
    expr +
    ";perform set_config('nuri.c.result',r->>'" +
    key +
    "',true);" +
    "exception when sqlstate '22023' then get stacked diagnostics d=pg_exception_detail;perform set_config('nuri.c.result',d::jsonb->>'walkCode',true);end;" +
    "perform set_config('nuri.c.ms',(extract(epoch from(clock_timestamp()-t))*1000)::text,true);end $$;" +
    "select current_setting('nuri.c.result') as result,current_setting('nuri.c.ms') as rpc_ms;commit;"
  );
}
async function race(label, a, aKey, b, bKey, expected) {
  const first = query(raceSql(a, aKey, true), label + '-holder');
  await new Promise(resolve => setTimeout(resolve, 600));
  const second = query(raceSql(b, bKey, false), label + '-waiter');
  const [ar, br] = await Promise.all([first, second]);
  if (ar[0].result !== expected[0] || br[0].result !== expected[1])
    throw Error('WALK_C_RACE_RESULT:' + label);
  if (Number(br[0].rpc_ms) < 1000)
    throw Error('WALK_C_CONCURRENCY_NOT_OBSERVED:' + label);
  result.races.push({
    label,
    holder: ar[0].result,
    waiter: br[0].result,
    waiterMs: br[0].rpc_ms,
    pass: true,
  });
}
async function check(pet, total, history, label) {
  const rows = await invoke(progression(pet), label);
  const value = rows[0].result;
  if (value.lifetimeDistanceM !== total || value.milestones.length !== history)
    throw Error('WALK_C_SNAPSHOT:' + label);
  return value;
}
const fingerprint =
  'select (select count(*) from auth.users) as users,(select count(*) from public.pets) as pets,' +
  "(select md5(string_agg(md5(row_to_json(u)::text),'' order by id)) from auth.users u) as authHash," +
  "(select md5(string_agg(md5(row_to_json(p)::text),'' order by id)) from public.pets p) as petHash";
(async () => {
  let failure;
  try {
    result.before = (await query(fingerprint, 'before'))[0];
    await query(
      "begin;do $$ begin if exists(select 1 from auth.users where id='" +
        ids.owner +
        "') or exists(select 1 from public.pets where id in ('" +
        ids.pet +
        "','" +
        ids.pet2 +
        "'))then raise exception 'WALK_C_COLLISION';end if;end$$;" +
        "insert into auth.users(id,raw_user_meta_data)values('" +
        ids.owner +
        "',jsonb_build_object('nickname','c'||left(replace('" +
        ids.owner +
        "','-',''),9),'walkPhase5ATest','" +
        token +
        "'));" +
        "insert into public.pets(id,user_id,name)values('" +
        ids.pet +
        "','" +
        ids.owner +
        "','Walk C concurrency'),('" +
        ids.pet2 +
        "','" +
        ids.owner +
        "','Walk C concurrency');commit;select true as ready;",
      'setup',
    );
    created = true;
    await invoke(reserve(ids.a, ids.pet), 'reserve-replay');
    const first = finish(ids.a, ids.pet, '14', '10000', '3600000');
    await race('same_finish_exact_once', first, 'state', first, 'state', [
      'ACCEPTED_SERVER',
      'ACCEPTED_SERVER',
    ]);
    const initial = await check(ids.pet, '10000', 2, 'first-history');
    await invoke(reserve(ids.b, ids.pet), 'reserve-threshold');
    await race(
      'finish_then_delete_history',
      finish(ids.b, ids.pet, '15', '90000', '14400000'),
      'state',
      del(ids.b, ids.pet),
      'state',
      ['ACCEPTED_SERVER', 'DELETED'],
    );
    const historical = await check(
      ids.pet,
      '10000',
      3,
      'historical-after-delete',
    );
    if (
      JSON.stringify(historical.milestones.slice(0, 2)) !==
      JSON.stringify(initial.milestones)
    )
      throw Error('WALK_C_HISTORY_REWRITTEN');
    await invoke(reserve(ids.c, ids.pet2), 'reserve-cancel');
    await race(
      'delete_before_finish_no_milestone',
      del(ids.c, ids.pet2),
      'state',
      finish(ids.c, ids.pet2, '16', '10000', '3600000'),
      'state',
      ['DELETED', 'WALK_SESSION_DELETED'],
    );
    await check(ids.pet2, '0', 0, 'cancelled-no-history');
    await race(
      'delete_recalculate_read',
      del(ids.a, ids.pet),
      'state',
      progression(ids.pet),
      'lifetimeDistanceM',
      ['DELETED', '0'],
    );
    await check(ids.pet, '0', 3, 'zero-historical');
    await invoke(reserve(ids.d, ids.pet2), 'reserve-sibling');
    await invoke(
      finish(ids.d, ids.pet2, '17', '100000', '14400000'),
      'finish-sibling',
    );
    const sibling = await check(ids.pet2, '100000', 3, 'sibling-only');
    await invoke(
      "public.delete_walk_route_v1('" + ids.d + "','" + ids.pet2 + "')",
      'route-delete',
    );
    const afterRoute = await check(ids.pet2, '100000', 3, 'route-preserves');
    if (JSON.stringify(sibling) !== JSON.stringify(afterRoute))
      throw Error('WALK_C_ROUTE_MUTATED_PROGRESSION');
    await check(ids.pet, '0', 3, 'selected-pet-isolation');
    result.functional = 'PASS';
  } catch (error) {
    failure = error.message;
    result.failure = failure;
  } finally {
    if (created) {
      try {
        await query(
          "begin;do $$ declare n integer;begin delete from auth.users where id='" +
            ids.owner +
            "' and raw_user_meta_data->>'walkPhase5ATest'='" +
            token +
            "';get diagnostics n=row_count;if n<>1 then raise exception 'WALK_C_CLEANUP_SCOPE';end if;end$$;commit;select " +
            "(select count(*) from auth.users where id='" +
            ids.owner +
            "') as users," +
            "(select count(*) from public.pets where id in ('" +
            ids.pet +
            "','" +
            ids.pet2 +
            "')) as pets," +
            "(select count(*) from public.walk_sessions where user_id='" +
            ids.owner +
            "') as sessions," +
            "(select count(*) from public.pet_walk_milestones where user_id='" +
            ids.owner +
            "') as milestones;",
          'cleanup',
        ).then(rows => {
          result.remaining = rows[0];
          if (Object.values(rows[0]).some(x => Number(x) !== 0))
            throw Error('WALK_C_REMAINDER');
        });
        result.cleanup = 'PASS';
        result.after = (await query(fingerprint, 'after'))[0];
        result.existingRowsPreserved =
          JSON.stringify(result.before) === JSON.stringify(result.after);
        if (!result.existingRowsPreserved)
          failure = 'WALK_C_EXISTING_DATA_DRIFT';
      } catch {
        result.cleanup = 'FAIL';
        failure = failure || 'WALK_C_CLEANUP_FAILED';
      }
    } else result.cleanup = 'NOT_REQUIRED';
    fs.writeFileSync(
      path.join(root, 'result.json'),
      JSON.stringify(result, null, 2) + '\n',
      { mode: 0o600 },
    );
    console.log(JSON.stringify(result));
    if (failure) process.exitCode = 1;
  }
})();

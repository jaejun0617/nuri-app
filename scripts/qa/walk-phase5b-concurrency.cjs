#!/usr/bin/env node
'use strict';
// D-only independent SQL connections and exact owned synthetic cleanup.
const fs = require('node:fs'),
  path = require('node:path'),
  cp = require('node:child_process'),
  crypto = require('node:crypto');
function classifyFailure(out, err, code, signal, timedOut) {
  const both = err + '\n' + out;
  const state =
    both.match(/SQLSTATE[\s:()]*([A-Z0-9]{5})/i) ||
    both.match(
      /["'](?:code|sql_state|sqlState|sqlstate)["']\s*:\s*["']([A-Z0-9]{5})["']/i,
    );
  const sqlState = state ? state[1].toUpperCase() : null;
  const classification = timedOut
    ? 'CLIENT_DEADLINE'
    : sqlState
    ? 'SQLSTATE'
    : /password authentication failed/i.test(both)
    ? 'AUTH_FAILURE_TEXT'
    : /timeout|deadline/i.test(both)
    ? 'TIMEOUT_TEXT'
    : 'UNCLASSIFIED_NONZERO';
  return {
    sqlState,
    classification,
    exitCode: code,
    signal: signal || null,
    deadlineExpired: timedOut,
  };
}
if (process.argv[2] === '--self-test-classifier') {
  const cases = [
    [
      classifyFailure('{"error":{"code":"42501"}}', '', 1, null, false),
      '42501',
    ],
    [classifyFailure('', 'failure (SQLSTATE 28P01)', 1, null, false), '28P01'],
  ];
  if (
    cases.some(([value, expected]) => value.sqlState !== expected) ||
    classifyFailure('', '', null, 'SIGTERM', true).classification !==
      'CLIENT_DEADLINE' ||
    classifyFailure('unknown', 'unknown', 1, null, false).classification !==
      'UNCLASSIFIED_NONZERO'
  )
    throw Error('WALK_D_CLASSIFIER_TEST');
  console.log('WALK_D_CLASSIFIER_SELF_TEST_PASS');
  process.exit(0);
}
const [scratch, root] = process.argv.slice(2);
const remainingOnly = process.argv[4] === 'remaining';
if (
  !scratch ||
  !root ||
  fs
    .readFileSync(path.join(scratch, 'supabase/.temp/project-ref'), 'utf8')
    .trim() !== 'grmekesqoydylqmyvfke'
)
  throw Error('WALK_D_PROJECT_GATE');
const names = [
  'owner',
  'pet',
  'pet2',
  'zeroSession',
  'zeroMemory',
  'manual',
  'manual2',
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'petFinalSession',
  'petFinalMemory',
];
const ids = Object.fromEntries(names.map(k => [k, crypto.randomUUID()])),
  token = crypto.randomUUID();
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
  setupAttempted = false;
function query(sql, label) {
  const file = path.join(root, ++seq + '-' + label + '.sql');
  fs.writeFileSync(file, sql, { mode: 0o600, flag: 'wx' });
  return new Promise((resolve, reject) => {
    const child = cp.spawn(
      'supabase',
      ['db', 'query', '--linked', '--file', file, '--agent=yes'],
      { cwd: scratch, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '',
      err = '';
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, 60000);
    child.stdout.on('data', b => {
      out += b;
    });
    child.stderr.on('data', b => {
      err += b;
    });
    child.on('error', () => {
      clearTimeout(deadline);
      reject(Error('WALK_D_CLI_UNAVAILABLE'));
    });
    child.on('close', (code, signal) => {
      clearTimeout(deadline);
      if (code !== 0) {
        const diagnostic = classifyFailure(out, err, code, signal, timedOut);
        result.queryFailures = [
          ...(result.queryFailures || []),
          { label, ...diagnostic },
        ];
        return reject(
          Error(
            'WALK_D_QUERY_FAILED:' +
              label +
              ':' +
              (diagnostic.sqlState || diagnostic.classification),
          ),
        );
      }
      try {
        resolve(JSON.parse(out.slice(out.indexOf('{'))).rows);
      } catch {
        reject(Error('WALK_D_INVALID_CLI_RESPONSE'));
      }
    });
  });
}
const auth =
  "select set_config('request.jwt.claim.sub','" +
  ids.owner +
  "',true);set local role authenticated;";
const start = (sid, pet) => "public.start_walk_v1('" + sid + "','" + pet + "')";
const remove = (sid, pet) =>
  "public.delete_walk_session_v1('" + sid + "','" + pet + "')";
const get = (sid, pet) =>
  "public.get_walk_record_v1('" + sid + "','" + pet + "')";
const create = (sid, pet, mid) =>
  "public.create_walk_memory_from_session_v1('" +
  sid +
  "','" +
  pet +
  "','" +
  mid +
  "','" +
  crypto.randomUUID() +
  '\',\'{"title":"Walk D controlled","content":"owned fixture"}\'::jsonb)';
const xp = (pet, mid) =>
  "public.award_user_activity_xp_v1('" +
  pet +
  "','walk_timeline_post','timeline_memory','" +
  mid +
  "')";
const daily = (pet, mid) =>
  "public.record_pet_daily_activity_v1('" +
  pet +
  "','timeline_walk_post','" +
  mid +
  "')";
async function invoke(expr, label) {
  return (
    await query(
      'begin;' + auth + 'select ' + expr + ' as result;commit;',
      label,
    )
  )[0].result;
}
async function finish(sid, pet, day) {
  const p = {
    payloadVersion: 1,
    clientSessionId: sid,
    petId: pet,
    startedAt: '2026-10-' + day + 'T00:00:00.000Z',
    endedAt: '2026-10-' + day + 'T01:00:00.000Z',
    measuredDurationMs: '3600000',
    activeDurationMs: '3600000',
    measuredDistanceM: '6000',
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
  await invoke(start(sid, pet), 'reserve');
  const r = await invoke(
    "public.finish_walk_v1('" + bytes + "'::jsonb,'" + digest + "')",
    'finish',
  );
  if (r.state !== 'ACCEPTED_SERVER') throw Error('WALK_D_SETUP_FINISH');
}
function exprBody(expr, value) {
  return (
    'r:=' + expr + ";perform set_config('nuri.d.value'," + value + ',true);'
  );
}
function raceSql(body, role = 'authenticated') {
  return (
    "begin;set local lock_timeout='15s';select set_config('request.jwt.claim.sub','" +
    ids.owner +
    "',true);set local role " +
    role +
    ';' +
    'do $$ declare r jsonb;d text;t timestamptz:=clock_timestamp();begin begin ' +
    body +
    " exception when sqlstate '22023' or sqlstate '42501' then get stacked diagnostics d=pg_exception_detail;" +
    "perform set_config('nuri.d.value',coalesce(nullif(d,'')::jsonb->>'walkCode',sqlerrm),true);end;" +
    "perform set_config('nuri.d.ms',(extract(epoch from(clock_timestamp()-t))*1000)::text,true);end$$;" +
    "select current_setting('nuri.d.value') as value,current_setting('nuri.d.ms') as rpc_ms;commit;"
  );
}
const holdOwner =
  "perform pg_advisory_xact_lock(hashtextextended('nuri-walk-owner:'||auth.uid()::text,0));perform pg_sleep(4);";
async function race(label, a, b, expected, role = 'authenticated') {
  if (
    remainingOnly &&
    [
      'legacy_zero_fence_manual_xp_contention',
      'two_device_same_session_different_candidates',
      'manual_daily_summary_then_xp_no_inversion',
      'two_sessions_shared_account_zero_budget',
    ].includes(label)
  ) {
    const ar = await query(
      raceSql(a.replaceAll('perform pg_sleep(4);', ''), role),
      label + '-setup-first',
    );
    const br = await query(raceSql(b), label + '-setup-second');
    if (ar[0].value !== expected[0] || br[0].value !== expected[1])
      throw Error('WALK_D_REMAINING_SETUP:' + label);
    result.setupChecks = [...(result.setupChecks || []), label];
    return;
  }
  const first = query(raceSql(a, role), label + '-holder');
  await new Promise(resolve => setTimeout(resolve, 600));
  const second = query(raceSql(b), label + '-waiter');
  const settled = await Promise.allSettled([first, second]);
  const failed = settled.find(item => item.status === 'rejected');
  if (failed) throw failed.reason;
  const [ar, br] = settled.map(item => item.value);
  if (ar[0].value !== expected[0] || br[0].value !== expected[1])
    throw Error('WALK_D_RACE_RESULT:' + label);
  if (Number(br[0].rpc_ms) < 1000)
    throw Error('WALK_D_NO_OBSERVED_CONTENTION:' + label);
  result.races.push({
    label,
    holder: ar[0].value,
    waiter: br[0].value,
    waiterMs: br[0].rpc_ms,
    pass: true,
  });
  console.log(JSON.stringify({ race: label, pass: true }));
}
const fingerprints =
  'select ' +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by id)) from auth.users t) as auth," +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by id)) from public.pets t) as pets," +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by id)) from public.memories t) as memories," +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by id)) from public.user_xp_ledger t) as ledger," +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by id)) from public.pet_daily_activities t) as daily," +
  "(select md5(string_agg(md5(row_to_json(t)::text),'' order by user_id)) from public.user_level_summaries t) as summary";
(async () => {
  let failure;
  try {
    result.before = (await query(fingerprints, 'before'))[0];
    setupAttempted = true;
    await query(
      "begin;do $$ begin if exists(select 1 from auth.users where id='" +
        ids.owner +
        "') or exists(select 1 from public.pets where id in('" +
        ids.pet +
        "','" +
        ids.pet2 +
        "'))then raise exception 'WALK_D_COLLISION';end if;end$$;" +
        "insert into auth.users(id,raw_user_meta_data)values('" +
        ids.owner +
        "',jsonb_build_object('nickname','d'||left(replace('" +
        ids.owner +
        "','-',''),9),'walkPhase5BTest','" +
        token +
        "'));" +
        "insert into public.pets(id,user_id,name)values('" +
        ids.pet +
        "','" +
        ids.owner +
        "','Walk D concurrent'),('" +
        ids.pet2 +
        "','" +
        ids.owner +
        "','Walk D concurrent');" +
        "insert into public.memories(id,user_id,pet_id,title,category,created_at)values('" +
        ids.manual +
        "','" +
        ids.owner +
        "','" +
        ids.pet +
        "','Walk D manual','walk',now()),('" +
        ids.manual2 +
        "','" +
        ids.owner +
        "','" +
        ids.pet2 +
        "','Walk D manual','walk',now());commit;select true as ready;",
      'setup',
    );
    await finish(ids.zeroSession, ids.pet, '10');
    await query(
      "insert into public.user_xp_ledger(user_id,pet_id,event_type,source_type,source_id,xp,activity_date_kst)values('" +
        ids.owner +
        "','" +
        ids.pet +
        "','timeline_post','walk_d_budget_fixture','" +
        token +
        "',150,public.nuri_kst_today_v1());select true as seeded;",
      'zero-budget',
    );
    const zero = await invoke(
      create(ids.zeroSession, ids.pet, ids.zeroMemory),
      'zero-create',
    );
    if (zero.record.claim.settlementOutcome !== 'ZERO_XP_VALID')
      throw Error('WALK_D_ZERO_SETUP');
    await query(
      "delete from public.user_xp_ledger where user_id='" +
        ids.owner +
        "' and source_type='walk_d_budget_fixture' and source_id='" +
        token +
        "';select true as freed;",
      'budget-free',
    );
    // Real OLD public XP retry waits behind a normal manual award with budget.
    await race(
      'legacy_zero_fence_manual_xp_contention',
      "perform pg_advisory_xact_lock(hashtextextended('nuri-user-xp:'||auth.uid()::text,0));perform pg_sleep(4);" +
        exprBody(
          'to_jsonb((' + 'select x from ' + xp(ids.pet, ids.manual) + ' x))',
          "r->>'awarded'",
        ),
      exprBody(
        'to_jsonb((' + 'select x from ' + xp(ids.pet, ids.zeroMemory) + ' x))',
        "r->>'xp_awarded'",
      ),
      ['true', '0'],
    );
    await finish(ids.s1, ids.pet, '11');
    await race(
      'two_device_same_session_different_candidates',
      holdOwner + exprBody(create(ids.s1, ids.pet, ids.m1), "r->>'replayed'"),
      exprBody(create(ids.s1, ids.pet, crypto.randomUUID()), "r->>'replayed'"),
      ['false', 'true'],
    );
    let r = await invoke(get(ids.s1, ids.pet), 'original-binding');
    if (r.claim.originalMemoryId !== ids.m1)
      throw Error('WALK_D_ORIGINAL_REPLACED');
    await finish(ids.s2, ids.pet2, '12');
    await race(
      'manual_daily_summary_then_xp_no_inversion',
      'r:=to_jsonb((select x from ' +
        daily(ids.pet2, ids.manual2) +
        ' x));perform pg_sleep(4);' +
        exprBody(
          'to_jsonb((select x from ' + xp(ids.pet2, ids.manual2) + ' x))',
          "r->>'awarded'",
        ),
      exprBody(
        create(ids.s2, ids.pet2, ids.m2),
        "r->'record'->'claim'->>'settlementOutcome'",
      ),
      ['true', 'XP_AWARDED'],
    );
    await finish(ids.s3, ids.pet, '13');
    await finish(ids.s4, ids.pet2, '14');
    await race(
      'two_sessions_shared_account_zero_budget',
      holdOwner +
        exprBody(
          create(ids.s3, ids.pet, ids.m3),
          "r->'record'->'claim'->>'settlementOutcome'",
        ),
      exprBody(
        create(ids.s4, ids.pet2, ids.m4),
        "r->'record'->'claim'->>'settlementOutcome'",
      ),
      ['ZERO_XP_VALID', 'ZERO_XP_VALID'],
    );
    await race(
      'memory_delete_wins_replay',
      "delete from public.memories where id='" +
        ids.m1 +
        "';perform pg_sleep(4);perform set_config('nuri.d.value','DELETED',true);",
      exprBody(create(ids.s1, ids.pet, crypto.randomUUID()), "r->>'replayed'"),
      ['DELETED', 'WALK_RECORD_RECREATE_FORBIDDEN'],
    );
    r = await invoke(get(ids.s1, ids.pet), 'deleted-memory-view');
    if (r.recordState !== 'RECORD_DELETED' || !r.claim)
      throw Error('WALK_D_DELETED_CLAIM_LOST');
    await race(
      'replay_locks_original_then_memory_delete',
      exprBody(
        create(ids.s2, ids.pet2, crypto.randomUUID()),
        "r->>'replayed'",
      ) + 'perform pg_sleep(4);',
      "delete from public.memories where id='" +
        ids.m2 +
        "';perform set_config('nuri.d.value','DELETED',true);",
      ['true', 'DELETED'],
    );
    await race(
      'claimed_session_delete_wins_create',
      holdOwner + exprBody(remove(ids.s3, ids.pet), "r->>'state'"),
      exprBody(create(ids.s3, ids.pet, crypto.randomUUID()), "r->>'replayed'"),
      ['DELETED', 'WALK_SESSION_DELETED'],
    );
    r = await invoke(get(ids.s3, ids.pet), 'deleted-session-view');
    if (
      r.recordState !== 'RECORDED' ||
      r.summary !== null ||
      !r.memory ||
      !r.claim
    )
      throw Error('WALK_D_SESSION_ERASURE_CONTRACT');
    const batch = await invoke(
      "public.get_walk_memory_summaries_v1(array['" + ids.m3 + "'::uuid])",
      'deleted-session-batch',
    );
    if (
      batch.items.length !== 1 ||
      batch.items[0].summary !== null ||
      'memory' in batch.items[0] ||
      'claim' in batch.items[0]
    )
      throw Error('WALK_D_BATCH_ERASURE');
    await finish(ids.s5, ids.pet, '15');
    await race(
      'unclaimed_session_delete_wins_create',
      holdOwner + exprBody(remove(ids.s5, ids.pet), "r->>'state'"),
      exprBody(create(ids.s5, ids.pet, ids.m5), "r->>'replayed'"),
      ['DELETED', 'WALK_SESSION_DELETED'],
    );
    await finish(ids.petFinalSession, ids.pet2, '16');
    await race(
      'owned_final_pet_delete_wins_claim',
      "delete from public.pets where id='" +
        ids.pet2 +
        "' and user_id='" +
        ids.owner +
        "';perform pg_sleep(4);perform set_config('nuri.d.value','DELETED',true);",
      exprBody(
        create(ids.petFinalSession, ids.pet2, ids.petFinalMemory),
        "r->>'replayed'",
      ),
      ['DELETED', 'WALK_OWNER_MISMATCH'],
      'postgres',
    );
    await query(
      'select ' +
        "(select count(*) from public.walk_record_claims where pet_id='" +
        ids.pet2 +
        "') as claims," +
        "(select count(*) from public.user_xp_ledger where user_id='" +
        ids.owner +
        "' and pet_id is null) as retained;",
      'pet-final',
    ).then(rows => {
      if (Number(rows[0].claims) !== 0 || Number(rows[0].retained) < 1)
        throw Error('WALK_D_PET_FINAL_XP');
    });
    await finish(ids.s6, ids.pet, '17');
    await race(
      'owned_final_account_delete_wins_claim',
      "delete from auth.users where id='" +
        ids.owner +
        "' and raw_user_meta_data->>'walkPhase5BTest'='" +
        token +
        "';perform pg_sleep(4);perform set_config('nuri.d.value','DELETED',true);",
      exprBody(create(ids.s6, ids.pet, ids.m6), "r->>'replayed'"),
      ['DELETED', 'WALK_OWNER_MISMATCH'],
      'postgres',
    );
    result.functional = 'PASS';
    result.petFinal = 'PASS';
    result.accountFinal = 'PASS';
  } catch (error) {
    failure = error.message;
    result.failure = failure;
  } finally {
    if (setupAttempted) {
      try {
        // Always reconcile this exact owned marker, even if setup response was lost.
        const rows = await query(
          "begin;delete from auth.users where id='" +
            ids.owner +
            "' and raw_user_meta_data->>'walkPhase5BTest'='" +
            token +
            "';commit;select " +
            "(select count(*) from auth.users where id='" +
            ids.owner +
            "') as users," +
            "(select count(*) from public.pets where id in('" +
            ids.pet +
            "','" +
            ids.pet2 +
            "')) as pets," +
            "(select count(*) from public.walk_sessions where user_id='" +
            ids.owner +
            "') as sessions," +
            "(select count(*) from public.walk_record_claims where user_id='" +
            ids.owner +
            "') as claims," +
            "(select count(*) from public.walk_record_prompt_dismissals where user_id='" +
            ids.owner +
            "') as dismissals," +
            "(select count(*) from public.memories where user_id='" +
            ids.owner +
            "') as memories," +
            "(select count(*) from public.user_xp_ledger where user_id='" +
            ids.owner +
            "') as xp;",
          'cleanup',
        );
        result.remaining = rows[0];
        if (Object.values(rows[0]).some(x => Number(x) !== 0))
          throw Error('WALK_D_REMAINDER');
        result.cleanup = 'PASS';
      } catch {
        result.cleanup = 'FAIL';
        failure = failure || 'WALK_D_CLEANUP_FAILED';
      }
    } else result.cleanup = 'NOT_REQUIRED';
    try {
      result.after = (await query(fingerprints, 'after'))[0];
      result.existingRowsPreserved =
        JSON.stringify(result.before) === JSON.stringify(result.after);
      if (!result.existingRowsPreserved)
        failure = failure || 'WALK_D_EXISTING_DATA_DRIFT';
    } catch {
      failure = failure || 'WALK_D_FINAL_FINGERPRINT_FAILED';
    }
    fs.writeFileSync(
      path.join(root, 'result.json'),
      JSON.stringify(result, null, 2) + '\n',
      { mode: 0o600 },
    );
    console.log(JSON.stringify(result));
    if (failure) process.exitCode = 1;
  }
})();

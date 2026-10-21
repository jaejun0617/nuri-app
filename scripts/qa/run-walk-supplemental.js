'use strict';

// Bounded host for this one approved trial. Never persists raw instrumentation,
// UI, identifiers, network bodies, coordinates or authentication material.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const METHODS = Object.freeze({
  inspect: 'reviewTestManifestNoRestart', remove: 'reviewTestManifestNoRestart',
  phaseA: 'phaseAHoldExactProductDeleteForHostKill', phaseB: 'phaseBColdProductRecoveryObserveOnly',
  attach: 'liveAuditStoredStateNoRestart',
});
const EVENTS = new Set(['TEST_MANIFEST_REVIEW', 'TEST_MANIFEST_ABSENT_AFTER_REVIEW', 'PHASE_A_INITIAL_AUDIT',
  'PHASE_A_READY_NORMAL_UI_ONE_NEW_PET_ONLY', 'NETWORK_PROBE_ATTACHED', 'PET_CREATED_BOUND_NO_CREDENTIAL_EXPORT',
  'ONE_SESSION_ID_BOUND', 'OWNED_FINISHED_LOCAL_DURABLE_NO_SERVER_RECEIPT', 'OWNED_SESSION_ACCEPTED_CANONICAL_ZERO_NO_MEMORY',
  'REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS', 'PHASE_B_READY_SAME_NATIVE_JOURNAL_NO_DIRECT_RPC',
  'PRODUCT_FINAL_NATIVE_DONE_SERVER_ACK_LOCAL_JOURNAL_REMOVED', 'LIVE_AUDIT_STORED_COUNTS',
  'LIVE_AUDIT_QUIESCENT_OBSERVED_HOST_DETACH_CHECK_REQUIRED']);
const STRINGS = new Set(['READY', 'PET_CREATED', 'REMOTE_SUCCESS_HELD', 'BACKOUT_REAL_RESPONSE_RETURNED',
  'PRODUCT_RECOVERY_OBSERVED', 'IDLE', 'STARTING', 'WALKING', 'PAUSED', 'FINISHING', 'FINISHED_LOCAL',
  'RECOVERY_REQUIRED', 'CANCELLED_LOCAL', 'PREPARED', 'RESERVED', 'START_REQUESTED', 'START_FAILED', 'RUNNING',
  'FINISH_PENDING', 'FINISH_INVALID', 'CANCEL_PENDING', 'RESOLVED']);
function priorResultPath(value) {
  const root = '/Users/shinjaejun/.codex/nuri-walk-real-product-20261020/';
  const candidate = value ?? root + 'SUPPLEMENTAL-CORRECTIVE-PHASE-A/result.json';
  assert([root + 'SUPPLEMENTAL-CORRECTIVE-PHASE-A/result.json', root + 'RESUME-20261021-PHASE-A/result.json',
    root + 'RESUME-20261021-RETRY-PHASE-A/result.json'].includes(candidate),
    'EXACT_APPROVED_PHASE_A_RESULT_REQUIRED');
  return candidate;
}
function publicCounts(value) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && (STRINGS.has(value) || /^[a-f0-9]{64}$/.test(value))) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('UNSAFE_STATUS_VALUE');
  const keys = new Set(['exists', 'stage', 'hasPet', 'hasSession', 'hasRequest', 'ownerKey', 'petKey', 'sessionKey', 'requestKey', 'resourceBinding',
    'runtimeState', 'phase', 'activeMs', 'finishEnvelopePresent', 'payloadPresent', 'receiptPresent', 'payloadDigest',
    'complete', 'journal', 'runtime', 'databasePresent', 'databaseReadError', 'observationChanged',
    'committed', 'v1', 'v2', 'confirmed', 'nativeDone', 'armed', 'pending', 'final', 'acknowledged', 'withoutProof',
    'partial', 'corrupt', 'keyError', 'unknown', 'rows', 'activeSlots', 'invalidSlots', 'nullStates', 'unknownStates', ...STRINGS]);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => {
    if (!keys.has(k)) throw Error('UNSAFE_STATUS_KEY');
    return [k, publicCounts(v)];
  }));
}
function parseStatus(block) {
  const name = block.match(/^INSTRUMENTATION_STATUS: supplemental=(.+)$/m)?.[1];
  if (!name) return null;
  if (!EVENTS.has(name)) return { type: 'SELECTOR_STOP', reasonHash: crypto.createHash('sha256').update(name).digest('hex') };
  const pid = Number(block.match(/^INSTRUMENTATION_STATUS: instrumentationPid=(\d+)$/m)?.[1]);
  if (!Number.isSafeInteger(pid) || pid <= 0) throw Error('STATUS_PID_MISSING');
  const marker = block.match(/^INSTRUMENTATION_STATUS: publicRunMarker=(.+)$/m)?.[1];
  if (marker && !/^NQ[0-9a-f]{12}$/.test(marker)) throw Error('UNSAFE_RUN_MARKER');
  const counts = block.match(/^INSTRUMENTATION_STATUS: counts=(.+)$/m)?.[1];
  return { type: name, pid, ...(marker ? { marker } : {}), ...(counts ? { counts: publicCounts(JSON.parse(counts)) } : {}) };
}
function terminal(output, exitCode, signal, intendedDeath, timedOut) {
  if (timedOut) return 'NOT_VERIFIED_HOST_TIMEOUT';
  if (intendedDeath) return 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED';
  if (exitCode === 0 && signal === null && /^INSTRUMENTATION_CODE: -1\s*$/m.test(output)
    && /OK \(1 test\)/.test(output) && !/FAILURES!!!|INSTRUMENTATION_FAILED/.test(output)) return 'PASS';
  return 'NOT_VERIFIED_TERMINAL_RESULT';
}
function mayKill(event, pid, serviceRunning) {
  return event.type === 'REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS' && event.pid === pid && pid > 0 && !serviceRunning
    && event.counts?.committed === 1 && event.counts.pending === 1 && event.counts.confirmed === 0 && event.counts.nativeDone === 0;
}
function assessAnalytics(before, after, appended, policy, plannedEntries) {
  assert.deepEqual(after.originalRows, before.originalRows, 'EXISTING_ANALYTICS_ROWS_CHANGED');
  assert.deepEqual(after.core, before.core, 'EXISTING_CORE_CHANGED');
  assert.equal(after.total, before.total + appended.length, 'ANALYTICS_DELTA_INCOMPLETE');
  assert(plannedEntries.length <= policy.homeEntries && appended.length <= plannedEntries.length * policy.rowsPerEntry, 'ANALYTICS_CAP_EXCEEDED');
  assert(new Set(appended.map(x => x.rowKey)).size === appended.length, 'DUPLICATE_EVENT_ROW');
  const opportunityCounts = plannedEntries.map(() => 0);
  for (const row of appended) {
    assert.equal(row.eventType, 'home_impression'); assert.equal(row.placement, 'logged-in-home');
    assert.equal(row.ownerKey, policy.ownerKey); assert.equal(row.payloadMatchesSource, true);
    assert(policy.petKeys.includes(row.petKey), 'UNAPPROVED_EVENT_PET');
    const stamp = Date.parse(row.occurredAt);
    const matches = plannedEntries.map((x, i) => ({ x, i })).filter(({ x }) => Number.isFinite(stamp)
      && stamp >= Date.parse(x.from) && stamp <= Date.parse(x.to) && x.petKey === row.petKey);
    assert.equal(matches.length, 1, 'UNMAPPED_OR_AMBIGUOUS_HOME_EVENT');
    assert(++opportunityCounts[matches[0].i] <= policy.rowsPerEntry, 'HOME_OPPORTUNITY_CAP_EXCEEDED');
  }
  return { existingCore: 'PASS', oldAnalyticsRows: 'PASS', accounted: appended.length, cap: plannedEntries.length * policy.rowsPerEntry };
}
function reconcileDetachedAnalytics(rows, priorVerified, ownedPetKey) {
  return rows.map(row => {
    if (!row.detached) return row;
    const prior = priorVerified.find(p => p.rowKey === row.rowKey);
    assert(prior && prior.payloadMatchesSource === true && prior.petKey === ownedPetKey && prior.ownerKey === row.ownerKey
      && prior.payloadHash === row.payloadHash && prior.occurredAt === row.occurredAt, 'UNPROVEN_DETACHED_ANALYTICS');
    return { ...row, petKey: prior.petKey, payloadMatchesSource: true };
  });
}

async function run(config) {
  assert(Object.hasOwn(METHODS, config.mode), 'UNAPPROVED_SELECTOR');
  const driver = require(config.driver);
  const output = path.resolve(config.output);
  assert(output.startsWith('/Users/shinjaejun/.codex/nuri-walk-real-product-20261020/'), 'OWNED_EVIDENCE_REQUIRED');
  assert(!fs.existsSync(output), 'RUN_OUTPUT_ALREADY_EXISTS');
  fs.mkdirSync(output, { mode: 0o700 });
  const journal = path.join(output, 'stages.ndjson');
  const record = value => fs.appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n', { mode: 0o600 });
  const started = Date.now();
  record({ type: 'HOST_START', mode: config.mode, run: path.basename(output) });
  let pidBefore = null;
  try { pidBefore = Number(driver.adb('shell', 'pidof', 'com.nuri.app').trim()) || null; }
  catch (error) { if (error.status !== 1) throw Error('PRODUCT_PID_READ_FAILED'); }
  if (config.mode === 'phaseB') {
    assert.equal(pidBefore, null, 'COLD_RECOVERY_REQUIRES_CONFIRMED_ABSENT_PROCESS');
    const prior = JSON.parse(fs.readFileSync(priorResultPath(config.phaseAResult), 'utf8'));
    assert(prior.mode === 'phaseA' && prior.intendedDeath === true && prior.observationFailed === false
      && prior.terminal === 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED', 'DURABLE_PRIOR_KILL_RESULT_REQUIRED');
  } else assert(pidBefore > 0, 'PRODUCT_PID_REQUIRED');
  const args = { class: 'com.nuri.walk.WalkProductResponseLossTest#' + METHODS[config.mode] };
  if (['inspect', 'remove', 'attach'].includes(config.mode)) Object.assign(args, {
    hostExpectedPid: String(pidBefore), hostNoRestartValidated: 'TRUE', waitForActivitiesToComplete: 'false',
  });
  if (['phaseA', 'phaseB', 'remove'].includes(config.mode)) for (const k of ['hostQuiescentVerified', 'exclusiveUi', 'hostBaselineVerified', 'hostOriginalSelectionHeld', 'hostExistingPetCountAtLeastOne']) {
    assert.equal(config[k], true, 'HOST_GATE_REQUIRED'); args[k] = 'TRUE';
  }
  if (['inspect', 'remove'].includes(config.mode)) {
    assert(/^[0-9a-f]{40,64}$/.test(config.publicHashLabel), 'PUBLIC_LABEL_REQUIRED');
    args.publicHashLabel = config.publicHashLabel; args.reviewOperation = config.mode === 'inspect' ? 'INSPECT' : 'REMOVE';
  }
  if (config.mode === 'remove') {
    assert.equal(config.serverReview?.decision, 'PASS', 'ACTUAL_SERVER_REVIEW_REQUIRED');
    assert(/^NQ[0-9a-f]{12}$/.test(config.serverReview.marker), 'EXACT_MARKER_REQUIRED');
    args.hostCleanupReviewed = 'TRUE'; args.reviewedRunMarker = config.serverReview.marker;
    for (const [key, field] of [['reviewedOwnerKey', 'ownerKey'], ['reviewedPetKey', 'petKey']]) {
      assert(/^[0-9a-f]{64}$/.test(config.serverReview[field]), 'EXACT_BINDING_REQUIRED'); args[key] = config.serverReview[field];
    }
    assert.equal(config.serverReview.petAndSessionsAbsent, true); assert.equal(config.serverReview.ackBound, true);
    args.reviewedServerPetAndSessionsAbsent = 'TRUE'; args.reviewedServerAckBound = 'TRUE';
  }
  if (config.mode === 'phaseA') {
    assert.equal(config.automaticOwnedKillApproved, true, 'KILL_APPROVAL_REQUIRED');
    assert(/^[0-9a-f]{64}$/.test(config.expectedOwnerKey) && /^[0-9a-f]{40,64}$/.test(config.publicHashLabel), 'FIXED_QA_OWNER_REQUIRED');
    args.expectedOwnerKey = config.expectedOwnerKey; args.publicHashLabel = config.publicHashLabel;
  }
  const adb = '/Users/shinjaejun/Library/Android/sdk/platform-tools/adb';
  const devices = cp.execFileSync(adb, ['devices'], { encoding: 'utf8' }).split('\n').filter(x => /\tdevice$/.test(x));
  assert.equal(devices.length, 1, 'SINGLE_DEVICE_REQUIRED');
  const argv = ['-s', devices[0].split('\t')[0], 'shell', 'am', 'instrument'];
  if (['inspect', 'remove', 'attach'].includes(config.mode)) argv.push('--no-restart');
  argv.push('-w', '-r');
  for (const [k, v] of Object.entries(args)) argv.push('-e', k, v);
  argv.push('com.nuri.app.test/androidx.test.runner.AndroidJUnitRunner');
  const child = cp.spawn(adb, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
  record({ type: 'INSTRUMENTATION_STARTED', hostPid: child.pid, productPidBefore: pidBefore });
  let buffer = '', pending = '', intendedDeath = false, timedOut = false, observationFailed = false;
  const timeoutMs = config.mode === 'phaseA' ? 960000 : config.mode === 'phaseB' ? 240000 : 45000;
  const deadline = setTimeout(() => {
    timedOut = true; record({ type: 'HOST_TIMEOUT', recovery: 'RETAIN_MANIFEST_REVIEW_LIVE_PROCESS_AND_JOURNAL_DO_NOT_DELETE' });
    child.kill('SIGTERM');
  }, timeoutMs);
  const onData = bytes => {
    buffer += bytes.toString('utf8'); pending += bytes.toString('utf8');
    if (buffer.length > 262144) { observationFailed = true; buffer = buffer.slice(-131072); }
    let match;
    while ((match = /INSTRUMENTATION_STATUS_CODE: -?\d+\r?\n/.exec(pending))) {
      const block = pending.slice(0, match.index); pending = pending.slice(match.index + match[0].length);
      try {
        const event = parseStatus(block); if (!event) continue;
        record(event);
        if (event.type === 'SELECTOR_STOP') observationFailed = true;
        if (event.type === 'REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS' && config.mode === 'phaseA') {
          assert(mayKill(event, Number(driver.adb('shell', 'pidof', 'com.nuri.app').trim()), driver.service()), 'KILL_BOUNDARY_NOT_PROVEN');
          record({ type: 'VERIFIED_BEFORE_LOCAL_COMPLETION_KILL', productPid: event.pid });
          driver.adb('shell', 'am', 'force-stop', 'com.nuri.app');
          intendedDeath = true;
          let absent = false;
          try { absent = driver.adb('shell', 'pidof', 'com.nuri.app').trim() === ''; } catch (e) { absent = e.status === 1; }
          assert(absent, 'PROCESS_DEATH_NOT_PROVEN');
          record({ type: 'OWNED_PRODUCT_PROCESS_ABSENT', serviceRunning: driver.service() });
        }
      } catch (_) { observationFailed = true; record({ type: 'HOST_OBSERVATION_FAILED_RECOVERY_REVIEW_REQUIRED' }); }
    }
    if (pending.length > 131072) { observationFailed = true; pending = ''; }
  };
  child.stdout.on('data', onData); child.stderr.on('data', onData);
  child.on('error', () => { observationFailed = true; record({ type: 'HOST_CHILD_ERROR' }); });
  const end = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal })));
  clearTimeout(deadline);
  if (['inspect', 'remove', 'attach'].includes(config.mode)) {
    let pidAfter = null;
    try { pidAfter = Number(driver.adb('shell', 'pidof', 'com.nuri.app').trim()); } catch (_) { observationFailed = true; }
    record({ type: 'LIVE_DETACH_PROCESS_CHECK', pidBefore, pidAfter, sameProcess: pidAfter === pidBefore });
    if (pidAfter !== pidBefore) observationFailed = true;
  }
  const result = { mode: config.mode, ...end, intendedDeath, timedOut, observationFailed,
    terminal: terminal(buffer, end.exitCode, end.signal, intendedDeath, timedOut), elapsedMs: Date.now() - started };
  if (observationFailed) result.terminal = 'NOT_VERIFIED_OBSERVATION_FAILED';
  buffer = ''; pending = '';
  record({ type: 'HOST_FINAL', ...result });
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  process.stdout.write(JSON.stringify(result) + '\n');
  return result;
}
module.exports = { parseStatus, terminal, mayKill, assessAnalytics, reconcileDetachedAnalytics, priorResultPath, run };
if (require.main === module) {
  run(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))).then(result => {
    process.exitCode = ['PASS', 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED'].includes(result.terminal) ? 0 : 1;
  }).catch(() => { process.stderr.write('SUPPLEMENTAL_HOST_STOP_REVIEW_REQUIRED\n'); process.exitCode = 1; });
}

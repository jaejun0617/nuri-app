'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const { PassThrough } = require('node:stream');
const host = require('../scripts/qa/run-walk-supplemental');
const status = (name, extra = '') => `INSTRUMENTATION_STATUS: supplemental=${name}\nINSTRUMENTATION_STATUS: instrumentationPid=1234\n${extra}`;
test('closed status parser preserves public stages, not raw output', () => {
  assert.deepEqual(host.parseStatus(status('TEST_MANIFEST_REVIEW', 'INSTRUMENTATION_STATUS: counts={"exists":true,"stage":"PET_CREATED"}\n')),
    { type: 'TEST_MANIFEST_REVIEW', pid: 1234, counts: { exists: true, stage: 'PET_CREATED' } });
  const rejected = host.parseStatus(status('PRIVATE_UNEXPECTED_VALUE'));
  assert.equal(rejected.type, 'SELECTOR_STOP'); assert.equal(JSON.stringify(rejected).includes('PRIVATE_UNEXPECTED_VALUE'), false);
  assert.throws(() => host.parseStatus(status('TEST_MANIFEST_REVIEW', 'INSTRUMENTATION_STATUS: counts={"token":"secret"}\n')));
});
test('missing or truncated JUnit result is never PASS', () => {
  assert.equal(host.terminal('OK (1 test)', 0, null, false, false), 'NOT_VERIFIED_TERMINAL_RESULT');
  assert.equal(host.terminal('INSTRUMENTATION_CODE: -1\n', 0, null, false, false), 'NOT_VERIFIED_TERMINAL_RESULT');
});
test('intentional target death is distinct from unexpected host or instrumentation failure', () => {
  assert.equal(host.terminal('', 0, null, true, false), 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED');
  assert.equal(host.terminal('', 0, null, false, false), 'NOT_VERIFIED_TERMINAL_RESULT');
  assert.equal(host.terminal('OK (1 test)\nINSTRUMENTATION_CODE: -1\n', 0, null, false, true), 'NOT_VERIFIED_HOST_TIMEOUT');
});
test('complete passing JUnit only succeeds without failure markers and a successful host exit', () => {
  const text = 'OK (1 test)\nINSTRUMENTATION_CODE: -1\n';
  assert.equal(host.terminal(text, 0, null, false, false), 'PASS');
  assert.notEqual(host.terminal(text + 'FAILURES!!!', 0, null, false, false), 'PASS');
  assert.notEqual(host.terminal(text, 1, null, false, false), 'PASS');
});
test('kill requires exact PID, completed server response, unconfirmed local journal and stopped service', () => {
  const e = { type: 'REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS', pid: 1234,
    counts: { committed: 1, pending: 1, confirmed: 0, nativeDone: 0 } };
  assert.equal(host.mayKill(e, 1234, false), true);
  assert.equal(host.mayKill(e, 1235, false), false);
  assert.equal(host.mayKill(e, 1234, true), false);
  for (const counts of [{ ...e.counts, confirmed: 1 }, { ...e.counts, nativeDone: 1 }, { ...e.counts, committed: 2 }, {}])
    assert.equal(host.mayKill({ ...e, counts }, 1234, false), false);
});
const ownerKey = 'a'.repeat(64), petKey = 'b'.repeat(64);
const baseline = { core: { records: 'unchanged', xp: 0 }, originalRows: ['old1', 'old2'], total: 2 };
const entries = [{ from: '2026-10-21T02:00:00Z', to: '2026-10-21T02:01:00Z', petKey }];
const policy = { homeEntries: 8, rowsPerEntry: 2, ownerKey, petKeys: [petKey] };
const row = { rowKey: 'new1', ownerKey, petKey, eventType: 'home_impression', placement: 'logged-in-home',
  occurredAt: '2026-10-21T02:00:30Z', payloadMatchesSource: true };
function review(rows = [row], after = { ...baseline, total: 2 + rows.length }) {
  return host.assessAnalytics(baseline, after, rows, policy, entries);
}
test('exact mapped append-only Home impression is accepted with a bounded exception', () => { assert.equal(review().accounted, 1); });
test('existing core modifications and old event mutations are not excepted', () => {
  assert.throws(() => review([row], { ...baseline, total: 3, core: { records: 'changed', xp: 0 } }));
  assert.throws(() => review([row], { ...baseline, total: 3, originalRows: ['old1'] }));
});
test('unknown event, other owner, other pet and unexplained payload changes are rejected', () => {
  for (const change of [{ eventType: 'detail_view' }, { ownerKey: 'c'.repeat(64) }, { petKey: 'd'.repeat(64) },
    { payloadMatchesSource: false }, { placement: 'other' }, { occurredAt: '2026-10-21T02:03:00Z' }])
    assert.throws(() => review([{ ...row, ...change }]));
});
test('cap, duplicate rows, missing appended rows and unplanned Home entries fail closed', () => {
  assert.throws(() => review([row, { ...row, rowKey: 'new2' }, { ...row, rowKey: 'new3' }]));
  assert.throws(() => review([row, row])); assert.throws(() => review([row], { ...baseline, total: 4 }));
  assert.throws(() => host.assessAnalytics(baseline, { ...baseline, total: 3 }, [row], policy, []));
});
test('event timestamps are compared as instants and each Home opportunity is capped separately', () => {
  assert.equal(review([{ ...row, occurredAt: '2026-10-21T02:00:00.000+00:00' }]).accounted, 1);
  const extraEntry = { ...entries[0], from: '2026-10-21T03:00:00Z', to: '2026-10-21T03:01:00Z' };
  assert.throws(() => host.assessAnalytics(baseline, { ...baseline, total: 5 },
    [row, { ...row, rowKey: 'new2' }, { ...row, rowKey: 'new3' }], policy, [...entries, extraEntry]));
});
test('test-Pet FK detachment requires exact previously verified row and payload, not a table exception', () => {
  const prior = { ...row, payloadHash: 'c'.repeat(64), detached: false };
  const detached = { ...prior, detached: true, petKey: null, payloadMatchesSource: false };
  assert.equal(host.reconcileDetachedAnalytics([detached], [prior], petKey)[0].payloadMatchesSource, true);
  assert.throws(() => host.reconcileDetachedAnalytics([detached], [], petKey));
  assert.throws(() => host.reconcileDetachedAnalytics([{ ...detached, payloadHash: 'changed' }], [prior], petKey));
  assert.throws(() => host.reconcileDetachedAnalytics([detached], [prior], 'd'.repeat(64)));
});

describe('bounded host lifetime and durable sanitized result recovery', () => {
  let child, writes, device;
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    writes = []; device = { adb: jest.fn(() => '1234'), service: jest.fn(() => false) };
    jest.doMock('/synthetic/driver', () => device, { virtual: true });
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'appendFileSync').mockImplementation((_file, text) => writes.push(JSON.parse(text)));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(cp, 'execFileSync').mockReturnValue('List of devices attached\nSYNTHETIC\tdevice\n');
    child = new cp.ChildProcess(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = jest.fn(() => { setImmediate(() => child.emit('close', null, 'SIGTERM')); return true; });
    jest.spyOn(cp, 'spawn').mockReturnValue(child);
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const config = () => ({ driver: '/synthetic/driver', output: '/Users/shinjaejun/.codex/nuri-walk-real-product-20261020/SYNTHETIC-HOST-ONLY',
    expectedOwnerKey: 'a'.repeat(64), publicHashLabel: 'b'.repeat(48),
    mode: 'phaseA', automaticOwnedKillApproved: true, hostQuiescentVerified: true, exclusiveUi: true,
    hostBaselineVerified: true, hostOriginalSelectionHeld: true, hostExistingPetCountAtLeastOne: true });
  test('host timeout persists exact failure and recovery instruction, never kills the product', async () => {
    const resultPromise = host.run(config());
    await jest.advanceTimersByTimeAsync(960001);
    const result = await resultPromise;
    assert.equal(result.terminal, 'NOT_VERIFIED_HOST_TIMEOUT');
    assert(writes.some(x => x.type === 'HOST_TIMEOUT' && x.recovery.includes('RETAIN_MANIFEST')));
    assert(writes.some(x => x.type === 'HOST_FINAL'));
    assert.equal(device.adb.mock.calls.some(x => x.includes('force-stop')), false);
  });
  test('uncompleted instrumentation cannot lose its terminal receipt or become PASS', async () => {
    const resultPromise = host.run(config());
    child.stdout.write('INSTRUMENTATION_RESULT: shortMsg=Process crashed.\n');
    child.emit('close', 0, null);
    const result = await resultPromise;
    assert.equal(result.terminal, 'NOT_VERIFIED_TERMINAL_RESULT');
    assert(writes.some(x => x.type === 'HOST_FINAL' && x.exitCode === 0));
    assert.equal(JSON.stringify(writes).includes('Process crashed'), false);
  });
  test('validated deliberate death records boundary before stop and confirms the old process absent', async () => {
    const resultPromise = host.run(config());
    device.adb.mockImplementation((...args) => args.includes('force-stop') ? '' : device.adb.mock.calls.some(x => x.includes('force-stop')) ? '' : '1234');
    child.stdout.write(status('REMOTE_SUCCESS_HELD_KILL_WINDOW_90_SECONDS',
      'INSTRUMENTATION_STATUS: counts={"committed":1,"pending":1,"confirmed":0,"nativeDone":0}\n') + 'INSTRUMENTATION_STATUS_CODE: 2\n');
    child.emit('close', 0, null);
    const result = await resultPromise;
    assert.equal(result.terminal, 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED');
    assert(writes.findIndex(x => x.type === 'VERIFIED_BEFORE_LOCAL_COMPLETION_KILL') < writes.findIndex(x => x.type === 'OWNED_PRODUCT_PROCESS_ABSENT'));
    assert(writes.some(x => x.type === 'OWNED_PRODUCT_PROCESS_ABSENT'));
  });
  test.each(['RESUME-20261021-PHASE-A', 'RESUME-20261021-RETRY-PHASE-A'])('cold recovery accepts an absent product only after its durable intended-death receipt from %s', async phase => {
    device.adb.mockImplementation(() => { const e = new Error('synthetic missing process'); e.status = 1; throw e; });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ mode: 'phaseA', intendedDeath: true,
      observationFailed: false, terminal: 'EXPECTED_PROCESS_DEATH_JUNIT_NOT_COMPLETED' }));
    const phaseAResult = '/Users/shinjaejun/.codex/nuri-walk-real-product-20261020/' + phase + '/result.json';
    const resultPromise = host.run({ ...config(), mode: 'phaseB', phaseAResult });
    child.stdout.write('OK (1 test)\nINSTRUMENTATION_CODE: -1\n'); child.emit('close', 0, null);
    assert.equal((await resultPromise).terminal, 'PASS');
    assert.equal(fs.readFileSync.mock.calls[0][0], phaseAResult);
    assert.equal(device.adb.mock.calls.some(x => x.includes('force-stop')), false);
  });
  test('cold recovery rejects an unrelated receipt path and an unproven prior death', async () => {
    assert.throws(() => host.priorResultPath('/private/tmp/unrelated/result.json'), /EXACT_APPROVED_PHASE_A_RESULT_REQUIRED/);
    assert.throws(() => host.priorResultPath('/Users/shinjaejun/.codex/nuri-walk-real-product-20261020/RESUME-20261021-PHASE-A/../other/result.json'));
    device.adb.mockImplementation(() => { const e = new Error('synthetic missing process'); e.status = 1; throw e; });
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ mode: 'phaseA', intendedDeath: false,
      observationFailed: false, terminal: 'NOT_VERIFIED_TERMINAL_RESULT' }));
    await assert.rejects(host.run({ ...config(), mode: 'phaseB' }), /DURABLE_PRIOR_KILL_RESULT_REQUIRED/);
    assert.equal(cp.spawn.mock.calls.length, 0);
  });
  test('unexpected process absence cannot silently start a new phaseA trial', async () => {
    device.adb.mockImplementation(() => { const e = new Error('synthetic missing process'); e.status = 1; throw e; });
    await assert.rejects(host.run(config()), /PRODUCT_PID_REQUIRED/);
    assert.equal(cp.spawn.mock.calls.length, 0);
  });
});

jest.mock('../src/services/monitoring/sentry', () => ({ captureMonitoringException: jest.fn() }));
import { NativeModules, Platform } from 'react-native';
import { canonicalizeWalkFinish, getWalkFinishDigest, type WalkFinishPayloadV1 } from '../src/services/walk/domain';
import { createWalkServerRepository, type WalkRpcTransport, type WalkServerReceipt } from '../src/services/walk/server/repository';
import { createWalkProductNativePort, decodeWalkProductCheckpoint, type ProductBinding, type WalkProductCheckpoint, type WalkProductNativePort } from '../src/services/walk/runtime/productNative';
import { createWalkProductService, type WalkProductContext } from '../src/services/walk/runtime/productWalkService';

const owner = '11111111-1111-4111-8111-111111111111';
const session = '44444444-4444-4444-8444-444444444444';
const pet = '22222222-2222-4222-8222-222222222222';
const command = '33333333-3333-4333-8333-333333333333';
const scope: ProductBinding = { ownerId: owner, epoch: '1' };
const payload: WalkFinishPayloadV1 = {
  payloadVersion: 1, clientSessionId: session, petId: pet, startedAt: '2026-10-13T00:00:00.000Z', endedAt: '2026-10-13T00:32:00.000Z',
  measuredDurationMs: '1920000', activeDurationMs: '1800000', measuredDistanceM: '2430', algorithmVersion: 1, qualitySchemaVersion: 1,
  qualitySummary: { schemaVersion: 1, totalFixCount: 10, acceptedFixCount: 5, rejectedAccuracyCount: 1, rejectedTimestampCount: 1,
    rejectedDuplicateCount: 1, rejectedJumpCount: 1, rejectedSpeedCount: 0, stationarySuppressedCount: 1,
    segmentCount: 1, gpsGapDurationMs: '1000', maxGapDurationMs: '1000', mockLocationObserved: false }, routeBackupChoice: 'LOCAL_ONLY',
};
function checkpoint(overrides: Partial<WalkProductCheckpoint> = {}): WalkProductCheckpoint {
  return { productVersion: 1, clientSessionId: session, petId: pet, runtimeState: 'IDLE', revision: '0', phase: 'PREPARED',
    startedAt: null, finishedAt: null, payloadJson: null, payloadDigest: null, filteredDistanceM: null, receipt: null,
    routeErased: false, routeDeletePending: false, sessionDeletePending: false, lastErrorCode: null, ...overrides };
}
function finished(id = session) {
  const p = { ...payload, clientSessionId: id };
  return checkpoint({ clientSessionId: id, runtimeState: 'FINISHED_LOCAL', revision: '4', phase: 'FINISH_PENDING',
    startedAt: p.startedAt, finishedAt: p.endedAt, payloadJson: canonicalizeWalkFinish(p), payloadDigest: getWalkFinishDigest(p), filteredDistanceM: '2430.99999' });
}
function receipt(state: WalkServerReceipt['state'] = 'ACTIVE', id = session): WalkServerReceipt {
  return { clientSessionId: id, petId: pet, state, payloadDigest: state === 'ACCEPTED_SERVER' ? getWalkFinishDigest({ ...payload, clientSessionId: id }) : null,
    recordClaimExists: false, deletedAt: state === 'DELETED' || state === 'NOT_ACCEPTED_FINAL' ? payload.endedAt : null, rejectionCode: null,
    summary: state === 'ACCEPTED_SERVER' ? { sessionId: command, startedAt: payload.startedAt, endedAt: payload.endedAt,
      measuredDurationMs: payload.measuredDurationMs, activeDurationMs: payload.activeDurationMs, measuredDistanceM: payload.measuredDistanceM,
      acceptedDistanceM: '2430', eligibility: 'PROGRESSION_ELIGIBLE', acceptedAt: payload.endedAt, routeBackupChoice: 'LOCAL_ONLY', routeRevision: '0', routeDeletedAt: null } : null };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture(initial = checkpoint()) {
  let context: WalkProductContext = { ownerId: owner, revision: 1, foreground: true };
  // Test double only; production persistence is independently tested against
  // actual Native encrypted SQLite/codec, never this in-memory test adapter.
  const records = new Map([[initial.clientSessionId, initial]]);
  const get = (id: string) => { const c = records.get(id); if (!c) throw Error('FIXTURE_MISSING'); return c; };
  const write = (c: WalkProductCheckpoint) => { records.set(c.clientSessionId, c); return c; };
  const native = {
    binding: jest.fn(async () => scope), commandId: jest.fn(async () => command),
    prepare: jest.fn(async () => get(session)), get: jest.fn(async (_, id) => get(id)),
    scan: jest.fn(async (_, after) => {
      const entries = [...records.values()].filter(c => c.clientSessionId > after && (c.phase !== 'RESOLVED' || c.routeDeletePending || c.sessionDeletePending))
        .sort((a, b) => a.clientSessionId.localeCompare(b.clientSessionId)).slice(0, 100);
      return { entries, nextCursor: entries.length === 100 ? entries[99].clientSessionId : null };
    }),
    start: jest.fn(async (_, id) => write({ ...get(id), phase: 'RUNNING', runtimeState: 'WALKING', revision: '2' })),
    mutate: jest.fn(async (_, c, action) => action === 'FINISH' ? write(finished(c.clientSessionId)) : c),
    apply: jest.fn(async (_, id, r) => write({ ...get(id), receipt: r,
      phase: r.state !== 'ACTIVE' ? 'RESOLVED' : get(id).phase === 'PREPARED' ? 'RESERVED' : get(id).phase,
      routeDeletePending: get(id).routeDeletePending && r.state !== 'DELETED' && r.summary?.routeDeletedAt === null,
      sessionDeletePending: get(id).sessionDeletePending && r.state !== 'DELETED' })),
    request: jest.fn(async (_, id, operation) => write({ ...get(id),
      phase: operation === 'CANCEL' && get(id).phase !== 'RESOLVED' ? 'CANCEL_PENDING' : get(id).phase,
      routeDeletePending: operation === 'DELETE_ROUTE', sessionDeletePending: operation === 'DELETE_SESSION' })),
    noteError: jest.fn(async (_, id, code) => write({ ...get(id), lastErrorCode: code })),
    snapshot: jest.fn(async () => null), routePage: jest.fn(), purgeResolved: jest.fn(),
    purgeFinalScope: jest.fn(async () => ({ removed: 0, nextCursor: null })),
  } satisfies WalkProductNativePort;
  const rpc = jest.fn<ReturnType<WalkRpcTransport>, Parameters<WalkRpcTransport>>().mockImplementation(async (name, parameters) => {
    if (name === 'get_walk_sessions_v1') return { data: (parameters.p_client_session_ids as string[]).map(id => ({ clientSessionId: id, state: 'NOT_FOUND' })), error: null };
    if (name === 'finish_walk_v1') return { data: receipt('ACCEPTED_SERVER', (parameters.p_payload as WalkFinishPayloadV1).clientSessionId), error: null };
    if (name === 'cancel_walk_v1') return { data: receipt('NOT_ACCEPTED_FINAL'), error: null };
    return { data: receipt(), error: null };
  });
  const server = createWalkServerRepository(rpc);
  const discoverActive = jest.fn(async () => receipt());
  const create = () => createWalkProductService({ native, server, context: () => context, discoverActive, rpcDeadlineMs: 100 });
  return { native, rpc, records, discoverActive, service: create(), create, setContext: (c: WalkProductContext) => { context = c; } };
}
afterEach(() => { jest.useRealTimers(); delete NativeModules.NuriWalk; });
test('no construction/ordinary discovery automatically requests permission, reserves or starts GPS', async () => {
  const f = fixture(); expect(f.native.binding).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  await f.service.discover(); expect(f.discoverActive).toHaveBeenCalledTimes(1);
  expect(f.native.prepare).not.toHaveBeenCalled(); expect(f.native.start).not.toHaveBeenCalled();
  await f.service.flush(); expect(f.native.start).not.toHaveBeenCalled();
  expect(f.rpc.mock.calls.every(([name]) => name === 'get_walk_sessions_v1')).toBe(true);
});
test('explicit Start persists intent -> online same identity ACTIVE -> Native collection; double tap is one flight', async () => {
  const f = fixture(); const one = f.service.start(pet), two = f.service.start(pet);
  expect(two).toBe(one); await one;
  expect(f.rpc).toHaveBeenCalledWith('start_walk_v1', { p_client_session_id: session, p_pet_id: pet });
  expect(f.native.start).toHaveBeenCalledWith(scope, session, command);
  expect(f.native.prepare.mock.invocationCallOrder[0]).toBeLessThan(f.rpc.mock.invocationCallOrder[0]);
  expect(f.native.apply.mock.invocationCallOrder[0]).toBeLessThan(f.native.start.mock.invocationCallOrder[0]);
});
test('lost reserve response retries durable identity; no second intent/session', async () => {
  const f = fixture(); f.rpc.mockRejectedValueOnce(Error('transport private detail'));
  await expect(f.service.start(pet)).rejects.toMatchObject({ code: 'WALK_SYNC_UNKNOWN_RETRYABLE' });
  expect(f.native.start).not.toHaveBeenCalled(); await f.service.start(pet);
  const calls = f.rpc.mock.calls.filter(([name]) => name === 'start_walk_v1'); expect(calls[0]).toEqual(calls[1]);
});
test.each(['NOT_ACCEPTED_FINAL', 'DELETED'] as const)('terminal reservation %s cannot start', async state => {
  const f = fixture(); f.rpc.mockResolvedValueOnce({ data: receipt(state), error: null });
  await expect(f.service.start(pet)).resolves.toMatchObject({ phase: 'RESOLVED' }); expect(f.native.start).not.toHaveBeenCalled();
});
test('Native finish is immediate local durable work, never waits for server or JS wall', async () => {
  const f = fixture(checkpoint({ runtimeState: 'WALKING', phase: 'RUNNING', revision: '2' }));
  await expect(f.service.control(session, 'FINISH')).resolves.toEqual(finished());
  expect(f.rpc).not.toHaveBeenCalled();
  await f.service.flush(); expect(f.rpc).toHaveBeenCalledWith('finish_walk_v1', { p_payload: payload, p_payload_digest: getWalkFinishDigest(payload) });
});
test('restart and uncertain finish retry preserve identical payload/digest/end time', async () => {
  const f = fixture(finished()); f.rpc.mockImplementationOnce(async () => ({ data: [{ clientSessionId: session, state: 'NOT_FOUND' }], error: null }))
    .mockRejectedValueOnce(Error('timeout'));
  await f.service.flush(); expect(f.records.get(session)?.phase).toBe('FINISH_PENDING');
  await f.create().flush();
  const calls = f.rpc.mock.calls.filter(([name]) => name === 'finish_walk_v1'); expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
});
test.each(['malformed', 'NOT_FOUND'] as const)('%s response cannot erase pending identity', async kind => {
  const f = fixture(checkpoint());
  if (kind === 'malformed') f.rpc.mockResolvedValueOnce({ data: [], error: null });
  await f.service.flush(); expect(f.records.get(session)?.phase).toBe('PREPARED');
  expect(f.native.purgeResolved).not.toHaveBeenCalled(); expect(f.native.start).not.toHaveBeenCalled();
});
test('complete queue >100 is visited across empty foreign pages and <=100 RPC batches', async () => {
  const f = fixture(); const list = Array.from({ length: 205 }, (_, i) => checkpoint({ clientSessionId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` }));
  f.native.scan.mockResolvedValueOnce({ entries: [], nextCursor: '00000000-0000-4000-7000-000000000000' })
    .mockResolvedValueOnce({ entries: list.slice(0, 100), nextCursor: list[99].clientSessionId })
    .mockResolvedValueOnce({ entries: list.slice(100, 200), nextCursor: list[199].clientSessionId })
    .mockResolvedValueOnce({ entries: list.slice(200), nextCursor: null });
  await expect(f.service.flush()).resolves.toEqual({ pages: 4, visited: 205, pending: 205 });
  expect(f.native.scan).toHaveBeenCalledTimes(4); expect(f.native.start).not.toHaveBeenCalled();
  expect(f.rpc.mock.calls.every(([name, args]) => name === 'get_walk_sessions_v1' && (args.p_client_session_ids as string[]).length <= 100)).toBe(true);
});
test('cancel wins -> final tombstone; finish wins -> accepted result retained, not deleted', async () => {
  const cancelled = fixture(); await expect(cancelled.service.cancel(session)).resolves.toMatchObject({ phase: 'RESOLVED', receipt: { state: 'NOT_ACCEPTED_FINAL' } });
  const won = fixture(finished()); won.rpc.mockResolvedValue({ data: [receipt('ACCEPTED_SERVER')], error: null });
  await expect(won.service.cancel(session)).resolves.toMatchObject({ receipt: { state: 'ACCEPTED_SERVER' } });
  expect(won.rpc.mock.calls.some(([name]) => name === 'delete_walk_session_v1')).toBe(false); expect(won.native.purgeResolved).not.toHaveBeenCalled();
});
test.each(['logout', 'same-owner-relogin', 'background'] as const)('%s fences a late reserve before Native receipt/start', async reason => {
  const f = fixture(); const response = deferred<{ data: unknown; error: unknown }>(); f.rpc.mockReturnValueOnce(response.promise);
  const starting = f.service.start(pet); await new Promise<void>(resolve => setImmediate(resolve));
  f.setContext({ ownerId: reason === 'logout' ? null : owner, revision: 2, foreground: reason !== 'background' });
  response.resolve({ data: receipt(), error: null });
  await expect(starting).rejects.toMatchObject({ code: 'WALK_PRODUCT_CONTEXT_CHANGED' });
  expect(f.native.apply).not.toHaveBeenCalled(); expect(f.native.start).not.toHaveBeenCalled();
});
test('never resolving reserve has deadline, unlocks single-flight and late success cannot start GPS', async () => {
  jest.useFakeTimers(); const f = fixture(); const response = deferred<{ data: unknown; error: unknown }>(); f.rpc.mockReturnValueOnce(response.promise);
  const first = f.service.start(pet); const result = first.catch((error: unknown) => error);
  await jest.advanceTimersByTimeAsync(101); expect(await result).toMatchObject({ code: 'WALK_SYNC_UNKNOWN_RETRYABLE' });
  response.resolve({ data: receipt(), error: null }); await Promise.resolve(); await Promise.resolve();
  expect(f.native.start).not.toHaveBeenCalled(); expect(f.native.apply).not.toHaveBeenCalled(); expect(jest.getTimerCount()).toBe(0);
  await f.service.start(pet); expect(f.native.start).toHaveBeenCalledTimes(1);
});
test('late finish accepted after timeout is discovered next same-ID flush, never duplicated', async () => {
  jest.useFakeTimers(); const f = fixture(finished()); const late = deferred<{ data: unknown; error: unknown }>();
  f.rpc.mockResolvedValueOnce({ data: [{ clientSessionId: session, state: 'NOT_FOUND' }], error: null }).mockReturnValueOnce(late.promise);
  const first = f.service.flush(); await jest.advanceTimersByTimeAsync(101); await first;
  expect(f.records.get(session)?.phase).toBe('FINISH_PENDING'); expect(jest.getTimerCount()).toBe(0);
  late.resolve({ data: receipt('ACCEPTED_SERVER'), error: null }); await Promise.resolve(); await Promise.resolve();
  expect(f.native.apply).not.toHaveBeenCalled();
  f.rpc.mockResolvedValueOnce({ data: [receipt('ACCEPTED_SERVER')], error: null });
  await f.service.flush(); expect(f.records.get(session)?.phase).toBe('RESOLVED');
  expect(f.rpc.mock.calls.filter(([name]) => name === 'finish_walk_v1')).toHaveLength(1);
});
test('never resolving reconcile releases flushFlight and clears deadline without resolving request', async () => {
  jest.useFakeTimers(); const f = fixture(); f.rpc.mockReturnValueOnce(new Promise(() => undefined));
  const first = f.service.flush(); expect(f.service.flush()).toBe(first);
  await jest.advanceTimersByTimeAsync(101); await first;
  expect(f.records.get(session)?.phase).toBe('PREPARED'); expect(jest.getTimerCount()).toBe(0);
  await f.service.flush(); expect(f.native.scan).toHaveBeenCalledTimes(2);
});
test('Store Native bridge works with qaEnabled false and rejects mutated finish bytes/digest', async () => {
  Platform.OS = 'android'; const call = jest.fn<Promise<string>, [string, string, string, string]>(async () => JSON.stringify(finished()));
  NativeModules.NuriWalk = { productApiVersion: 1, qaEnabled: false, productGetBinding: jest.fn(async () => '1'), productCommand: call, createCommandId: jest.fn(async () => command) };
  const port = createWalkProductNativePort(); expect(await port.binding(owner)).toEqual(scope);
  await expect(port.get(scope, session)).resolves.toEqual(finished());
  expect(() => decodeWalkProductCheckpoint({ ...finished(), filteredDistanceM: '9999.9' })).toThrow('WALK_INVALID_PRODUCT_CHECKPOINT');
  expect(() => decodeWalkProductCheckpoint({ ...finished(), payloadDigest: '0'.repeat(64) })).toThrow('WALK_INVALID_PRODUCT_CHECKPOINT');
  expect(() => decodeWalkProductCheckpoint({ ...finished(), finishedAt: '2026-10-13T00:32:00.001Z' })).toThrow('WALK_INVALID_PRODUCT_CHECKPOINT');
});
test('future C additive receipt fields are stripped to version1 Native core, never dropped blindly', async () => {
  Platform.OS = 'android'; const call = jest.fn<Promise<string>, [string, string, string, string]>(async () => JSON.stringify(finished()));
  NativeModules.NuriWalk = { productApiVersion: 1, productCommand: call, productGetBinding: jest.fn(), createCommandId: jest.fn() };
  const r = { ...receipt('ACCEPTED_SERVER'), progression: { future: true } };
  await createWalkProductNativePort().apply(scope, session, r);
  const sent = JSON.parse(JSON.parse(call.mock.calls[0][3]).receipt);
  expect(sent).toEqual(receipt('ACCEPTED_SERVER')); expect(sent).not.toHaveProperty('progression');
});

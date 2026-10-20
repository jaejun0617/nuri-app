import {
  createWalkServerRepository, decodeWalkReceipt, floorWalkFilteredDistanceM, WalkServerError,
  type WalkRpcTransport,
} from '../src/services/walk/server/repository';
import { getWalkFinishDigest, type WalkFinishPayloadV1 } from '../src/services/walk/domain';

const session = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
test('filtered distance converts once without floating point precision loss', () => {
  expect(floorWalkFilteredDistanceM('2430.99999')).toBe('2430');
  expect(floorWalkFilteredDistanceM('9007199254740993.9')).toBe('9007199254740993');
  expect(() => floorWalkFilteredDistanceM('-1')).toThrow('WALK_INVALID_DISTANCE');
});
const payload: WalkFinishPayloadV1 = {
  payloadVersion: 1, clientSessionId: session, petId: pet,
  startedAt: '2026-10-13T00:00:00.000Z', endedAt: '2026-10-13T00:32:00.000Z',
  measuredDurationMs: '1920000', activeDurationMs: '1800000', measuredDistanceM: '2430',
  algorithmVersion: 1, qualitySchemaVersion: 1, routeBackupChoice: 'LOCAL_ONLY',
  qualitySummary: {
    schemaVersion: 1, totalFixCount: 20, acceptedFixCount: 15, rejectedAccuracyCount: 1,
    rejectedTimestampCount: 1, rejectedDuplicateCount: 1, rejectedJumpCount: 1,
    rejectedSpeedCount: 0, stationarySuppressedCount: 1, segmentCount: 1,
    gpsGapDurationMs: '1000', maxGapDurationMs: '1000', mockLocationObserved: false,
  },
};
const accepted = () => ({
  clientSessionId: session, petId: pet, state: 'ACCEPTED_SERVER',
  payloadDigest: getWalkFinishDigest(payload), deletedAt: null, recordClaimExists: false,
  rejectionCode: null,
  summary: {
    sessionId: '33333333-3333-4333-8333-333333333333',
    startedAt: payload.startedAt, endedAt: payload.endedAt,
    measuredDurationMs: '1920000', activeDurationMs: '1800000', measuredDistanceM: '2430',
    acceptedDistanceM: '2430', eligibility: 'PROGRESSION_ELIGIBLE', acceptedAt: payload.endedAt,
    routeBackupChoice: 'LOCAL_ONLY', routeRevision: '0', routeDeletedAt: null,
  },
});
function transport(data: unknown) {
  return jest.fn<ReturnType<WalkRpcTransport>, Parameters<WalkRpcTransport>>()
    .mockResolvedValue({ data, error: null });
}
test('finish sends strict normalized payload and independently recomputed canonical digest', async () => {
  const rpc = transport(accepted());
  const result = await createWalkServerRepository(rpc).finish(payload);
  expect(rpc).toHaveBeenCalledWith('finish_walk_v1', {
    p_payload: payload, p_payload_digest: getWalkFinishDigest(payload),
  });
  expect(result.summary?.acceptedDistanceM).toBe('2430');
  expect(Object.keys(rpc.mock.calls[0][1])).toEqual(['p_payload', 'p_payload_digest']);
});
test('same durable payload retry after uncertain timeout never creates another identity', async () => {
  const rpc = transport(accepted()).mockRejectedValueOnce(new Error('private server detail'));
  const repository = createWalkServerRepository(rpc);
  await expect(repository.finish(payload)).rejects.toEqual(new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true));
  await expect(repository.finish(payload)).resolves.toMatchObject({ state: 'ACCEPTED_SERVER' });
  expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  expect(rpc).toHaveBeenCalledTimes(2);
});
test('unknown backend errors remain uncertain; only allowlisted stable codes become permanent', async () => {
  const rpc = transport(null).mockResolvedValue({ data: null, error: { code: 'XX000', message: 'sensitive detail' } });
  await expect(createWalkServerRepository(rpc).finish(payload)).rejects.toMatchObject({ code: 'WALK_SYNC_UNKNOWN_RETRYABLE', retryable: true });
  rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Human text may change', details: JSON.stringify({ walkErrorVersion: 1, walkCode: 'WALK_PAYLOAD_CONFLICT' }) } });
  await expect(createWalkServerRepository(rpc).finish(payload)).rejects.toMatchObject({ code: 'WALK_PAYLOAD_CONFLICT', retryable: false });
});
test('misleading message with unrelated code never becomes permanent', async () => {
  const rpc = transport(null).mockResolvedValue({ data: null, error: { code: 'XX000', message: 'WALK_PAYLOAD_CONFLICT' } });
  await expect(createWalkServerRepository(rpc).finish(payload)).rejects.toMatchObject({ code: 'WALK_SYNC_UNKNOWN_RETRYABLE', retryable: true });
});
test('future additive server fields are safely omitted until explicitly supported', () => {
  const result = decodeWalkReceipt({ ...accepted(), progression: { level: '2' } });
  expect(result).not.toHaveProperty('progression');
});
test('server digest, pet or identity mismatch cannot be accepted as this request receipt', async () => {
  for (const bad of [
    { ...accepted(), payloadDigest: '0'.repeat(64) },
    { ...accepted(), petId: '44444444-4444-4444-8444-444444444444' },
    { ...accepted(), clientSessionId: '44444444-4444-4444-8444-444444444444' },
  ]) {
    await expect(createWalkServerRepository(transport(bad)).finish(payload)).rejects.toMatchObject({ code: 'WALK_INVALID_SERVER_RESPONSE' });
  }
});
test('decimal strings larger than JS safe range stay exact and numeric JSON is rejected', () => {
  const receipt = accepted();
  expect(decodeWalkReceipt({ ...receipt, summary: {
    ...receipt.summary, measuredDistanceM: '9007199254740993', acceptedDistanceM: '9007199254740993',
  } }).summary?.acceptedDistanceM).toBe('9007199254740993');
  expect(() => decodeWalkReceipt({ ...receipt, summary: { ...receipt.summary, acceptedDistanceM: 2430 } })).toThrow('WALK_INVALID_SERVER_RESPONSE');
});
test.each([
  { ...accepted(), summary: { ...accepted().summary, measuredDurationMs: '0' } },
  { ...accepted(), summary: { ...accepted().summary, measuredDurationMs: '1920001' } },
  { ...accepted(), state: 'REJECTED_SERVER', summary: null, payloadDigest: null },
  { ...accepted(), summary: null },
  { ...accepted(), summary: { ...accepted().summary, eligibility: 'PROGRESSION_INELIGIBLE_QUALITY' } },
  { ...accepted(), summary: { ...accepted().summary, activeDurationMs: '1920001' } },
  { ...accepted(), summary: { ...accepted().summary, acceptedDistanceM: '2431' } },
  { ...accepted(), summary: { ...accepted().summary, routeRevision: '01' } },
  { ...accepted(), state: 'DELETED', summary: null },
])('malformed receipt fails closed', invalid => {
  expect(() => decodeWalkReceipt(invalid)).toThrow('WALK_INVALID_SERVER_RESPONSE');
});
test('reconcile requires exact coverage and requested order; missing is never final cancellation', async () => {
  const missing = { clientSessionId: session, state: 'NOT_FOUND' };
  const repository = createWalkServerRepository(transport([missing]));
  await expect(repository.reconcile([session])).resolves.toEqual([missing]);
  await expect(createWalkServerRepository(transport([])).reconcile([session])).rejects.toThrow('WALK_INVALID_SERVER_RESPONSE');
  await expect(repository.reconcile([session, session])).rejects.toThrow('WALK_INVALID_PAYLOAD');
});
test('reservation and cancellation use authenticated RPCs without viewer argument', async () => {
  const active = { ...accepted(), state: 'ACTIVE', payloadDigest: null, summary: null };
  const rpc = transport(active), repository = createWalkServerRepository(rpc);
  await repository.reserve(session, pet);
  expect(rpc).toHaveBeenLastCalledWith('start_walk_v1', { p_client_session_id: session, p_pet_id: pet });
  rpc.mockResolvedValue({ data: { ...active, state: 'NOT_ACCEPTED_FINAL', deletedAt: payload.endedAt }, error: null });
  await expect(repository.cancel(session, pet)).resolves.toMatchObject({ state: 'NOT_ACCEPTED_FINAL' });
});

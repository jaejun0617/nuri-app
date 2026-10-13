import { decodeWalkSnapshot } from '../src/services/walk/runtime/nativeWalk';

const base = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  petId: '22222222-2222-4222-8222-222222222222',
  runtimeState: 'WALKING', revision: '2', startedAt: '2026-10-14T00:00:00.000Z',
  elapsedActiveMs: '120000', elapsedPausedMs: '0', fixCount: '10', encryptedChunkCount: '10',
  segmentCount: '1', lastFixAgeMs: '0', serviceRunning: true, subscriptionActive: true,
  recoverable: false, locationAvailable: true, permissionState: 'PRECISE_GRANTED',
  notificationPermissionState: 'GRANTED', distanceStatus: 'LOCAL_CANDIDATE', syncState: null,
  lastErrorCode: null,
};
const summary = {
  algorithmVersion: 1, policyVersion: 1, measuredDistanceM: '123.456789',
  acceptedDistanceM: '120.125', routeRevision: '8', recommendation: 'ELIGIBLE_CANDIDATE',
  gpsSignal: 'GPS_READY',
  quality: {
    schemaVersion: 1, totalFixCount: 10, acceptedFixCount: 8, rejectedAccuracyCount: 0,
    rejectedTimestampCount: 0, rejectedDuplicateCount: 0, rejectedJumpCount: 0,
    rejectedSpeedCount: 0, stationarySuppressedCount: 2, segmentCount: 1,
    gpsGapDurationMs: '0', maxGapDurationMs: '0', mockLocationObserved: false,
  },
};
describe('Phase 3 bounded, coordinate-free distance snapshot contract', () => {
  test('candidate distance is accepted without claiming server acceptance', () => {
    const value = { ...base, distanceSummary: summary };
    expect(decodeWalkSnapshot(JSON.stringify(value))).toEqual(value);
  });
  test('legacy Phase 2 snapshot is still readable without invented distance', () => {
    expect(decodeWalkSnapshot(JSON.stringify({ ...base, distanceStatus: 'NOT_AVAILABLE_PHASE_2' })))
      .toEqual({ ...base, distanceStatus: 'NOT_AVAILABLE_PHASE_2' });
  });
  test.each([
    { ...summary, acceptedDistanceM: '-1' },
    { ...summary, acceptedDistanceM: 'NaN' },
    { ...summary, acceptedDistanceM: 'Infinity' },
    { ...summary, acceptedDistanceM: '124' },
    { ...summary, policyVersion: 2 },
    { ...summary, recommendation: 'ACCEPTED_SERVER' },
    { ...summary, latitude: 1 },
    { ...summary, route: [] },
    { ...summary, quality: { ...summary.quality, totalFixCount: 11 } },
    { ...summary, quality: { ...summary.quality, acceptedFixCount: -1 } },
    { ...summary, quality: { ...summary.quality, userId: 'forbidden' } },
  ])('invalid units, counter sum or private/unknown fields reject', distanceSummary => {
    expect(() => decodeWalkSnapshot(JSON.stringify({ ...base, distanceSummary })))
      .toThrow('WALK_INVALID_NATIVE_SNAPSHOT');
  });
});

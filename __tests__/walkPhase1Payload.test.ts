import { createHash } from 'crypto';
import {
  canonicalizeWalkFinish,
  getWalkFinishDigest,
  parseWalkFinishPayload,
  parseWalkQualitySummary,
  getWalkDateAttribution,
  intervalsOverlap,
  checkWalkOverlap,
  WalkDomainError,
} from '../src/services/walk/domain';

const quality = {
  schemaVersion: 1,
  totalFixCount: 10,
  acceptedFixCount: 5,
  rejectedAccuracyCount: 1,
  rejectedTimestampCount: 1,
  rejectedDuplicateCount: 1,
  rejectedJumpCount: 1,
  rejectedSpeedCount: 0,
  stationarySuppressedCount: 1,
  segmentCount: 1,
  gpsGapDurationMs: '1000',
  maxGapDurationMs: '1000',
  mockLocationObserved: false,
};
const payload = {
  payloadVersion: 1,
  clientSessionId: '11111111-1111-4111-8111-111111111111',
  petId: '22222222-2222-4222-8222-222222222222',
  startedAt: '2026-10-13T00:00:00.000Z',
  endedAt: '2026-10-13T00:32:00.000Z',
  measuredDurationMs: '1920000',
  activeDurationMs: '1800000',
  measuredDistanceM: '2430',
  algorithmVersion: 1,
  qualitySchemaVersion: 1,
  qualitySummary: quality,
  routeBackupChoice: 'LOCAL_ONLY',
};

// Fixed UTF-8 JSON vector shared with future native/server implementations.
const canonical =
  '{"payloadVersion":1,"clientSessionId":"11111111-1111-4111-8111-111111111111","petId":"22222222-2222-4222-8222-222222222222","startedAt":"2026-10-13T00:00:00.000Z","endedAt":"2026-10-13T00:32:00.000Z","measuredDurationMs":"1920000","activeDurationMs":"1800000","measuredDistanceM":"2430","algorithmVersion":1,"qualitySchemaVersion":1,"qualitySummary":{"schemaVersion":1,"totalFixCount":10,"acceptedFixCount":5,"rejectedAccuracyCount":1,"rejectedTimestampCount":1,"rejectedDuplicateCount":1,"rejectedJumpCount":1,"rejectedSpeedCount":0,"stationarySuppressedCount":1,"segmentCount":1,"gpsGapDurationMs":"1000","maxGapDurationMs":"1000","mockLocationObserved":false},"routeBackupChoice":"LOCAL_ONLY"}';

describe('Strict finish payload and canonical serialization', () => {
  test('fixed JSON vector and cross-platform SHA-256 match independent Node hash', () => {
    expect(canonicalizeWalkFinish(payload)).toBe(canonical);
    expect(Buffer.byteLength(canonical, 'utf8')).toBe(696);
    expect(getWalkFinishDigest(payload)).toBe(
      'dc77b2bc30280200bf5da43babce17b37134a090ec8f87c2e4c64dd72918b6fd',
    );
    expect(getWalkFinishDigest(payload)).toBe(
      createHash('sha256').update(canonical, 'utf8').digest('hex'),
    );
  });
  test('private backup is an independent fixed canonical digest vector', () => {
    const expected = canonical.replace('"LOCAL_ONLY"}', '"PRIVATE_BACKUP"}');
    expect(
      canonicalizeWalkFinish({
        ...payload,
        routeBackupChoice: 'PRIVATE_BACKUP',
      }),
    ).toBe(expected);
    expect(
      getWalkFinishDigest({ ...payload, routeBackupChoice: 'PRIVATE_BACKUP' }),
    ).toBe('a3dffb3d91caffafa61bed56ba761aec48698a67ef3acfd1821971ffdd4b93c1');
  });
  test('key order, decimal leading zeros and equivalent timezone representation normalize', () => {
    const reordered = Object.fromEntries(Object.entries(payload).reverse());
    expect(
      canonicalizeWalkFinish({
        ...reordered,
        measuredDistanceM: '002430',
        startedAt: '2026-10-13T09:00:00+09:00',
        endedAt: '2026-10-13T09:32:00+09:00',
      }),
    ).toBe(canonical);
    expect(parseWalkFinishPayload(payload).qualitySummary).not.toBe(quality);
  });
  test.each(['userId', 'acceptedDistanceM', 'latitude', 'extra'])(
    'unknown field %s is rejected, never authorized',
    key => {
      expect(() =>
        parseWalkFinishPayload({ ...payload, [key]: 'ignored' }),
      ).toThrow('WALK_INVALID_PAYLOAD');
    },
  );
  test.each([
    null,
    undefined,
    [],
    {},
    { ...payload, clientSessionId: 'not-uuid' },
  ])('invalid shape is rejected', input => {
    expect(() => parseWalkFinishPayload(input)).toThrow(WalkDomainError);
  });
  test('version/algorithm must be explicit and supported', () => {
    expect(() =>
      parseWalkFinishPayload({ ...payload, payloadVersion: 2 }),
    ).toThrow('WALK_UNSUPPORTED_PAYLOAD_VERSION');
    expect(() =>
      parseWalkFinishPayload({ ...payload, algorithmVersion: 2 }),
    ).toThrow('WALK_UNSUPPORTED_ALGORITHM_VERSION');
    expect(() =>
      parseWalkFinishPayload({ ...payload, qualitySchemaVersion: 2 }),
    ).toThrow('WALK_INVALID_QUALITY_SUMMARY');
  });
  test.each(['-1', '0', '1.5', '1920001'])(
    'invalid measured duration %s',
    measuredDurationMs => {
      expect(() =>
        parseWalkFinishPayload({ ...payload, measuredDurationMs }),
      ).toThrow('WALK_INVALID_DURATION');
    },
  );
  test('distance range, active duration and gap consistency are enforced', () => {
    expect(() =>
      parseWalkFinishPayload({ ...payload, measuredDistanceM: '-1' }),
    ).toThrow('WALK_INVALID_DISTANCE');
    expect(() =>
      parseWalkFinishPayload({
        ...payload,
        measuredDistanceM: '9223372036854775808',
      }),
    ).toThrow('WALK_INTEGER_OUT_OF_RANGE');
    expect(() =>
      parseWalkFinishPayload({
        ...payload,
        measuredDurationMs: '9223372036854775808',
      }),
    ).toThrow('WALK_INTEGER_OUT_OF_RANGE');
    expect(() =>
      parseWalkFinishPayload({ ...payload, activeDurationMs: '1920001' }),
    ).toThrow('WALK_INVALID_DURATION');
    expect(() =>
      parseWalkFinishPayload({
        ...payload,
        qualitySummary: { ...quality, gpsGapDurationMs: '1920001' },
      }),
    ).toThrow('WALK_INVALID_QUALITY_SUMMARY');
    expect(() =>
      parseWalkFinishPayload({ ...payload, routeBackupChoice: 'PUBLIC' }),
    ).toThrow('WALK_INVALID_PAYLOAD');
  });
  test.each([
    '2026-02-30T00:00:00Z',
    '2026-10-13',
    '2026-10-13T00:00:00',
    'invalid',
  ])('invalid/ambiguous timestamp %s', startedAt => {
    expect(() => parseWalkFinishPayload({ ...payload, startedAt })).toThrow(
      'WALK_INVALID_TIMESTAMP_ORDER',
    );
  });
  test('equal/reversed timestamps are rejected and changing a field changes digest', () => {
    expect(() =>
      parseWalkFinishPayload({ ...payload, endedAt: payload.startedAt }),
    ).toThrow('WALK_INVALID_TIMESTAMP_ORDER');
    expect(
      getWalkFinishDigest({ ...payload, measuredDistanceM: '2431' }),
    ).not.toBe(getWalkFinishDigest(payload));
    expect(() =>
      canonicalizeWalkFinish({ ...payload, activeDurationMs: null }),
    ).toThrow('WALK_INVALID_DURATION');
  });
});

describe('Bounded quality summary v1 without coordinate payload', () => {
  test('strict and normalized copy, including mock signal without assuming fraud proof', () => {
    expect(
      parseWalkQualitySummary({ ...quality, gpsGapDurationMs: '001000' }),
    ).toEqual(quality);
    expect(
      parseWalkQualitySummary({ ...quality, mockLocationObserved: true })
        .mockLocationObserved,
    ).toBe(true);
  });
  test.each([
    { ...quality, latitude: 0 },
    { ...quality, coordinates: [] },
    { ...quality, extra: {} },
    { ...quality, totalFixCount: -1 },
    { ...quality, totalFixCount: 2147483648 },
    { ...quality, acceptedFixCount: 11 },
    { ...quality, acceptedFixCount: 1.5 },
    { ...quality, rejectedSpeedCount: 1 },
    { ...quality, segmentCount: 6 },
    { ...quality, gpsGapDurationMs: '-1' },
    { ...quality, maxGapDurationMs: '1001' },
    { ...quality, schemaVersion: 2 },
    { ...quality, mockLocationObserved: 'false' },
    { ...quality, totalFixCount: NaN },
    { ...quality, maxGapDurationMs: '1'.repeat(257) },
    null,
    [],
    {},
  ])('malformed quality is rejected', input => {
    expect(() => parseWalkQualitySummary(input)).toThrow(
      'WALK_INVALID_QUALITY_SUMMARY',
    );
  });
});

describe('UTC half-open intervals', () => {
  const first = {
    startedAt: '2026-10-13T14:30:00Z',
    endedAt: '2026-10-13T15:30:00Z',
  };
  test.each([
    ['2026-10-13T13:00:00Z', '2026-10-13T14:30:00Z', false],
    ['2026-10-13T15:30:00Z', '2026-10-13T16:00:00Z', false],
    ['2026-10-13T15:00:00Z', '2026-10-13T16:00:00Z', true],
    ['2026-10-13T14:40:00Z', '2026-10-13T15:00:00Z', true],
    ['2026-10-13T14:00:00Z', '2026-10-13T16:00:00Z', true],
    ['2026-10-13T23:30:00+09:00', '2026-10-14T00:30:00+09:00', true],
  ])('%s..%s overlap=%s', (startedAt, endedAt, expected) => {
    expect(intervalsOverlap(first, { startedAt, endedAt })).toBe(expected);
    expect(checkWalkOverlap(first, [{ startedAt, endedAt }]).ok).toBe(
      !expected,
    );
  });
  test('invalid intervals cannot silently pass overlap gates', () => {
    expect(() =>
      intervalsOverlap(first, {
        startedAt: first.endedAt,
        endedAt: first.startedAt,
      }),
    ).toThrow('WALK_INVALID_TIMESTAMP_ORDER');
  });
});

describe('Existing NURI KST attribution, explicit instants only', () => {
  test('start day/week/season differ from server save XP/streak day across midnight and season boundary', () => {
    expect(
      getWalkDateAttribution('2026-05-31T14:59:00Z', '2026-06-01T15:01:00Z'),
    ).toEqual({
      walkDate: '2026-05-31',
      memoryOccurredAt: '2026-05-31',
      weekStartDate: '2026-05-25',
      season: 'spring',
      rewardDate: '2026-06-02',
    });
  });
  test.each([
    ['2026-02-28T15:00:00Z', 'spring'],
    ['2026-05-31T15:00:00Z', 'summer'],
    ['2026-08-31T15:00:00Z', 'autumn'],
    ['2026-11-30T15:00:00Z', 'winter'],
  ])(
    'season uses actual start, not presentation preference',
    (start, season) => {
      expect(getWalkDateAttribution(start, start).season).toBe(season);
    },
  );
});

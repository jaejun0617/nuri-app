import { assertWalkQaReceiptSafe, decodeWalkQaProtocol, walkQaReference } from '../src/services/walk/runtime/qaProtocol';
import { decodeWalkRoutePage, walkCameraAction } from '../src/services/walk/runtime/distanceProjection';

const protocol = {
  schemaVersion: 1, protocolId: '11111111-1111-4111-8111-111111111111', revision: '1', mode: 'READINESS', stepIndex: 0, cleaned: false,
  steps: [
    { stepType: 'READINESS', status: 'NOT_STARTED', error: null, receipt: null },
    { stepType: 'CLEANUP', status: 'NOT_STARTED', error: null, receipt: null },
  ],
};
const page = { routeRevision: '2', filteredPointCount: '2', startCursor: '0', endCursor: '1', hasEarlier: false, hasLater: false,
  current: { latitude: 0, longitude: 0.01 }, segments: [{ segmentId: '1', points: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01 }] }] };
describe('Native-owned QA wizard projection and safe export boundaries', () => {
  test('readiness protocol is not a physical accuracy claim', () => {
    expect(decodeWalkQaProtocol(protocol)).toEqual(protocol);
    expect(decodeWalkQaProtocol(null)).toBeNull();
  });
  test.each(['IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED_WITH_REASON'])('durable status %s is readable', status => {
    const value = { ...protocol, steps: [{ ...protocol.steps[0], status }, protocol.steps[1]] };
    expect(decodeWalkQaProtocol(value)).toEqual(value);
  });
  test.each(['latitude', 'longitude', 'route', 'rawRoute', 'userId', 'petId', 'token', 'credential', 'path', 'privateOpaquePayload'])('private or unknown receipt key %s is rejected recursively', key => {
    expect(() => assertWalkQaReceiptSafe({ receipt: { performance: { [key]: 'FORBIDDEN_PUBLIC_TEST_VALUE' } } })).toThrow('WALK_QA_RECEIPT_PRIVATE_FIELD');
  });
  test('unknown protocol fields and duplicate steps reject', () => {
    expect(() => decodeWalkQaProtocol({ ...protocol, steps: [protocol.steps[0], protocol.steps[0], protocol.steps[1]] })).toThrow();
    expect(() => decodeWalkQaProtocol({ ...protocol, actor: 'forged' })).toThrow();
    expect(() => decodeWalkQaProtocol({ ...protocol, stepIndex: 3 })).toThrow();
  });
  test('reference is independent input, not an app distance or location', () => {
    expect(walkQaReference('OPEN_A', '1000.5')).toEqual({ label: 'OPEN_A', meters: 1000.5 });
    for (const [label, meters] of [['https://example.com/map', '1000'], ['TEST@EMAIL', '1000'], ['OPEN_A', ''], ['OPEN_A', 'NaN'], ['OPEN_A', '0']]) {
      expect(() => walkQaReference(label, meters)).toThrow('WALK_QA_PROTOCOL_INVALID');
    }
  });
  test('free-look is never overridden by a new fix', () => {
    expect(walkCameraAction('FOLLOW', 'DRAG')).toBe('FREE_LOOK');
    expect(walkCameraAction('FREE_LOOK', 'FIX')).toBe('FREE_LOOK');
    expect(walkCameraAction('FREE_LOOK', 'RECENTER')).toBe('FOLLOW');
  });
  test('owner-authorized route pages remain bounded and segment-aware', () => {
    expect(decodeWalkRoutePage(JSON.stringify(page))).toEqual(page);
    const split = { ...page, segments: [{ segmentId: '1', points: page.segments[0].points.slice(0, 1) }, { segmentId: '2', points: page.segments[0].points.slice(1) }] };
    expect(decodeWalkRoutePage(JSON.stringify(split)).segments).toHaveLength(2);
    expect(() => decodeWalkRoutePage(JSON.stringify({ ...page, segments: [{ segmentId: '1', points: Array(513).fill(page.current) }] }))).toThrow();
    expect(() => decodeWalkRoutePage(JSON.stringify({ ...page, current: { latitude: 100, longitude: 1 } }))).toThrow();
    expect(() => decodeWalkRoutePage(JSON.stringify({ ...page, rawRoute: [] }))).toThrow();
  });
});

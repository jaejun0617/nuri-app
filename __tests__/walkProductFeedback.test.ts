import { appQueryClient } from '../src/services/query/appQueryClient';
import {
  cachedWalkLevel,
  createWalkSessionFeedback,
} from '../src/services/walk/product/feedback';
import {
  getProgressionSnapshot,
  toProgressionWire,
} from '../src/services/walk/domain';
import type { WalkNativeSnapshot } from '../src/services/walk/runtime/nativeWalk';

const owner = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const point = (distance: string, active = '0') =>
  ({
    sessionId: session,
    runtimeState: 'WALKING',
    elapsedActiveMs: active,
    distanceSummary: {
      acceptedDistanceM: distance,
      measuredDistanceM: '99999',
    },
  } as WalkNativeSnapshot);
afterEach(() => appQueryClient.clear());
test('explicit live session emits each policy threshold once, from filtered accepted distance/time only; no persistence/XP surface', () => {
  const f = createWalkSessionFeedback();
  f.begin(session);
  expect(f.update(point('499.999', '1199999'))).toEqual([]);
  expect(f.update(point('500.001', '1200000'))).toEqual([
    'SESSION_500_M',
    'SESSION_20_MIN',
  ]);
  expect(f.update(point('1000.001', '1200001'))).toEqual(['SESSION_1_KM']);
  expect(f.update(point('499', '0'))).toEqual([]);
  expect(f.update(point('1001', '1300000'))).toEqual([]);
  expect(Object.keys(f).sort()).toEqual(['begin', 'suspend', 'update']);
});
test('existing/recovered/reopened and foreground baseline seeds past thresholds instead of replaying them', () => {
  const f = createWalkSessionFeedback();
  expect(f.update(point('700', '1200001'))).toEqual([]);
  expect(f.update(point('1000', '1200002'))).toEqual(['SESSION_1_KM']);
  const reopened = createWalkSessionFeedback();
  expect(reopened.update(point('1100', '1200003'))).toEqual([]);
  reopened.suspend();
  expect(reopened.update(point('1200', '1300000'))).toEqual([]);
  expect(reopened.update(point('1201', '1300001'))).toEqual([]);
});
test('cached baseline is validated same-owner/pet C data only; does not fetch or trust local/foreign/malformed data', async () => {
  const key = ['walk', owner, pet, 'progression', 'generation'];
  const valid = {
    ...toProgressionWire(getProgressionSnapshot(1200n)),
    petId: pet,
    eligibleSessionCount: '1',
    milestones: [],
  };
  appQueryClient.setQueryData(['walk', 'foreign', pet, 'progression'], valid);
  expect(cachedWalkLevel(owner, pet)).toBeUndefined();
  appQueryClient.setQueryData(key, { ...valid, level: '999' });
  expect(cachedWalkLevel(owner, pet)).toBeUndefined();
  appQueryClient.setQueryData(key, valid);
  expect(cachedWalkLevel(owner, pet)).toBe('2');
  await appQueryClient.invalidateQueries({ queryKey: key });
  expect(cachedWalkLevel(owner, pet)).toBeUndefined();
});

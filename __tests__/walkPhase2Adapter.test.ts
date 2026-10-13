jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
}));
import { NativeModules, Platform } from 'react-native';
import {
  bindWalkAuthenticatedOwner,
  createWalkCommandId,
  decodeWalkSnapshot,
  getWalkSnapshot,
  isWalkQaEnabled,
  mutateNativeWalk,
  startNativeWalk,
  stopWalkForLogout,
} from '../src/services/walk/runtime/nativeWalk';
import { captureMonitoringException } from '../src/services/monitoring/sentry';

const snapshot = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  petId: '22222222-2222-4222-8222-222222222222',
  runtimeState: 'WALKING',
  revision: '2',
  startedAt: '2026-10-13T00:00:00.000Z',
  elapsedActiveMs: '0',
  elapsedPausedMs: '0',
  fixCount: '1',
  encryptedChunkCount: '1',
  segmentCount: '1',
  lastFixAgeMs: '0',
  serviceRunning: true,
  subscriptionActive: true,
  recoverable: false,
  locationAvailable: true,
  permissionState: 'PRECISE_GRANTED',
  notificationPermissionState: 'GRANTED',
  distanceStatus: 'NOT_AVAILABLE_PHASE_2',
  syncState: null,
  lastErrorCode: null,
};
const module = {
  runtimeVersion: 1,
  qaEnabled: true,
  setOwner: jest.fn(async () => 'OK'),
  createCommandId: jest.fn(async () => 'command'),
  startWalk: jest.fn(async () => JSON.stringify(snapshot)),
  getSnapshot: jest.fn(async () => JSON.stringify(snapshot)),
  getRecoverableSession: jest.fn(async () => JSON.stringify(snapshot)),
  pauseWalk: jest.fn(async () => JSON.stringify(snapshot)),
  resumeWalk: jest.fn(),
  finishWalk: jest.fn(),
  recoverPause: jest.fn(),
  resumeRecoveredWalk: jest.fn(),
  discardRecoverableWalk: jest.fn(),
  stopForLogout: jest.fn(async () => 'OK'),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
describe('Typed Walk native projection, no route/coordinate or server surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    NativeModules.NuriWalk = module;
    module.stopForLogout.mockResolvedValue('OK');
  });
  afterEach(() => {
    delete NativeModules.NuriWalk;
    jest.useRealTimers();
  });
  test('snapshot mirrors Phase 1 runtime strings with decimal units and no distance claim', () => {
    expect(decodeWalkSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(decodeWalkSnapshot('null')).toBeNull();
  });
  test.each([
    { ...snapshot, latitude: 'forbidden' },
    { ...snapshot, route: [] },
    { ...snapshot, ownerId: 'forbidden' },
    { ...snapshot, revision: 2 },
    { ...snapshot, runtimeState: 'GPS_WEAK' },
    { ...snapshot, distanceStatus: '0m' },
    { ...snapshot, permissionState: 'UNKNOWN' },
    { ...snapshot, fixCount: '-1' },
    { ...snapshot, lastFixAgeMs: '-1' },
    { ...snapshot, sessionId: 'unverified' },
    { ...snapshot, startedAt: 'invalid' },
    { ...snapshot, recoverable: true },
    { ...snapshot, syncState: 'SYNC_PENDING' },
    { ...snapshot, lastErrorCode: 'PRIVATE_EXCEPTION_DETAIL' },
  ])('malformed or sensitive native projection is rejected', value => {
    expect(() => decodeWalkSnapshot(JSON.stringify(value))).toThrow(
      'WALK_INVALID_NATIVE_SNAPSHOT',
    );
  });
  test('Store QA flag false stays disabled, including a missing/incomplete module', () => {
    module.qaEnabled = false;
    expect(isWalkQaEnabled()).toBe(false);
    module.qaEnabled = true;
    NativeModules.NuriWalk = {};
    expect(isWalkQaEnabled()).toBe(false);
    expect(() => createWalkCommandId()).toThrow('WALK_SERVICE_UNAVAILABLE');
  });
  test('owner only comes from central auth binding; start cannot supply owner or session identity', async () => {
    await bindWalkAuthenticatedOwner('owner');
    expect(module.setOwner).toHaveBeenCalledWith('owner');
    await startNativeWalk('pet', 'command');
    expect(module.startWalk).toHaveBeenCalledWith('pet', 'command', '0');
    const current = await getWalkSnapshot();
    if (!current) throw new Error('Expected snapshot');
    await mutateNativeWalk('pauseWalk', current, 'pause');
    expect(module.pauseWalk).toHaveBeenCalledWith(
      current.sessionId,
      'pause',
      '2',
    );
  });
  test('logout is bounded only after invoking native safety stop; no native error object is logged', async () => {
    jest.useFakeTimers();
    module.stopForLogout.mockImplementationOnce(() => new Promise(() => {}));
    const stop = stopWalkForLogout();
    expect(module.stopForLogout).toHaveBeenCalledWith('', '0');
    jest.advanceTimersByTime(2000);
    await stop;
    expect(captureMonitoringException).toHaveBeenCalledWith(
      new Error('WALK_LOCAL_PERSISTENCE_REVIEW_REQUIRED'),
    );
  });
  test('older binary/iOS with no Walk cannot change auth scheduling', () => {
    delete NativeModules.NuriWalk;
    expect(stopWalkForLogout()).toBeUndefined();
    expect(bindWalkAuthenticatedOwner(null)).toBeUndefined();
  });
  test('synchronous native boundary failure cannot block logout', async () => {
    module.stopForLogout.mockImplementationOnce(() => {
      throw new Error('PRIVATE_EXCEPTION_DETAIL');
    });
    await expect(stopWalkForLogout()).resolves.toBeUndefined();
    expect(captureMonitoringException).toHaveBeenCalledWith(
      new Error('WALK_LOCAL_PERSISTENCE_REVIEW_REQUIRED'),
    );
  });
});

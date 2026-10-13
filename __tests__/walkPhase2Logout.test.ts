jest.mock('../src/services/walk/runtime/nativeWalk', () => ({
  stopWalkForLogout: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/services/schedules/notifications', () => ({
  clearAllScheduleNotifications: jest.fn(() =>
    Promise.resolve({ status: 'cleared' }),
  ),
}));
jest.mock('../src/services/auth/localSession', () => ({
  markExplicitLogout: jest.fn(() => Promise.resolve()),
}));
jest.mock('../src/services/notifications/pushTokenLifecycle', () => ({
  revokeCurrentDevicePushToken: jest.fn(() => Promise.resolve(0)),
}));
jest.mock('../src/services/supabase/auth', () => ({
  clearLocalAuthSession: jest.fn(() => Promise.resolve()),
  deleteMyAccount: jest.fn(),
  signOut: jest.fn(),
  signOutBestEffort: jest.fn(() =>
    Promise.resolve({ timedOut: false, error: null }),
  ),
}));
jest.mock('../src/services/auth/recentLoginProvider', () => ({
  clearRecentLoginProvider: jest.fn(),
}));
jest.mock('../src/services/local/placeTravelSearch', () => ({
  clearAllRecentPersonalSearches: jest.fn(),
}));
jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
  captureMonitoringMessage: jest.fn(),
  setMonitoringUser: jest.fn(),
}));
jest.mock('../src/services/query/appQueryClient', () => ({
  clearAppQueryCache: jest.fn(),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      signOutLocal: jest.fn(),
      clearPasswordRecovery: jest.fn(),
    }),
  },
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: { getState: () => ({ clear: jest.fn() }) },
}));
jest.mock('../src/store/recordStore', () => ({
  useRecordStore: { getState: () => ({ clearAll: jest.fn() }) },
}));
jest.mock('../src/store/scheduleStore', () => ({
  useScheduleStore: { getState: () => ({ clearAll: jest.fn() }) },
}));

import { stopWalkForLogout } from '../src/services/walk/runtime/nativeWalk';
import { markExplicitLogout } from '../src/services/auth/localSession';
import { deleteMyAccount, signOut } from '../src/services/supabase/auth';
import {
  clearLocalSessionState,
  createAuthBoundaryCleanupQueue,
  disposePasswordRecoverySession,
  performAccountDeletion,
  performLogout,
} from '../src/services/auth/session';

describe('Walk collection is stopped at the canonical auth boundary', () => {
  beforeEach(() => jest.clearAllMocks());
  test('explicit logout stops Walk before persisted logout intent and network work', async () => {
    await performLogout();
    expect(stopWalkForLogout).toHaveBeenCalled();
    expect(
      jest.mocked(stopWalkForLogout).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(markExplicitLogout).mock.invocationCallOrder[0]);
  });
  test('local session disposal also stops collection', async () => {
    await clearLocalSessionState();
    expect(stopWalkForLogout).toHaveBeenCalled();
  });
  test('owner replacement/expiry stops Walk; same-user refresh does not', async () => {
    const queue = createAuthBoundaryCleanupQueue();
    await queue.waitForBoundary(false);
    expect(stopWalkForLogout).not.toHaveBeenCalled();
    await queue.waitForBoundary(true);
    expect(stopWalkForLogout).toHaveBeenCalledTimes(1);
  });
  test('account deletion stops collection before the remote deletion request', async () => {
    jest.mocked(deleteMyAccount).mockResolvedValueOnce({
      requestId: 'fixture',
      status: 'completed',
      actualStatus: 'completed',
      storageCleanupPending: false,
      cleanupItemCount: 0,
      cleanupCompletedCount: 0,
      requestedAt: null,
      scheduledDeletionAt: null,
      cancelledAt: null,
      restoredAt: null,
      completedAt: null,
      canRestore: false,
      lastErrorCode: null,
      lastErrorMessage: null,
    });
    await performAccountDeletion();
    expect(
      jest.mocked(stopWalkForLogout).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(deleteMyAccount).mock.invocationCallOrder[0]);
  });
  test('recovery session disposal stops collection before signing out', async () => {
    await disposePasswordRecoverySession();
    expect(
      jest.mocked(stopWalkForLogout).mock.invocationCallOrder[0],
    ).toBeLessThan(jest.mocked(signOut).mock.invocationCallOrder[0]);
  });
});

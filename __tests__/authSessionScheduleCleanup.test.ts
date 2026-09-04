jest.mock('../src/services/schedules/notifications', () => ({
  clearAllScheduleNotifications: jest.fn(),
}));

jest.mock('../src/services/notifications/pushTokenLifecycle', () => ({
  revokeCurrentDevicePushToken: jest.fn(),
}));

jest.mock('../src/services/supabase/auth', () => ({
  clearLocalAuthSession: jest.fn(() => Promise.resolve()),
  deleteMyAccount: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  signOutBestEffort: jest.fn(),
}));

jest.mock('../src/services/auth/recentLoginProvider', () => ({
  clearRecentLoginProvider: jest.fn(),
}));

jest.mock('../src/services/local/placeTravelSearch', () => ({
  clearAllRecentPersonalSearches: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
  captureMonitoringMessage: jest.fn(),
  setMonitoringUser: jest.fn(),
}));

jest.mock('../src/services/query/appQueryClient', () => ({
  clearAppQueryCache: jest.fn(),
}));

import {
  clearAllScheduleNotifications,
  type ScheduleNotificationSyncResult,
} from '../src/services/schedules/notifications';
import { revokeCurrentDevicePushToken } from '../src/services/notifications/pushTokenLifecycle';
import {
  deleteMyAccount,
  signOutBestEffort,
  type AccountDeletionResult,
} from '../src/services/supabase/auth';
import { clearRecentLoginProvider } from '../src/services/auth/recentLoginProvider';
import {
  captureMonitoringException,
  captureMonitoringMessage,
} from '../src/services/monitoring/sentry';
import {
  clearAuthBoundScheduleNotifications,
  createAuthBoundaryCleanupQueue,
  performAccountDeletion,
  performLogout,
  shouldClearAuthBoundScheduleNotifications,
} from '../src/services/auth/session';

const mockClearAllScheduleNotifications = jest.mocked(
  clearAllScheduleNotifications,
);
const mockRevokeCurrentDevicePushToken = jest.mocked(
  revokeCurrentDevicePushToken,
);
const mockSignOutBestEffort = jest.mocked(signOutBestEffort);
const mockDeleteMyAccount = jest.mocked(deleteMyAccount);
const mockClearRecentLoginProvider = jest.mocked(clearRecentLoginProvider);
const mockCaptureMonitoringException = jest.mocked(captureMonitoringException);
const mockCaptureMonitoringMessage = jest.mocked(captureMonitoringMessage);

function createScheduleCleanupResult(
  status: 'cleared' | 'failed' | 'unsupported',
): ScheduleNotificationSyncResult {
  return {
    status,
    persistedRecord: 'unchanged',
    deviceAlarm:
      status === 'cleared'
        ? 'cleared'
        : status === 'unsupported'
        ? 'unsupported'
        : 'not-scheduled',
    delivery: 'not-applicable',
    permission: 'unsupported',
    exactAlarm: 'unsupported',
    channel: 'unsupported',
    ...(status === 'failed' ? { errorCode: 'native-failure' } : {}),
  };
}

function createDeletionResult(
  status: AccountDeletionResult['status'],
): AccountDeletionResult {
  return {
    requestId: 'request-1',
    status,
    actualStatus: status,
    storageCleanupPending: false,
    cleanupItemCount: 0,
    cleanupCompletedCount: 0,
    requestedAt: null,
    scheduledDeletionAt: null,
    cancelledAt: null,
    restoredAt: null,
    completedAt: status === 'completed' ? '2026-09-04T00:00:00.000Z' : null,
    canRestore: status === 'pending_grace_period',
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

describe('auth-bound schedule cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClearAllScheduleNotifications.mockResolvedValue(
      createScheduleCleanupResult('cleared'),
    );
    mockRevokeCurrentDevicePushToken.mockResolvedValue(0);
    mockSignOutBestEffort.mockResolvedValue({ timedOut: false, error: null });
    mockClearRecentLoginProvider.mockResolvedValue(undefined);
  });

  it('cleans on session expiry and user replacement, not same-user refresh or valid boot', () => {
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'SIGNED_OUT',
        previousUserId: 'user-a',
        nextUserId: null,
      }),
    ).toBe(true);
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'SIGNED_IN',
        previousUserId: 'user-a',
        nextUserId: 'user-b',
      }),
    ).toBe(true);
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'TOKEN_REFRESHED',
        previousUserId: 'user-a',
        nextUserId: 'user-a',
      }),
    ).toBe(false);
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'INITIAL_SESSION',
        previousUserId: 'user-a',
        nextUserId: 'user-a',
      }),
    ).toBe(false);
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'boot',
        previousUserId: 'user-a',
        nextUserId: 'user-a',
      }),
    ).toBe(false);
    expect(
      shouldClearAuthBoundScheduleNotifications({
        event: 'boot',
        previousUserId: null,
        nextUserId: null,
      }),
    ).toBe(true);
  });

  it('waits for cleanup before logout continues', async () => {
    let resolveCleanup: (
      value: ScheduleNotificationSyncResult,
    ) => void = () => {};
    mockClearAllScheduleNotifications.mockReturnValue(
      new Promise(resolve => {
        resolveCleanup = resolve;
      }),
    );

    const logout = performLogout();
    await Promise.resolve();

    expect(mockRevokeCurrentDevicePushToken).not.toHaveBeenCalled();
    expect(mockSignOutBestEffort).not.toHaveBeenCalled();

    resolveCleanup(createScheduleCleanupResult('cleared'));
    await logout;

    expect(mockClearAllScheduleNotifications).toHaveBeenCalledTimes(1);
    expect(mockRevokeCurrentDevicePushToken).toHaveBeenCalledWith(
      'user_logout',
    );
    expect(mockSignOutBestEffort).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent auth-bound cleanup requests', async () => {
    let resolveCleanup: (
      value: ScheduleNotificationSyncResult,
    ) => void = () => {};
    mockClearAllScheduleNotifications.mockReturnValue(
      new Promise(resolve => {
        resolveCleanup = resolve;
      }),
    );

    const first = clearAuthBoundScheduleNotifications();
    const second = clearAuthBoundScheduleNotifications();

    expect(mockClearAllScheduleNotifications).toHaveBeenCalledTimes(1);

    resolveCleanup(createScheduleCleanupResult('cleared'));
    await expect(first).resolves.toMatchObject({ status: 'cleared' });
    await expect(second).resolves.toMatchObject({ status: 'cleared' });
  });

  it('cleans only completed account deletion and preserves pending deletion policy', async () => {
    mockDeleteMyAccount.mockResolvedValueOnce(
      createDeletionResult('pending_grace_period'),
    );
    await performAccountDeletion();
    expect(mockClearAllScheduleNotifications).not.toHaveBeenCalled();

    mockDeleteMyAccount.mockResolvedValueOnce(
      createDeletionResult('completed'),
    );
    await performAccountDeletion();
    expect(mockClearAllScheduleNotifications).toHaveBeenCalledTimes(1);
  });

  it('does not hide failed or unsupported cleanup results', async () => {
    mockClearAllScheduleNotifications.mockResolvedValueOnce(
      createScheduleCleanupResult('failed'),
    );
    await clearAuthBoundScheduleNotifications();
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(Error),
    );

    mockClearAllScheduleNotifications.mockResolvedValueOnce(
      createScheduleCleanupResult('unsupported'),
    );
    await clearAuthBoundScheduleNotifications();
    expect(mockCaptureMonitoringMessage).toHaveBeenCalledWith(
      'auth-bound schedule cleanup unsupported',
      expect.objectContaining({
        level: 'warning',
        tags: { status: 'unsupported' },
      }),
    );
  });

  it('serializes the short cleanup boundary and preserves latest transition ordering', async () => {
    let resolveCleanup: (
      value: ScheduleNotificationSyncResult,
    ) => void = () => {};
    mockClearAllScheduleNotifications.mockReturnValue(
      new Promise(resolve => {
        resolveCleanup = resolve;
      }),
    );

    const queue = createAuthBoundaryCleanupQueue();
    const oldUserCleanup = queue.waitForBoundary(true);
    const nextUserPublish = queue.waitForBoundary(false);
    let nextUserPublished = false;
    const nextUserPublishObservation = nextUserPublish.then(() => {
      nextUserPublished = true;
    });

    await Promise.resolve();
    expect(nextUserPublished).toBe(false);

    resolveCleanup(createScheduleCleanupResult('cleared'));
    await oldUserCleanup;
    await nextUserPublishObservation;

    expect(nextUserPublished).toBe(true);
    expect(mockClearAllScheduleNotifications).toHaveBeenCalledTimes(1);
  });
});

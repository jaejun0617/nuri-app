// 파일: src/services/auth/session.ts
// 역할:
// - 로그아웃/탈퇴 후 로컬 store 정리 공통화
// - MoreScreen / Drawer가 같은 세션 종료 규칙을 공유하도록 유지

import type { AuthChangeEvent } from '@supabase/supabase-js';

import {
  clearLocalAuthSession,
  deleteMyAccount,
  signOut,
  signOutBestEffort,
  type AccountDeletionResult,
} from '../supabase/auth';
import { clearAllRecentPersonalSearches } from '../local/placeTravelSearch';
import {
  captureMonitoringException,
  captureMonitoringMessage,
  setMonitoringUser,
} from '../monitoring/sentry';
import { clearRecentLoginProvider } from './recentLoginProvider';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { markExplicitLogout } from './localSession';
import { revokeCurrentDevicePushToken } from '../notifications/pushTokenLifecycle';
import { clearAppQueryCache } from '../query/appQueryClient';
import { stopWalkForLogout } from '../walk/runtime/nativeWalk';
import {
  captureWalkFinalDeletion,
  queueConfirmedWalkFinalDeletion,
  isConfirmedFinalAccountDeletion,
  armWalkFinalDeletion,
  bindWalkAccountDeletionRequest,
  assertWalkFinalDeletionCurrent,
  disposeWalkFinalDeletion,
  noteRestorableWalkDeletion,
  releaseWalkFinalDeletion,
  type WalkFinalDeletionScope,
} from '../walk/product/finalDeletion';
import {
  clearAllScheduleNotifications,
  type ScheduleNotificationSyncResult,
} from '../schedules/notifications';

let authBoundScheduleCleanupInFlight: Promise<ScheduleNotificationSyncResult> | null =
  null;

export async function clearAuthBoundScheduleNotifications(): Promise<ScheduleNotificationSyncResult> {
  if (!authBoundScheduleCleanupInFlight) {
    authBoundScheduleCleanupInFlight = clearAllScheduleNotifications()
      .then(result => {
        if (result.status === 'failed') {
          captureMonitoringException(
            new Error(
              `auth-bound schedule cleanup failed: ${
                result.errorCode ?? 'unknown'
              }`,
            ),
          );
        } else if (result.status === 'unsupported') {
          captureMonitoringMessage('auth-bound schedule cleanup unsupported', {
            level: 'warning',
            tags: { status: result.status },
          });
        }

        return result;
      })
      .finally(() => {
        authBoundScheduleCleanupInFlight = null;
      });
  }

  return authBoundScheduleCleanupInFlight;
}

export type AuthSessionBoundary = {
  event: AuthChangeEvent | 'boot';
  previousUserId: string | null;
  nextUserId: string | null;
};

export function shouldClearAuthBoundScheduleNotifications(
  boundary: AuthSessionBoundary,
): boolean {
  if (boundary.event === 'boot') return !boundary.nextUserId;
  return Boolean(
    boundary.previousUserId && boundary.previousUserId !== boundary.nextUserId,
  );
}

export function createAuthBoundaryCleanupQueue() {
  let tail = Promise.resolve();

  return {
    waitForBoundary: (shouldCleanup: boolean): Promise<void> => {
      const next = tail.then(async () => {
        if (shouldCleanup) {
          const walkStop = stopWalkForLogout();
          if (walkStop) await walkStop;
          await clearAuthBoundScheduleNotifications();
        }
      });

      tail = next.catch(() => undefined);
      return next;
    },
  };
}

export async function clearLocalSessionState(
  current: () => boolean = () => true,
): Promise<void> {
  if (!current()) return;
  const walkStop = stopWalkForLogout();
  if (walkStop) await walkStop;
  if (!current()) return;
  setMonitoringUser({ id: null });
  clearAppQueryCache();
  await clearAllRecentPersonalSearches();
  if (!current()) return;
  await useAuthStore.getState().signOutLocal();
  // signOutLocal intentionally changes A to guest; caller fence permits that
  // owned transition, but never a newer authenticated owner's stores.
  if (useAuthStore.getState().session?.user.id) return;
  usePetStore.getState().clear();
  useRecordStore.getState().clearAll();
  useScheduleStore.getState().clearAll();
}

export async function disposePasswordRecoverySession(): Promise<void> {
  const walkStop = stopWalkForLogout();
  if (walkStop) await walkStop;
  await useAuthStore.getState().clearPasswordRecovery();

  try {
    await signOut();
  } catch (error: unknown) {
    captureMonitoringException(error);
  }

  try {
    await clearLocalAuthSession();
  } catch (error: unknown) {
    captureMonitoringException(error);
  }

  await clearLocalSessionState();
}

export async function performLogout(timeoutMs = 1200) {
  const walkStop = stopWalkForLogout();
  if (walkStop) await walkStop;
  // Persist intent before any network work: failed remote logout must never
  // resurrect the old local credential on the next offline cold start.
  await markExplicitLogout();
  await clearAuthBoundScheduleNotifications();

  try {
    await revokeCurrentDevicePushToken('user_logout');
  } catch (error: unknown) {
    captureMonitoringException(error);
  }

  await clearLocalSessionState();
  return signOutBestEffort(timeoutMs);
}

export async function performAccountDeletion(): Promise<AccountDeletionResult> {
  const owner = useAuthStore.getState().session?.user.id;
  if (!owner) throw new Error('WALK_ACTIVE_SESSION_OWNER_MISMATCH');
  let changed = false;
  const unsubscribe = useAuthStore.subscribe((next, previous) => {
    if (next.session?.user.id !== previous.session?.user.id) changed = true;
  });
  const current = () =>
    !changed && useAuthStore.getState().session?.user.id === owner;
  let cleanup: WalkFinalDeletionScope | null = null;
  let requestPipelineStarted = false;
  try {
    cleanup = await captureWalkFinalDeletion(owner, null);
    if (!current()) throw new Error('WALK_PRODUCT_CONTEXT_CHANGED');
    await armWalkFinalDeletion(cleanup);
    assertWalkFinalDeletionCurrent(cleanup);
    const walkStop = stopWalkForLogout();
    if (walkStop) await walkStop;
    if (!current()) throw new Error('WALK_PRODUCT_CONTEXT_CHANGED');
    assertWalkFinalDeletionCurrent(cleanup);
    // The FIRST create-request RPC already schedules deletion. This marker is
    // intentionally earlier than the compatibility delete_my_account dispatch.
    requestPipelineStarted = true;
    const result = await deleteMyAccount({
      onRequest: receipt => bindWalkAccountDeletionRequest(cleanup, receipt),
      onRequestRejected: code => releaseWalkFinalDeletion(cleanup, { outcome: 'ROLLED_BACK', code }),
      onResult: async receipt =>
        isConfirmedFinalAccountDeletion(receipt)
          ? queueConfirmedWalkFinalDeletion(cleanup)
          : true,
      onNonFinalResult: receipt => noteRestorableWalkDeletion(cleanup, receipt),
    });
    if (!current()) return { ...result, localContextChanged: true };
    try {
      await clearRecentLoginProvider();
    } catch (error: unknown) {
      captureMonitoringException(error);
    }

    // Existing compatibility success still logs out during restorable grace.
    // That isolation policy is independent from confirmed irreversible purge.
    if (
      result.status === 'completed' ||
      result.status === 'completed_with_cleanup_pending'
    ) {
      if (!current()) return { ...result, localContextChanged: true };
      await clearAuthBoundScheduleNotifications();
      try {
        if (current()) await revokeCurrentDevicePushToken('account_deleted');
      } catch (error: unknown) {
        captureMonitoringException(error);
      }
      await clearLocalSessionState(current);
    }
    return changed && useAuthStore.getState().session
      ? { ...result, localContextChanged: true }
      : result;
  } finally {
    if (!requestPipelineStarted && cleanup) {
      await releaseWalkFinalDeletion(cleanup, {
        outcome: 'NOT_STARTED',
        code: 'NOT_INVOKED',
      }).catch(() => undefined);
    }
    disposeWalkFinalDeletion(cleanup);
    unsubscribe();
  }
}

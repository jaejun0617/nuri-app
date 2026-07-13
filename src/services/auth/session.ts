// 파일: src/services/auth/session.ts
// 역할:
// - 로그아웃/탈퇴 후 로컬 store 정리 공통화
// - MoreScreen / Drawer가 같은 세션 종료 규칙을 공유하도록 유지

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
  setMonitoringUser,
} from '../monitoring/sentry';
import { clearRecentLoginProvider } from './recentLoginProvider';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { revokeCurrentDevicePushToken } from '../notifications/pushTokenLifecycle';

export async function clearLocalSessionState(): Promise<void> {
  setMonitoringUser({ id: null, email: null });
  await clearAllRecentPersonalSearches();
  await useAuthStore.getState().signOutLocal();
  usePetStore.getState().clear();
  useRecordStore.getState().clearAll();
  useScheduleStore.getState().clearAll();
}

export async function disposePasswordRecoverySession(): Promise<void> {
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
  try {
    await revokeCurrentDevicePushToken('user_logout');
  } catch (error: unknown) {
    captureMonitoringException(error);
  }

  await clearLocalSessionState();
  return signOutBestEffort(timeoutMs);
}

export async function performAccountDeletion(): Promise<AccountDeletionResult> {
  const result = await deleteMyAccount();
  try {
    await clearRecentLoginProvider();
  } catch (error: unknown) {
    captureMonitoringException(error);
  }

  if (
    result.status === 'completed' ||
    result.status === 'completed_with_cleanup_pending'
  ) {
    try {
      await revokeCurrentDevicePushToken('account_deleted');
    } catch (error: unknown) {
      captureMonitoringException(error);
    }
    await clearLocalSessionState();
  }

  return result;
}

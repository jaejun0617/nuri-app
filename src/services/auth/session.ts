// 파일: src/services/auth/session.ts
// 역할:
// - 로그아웃/탈퇴 후 로컬 store 정리 공통화
// - MoreScreen / Drawer가 같은 세션 종료 규칙을 공유하도록 유지

import { deleteMyAccount, signOutBestEffort } from '../supabase/auth';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';

export async function clearLocalSessionState(): Promise<void> {
  await useAuthStore.getState().signOutLocal();
  usePetStore.getState().clear();
  useRecordStore.getState().clearAll();
  useScheduleStore.getState().clearAll();
}

export async function performLogout(timeoutMs = 1200) {
  await clearLocalSessionState();
  return signOutBestEffort(timeoutMs);
}

export async function performAccountDeletion() {
  await deleteMyAccount();
  await clearLocalSessionState();
}

import { AppState } from 'react-native';
import { supabase } from '../supabase/client';
import { appQueryClient } from '../query/appQueryClient';
import { useAuthStore } from '../../store/authStore';
import { syncPushNotificationDevice } from './pushTokenLifecycle';
import { clearNativePushOwner } from './nativePush';

/** One account-scoped invalidation owner; Realtime is not an OS push channel. */
export function observeNotificationChanges(userId: string): () => void {
  syncPushNotificationDevice().catch(() => {});
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const invalidate = () => {
    if (!active || useAuthStore.getState().session?.user.id !== userId) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (active && useAuthStore.getState().session?.user.id === userId)
        appQueryClient
          .invalidateQueries({
            queryKey: ['notifications-v3', userId],
          })
          .catch(() => {});
    }, 120);
  };
  const channel = supabase
    .channel(`notification-invalidation:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      invalidate,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_notification_reads',
        filter: `user_id=eq.${userId}`,
      },
      invalidate,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      invalidate,
    )
    .subscribe();
  const listener = AppState.addEventListener('change', state => {
    if (state === 'active') {
      invalidate();
      syncPushNotificationDevice().catch(() => {});
    }
  });
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    listener.remove();
    clearNativePushOwner(userId).catch(() => {});
    supabase.removeChannel(channel).catch(() => {});
    appQueryClient.removeQueries({ queryKey: ['notifications-v3', userId] });
  };
}

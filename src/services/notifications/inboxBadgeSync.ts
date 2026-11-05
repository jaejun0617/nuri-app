import { QueryObserver } from '@tanstack/react-query';
import { appQueryClient } from '../query/appQueryClient';
import { useAuthStore } from '../../store/authStore';
import { fetchNotificationBadgeSnapshot } from './userNotifications';
import { syncNativeInboxBadge } from './nativePush';

/** Share the Home/inbox query: never derive the badge from a partial page or
 * subtract locally. Failed/offline lookups must not turn unread items into zero. */
export function observeInboxBadge(userId: string) {
  let active = true;
  let lastObservedAt = 0;
  let lastCount: number | undefined;
  const observer = new QueryObserver(appQueryClient, {
    queryKey: ['notifications-v3', userId, 'unread', 'snapshot-v1'],
    queryFn: () => {
      if (!active || useAuthStore.getState().session?.user.id !== userId)
        throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      return fetchNotificationBadgeSnapshot();
    },
    staleTime: 15_000,
  });
  const sync = () => {
    const result = observer.getCurrentResult();
    if (!active || useAuthStore.getState().session?.user.id !== userId || !result.isSuccess ||
      result.isFetching || (result.dataUpdatedAt === lastObservedAt && result.data.count === lastCount)) return;
    lastObservedAt = result.dataUpdatedAt;
    lastCount = result.data.count;
    syncNativeInboxBadge(userId, result.data.count, result.data.observedAt, result.data.validUntil).catch(() => {});
  };
  const unsubscribe = observer.subscribe(sync);
  // Owner lifetime, not merely A == A after an intervening account change.
  const unsubscribeOwner = useAuthStore.subscribe((next, previous) => {
    if (next.session?.user.id !== previous.session?.user.id) active = false;
  });
  return {
    // Registration may bind the native owner after the first query completed.
    syncAfterOwnerBound: () => { lastObservedAt = 0; lastCount = undefined; sync(); },
    stop: () => { active = false; unsubscribeOwner(); unsubscribe(); observer.destroy(); },
  };
}

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNotificationScope } from '../app/providers/NotificationScopeProvider';
import { mixedInboxKey, type InboxItem, type MixedCursor } from '../services/notifications/mixedNotifications';
import { useAuthStore } from '../store/authStore';
import { dismissNativeInboxNotification } from '../services/notifications/nativePush';
import {
  fetchNotificationPage,
  fetchNotificationBadgeSnapshot,
  markAllNotificationsRead,
  dismissUserNotification,
  dismissAllUserNotifications,
  type NotificationCursor,
} from '../services/notifications/userNotifications';

export const notificationKeys = {
  owner: (userId: string | null) => ['notifications-v3', userId] as const,
  list: (userId: string | null) =>
    ['notifications-v3', userId, 'list'] as const,
  unread: (userId: string | null) =>
    ['notifications-v3', userId, 'unread', 'snapshot-v1'] as const,
  preview: (userId: string | null) =>
    ['notifications-v3', userId, 'preview'] as const,
};

function requireNotificationOwner(userId: string | null) {
  if (!userId || useAuthStore.getState().session?.user.id !== userId)
    throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
}

export function useNotificationPreview() {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const client = useQueryClient();
  const unread = useNotificationUnreadCount();
  const list = useQuery({
    queryKey: notificationKeys.preview(userId),
    queryFn: () => {
      requireNotificationOwner(userId);
      return fetchNotificationPage({ limit: 3 });
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
  const markAll = useCallback(async () => {
    if (!userId || useAuthStore.getState().session?.user.id !== userId)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    // The server snapshots all unread rows, not merely these three previews.
    await markAllNotificationsRead();
    if (useAuthStore.getState().session?.user.id !== userId) return;
    await client.invalidateQueries({ queryKey: notificationKeys.owner(userId) });
  }, [client, userId]);
  return { list, unread, markAll, userId };
}

export function useNotificationUnreadCount() {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const { inbox } = useNotificationScope();
  return useQuery({
    queryKey: inbox ? [...mixedInboxKey(inbox), 'unread'] : notificationKeys.unread(userId),
    queryFn: async () => {
      if (inbox) {
        if (!inbox.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
        const snapshot = await inbox.api.unread();
        if (!inbox.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
        return snapshot;
      }
      requireNotificationOwner(userId);
      return fetchNotificationBadgeSnapshot();
    },
    select: snapshot => snapshot.count,
    enabled: Boolean(inbox?.userId ?? userId),
    staleTime: 15_000,
    refetchOnMount: true,
    refetchInterval: inbox ? 15_000 : false,
  });
}

export function useNotificationInbox() {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const { inbox } = useNotificationScope();
  const client = useQueryClient();
  const unread = useNotificationUnreadCount();
  const list = useInfiniteQuery({
    queryKey: inbox ? [...mixedInboxKey(inbox), 'list'] : notificationKeys.list(userId),
    initialPageParam: null as MixedCursor | NotificationCursor | null,
    queryFn: async ({ pageParam }) => {
      if (inbox) {
        if (!inbox.isCurrent() || (pageParam && !('snapshotAt' in pageParam))) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
        const page = await inbox.api.page(pageParam);
        if (!inbox.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
        return page;
      }
      requireNotificationOwner(userId);
      if (pageParam && 'snapshotAt' in pageParam) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      return fetchNotificationPage({ cursor: pageParam });
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: Boolean(inbox?.userId ?? userId),
    staleTime: 15_000,
    refetchOnMount: true,
  });
  const markAll = useCallback(async () => {
    if (inbox) {
      if (!inbox.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      try {
        await inbox.api.command('read');
      } finally {
        if (inbox.isCurrent()) await client.invalidateQueries({ queryKey: mixedInboxKey(inbox) });
      }
      return;
    }
    if (!userId || useAuthStore.getState().session?.user.id !== userId)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    await markAllNotificationsRead();
    // Never retain old-account responses or optimistically consume arrivals.
    if (useAuthStore.getState().session?.user.id !== userId) return;
    await client.invalidateQueries({
      queryKey: notificationKeys.owner(userId),
    });
  }, [client, inbox, userId]);
  const dismiss = useCallback(
    async (item: InboxItem | null) => {
      if (inbox) {
        if (!inbox.isCurrent()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
        try {
          await inbox.api.command('hide', item ?? undefined);
        } finally {
          // A missing response may mean it committed. Recover by reading, never replaying.
          if (inbox.isCurrent()) await client.invalidateQueries({ queryKey: mixedInboxKey(inbox) });
        }
        return;
      }
      if (item?.source === 'support_reply') throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      if (!userId || useAuthStore.getState().session?.user.id !== userId)
        throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      if (item) await dismissUserNotification(item);
      else await dismissAllUserNotifications();
      if (item && useAuthStore.getState().session?.user.id === userId)
        await dismissNativeInboxNotification(userId, item.id, item.source).catch(() => {});
      if (useAuthStore.getState().session?.user.id === userId)
        await client.invalidateQueries({
          queryKey: notificationKeys.owner(userId),
        });
    },
    [client, inbox, userId],
  );
  return { list, unread, markAll, dismiss, userId: inbox?.key ?? userId };
}

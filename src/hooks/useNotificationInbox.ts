import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  fetchNotificationPage,
  fetchUserNotificationUnreadCount,
  markAllNotificationsRead,
  dismissUserNotification,
  dismissAllUserNotifications,
  type UserNotificationItem,
  type NotificationCursor,
} from '../services/notifications/userNotifications';

export const notificationKeys = {
  owner: (userId: string | null) => ['notifications-v3', userId] as const,
  list: (userId: string | null) =>
    ['notifications-v3', userId, 'list'] as const,
  unread: (userId: string | null) =>
    ['notifications-v3', userId, 'unread'] as const,
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
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => {
      requireNotificationOwner(userId);
      return fetchUserNotificationUnreadCount();
    },
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchOnMount: true,
  });
}

export function useNotificationInbox() {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const client = useQueryClient();
  const unread = useNotificationUnreadCount();
  const list = useInfiniteQuery({
    queryKey: notificationKeys.list(userId),
    initialPageParam: null as NotificationCursor | null,
    queryFn: ({ pageParam }) => {
      requireNotificationOwner(userId);
      return fetchNotificationPage({ cursor: pageParam });
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchOnMount: true,
  });
  const markAll = useCallback(async () => {
    if (!userId || useAuthStore.getState().session?.user.id !== userId)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    await markAllNotificationsRead();
    // Never retain old-account responses or optimistically consume arrivals.
    if (useAuthStore.getState().session?.user.id !== userId) return;
    await client.invalidateQueries({
      queryKey: notificationKeys.owner(userId),
    });
  }, [client, userId]);
  const dismiss = useCallback(
    async (item: UserNotificationItem | null) => {
      if (!userId || useAuthStore.getState().session?.user.id !== userId)
        throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      if (item) await dismissUserNotification(item);
      else await dismissAllUserNotifications();
      if (useAuthStore.getState().session?.user.id === userId)
        await client.invalidateQueries({
          queryKey: notificationKeys.owner(userId),
        });
    },
    [client, userId],
  );
  return { list, unread, markAll, dismiss, userId };
}

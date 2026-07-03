// 파일: src/services/notifications/homeQuickDismiss.ts
// 역할:
// - 로그인 홈 상단 간편 알림창에서만 알림을 숨기는 local/user-scoped 상태를 관리한다.
// - 전체 알림함 삭제(user-scoped server dismiss)와 분리해, 홈에서 치운 알림이 알림함에는 남도록 보장한다.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  UserNotificationItem,
  UserNotificationSource,
} from './userNotifications';

const HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX =
  'nuri.notifications.homeQuickDismiss.v1';

export type HomeNotificationIdentity = {
  id: string;
  source: UserNotificationSource;
};

function normalizeUserId(userId: string): string {
  return userId.trim();
}

function isValidDismissKey(value: unknown): value is string {
  return typeof value === 'string' && /^(user|announcement):[0-9a-f-]+$/i.test(value);
}

export function buildHomeNotificationDismissStorageKey(userId: string): string {
  return `${HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX}:${normalizeUserId(userId)}`;
}

export function getHomeNotificationDismissKey(
  notification: HomeNotificationIdentity,
): string {
  return `${notification.source}:${notification.id}`;
}

export function normalizeHomeNotificationDismissKeys(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isValidDismissKey))).sort();
}

export function filterHomeVisibleNotifications(
  items: UserNotificationItem[],
  dismissedKeys: ReadonlySet<string>,
): UserNotificationItem[] {
  return items.filter(item => !dismissedKeys.has(getHomeNotificationDismissKey(item)));
}

async function saveHomeDismissKeys(
  userId: string,
  keys: ReadonlySet<string>,
): Promise<void> {
  await AsyncStorage.setItem(
    buildHomeNotificationDismissStorageKey(userId),
    JSON.stringify(Array.from(keys).sort()),
  );
}

export async function loadHomeNotificationDismissedKeys(
  userId: string,
): Promise<ReadonlySet<string>> {
  const raw = await AsyncStorage.getItem(
    buildHomeNotificationDismissStorageKey(userId),
  );
  if (!raw) return new Set();

  try {
    return new Set(normalizeHomeNotificationDismissKeys(JSON.parse(raw)));
  } catch {
    return new Set();
  }
}

export async function dismissHomeNotification(input: {
  userId: string;
  notification: HomeNotificationIdentity;
}): Promise<ReadonlySet<string>> {
  const existing = await loadHomeNotificationDismissedKeys(input.userId);
  const next = new Set(existing);
  next.add(getHomeNotificationDismissKey(input.notification));
  await saveHomeDismissKeys(input.userId, next);
  return next;
}

export async function dismissHomeNotifications(input: {
  userId: string;
  notifications: HomeNotificationIdentity[];
}): Promise<ReadonlySet<string>> {
  const existing = await loadHomeNotificationDismissedKeys(input.userId);
  const next = new Set(existing);
  for (const notification of input.notifications) {
    next.add(getHomeNotificationDismissKey(notification));
  }
  await saveHomeDismissKeys(input.userId, next);
  return next;
}

export const HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX_FOR_TEST =
  HOME_NOTIFICATION_DISMISS_STORAGE_PREFIX;

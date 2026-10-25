// 파일: src/services/notifications/userNotifications.ts
// 역할:
// - V1.1 앱 내부 알림 read path의 목록, unread count, 읽음 처리를 담당한다.
// - OS push/local notification과 분리해 사용자-facing read model만 다룬다.

import { supabase } from '../supabase/client';
import { resolvedNotificationTimeZone } from './notificationPresentation';

export type UserNotificationSource = 'user' | 'announcement';

export type UserNotificationActionTarget =
  | { kind: 'community_comment'; postId: string; commentId: string }
  | { kind: 'community_post'; postId: string }
  | { kind: 'record'; memoryId: string; petId: string }
  | { kind: 'schedule'; scheduleId: string; petId: string }
  | { kind: 'title'; titleId: string; petId: string | null }
  | { kind: 'activity'; grantId?: string }
  | {
      kind: 'timeline_period';
      startDate: string;
      endDate: string;
      petId: string | null;
    }
  | { kind: 'pet_anniversary'; petId: string }
  | { kind: 'notification_detail' }
  | { kind: 'unavailable' };

export type NotificationCategory =
  | 'news'
  | 'community'
  | 'schedule'
  | 'activity'
  | 'record';

export type UserNotificationItem = {
  id: string;
  source: UserNotificationSource;
  title: string;
  body: string;
  type: 'notice' | 'account' | 'service' | 'event';
  readAt: string | null;
  createdAt: string;
  actionTarget: UserNotificationActionTarget | null;
  category?: NotificationCategory;
  availableAt?: string;
  eventType?: string;
  payload?: Record<string, unknown>;
  timeZone?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unreadCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return value;
}

function normalizeSource(value: unknown): UserNotificationSource {
  return value === 'announcement' ? 'announcement' : 'user';
}

function normalizeType(value: unknown): UserNotificationItem['type'] {
  switch (value) {
    case 'account':
    case 'service':
    case 'event':
    case 'notice':
      return value;
    default:
      return 'notice';
  }
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toNullableUuid(value: unknown): string | null {
  const normalized = toNullableString(value)?.trim() ?? null;
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + 'T00:00:00Z');
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function parseNotificationTarget(
  value: unknown,
): UserNotificationActionTarget {
  if (!isRecord(value)) return { kind: 'unavailable' };
  const petId = toNullableUuid(value.petId);
  const postId = toNullableUuid(value.postId);
  switch (value.kind) {
    case 'community_comment': {
      const commentId = toNullableUuid(value.commentId);
      if (postId && commentId) return { kind: value.kind, postId, commentId };
      break;
    }
    case 'community_post':
      if (postId) return { kind: value.kind, postId };
      break;
    case 'record': {
      const memoryId = toNullableUuid(value.memoryId);
      if (memoryId && petId) return { kind: value.kind, memoryId, petId };
      break;
    }
    case 'schedule': {
      const scheduleId = toNullableUuid(value.scheduleId);
      if (scheduleId && petId) return { kind: value.kind, scheduleId, petId };
      break;
    }
    case 'title':
      if (
        typeof value.titleId === 'string' &&
        /^[A-Z]{1,2}\d{2}$/.test(value.titleId)
      ) {
        return { kind: value.kind, titleId: value.titleId, petId };
      }
      break;
    case 'activity':
      return {
        kind: value.kind,
        grantId: toNullableUuid(value.grantId) ?? undefined,
      };
    case 'timeline_period':
      if (
        isCalendarDate(value.startDate) &&
        isCalendarDate(value.endDate) &&
        Date.parse(value.startDate) < Date.parse(value.endDate)
      ) {
        return {
          kind: value.kind,
          startDate: value.startDate,
          endDate: value.endDate,
          petId,
        };
      }
      break;
    case 'pet_anniversary':
      if (petId) return { kind: value.kind, petId };
      break;
    case 'notification_detail':
    case 'unavailable':
      return { kind: value.kind };
  }
  return { kind: 'unavailable' };
}

export function mapNotification(row: unknown): UserNotificationItem | null {
  if (!isRecord(row)) return null;
  const id = toString(row.notification_id).trim();
  const title = toString(row.title).trim();
  const body = toString(row.body).trim();
  const createdAt = toString(row.created_at).trim();
  const targetPostId = toNullableUuid(row.target_post_id);
  const targetCommentId = toNullableUuid(row.target_comment_id);
  if (!id || !title || !createdAt) return null;

  return {
    id,
    source: normalizeSource(row.notification_source),
    title,
    body,
    type: normalizeType(row.type),
    readAt: toNullableString(row.read_at),
    createdAt,
    category:
      row.category === 'community' ||
      row.category === 'schedule' ||
      row.category === 'activity' ||
      row.category === 'record'
        ? row.category
        : 'news',
    availableAt: toNullableString(row.available_at) ?? createdAt,
    eventType: toString(row.event_type),
    payload: isRecord(row.payload) ? row.payload : {},
    actionTarget:
      row.schema_version !== undefined
        ? row.schema_version === 1
          ? parseNotificationTarget(row.target)
          : { kind: 'unavailable' }
        : targetPostId && targetCommentId
        ? {
            kind: 'community_comment',
            postId: targetPostId,
            commentId: targetCommentId,
          }
        : null,
  };
}

export async function fetchUserNotifications(
  limit = 50,
): Promise<UserNotificationItem[]> {
  return (await fetchNotificationPage({ limit })).items;
}

export type NotificationCursor = {
  at: string;
  id: string;
  source: UserNotificationSource;
};
export type NotificationPage = {
  items: UserNotificationItem[];
  nextCursor: NotificationCursor | null;
  unreadCount: number;
  timeZone: string;
};

export async function fetchNotificationPage(input: {
  limit?: number;
  cursor?: NotificationCursor | null;
}): Promise<NotificationPage> {
  const { data, error } = await supabase.rpc('get_user_notifications_v3', {
    p_limit: input.limit ?? 30,
    p_cursor_at: input.cursor?.at ?? null,
    p_cursor_id: input.cursor?.id ?? null,
    p_cursor_source: input.cursor?.source ?? null,
  });
  if (error) throw error;
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    typeof data.unreadCount !== 'number' ||
    !Number.isSafeInteger(data.unreadCount) ||
    data.unreadCount < 0
  ) {
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  }
  const items = data.items
    .map(mapNotification)
    .filter((item): item is UserNotificationItem => item !== null);
  if (items.length !== data.items.length)
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      data.hasMore === true && last
        ? {
            at: last.availableAt ?? last.createdAt,
            id: last.id,
            source: last.source,
          }
        : null,
    unreadCount: Math.max(0, data.unreadCount),
    timeZone: resolvedNotificationTimeZone(data.timeZone),
  };
}

export async function fetchNotificationDetail(
  id: string,
  source: UserNotificationSource,
): Promise<UserNotificationItem> {
  const { data, error } = await supabase.rpc(
    'get_user_notification_detail_v3',
    { p_id: id, p_source: source },
  );
  if (error) throw error;
  const item = mapNotification(data);
  if (!item) throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  const preferences = await supabase.rpc(
    'manage_user_notification_preferences_v3',
  );
  if (preferences.error) throw preferences.error;
  return {
    ...item,
    timeZone: resolvedNotificationTimeZone(
      isRecord(preferences.data) ? preferences.data.timeZone : null,
    ),
  };
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc(
    'mark_all_user_notifications_read_v3',
  );
  if (error) throw error;
  return unreadCount(data);
}

export async function fetchUserNotificationUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc(
    'get_user_notification_unread_count_v1',
  );
  if (error) throw error;
  if (typeof data !== 'number' || !Number.isSafeInteger(data) || data < 0)
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return data;
}

export async function markUserNotificationRead(input: {
  id: string;
  source: UserNotificationSource;
}): Promise<number> {
  const { data, error } = await supabase.rpc('mark_user_notification_read_v1', {
    p_notification_id: input.id,
    p_notification_source: input.source,
  });
  if (error) throw error;
  return unreadCount(data);
}

export async function dismissUserNotification(input: {
  id: string;
  source: UserNotificationSource;
}): Promise<number> {
  const { data, error } = await supabase.rpc('dismiss_user_notification_v1', {
    p_notification_id: input.id,
    p_notification_source: input.source,
  });
  if (error) throw error;
  return unreadCount(data);
}

export async function dismissAllUserNotifications(): Promise<number> {
  const { data, error } = await supabase.rpc(
    'dismiss_all_user_notifications_v1',
  );
  if (error) throw error;
  return unreadCount(data);
}

export async function createQaUserNotification(input?: {
  title?: string;
  body?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_qa_user_notification_v1', {
    p_title: input?.title ?? 'QA_RETENTION_NOTICE',
    p_body:
      input?.body ??
      'home quick dismiss와 inbox delete 분리 live smoke용 알림입니다.',
  });
  if (error) throw error;
  return typeof data === 'string' ? data : '';
}

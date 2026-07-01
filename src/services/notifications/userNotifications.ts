// 파일: src/services/notifications/userNotifications.ts
// 역할:
// - V1.1 앱 내부 알림 read path의 목록, unread count, 읽음 처리를 담당한다.
// - OS push/local notification과 분리해 사용자-facing read model만 다룬다.

import { supabase } from '../supabase/client';

export type UserNotificationSource = 'user' | 'announcement';

export type UserNotificationItem = {
  id: string;
  source: UserNotificationSource;
  title: string;
  body: string;
  type: 'notice' | 'account' | 'service' | 'event';
  readAt: string | null;
  createdAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function mapNotification(row: unknown): UserNotificationItem | null {
  if (!isRecord(row)) return null;
  const id = toString(row.notification_id).trim();
  const title = toString(row.title).trim();
  const body = toString(row.body).trim();
  const createdAt = toString(row.created_at).trim();
  if (!id || !title || !createdAt) return null;

  return {
    id,
    source: normalizeSource(row.notification_source),
    title,
    body,
    type: normalizeType(row.type),
    readAt: toNullableString(row.read_at),
    createdAt,
  };
}

export async function fetchUserNotifications(limit = 50): Promise<UserNotificationItem[]> {
  const { data, error } = await supabase.rpc('get_user_notifications_v1', {
    p_limit: limit,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data
    .map(mapNotification)
    .filter((item): item is UserNotificationItem => Boolean(item));
}

export async function fetchUserNotificationUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_notification_unread_count_v1');
  if (error) throw error;
  return typeof data === 'number' && Number.isFinite(data) ? data : 0;
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
  return typeof data === 'number' && Number.isFinite(data) ? data : 0;
}

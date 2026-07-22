// 파일: src/services/notifications/userNotifications.ts
// 역할:
// - V1.1 앱 내부 알림 read path의 목록, unread count, 읽음 처리를 담당한다.
// - OS push/local notification과 분리해 사용자-facing read model만 다룬다.

import { supabase } from '../supabase/client';

export type UserNotificationSource = 'user' | 'announcement';

export type UserNotificationActionTarget = {
  kind: 'community_comment';
  postId: string;
  commentId: string;
};

export type UserNotificationItem = {
  id: string;
  source: UserNotificationSource;
  title: string;
  body: string;
  type: 'notice' | 'account' | 'service' | 'event';
  readAt: string | null;
  createdAt: string;
  actionTarget: UserNotificationActionTarget | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function toNullableUuid(value: unknown): string | null {
  const normalized = toNullableString(value)?.trim() ?? null;
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

function mapNotification(row: unknown): UserNotificationItem | null {
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
    actionTarget:
      targetPostId && targetCommentId
        ? {
            kind: 'community_comment',
            postId: targetPostId,
            commentId: targetCommentId,
          }
        : null,
  };
}

export async function fetchUserNotifications(limit = 50): Promise<UserNotificationItem[]> {
  const { data, error } = await supabase.rpc('get_user_notifications_v2', {
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

export async function dismissUserNotification(input: {
  id: string;
  source: UserNotificationSource;
}): Promise<number> {
  const { data, error } = await supabase.rpc('dismiss_user_notification_v1', {
    p_notification_id: input.id,
    p_notification_source: input.source,
  });
  if (error) throw error;
  return typeof data === 'number' && Number.isFinite(data) ? data : 0;
}

export async function dismissAllUserNotifications(): Promise<number> {
  const { data, error } = await supabase.rpc('dismiss_all_user_notifications_v1');
  if (error) throw error;
  return typeof data === 'number' && Number.isFinite(data) ? data : 0;
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

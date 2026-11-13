import type { NotificationListRow } from './notificationPresentation';

export type SupportReplyTarget = {
  kind: 'support_ticket';
  ticketId: string;
  messageSeq: number;
};
export type SupportReplyNotification = NotificationListRow & {
  source: 'support_reply';
  isRead: boolean;
  target: SupportReplyTarget;
};
export type SupportNotificationPage = {
  items: SupportReplyNotification[];
  hasMore: boolean;
  unreadCount: number;
  timeZone: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return value as Record<string, unknown>;
}
export function parseSupportReplyTarget(value: unknown): SupportReplyTarget {
  const row = object(value);
  if (
    row.kind !== 'support_ticket' ||
    typeof row.ticketId !== 'string' ||
    !uuid.test(row.ticketId) ||
    typeof row.messageSeq !== 'number' ||
    !Number.isSafeInteger(row.messageSeq) ||
    row.messageSeq < 1
  )
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return {
    kind: 'support_ticket',
    ticketId: row.ticketId,
    messageSeq: row.messageSeq,
  };
}
export function parseSupportNotificationPage(
  value: unknown,
): SupportNotificationPage {
  const page = object(value);
  if (
    !Array.isArray(page.items) ||
    typeof page.hasMore !== 'boolean' ||
    typeof page.unreadCount !== 'number' ||
    !Number.isSafeInteger(page.unreadCount) ||
    page.unreadCount < 0 ||
    page.timeZone !== 'Asia/Seoul'
  )
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  const items = page.items.map((entry): SupportReplyNotification => {
    const row = object(entry);
    if (
      typeof row.id !== 'string' ||
      !uuid.test(row.id) ||
      row.source !== 'support_reply' ||
      typeof row.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(row.createdAt)) ||
      typeof row.isRead !== 'boolean'
    )
      throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
    return {
      id: row.id,
      source: 'support_reply',
      createdAt: row.createdAt,
      availableAt: row.createdAt,
      isRead: row.isRead,
      category: 'news',
      title: '문의에 답변이 도착했어요',
      body: '남긴 문의의 답변을 확인해주세요.',
      target: parseSupportReplyTarget(row.target),
    };
  });
  if (page.hasMore && items.length === 0)
    throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return {
    items,
    hasMore: page.hasMore,
    unreadCount: page.unreadCount,
    timeZone: page.timeZone,
  };
}

/** Never trust a cached ticket ID. Resolve the delivered event under the current
 * authenticated source again, before loading any inquiry text or acknowledging it. */
export async function resolveSupportReplyNotification(
  id: string,
  lookup: (id: string) => Promise<unknown>,
): Promise<SupportReplyTarget> {
  if (!uuid.test(id)) throw new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
  return parseSupportReplyTarget(await lookup(id));
}

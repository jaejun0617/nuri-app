import { mapNotification, type UserNotificationItem, type UserNotificationSource } from './userNotifications';
import { parseSupportReplyTarget, type SupportReplyTarget } from './supportReplyNotifications';
import { resolvedNotificationTimeZone } from './notificationPresentation';

export type InboxSource = UserNotificationSource | 'support_reply';
export type InboxKey = { id: string; source: InboxSource };
export type InboxItem = UserNotificationItem | (InboxKey & {
  source: 'support_reply';
  title: string;
  body: string;
  createdAt: string;
  availableAt: string;
  category: 'news';
  isRead: boolean;
});
export type MixedCursor = InboxKey & { at: string; snapshotAt: string };
export type MixedTarget =
  | { kind: 'legacy'; item: UserNotificationItem }
  | { kind: 'support'; target: SupportReplyTarget };

type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;
const invalid = () => new Error('NURI_NOTIFICATION_RESPONSE_INVALID');
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function time(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}
function item(value: unknown): InboxItem {
  const row = record(value);
  const source = row.notification_source;
  if (source !== 'support_reply' && source !== 'user' && source !== 'announcement') throw invalid();
  if (typeof row.notification_id !== 'string' ||
      !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(row.notification_id)) throw invalid();
  const availableAt = time(row.available_at);
  const createdAt = time(row.created_at);
  if (source !== 'support_reply') {
    const mapped = mapNotification(row);
    if (!mapped || !mapped.availableAt || (row.read_at !== null && typeof row.read_at !== 'string')) throw invalid();
    return mapped;
  }
  if (typeof row.title !== 'string' || typeof row.body !== 'string' || typeof row.is_read !== 'boolean') throw invalid();
  return { source, id: row.notification_id, title: row.title, body: row.body, availableAt, createdAt, category: 'news', isRead: row.is_read };
}

export function createMixedNotificationApi(rpc: Rpc) {
  return {
    async page(cursor: MixedCursor | null = null) {
      const page = record(await rpc('get_notification_inbox_v4', {
        p_snapshot: cursor?.snapshotAt ?? null,
        p_at: cursor?.at ?? null,
        p_id: cursor?.id ?? null,
        p_source: cursor?.source ?? null,
      }));
      if (!Array.isArray(page.items) || typeof page.hasMore !== 'boolean') throw invalid();
      const items = page.items.map(item);
      const snapshotAt = time(page.snapshotAt);
      const last = items.at(-1);
      if (page.hasMore && !last) throw invalid();
      return {
        items,
        unreadCount: count(page.unreadCount),
        timeZone: resolvedNotificationTimeZone(page.timeZone),
        nextCursor: page.hasMore && last?.availableAt
          ? { id: last.id, source: last.source, at: last.availableAt, snapshotAt }
          : null,
      };
    },
    async unread() {
      const result = record(await rpc('get_notification_inbox_v4', { p_limit: 0 }));
      const badge = record(result.badge);
      const unread = count(badge.count);
      if (unread !== count(result.unreadCount)) throw invalid();
      if (typeof badge.observedAt !== 'number' || !Number.isSafeInteger(badge.observedAt) ||
        (badge.validUntil !== null && (typeof badge.validUntil !== 'number' ||
          !Number.isSafeInteger(badge.validUntil) || badge.validUntil <= badge.observedAt)) ||
        (unread === 0) !== (badge.validUntil === null)) throw invalid();
      return { count: unread, observedAt: badge.observedAt, validUntil: badge.validUntil };
    },
    async target(key: InboxKey): Promise<MixedTarget> {
      const row = record(await rpc('get_notification_target_v4', { p_id: key.id, p_source: key.source }));
      const resolved = item(row);
      if (resolved.id !== key.id || resolved.source !== key.source) throw invalid();
      return resolved.source === 'support_reply'
        ? { kind: 'support', target: parseSupportReplyTarget(row.target) }
        : { kind: 'legacy', item: resolved };
    },
    async command(operation: 'read' | 'hide', key?: InboxKey) {
      await rpc('command_notification_inbox_v4', { p_operation: operation, p_id: key?.id ?? null, p_source: key?.source ?? null });
    },
    async acknowledgeReply(id: string) {
      await rpc('acknowledge_notification_reply_v4', { p_id: id });
    },
  };
}

export type MixedInboxScope = {
  // This key is ephemeral and changes even when the same account signs in again.
  key: string;
  userId: string;
  api: ReturnType<typeof createMixedNotificationApi>;
  isCurrent(): boolean;
};

export const mixedInboxKey = (scope: MixedInboxScope) =>
  ['notifications-v4', 'isolated', scope.userId, scope.key] as const;

import type { UserNotificationItem } from './userNotifications';

export function resolvedNotificationTimeZone(value: unknown): string {
  if (typeof value === 'string') {
    try {
      new Intl.DateTimeFormat('ko-KR', { timeZone: value }).format(0);
      return value;
    } catch {}
  }
  return 'Asia/Seoul';
}

export function notificationDetailDate(
  value: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: resolvedNotificationTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(value));
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === name)?.value ?? '';
  return `${part('year')}.${part('month')}.${part('day')} ${part(
    'dayPeriod',
  )} ${part('hour')}:${part('minute')}`;
}

export function notificationDateKey(value: string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function notificationDateLabel(
  value: string,
  now: Date,
  timeZone: string,
): string {
  const key = notificationDateKey(value, timeZone);
  if (key === notificationDateKey(now.toISOString(), timeZone)) return '오늘';
  // Local date arithmetic avoids a 24-hour DST assumption.
  const today = notificationDateKey(now.toISOString(), timeZone);
  const yesterday = new Date(today + 'T12:00:00Z');
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (key === yesterday.toISOString().slice(0, 10)) return '어제';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

export function notificationRelativeTime(
  value: string,
  now: Date,
  timeZone: string,
): string {
  const elapsed = Math.max(0, now.getTime() - Date.parse(value));
  if (
    notificationDateKey(value, timeZone) !==
    notificationDateKey(now.toISOString(), timeZone)
  ) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone,
      month: 'long',
      day: 'numeric',
    }).format(new Date(value));
  }
  if (elapsed < 60_000) return '방금 전';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}분 전`;
  return `${Math.floor(elapsed / 3_600_000)}시간 전`;
}

export function groupNotifications(
  items: UserNotificationItem[],
  now: Date,
  timeZone: string,
) {
  const groups: {
    key: string;
    label: string;
    items: UserNotificationItem[];
  }[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const identity = `${item.source}:${item.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const value = item.availableAt ?? item.createdAt;
    const key = notificationDateKey(value, timeZone);
    let group = groups.find(g => g.key === key);
    if (!group) {
      group = {
        key,
        label: notificationDateLabel(value, now, timeZone),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

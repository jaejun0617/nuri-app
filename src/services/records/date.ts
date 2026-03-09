import type { MemoryRecord } from '../supabase/memories';
import {
  diffCalendarDaysBetweenYmd,
  formatYmdToDots,
  getDateYmdInKst,
  getKstYmd,
  getMonthKeyFromYmd,
  safeYmd,
} from '../../utils/date';

type RecordDateSource = Pick<MemoryRecord, 'createdAt' | 'occurredAt'>;

export function getRecordDisplayYmd(record: RecordDateSource): string | null {
  return safeYmd(record.occurredAt) ?? getDateYmdInKst(record.createdAt);
}

export function getRecordSortTimestamp(record: RecordDateSource): number {
  const occurredAt = safeYmd(record.occurredAt);
  if (occurredAt) {
    const time = new Date(`${occurredAt}T23:59:59.999`).getTime();
    if (Number.isFinite(time)) return time;
  }

  const createdTime = new Date(record.createdAt).getTime();
  if (Number.isFinite(createdTime)) return createdTime;
  return 0;
}

export function getRecordMonthKey(record: RecordDateSource): string | null {
  return getMonthKeyFromYmd(getRecordDisplayYmd(record));
}

export function formatRecordDisplayDate(record: RecordDateSource): string {
  const ymd = getRecordDisplayYmd(record);
  return formatYmdToDots(ymd) ?? '';
}

export function formatRecordRelativeTime(record: RecordDateSource, now = new Date()): string {
  const occurredAt = safeYmd(record.occurredAt);
  if (occurredAt) {
    const diffDays = diffCalendarDaysBetweenYmd(occurredAt, getKstYmd(now));
    if (diffDays === null) return '';
    if (diffDays <= 0) {
      const createdAt = new Date(record.createdAt).getTime();
      if (!Number.isFinite(createdAt)) return '1분 전';

      const diffMs = Math.max(0, now.getTime() - createdAt);
      const minuteMs = 60 * 1000;
      const hourMs = 60 * minuteMs;
      const dayMs = 24 * hourMs;

      if (diffMs < hourMs) {
        return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`;
      }

      if (diffMs <= dayMs) {
        return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
      }

      return `${Math.max(1, Math.floor(diffMs / dayMs))}일 전`;
    }
    return `${diffDays}일 전`;
  }

  const createdAt = new Date(record.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return '';

  const diffMs = Math.max(0, now.getTime() - createdAt);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))}분 전`;
  }

  if (diffMs <= dayMs) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}시간 전`;
  }

  return `${Math.max(1, Math.floor(diffMs / dayMs))}일 전`;
}

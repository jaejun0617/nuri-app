import type { MemoryRecord } from '../supabase/memories';
import {
  formatRelativeTimeFromNow,
  formatYmdToDots,
  getDateYmdInKst,
  getMonthKeyFromYmd,
  safeYmd,
} from '../../utils/date';

type RecordDateSource = Pick<MemoryRecord, 'createdAt' | 'occurredAt'>;

export function getRecordDisplayYmd(record: RecordDateSource): string | null {
  return safeYmd(record.occurredAt) ?? getDateYmdInKst(record.createdAt);
}

export function getRecordMonthKey(record: RecordDateSource): string | null {
  return getMonthKeyFromYmd(getRecordDisplayYmd(record));
}

export function formatRecordDisplayDate(record: RecordDateSource): string {
  const ymd = getRecordDisplayYmd(record);
  return formatYmdToDots(ymd) ?? '';
}

export function formatRecordRelativeTime(record: RecordDateSource, now = new Date()): string {
  const source = `${record.createdAt ?? ''}`.trim();
  if (source) {
    const createdRelative = formatRelativeTimeFromNow(source, now);
    if (createdRelative) return createdRelative;
  }

  const ymd = getRecordDisplayYmd(record);
  return ymd ? formatRelativeTimeFromNow(ymd, now) : '';
}

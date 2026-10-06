import { getRecordDisplayYmd } from '../../services/records/date';
import type { MemoryRecord } from '../../services/supabase/memories';
import { getKstDateParts } from '../../utils/date';

const WEEKDAYS = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

export function formatTimelineRecordedMonth(monthKey: string) {
  const parts = getKstDateParts(`${monthKey}-01`);
  return parts ? `${parts.year}년 ${parts.month}월` : null;
}

export function getLatestTimelineDayKey(days: Iterable<string>) {
  let latest: string | null = null;
  for (const day of days) {
    if (getKstDateParts(day) && (latest === null || day > latest)) latest = day;
  }
  return latest;
}

export function getLatestTimelineRecordedDay(records: MemoryRecord[]) {
  return getLatestTimelineDayKey(
    records.flatMap(record => {
      const day = getRecordDisplayYmd(record);
      return day ? [day] : [];
    }),
  );
}

export function resolveTimelineDaySubtitleColor(
  day: string | null,
  latestDay: string | null,
  seasonAccent: string,
) {
  return day !== null && day === latestDay ? seasonAccent : '#5D6879';
}

export function buildTimelineDayHeader(
  ymd: string | null,
  previousYmd: string | null,
  referenceYmd: string,
) {
  if (!ymd || ymd === previousYmd) return null;
  const parts = getKstDateParts(ymd);
  if (!parts) return null;
  const yearPrefix =
    ymd.slice(0, 4) === referenceYmd.slice(0, 4) ? '' : `${parts.year}년 `;
  return {
    title: `${yearPrefix}${parts.month}월 ${parts.day}일`,
    subtitle: WEEKDAYS[parts.weekday],
    isWeekend: parts.weekday === 0 || parts.weekday === 6,
  };
}

// Only a complete lightweight summary may supply day totals, not an infinite-scroll page.
export function buildTimelineDayCounts(records: MemoryRecord[]) {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const ymd = getRecordDisplayYmd(record);
    if (ymd) counts.set(ymd, (counts.get(ymd) ?? 0) + 1);
  }
  return counts;
}

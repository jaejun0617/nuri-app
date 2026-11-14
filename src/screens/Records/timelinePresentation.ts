import { formatRecordMonthDayWithWeekday, getRecordDisplayYmd } from '../../services/records/date';
import type { MemoryRecord } from '../../services/supabase/memories';
import { compareTimelineRecords, type TimelineSortMode } from '../../services/timeline/query';
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

export function buildTimelineMonthGrid(
  recordIds: readonly string[],
  recordsById: Readonly<Record<string, MemoryRecord>>,
  sortMode: TimelineSortMode = 'recent',
  grouping: 'day' | 'month' = 'day',
) {
  const ids: string[] = [];
  const dayTitles = new Map<string, string>();
  const listIndexById = new Map<string, number>();
  const recordIndexById = new Map<string, number>();
  let previousDay: string | null | undefined;

  const records = recordIds.flatMap((id, recordIndex) => {
    if (!recordsById[id]) return [];
    recordIndexById.set(id, recordIndex);
    return [recordsById[id]];
  });
  const direction = sortMode === 'recent' ? 1 : -1;
  // Cursor pages follow creation time; regroup by the displayed date after merging pages.
  records.sort((left, right) => direction * compareTimelineRecords(left, right));

  for (const record of records) {
    const day = getRecordDisplayYmd(record);
    const group = grouping === 'month' ? day?.slice(0, 7) ?? null : day;
    if (group !== previousDay) {
      const headingId = `month-grid-${grouping}:${group ?? 'unknown'}`;
      ids.push(headingId);
      dayTitles.set(headingId, grouping === 'month' && group
        ? `${group.slice(0, 4)}년 ${Number(group.slice(5))}월`
        : formatRecordMonthDayWithWeekday(record) || '날짜 미확인');
      previousDay = group;
    }
    listIndexById.set(record.id, ids.length);
    ids.push(record.id);
  }

  return { ids, dayTitles, listIndexById, recordIndexById };
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

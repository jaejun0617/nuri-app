// 파일: src/services/timeline/heatmap.ts
// 역할:
// - 타임라인 캘린더 히트맵용 날짜 집계 로직
// - 최근 n주 기준으로 날짜별 기록 수와 강도를 계산

import type { MemoryRecord } from '../supabase/memories';

export type TimelineHeatmapCell = {
  key: string;
  ymd: string;
  label: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type TimelineHeatmapWeek = {
  key: string;
  cells: TimelineHeatmapCell[];
};

function toRecordYmd(record: MemoryRecord): string | null {
  const raw = (record.occurredAt ?? record.createdAt.slice(0, 10) ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export function buildTimelineHeatmap(
  records: MemoryRecord[],
  weeks = 12,
  now = new Date(),
): TimelineHeatmapWeek[] {
  const safeWeeks = Math.max(4, Math.min(20, weeks));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const dateCounts = new Map<string, number>();
  for (const record of records) {
    const ymd = toRecordYmd(record);
    if (!ymd) continue;
    dateCounts.set(ymd, (dateCounts.get(ymd) ?? 0) + 1);
  }

  const currentWeekStart = getWeekStart(today);
  const start = new Date(currentWeekStart);
  start.setDate(start.getDate() - (safeWeeks - 1) * 7);

  const weeksOutput: TimelineHeatmapWeek[] = [];
  const cursor = new Date(start);

  for (let weekIndex = 0; weekIndex < safeWeeks; weekIndex += 1) {
    const weekStartYmd = formatYmd(cursor);
    const cells: TimelineHeatmapCell[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + dayIndex);
      const ymd = formatYmd(day);
      const count = dateCounts.get(ymd) ?? 0;

      cells.push({
        key: `${weekStartYmd}:${dayIndex}`,
        ymd,
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        count,
        intensity: getIntensity(count),
        isCurrentMonth: day.getMonth() === today.getMonth(),
        isToday: ymd === formatYmd(today),
      });
    }

    weeksOutput.push({
      key: weekStartYmd,
      cells,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return weeksOutput;
}

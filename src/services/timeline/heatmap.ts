// 파일: src/services/timeline/heatmap.ts
// 역할:
// - 타임라인 캘린더 히트맵용 날짜 집계 로직
// - 최근 n주 기준으로 날짜별 기록 수와 강도를 계산

import type { MemoryRecord } from '../supabase/memories';
import {
  addDaysToYmd,
  getKstYmd,
  getMonthKeyFromYmd,
  getStartOfWeekYmd,
} from '../../utils/date';
import { getRecordDisplayYmd } from '../records/date';

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
  const todayYmd = getKstYmd(now);
  const currentMonthKey = getMonthKeyFromYmd(todayYmd);

  const dateCounts = new Map<string, number>();
  for (const record of records) {
    const ymd = getRecordDisplayYmd(record);
    if (!ymd) continue;
    dateCounts.set(ymd, (dateCounts.get(ymd) ?? 0) + 1);
  }

  const currentWeekStartYmd = getStartOfWeekYmd(todayYmd, {
    weekStartsOn: 1,
  });
  const startYmd = addDaysToYmd(
    currentWeekStartYmd,
    -(safeWeeks - 1) * 7,
  );
  if (!currentWeekStartYmd || !startYmd) return [];

  const weeksOutput: TimelineHeatmapWeek[] = [];
  let cursorYmd = startYmd;

  for (let weekIndex = 0; weekIndex < safeWeeks; weekIndex += 1) {
    const cells: TimelineHeatmapCell[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const ymd = addDaysToYmd(cursorYmd, dayIndex);
      if (!ymd) continue;
      const count = dateCounts.get(ymd) ?? 0;
      const month = Number(ymd.slice(5, 7));
      const day = Number(ymd.slice(8, 10));

      cells.push({
        key: `${cursorYmd}:${dayIndex}`,
        ymd,
        label: `${month}/${day}`,
        count,
        intensity: getIntensity(count),
        isCurrentMonth: getMonthKeyFromYmd(ymd) === currentMonthKey,
        isToday: ymd === todayYmd,
      });
    }

    weeksOutput.push({
      key: cursorYmd,
      cells,
    });

    const nextCursorYmd = addDaysToYmd(cursorYmd, 7);
    if (!nextCursorYmd) break;
    cursorYmd = nextCursorYmd;
  }

  return weeksOutput;
}

// 파일: src/services/home/weeklySummary.ts
// 역할:
// - 홈 화면의 "이번 주 요약" 카드 계산
// - 기록/일정 데이터를 한 번만 훑어서 이번 주 핵심 지표를 만든다

import type { MemoryRecord } from '../supabase/memories';
import type { PetSchedule } from '../supabase/schedules';
import {
  addDaysToYmd,
  diffCalendarDaysBetweenYmd,
  getDateYmdInKst,
  getKstYmd,
  getStartOfWeekYmd,
} from '../../utils/date';
import { getRecordDisplayYmd } from '../records/date';

export type WeeklySummary = {
  walkCount: number;
  mealCount: number;
  healthCount: number;
  recordDays: number;
  totalRecords: number;
  upcomingSchedules: number;
};

function isWithinWeekYmd(
  ymd: string | null,
  weekStartYmd: string,
  weekEndYmdExclusive: string,
): boolean {
  if (!ymd) return false;
  const fromStart = diffCalendarDaysBetweenYmd(weekStartYmd, ymd);
  const toEnd = diffCalendarDaysBetweenYmd(ymd, weekEndYmdExclusive);
  if (fromStart === null || toEnd === null) return false;
  return fromStart >= 0 && toEnd > 0;
}

function hasTag(record: MemoryRecord, keyword: string): boolean {
  return (record.tags ?? []).some(tag => tag === keyword);
}

export function buildWeeklySummary(
  records: MemoryRecord[],
  schedules: PetSchedule[],
  now = new Date(),
): WeeklySummary {
  const todayYmd = getKstYmd(now);
  const weekStartYmd = getStartOfWeekYmd(todayYmd, { weekStartsOn: 1 });
  const weekEndYmd = addDaysToYmd(weekStartYmd, 7);
  if (!weekStartYmd || !weekEndYmd) {
    return {
      walkCount: 0,
      mealCount: 0,
      healthCount: 0,
      recordDays: 0,
      totalRecords: 0,
      upcomingSchedules: 0,
    };
  }
  const seenDays = new Set<string>();

  let walkCount = 0;
  let mealCount = 0;
  let healthCount = 0;
  let totalRecords = 0;
  let upcomingSchedules = 0;

  for (const record of records) {
    const ymd = getRecordDisplayYmd(record);
    if (!isWithinWeekYmd(ymd, weekStartYmd, weekEndYmd)) continue;

    totalRecords += 1;
    seenDays.add(ymd as string);

    if (hasTag(record, 'walk')) walkCount += 1;
    if (hasTag(record, 'meal')) mealCount += 1;
    if (hasTag(record, 'health')) healthCount += 1;
  }

  for (const schedule of schedules) {
    const ymd = getDateYmdInKst(schedule.startsAt);
    if (!isWithinWeekYmd(ymd, weekStartYmd, weekEndYmd)) continue;
    upcomingSchedules += 1;
  }

  return {
    walkCount,
    mealCount,
    healthCount,
    recordDays: seenDays.size,
    totalRecords,
    upcomingSchedules,
  };
}

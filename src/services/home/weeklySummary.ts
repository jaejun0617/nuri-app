// 파일: src/services/home/weeklySummary.ts
// 역할:
// - 홈 화면의 "이번 주 요약" 카드 계산
// - 기록/일정 데이터를 한 번만 훑어서 이번 주 핵심 지표를 만든다

import type { MemoryRecord } from '../supabase/memories';
import type { PetSchedule } from '../supabase/schedules';
import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
} from '../memories/categoryMeta';
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
  lifeCount: number;
  recordDays: number;
  totalRecords: number;
  upcomingSchedules: number;
};

export type WeeklySummaryBounds = {
  startYmd: string;
  endExclusiveYmd: string;
  startIso: string;
  endExclusiveIso: string;
};

type WeeklyRecordKind = 'walk' | 'meal' | 'life' | null;

function toKstMidnightIso(ymd: string): string {
  return new Date(`${ymd}T00:00:00+09:00`).toISOString();
}

export function getWeeklySummaryBounds(now = new Date()): WeeklySummaryBounds {
  const todayYmd = getKstYmd(now);
  const startYmd = getStartOfWeekYmd(todayYmd, { weekStartsOn: 1 }) ?? todayYmd;
  const endExclusiveYmd = addDaysToYmd(startYmd, 7) ?? startYmd;

  return {
    startYmd,
    endExclusiveYmd,
    startIso: toKstMidnightIso(startYmd),
    endExclusiveIso: toKstMidnightIso(endExclusiveYmd),
  };
}

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

function hasExplicitCategory(record: MemoryRecord): boolean {
  const source = record as Record<string, unknown>;
  return [
    'category',
    'type',
    'kind',
    'recordType',
    'mainCategory',
    'categoryKey',
  ].some(key => {
    const value = source[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function getWeeklyRecordKind(record: MemoryRecord): WeeklyRecordKind {
  const explicitCategory = hasExplicitCategory(record);
  const rawCategory = readRecordCategoryRaw(record).trim().toLowerCase();
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory = normalizeOtherSubKey(
    readOtherSubCategoryRaw(record),
  );

  // New records persist category/subCategory. Legacy records without an
  // explicit category still resolve through readRecordCategoryRaw(tags).
  // Explicit but unknown categories must not be guessed as life records.
  if (mainCategory === 'walk') return 'walk';
  if (mainCategory === 'meal') return 'meal';
  const isKnownLifeCategory =
    !explicitCategory ||
    rawCategory === 'other' ||
    rawCategory === 'etc' ||
    rawCategory === 'life' ||
    rawCategory === 'grooming' ||
    rawCategory === 'bathing' ||
    rawCategory.includes('생활') ||
    rawCategory.includes('미용') ||
    rawCategory.includes('목욕') ||
    rawCategory.includes('위생');
  if (
    mainCategory === 'other' &&
    otherSubCategory !== 'hospital' &&
    isKnownLifeCategory
  ) {
    return 'life';
  }
  return null;
}

export function buildWeeklySummary(
  records: MemoryRecord[],
  schedules: PetSchedule[],
  now = new Date(),
): WeeklySummary {
  const bounds = getWeeklySummaryBounds(now);
  const weekStartYmd = bounds.startYmd;
  const weekEndYmd = bounds.endExclusiveYmd;
  if (!weekStartYmd || !weekEndYmd) {
    return {
      walkCount: 0,
      mealCount: 0,
      lifeCount: 0,
      recordDays: 0,
      totalRecords: 0,
      upcomingSchedules: 0,
    };
  }
  const seenDays = new Set<string>();

  let walkCount = 0;
  let mealCount = 0;
  let lifeCount = 0;
  let totalRecords = 0;
  let upcomingSchedules = 0;

  for (const record of records) {
    const ymd = getRecordDisplayYmd(record);
    if (!isWithinWeekYmd(ymd, weekStartYmd, weekEndYmd)) continue;

    const recordKind = getWeeklyRecordKind(record);
    if (!recordKind) continue;

    totalRecords += 1;
    seenDays.add(ymd as string);

    if (recordKind === 'walk') walkCount += 1;
    if (recordKind === 'meal') mealCount += 1;
    if (recordKind === 'life') lifeCount += 1;
  }

  for (const schedule of schedules) {
    const ymd = getDateYmdInKst(schedule.startsAt);
    if (!isWithinWeekYmd(ymd, weekStartYmd, weekEndYmd)) continue;
    upcomingSchedules += 1;
  }

  return {
    walkCount,
    mealCount,
    lifeCount,
    recordDays: seenDays.size,
    totalRecords,
    upcomingSchedules,
  };
}

export function buildWeeklySummaryLine(summary: WeeklySummary): string {
  if (summary.totalRecords === 0) return '이번 주 첫 기록을 남겨보세요.';
  if (summary.walkCount > 0 && summary.mealCount > 0) {
    return '규칙적인 산책과 식사로 건강한 한 주를 보냈어요!';
  }
  if (summary.walkCount > 0) return '산책으로 활기찬 한 주를 보냈어요!';
  if (summary.mealCount > 0) return '꾸준한 식사 기록으로 건강한 한 주를 만들었어요!';
  if (summary.lifeCount > 0) return '소중한 생활 기록으로 한 주를 남겼어요.';
  return '이번 주의 기록을 차곡차곡 남겨보세요.';
}

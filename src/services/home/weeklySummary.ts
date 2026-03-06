// 파일: src/services/home/weeklySummary.ts
// 역할:
// - 홈 화면의 "이번 주 요약" 카드 계산
// - 기록/일정 데이터를 한 번만 훑어서 이번 주 핵심 지표를 만든다

import type { MemoryRecord } from '../supabase/memories';
import type { PetSchedule } from '../supabase/schedules';

export type WeeklySummary = {
  walkCount: number;
  mealCount: number;
  healthCount: number;
  recordDays: number;
  totalRecords: number;
  upcomingSchedules: number;
};

function toLocalDate(value: string | null | undefined): Date | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  return start;
}

function endOfWeek(date: Date): Date {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 7);
  return end;
}

function isWithinWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
  return date >= weekStart && date < weekEnd;
}

function hasTag(record: MemoryRecord, keyword: string): boolean {
  return (record.tags ?? []).some(tag => tag === keyword);
}

export function buildWeeklySummary(
  records: MemoryRecord[],
  schedules: PetSchedule[],
  now = new Date(),
): WeeklySummary {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const seenDays = new Set<string>();

  let walkCount = 0;
  let mealCount = 0;
  let healthCount = 0;
  let totalRecords = 0;
  let upcomingSchedules = 0;

  for (const record of records) {
    const date = toLocalDate(record.occurredAt ?? record.createdAt);
    if (!date || !isWithinWeek(date, weekStart, weekEnd)) continue;

    totalRecords += 1;
    seenDays.add(date.toISOString().slice(0, 10));

    if (hasTag(record, 'walk')) walkCount += 1;
    if (hasTag(record, 'meal')) mealCount += 1;
    if (hasTag(record, 'health')) healthCount += 1;
  }

  for (const schedule of schedules) {
    const date = toLocalDate(schedule.startsAt);
    if (!date || !isWithinWeek(date, weekStart, weekEnd)) continue;
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

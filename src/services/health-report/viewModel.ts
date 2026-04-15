import {
  getRecordDisplayYmd,
  getRecordSortTimestamp,
} from '../records/date';
import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
} from '../memories/categoryMeta';
import type { MemoryRecord } from '../supabase/memories';
import type { PetWeightLatestSnapshot, PetWeightLog } from '../supabase/petWeightLogs';
import type { PetSchedule } from '../supabase/schedules';
import { formatScheduleDateLabel } from '../schedules/presentation';
import { getDateYmdInKst } from '../../utils/date';

export type HealthReportTabKey = 'records' | 'weight' | 'report';
export type WeightDeltaDirection = 'up' | 'down' | 'same';

export type HealthActivityItem = {
  id: string;
  source: 'memory' | 'schedule';
  ymd: string;
  title: string;
  subtitle: string;
  kind: 'symptom' | 'hospital' | 'medicine' | 'checkup' | 'vaccine' | 'health';
  iconName: string;
  memoryId?: string;
  scheduleId?: string;
  scheduleStartsAt?: string;
  reminderMinutes?: number[];
  linkedMemoryId?: string | null;
  completedAt?: string | null;
};

export type WeightTimelineItem = PetWeightLog & {
  deltaKg: number | null;
  deltaRate: number | null;
  direction: WeightDeltaDirection;
};

export type WeightSummary = {
  latestWeightKg: number | null;
  latestMeasuredOn: string | null;
  deltaKg: number | null;
  deltaRate: number | null;
  direction: WeightDeltaDirection;
  monthCount: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toDirection(deltaKg: number | null): WeightDeltaDirection {
  if (deltaKg === null) return 'same';
  if (deltaKg > 0) return 'up';
  if (deltaKg < 0) return 'down';
  return 'same';
}

function buildWeightDelta(current: number, previous: number | null) {
  if (previous === null || !Number.isFinite(previous) || previous <= 0) {
    return {
      deltaKg: null,
      deltaRate: null,
      direction: 'same' as const,
    };
  }

  const deltaKg = round2(current - previous);
  const deltaRate = round2((deltaKg / previous) * 100);
  return {
    deltaKg,
    deltaRate,
    direction: toDirection(deltaKg),
  };
}

function buildMemorySubtitle(record: MemoryRecord): string {
  const content = `${record.content ?? ''}`.trim();
  if (content) return content;

  const subKey = normalizeOtherSubKey(readOtherSubCategoryRaw(record));
  if (subKey === 'hospital') return '병원/약 기록';

  return normalizeCategoryKey(readRecordCategoryRaw(record)) === 'health'
    ? '건강 기록'
    : '생활 기록';
}

function mapMemoryKind(record: MemoryRecord): HealthActivityItem['kind'] {
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory = normalizeOtherSubKey(readOtherSubCategoryRaw(record));

  if (mainCategory === 'health') return 'health';
  if (otherSubCategory === 'hospital') return 'hospital';
  return 'symptom';
}

function mapScheduleKind(schedule: PetSchedule): HealthActivityItem['kind'] {
  if (schedule.subCategory === 'hospital') return 'hospital';
  if (schedule.subCategory === 'medicine') return 'medicine';
  if (schedule.subCategory === 'checkup') return 'checkup';
  if (schedule.subCategory === 'vaccine') return 'vaccine';
  return 'health';
}

function mapKindToIcon(kind: HealthActivityItem['kind']): string {
  switch (kind) {
    case 'hospital':
      return 'plus-square';
    case 'medicine':
      return 'droplet';
    case 'checkup':
      return 'clipboard';
    case 'vaccine':
      return 'shield';
    case 'symptom':
      return 'activity';
    case 'health':
    default:
      return 'heart';
  }
}

export function isHealthMemoryRecord(record: MemoryRecord): boolean {
  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory = normalizeOtherSubKey(readOtherSubCategoryRaw(record));
  return mainCategory === 'health' || otherSubCategory === 'hospital';
}

export function isHealthSchedule(schedule: PetSchedule): boolean {
  return (
    schedule.category === 'health' ||
    schedule.subCategory === 'hospital' ||
    schedule.subCategory === 'medicine' ||
    schedule.subCategory === 'checkup' ||
    schedule.subCategory === 'vaccine'
  );
}

export function buildHealthActivityItems(
  records: MemoryRecord[],
  schedules: PetSchedule[],
): HealthActivityItem[] {
  const healthRecords = records.filter(isHealthMemoryRecord);
  const memoryIdSet = new Set(healthRecords.map(record => record.id));
  const items: Array<HealthActivityItem & { sortTimestamp: number }> = [];

  healthRecords.forEach(record => {
    const ymd = getRecordDisplayYmd(record);
    if (!ymd) return;

    const kind = mapMemoryKind(record);
    items.push({
      id: `memory:${record.id}`,
      source: 'memory',
      ymd,
      title: record.title,
      subtitle: buildMemorySubtitle(record),
      kind,
      iconName: mapKindToIcon(kind),
      memoryId: record.id,
      sortTimestamp: getRecordSortTimestamp(record),
    });
  });

  schedules
    .filter(isHealthSchedule)
    .filter(schedule => !schedule.linkedMemoryId || !memoryIdSet.has(schedule.linkedMemoryId))
    .forEach(schedule => {
      const ymd = getDateYmdInKst(schedule.startsAt);
      if (!ymd) return;

      const kind = mapScheduleKind(schedule);
      const sortTimestamp = new Date(schedule.startsAt).getTime();
      items.push({
        id: `schedule:${schedule.id}`,
        source: 'schedule',
        ymd,
        title: schedule.title,
        subtitle: formatScheduleDateLabel(schedule),
        kind,
        iconName: mapKindToIcon(kind),
        scheduleId: schedule.id,
        scheduleStartsAt: schedule.startsAt,
        reminderMinutes: schedule.reminderMinutes,
        linkedMemoryId: schedule.linkedMemoryId,
        completedAt: schedule.completedAt,
        sortTimestamp: Number.isFinite(sortTimestamp) ? sortTimestamp : 0,
      });
    });

  return items
    .sort((lhs, rhs) => {
      if (rhs.sortTimestamp !== lhs.sortTimestamp) {
        return rhs.sortTimestamp - lhs.sortTimestamp;
      }
      return lhs.id.localeCompare(rhs.id);
    })
    .map(({ sortTimestamp: _sortTimestamp, ...item }) => item);
}

export function groupHealthActivitiesByYmd(items: HealthActivityItem[]) {
  return items.reduce<Record<string, HealthActivityItem[]>>((acc, item) => {
    acc[item.ymd] = [...(acc[item.ymd] ?? []), item];
    return acc;
  }, {});
}

export function buildWeightTimelineItems(input: {
  logs: PetWeightLog[];
  previousLog: PetWeightLog | null;
}): WeightTimelineItem[] {
  let previousWeight = input.previousLog?.weightKg ?? null;

  return input.logs.map(log => {
    const delta = buildWeightDelta(log.weightKg, previousWeight);
    previousWeight = log.weightKg;
    return {
      ...log,
      ...delta,
    };
  });
}

export function buildWeightSummary(input: {
  logs: PetWeightLog[];
  previousLog: PetWeightLog | null;
  latestSnapshot: PetWeightLatestSnapshot | null;
  fallbackLatestWeightKg?: number | null;
}): WeightSummary {
  const latestLog = input.logs[input.logs.length - 1] ?? null;
  const latestWeightKg =
    latestLog?.weightKg ??
    input.latestSnapshot?.latestWeightKg ??
    input.fallbackLatestWeightKg ??
    null;
  const latestMeasuredOn =
    latestLog?.measuredOn ?? input.latestSnapshot?.latestMeasuredOn ?? null;

  if (latestLog) {
    const previousWeight =
      input.logs.length >= 2
        ? input.logs[input.logs.length - 2]?.weightKg ?? null
        : input.previousLog?.weightKg ?? null;
    const delta = buildWeightDelta(latestLog.weightKg, previousWeight);

    return {
      latestWeightKg,
      latestMeasuredOn,
      deltaKg: delta.deltaKg,
      deltaRate: delta.deltaRate,
      direction: delta.direction,
      monthCount: input.logs.length,
    };
  }

  return {
    latestWeightKg,
    latestMeasuredOn,
    deltaKg: null,
    deltaRate: null,
    direction: 'same',
    monthCount: 0,
  };
}

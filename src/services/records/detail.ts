import type { MemoryRecord } from '../supabase/memories';
import { isHealthMemoryRecord } from '../health-report/viewModel';
import {
  getMemoryCategoryChipTone,
  getRecordCategoryMeta,
} from '../memories/categoryMeta';
import { addDaysToYmd, formatYmdWithWeekday } from '../../utils/date';
import { formatRecordCreatedTime, getRecordDisplayYmd } from './date';

// Detail accents follow the mockup without recoloring the Timeline filters.
export function getMemoryDetailCategoryTone(record: MemoryRecord) {
  const base = getMemoryCategoryChipTone(record);
  const meta = getRecordCategoryMeta(record);
  if (meta.otherSubCategory === 'grooming') {
    return { ...base, backgroundColor: '#E5F5FE', textColor: '#00799F' };
  }
  if (meta.mainCategory === 'diary') {
    return { ...base, backgroundColor: '#FFEAF2', textColor: '#C83263' };
  }
  return base;
}

export function getMemoryDetailDayBounds(
  record: Pick<MemoryRecord, 'createdAt' | 'occurredAt'>,
) {
  const startYmd = getRecordDisplayYmd(record);
  const endExclusiveYmd = addDaysToYmd(startYmd, 1);
  if (!startYmd || !endExclusiveYmd) return null;
  return {
    startYmd,
    endExclusiveYmd,
    createdAtStartIso: new Date(`${startYmd}T00:00:00+09:00`).toISOString(),
    createdAtEndExclusiveIso: new Date(
      `${endExclusiveYmd}T00:00:00+09:00`,
    ).toISOString(),
  };
}

export function selectSameDayRelatedRecords(
  record: MemoryRecord,
  candidates: readonly MemoryRecord[],
): MemoryRecord[] {
  const day = getRecordDisplayYmd(record);
  if (!day) return [];
  return Array.from(new Map(candidates.map(item => [item.id, item])).values())
    .filter(
      item =>
        item.id !== record.id &&
        item.petId === record.petId &&
        getRecordDisplayYmd(item) === day &&
        !isHealthMemoryRecord(item),
    )
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
}

export function formatMemoryDetailDate(record: MemoryRecord): string {
  return [
    formatYmdWithWeekday(getRecordDisplayYmd(record), { suffix: false }),
    formatRecordCreatedTime(record),
  ]
    .filter(Boolean)
    .join(' · ');
}

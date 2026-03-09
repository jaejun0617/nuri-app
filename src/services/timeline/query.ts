import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../memories/categoryMeta';
import { humanizeMonthKey } from '../../utils/date';
import { getRecordDisplayYmd, getRecordMonthKey } from '../records/date';
import type { MemoryRecord } from '../supabase/memories';

export type TimelineSortMode = 'recent' | 'oldest';

export type TimelineFilterInput = {
  ymFilter: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
  query: string;
  sortMode: TimelineSortMode;
};

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeString(value: string | null | undefined) {
  return `${value ?? ''}`.trim();
}

export function getTimelineRecordYmd(item: MemoryRecord): string {
  return getRecordDisplayYmd(item) ?? '';
}

export function getTimelineMonthKeyFromYmd(ymd: string): string | null {
  return isYmd(ymd) ? ymd.slice(0, 7) : null;
}

export function getTimelineMonthKey(item: MemoryRecord): string | null {
  return getRecordMonthKey(item);
}

export function humanizeTimelineMonthKey(ym: string) {
  return humanizeMonthKey(ym);
}

export function normalizeTimelineQuery(value: string) {
  return normalizeString(value).toLowerCase();
}

export function compareTimelineRecords(a: MemoryRecord, b: MemoryRecord) {
  const aYmd = getTimelineRecordYmd(a);
  const bYmd = getTimelineRecordYmd(b);

  if (aYmd !== bYmd) return aYmd < bYmd ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function dedupeTimelineRecords(items: ReadonlyArray<MemoryRecord>) {
  const seen = new Set<string>();
  const next: MemoryRecord[] = [];

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }

  return next;
}

export function timelineRecordMatchesQuery(record: MemoryRecord, query: string) {
  if (!query) return true;
  const normalizedQuery = normalizeTimelineQuery(query);
  if (!normalizedQuery) return true;

  const title = normalizeString(record.title).toLowerCase();
  const tags = Array.isArray(record.tags)
    ? record.tags
        .map(tag => normalizeString(tag).toLowerCase())
        .filter(Boolean)
        .join(' ')
    : '';

  return title.includes(normalizedQuery) || tags.includes(normalizedQuery);
}

export function timelineRecordMatchesFilters(
  record: MemoryRecord,
  filters: Omit<TimelineFilterInput, 'sortMode'>,
) {
  if (filters.ymFilter && getTimelineMonthKey(record) !== filters.ymFilter) {
    return false;
  }

  if (filters.mainCategory !== 'all') {
    const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
    if (filters.mainCategory !== 'other') {
      if (mainCategory !== filters.mainCategory) return false;
    } else {
      if (mainCategory !== 'other') return false;
      if (filters.otherSubCategory) {
        const subCategory = normalizeOtherSubKey(readOtherSubCategoryRaw(record));
        if (subCategory !== filters.otherSubCategory) return false;
      }
    }
  }

  return timelineRecordMatchesQuery(record, filters.query);
}

export function buildTimelineView(input: {
  items: ReadonlyArray<MemoryRecord>;
  filters: TimelineFilterInput;
}) {
  const baseItems = dedupeTimelineRecords(input.items);
  const availableMonthKeys = Array.from(
    new Set(
      baseItems
        .map(getTimelineMonthKey)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const filteredItems = baseItems.filter(record =>
    timelineRecordMatchesFilters(record, input.filters),
  );

  filteredItems.sort(compareTimelineRecords);
  if (input.filters.sortMode === 'oldest') {
    filteredItems.reverse();
  }

  const firstIndexByMonth = new Map<string, number>();
  filteredItems.forEach((record, index) => {
    const monthKey = getTimelineMonthKey(record);
    if (!monthKey || firstIndexByMonth.has(monthKey)) return;
    firstIndexByMonth.set(monthKey, index);
  });

  return {
    baseItems,
    availableMonthKeys,
    filteredItems,
    firstIndexByMonth,
  };
}

export function shouldAutoLoadMoreTimeline(input: {
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'loadingMore' | 'error';
  hasMore: boolean;
  query: string;
  pendingJumpMonth: string | null;
  ymFilter: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
}) {
  if (input.status !== 'ready') return false;
  if (!input.hasMore) return false;
  if (normalizeTimelineQuery(input.query)) return false;
  if (input.pendingJumpMonth) return false;
  if (input.ymFilter) return false;
  if (input.mainCategory !== 'all') return false;
  if (input.otherSubCategory) return false;
  return true;
}

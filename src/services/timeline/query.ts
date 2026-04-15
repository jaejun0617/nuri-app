import {
  normalizeCategoryKey,
  normalizeOtherSubKey,
  readOtherSubCategoryRaw,
  readRecordCategoryRaw,
  type MemoryMainCategory,
  type MemoryOtherSubCategory,
} from '../memories/categoryMeta';
import { isHealthMemoryRecord } from '../health-report/viewModel';
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

type TimelineRecordMeta = {
  signature: string;
  monthKey: string | null;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
  queryText: string;
};

const timelineRecordMetaCache = new Map<string, TimelineRecordMeta>();

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

function buildTimelineRecordSignature(record: MemoryRecord) {
  return [
    record.createdAt ?? '',
    getTimelineRecordYmd(record),
    normalizeString(record.title),
    Array.isArray(record.tags) ? record.tags.join('|') : '',
    readRecordCategoryRaw(record) ?? '',
    readOtherSubCategoryRaw(record) ?? '',
  ].join('::');
}

function getTimelineRecordMeta(record: MemoryRecord): TimelineRecordMeta {
  const signature = buildTimelineRecordSignature(record);
  const cached = timelineRecordMetaCache.get(record.id);
  if (cached && cached.signature === signature) {
    return cached;
  }

  const mainCategory = normalizeCategoryKey(readRecordCategoryRaw(record));
  const otherSubCategory =
    mainCategory === 'other'
      ? normalizeOtherSubKey(readOtherSubCategoryRaw(record))
      : null;
  const queryText = [
    normalizeString(record.title),
    Array.isArray(record.tags) ? record.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const next: TimelineRecordMeta = {
    signature,
    monthKey: getTimelineMonthKey(record),
    mainCategory,
    otherSubCategory,
    queryText,
  };
  timelineRecordMetaCache.set(record.id, next);
  return next;
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

  return getTimelineRecordMeta(record).queryText.includes(normalizedQuery);
}

export function timelineRecordMatchesFilters(
  record: MemoryRecord,
  filters: Omit<TimelineFilterInput, 'sortMode'>,
) {
  const meta = getTimelineRecordMeta(record);

  if (filters.ymFilter && meta.monthKey !== filters.ymFilter) {
    return false;
  }

  if (filters.mainCategory !== 'all') {
    if (filters.mainCategory !== 'other') {
      if (meta.mainCategory !== filters.mainCategory) return false;
    } else {
      if (meta.mainCategory !== 'other') return false;
      if (filters.otherSubCategory) {
        if (meta.otherSubCategory !== filters.otherSubCategory) return false;
      }
    }
  }

  if (!filters.query) return true;
  return meta.queryText.includes(filters.query);
}

export function buildTimelineView(input:
  | {
      ids: ReadonlyArray<string>;
      recordsById: Readonly<Record<string, MemoryRecord>>;
      filters: TimelineFilterInput;
    }
  | {
      items: ReadonlyArray<MemoryRecord>;
      filters: TimelineFilterInput;
    },
) {
  const recordsById =
    'recordsById' in input
      ? input.recordsById
      : Object.fromEntries(input.items.map(item => [item.id, item]));
  const ids =
    'ids' in input ? input.ids : dedupeTimelineRecords(input.items).map(item => item.id);
  const availableMonthKeys: string[] = [];
  const seenMonthKeys = new Set<string>();
  const filteredIds: string[] = [];
  const firstIndexByMonth = new Map<string, number>();
  const normalizedQuery = normalizeTimelineQuery(input.filters.query);
  const filtersWithoutSort = {
    ...input.filters,
    query: normalizedQuery,
  };

  for (const id of ids) {
    const record = recordsById[id];
    if (!record) continue;
    if (isHealthMemoryRecord(record)) continue;

    const meta = getTimelineRecordMeta(record);
    if (meta.monthKey && !seenMonthKeys.has(meta.monthKey)) {
      seenMonthKeys.add(meta.monthKey);
      availableMonthKeys.push(meta.monthKey);
    }

    if (!timelineRecordMatchesFilters(record, filtersWithoutSort)) {
      continue;
    }

    filteredIds.push(id);
  }

  if (input.filters.sortMode === 'oldest') {
    filteredIds.reverse();
  }

  filteredIds.forEach((id, index) => {
    const monthKey = recordsById[id]
      ? getTimelineRecordMeta(recordsById[id]).monthKey
      : null;
    if (!monthKey || firstIndexByMonth.has(monthKey)) return;
    firstIndexByMonth.set(monthKey, index);
  });

  const baseItems = ids
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item))
    .filter(item => !isHealthMemoryRecord(item));
  const filteredItems = filteredIds
    .map(id => recordsById[id])
    .filter((item): item is MemoryRecord => Boolean(item));

  return {
    baseItems,
    availableMonthKeys,
    filteredItems,
    filteredIds,
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

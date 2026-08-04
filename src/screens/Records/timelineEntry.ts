import type {
  MemoryMainCategory,
  MemoryOtherSubCategory,
} from '../../services/memories/categoryMeta';

export const HOME_TOTAL_SUMMARY_ENTRY_SOURCE = 'home-total-summary' as const;

export type HomeTotalSummaryEntryRequest = {
  entryRequestId: number;
  entrySource: typeof HOME_TOTAL_SUMMARY_ENTRY_SOURCE;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
};

export type TimelineEntryStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

export function createTimelineEntryRequestId(
  previousRequestId: number,
  now = Date.now(),
): number {
  const timestampRequestId = now * 1000 + 1;
  return Math.max(timestampRequestId, previousRequestId + 1);
}

export function isTimelineEntryPending(
  entrySource: string | undefined,
  entryRequestId: number | null,
  appliedEntryRequestId: number | null,
): boolean {
  return (
    entrySource === HOME_TOTAL_SUMMARY_ENTRY_SOURCE &&
    entryRequestId !== null &&
    entryRequestId !== appliedEntryRequestId
  );
}

export function shouldShowTimelineEntryLoading({
  isEntryPending,
  status,
}: {
  isEntryPending: boolean;
  status: TimelineEntryStatus;
}): boolean {
  return isEntryPending || status === 'idle' || status === 'loading';
}

export function shouldShowTimelineEmpty({
  isEntryPending,
  status,
  filteredCount,
}: {
  isEntryPending: boolean;
  status: TimelineEntryStatus;
  filteredCount: number;
}): boolean {
  return !isEntryPending && status === 'ready' && filteredCount === 0;
}

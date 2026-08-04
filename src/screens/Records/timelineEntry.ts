import type {
  MemoryMainCategory,
  MemoryOtherSubCategory,
} from '../../services/memories/categoryMeta';

export const HOME_TOTAL_SUMMARY_ENTRY_SOURCE = 'home-total-summary' as const;

export type HomeTotalSummaryEntryRequest = Readonly<{
  entryRequestId: number;
  entrySource: typeof HOME_TOTAL_SUMMARY_ENTRY_SOURCE;
  petId: string;
  mainCategory: MemoryMainCategory;
  otherSubCategory: MemoryOtherSubCategory | null;
  ymFilter: string | null;
  createdAt: number;
}>;

export type TimelineEntrySnapshot = Readonly<{
  request: HomeTotalSummaryEntryRequest;
  generation: number;
}>;

let latestTimelineEntrySnapshot: TimelineEntrySnapshot | null = null;
let timelineEntryGeneration = 0;

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

/**
 * Home 요약 진입을 네비게이션보다 먼저 발행한다.
 * Gate가 이전 Timeline route보다 최신 요청을 판별할 수 있도록 작은 takeLatest 경계를 둔다.
 */
export function publishTimelineEntryRequest(
  request: HomeTotalSummaryEntryRequest,
): TimelineEntrySnapshot {
  timelineEntryGeneration += 1;

  const immutableRequest = Object.freeze({ ...request });
  const snapshot = Object.freeze({
    request: immutableRequest,
    generation: timelineEntryGeneration,
  });

  latestTimelineEntrySnapshot = snapshot;
  return snapshot;
}

export function getLatestTimelineEntrySnapshot(): TimelineEntrySnapshot | null {
  return latestTimelineEntrySnapshot;
}

export function isLatestTimelineEntrySnapshot(
  snapshot: TimelineEntrySnapshot,
): boolean {
  return (
    latestTimelineEntrySnapshot?.generation === snapshot.generation &&
    latestTimelineEntrySnapshot.request.entryRequestId ===
      snapshot.request.entryRequestId
  );
}

export function isLatestTimelineEntryRequest(entryRequestId: number): boolean {
  return latestTimelineEntrySnapshot?.request.entryRequestId === entryRequestId;
}

export function isLatestTimelineEntryGeneration(
  entryRequestId: number,
  generation: number,
): boolean {
  return (
    latestTimelineEntrySnapshot?.request.entryRequestId === entryRequestId &&
    latestTimelineEntrySnapshot.generation === generation
  );
}

export function invalidateTimelineEntryRequest(entryRequestId: number): void {
  if (
    latestTimelineEntrySnapshot?.request.entryRequestId === entryRequestId
  ) {
    latestTimelineEntrySnapshot = null;
  }
}

export function resetTimelineEntryControllerForTests(): void {
  latestTimelineEntrySnapshot = null;
  timelineEntryGeneration = 0;
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

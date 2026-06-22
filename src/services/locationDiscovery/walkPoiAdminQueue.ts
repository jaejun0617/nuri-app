// 파일: src/services/locationDiscovery/walkPoiAdminQueue.ts
// 파일 목적:
// - 산책 POI admin summary 응답을 운영 화면의 queue filter와 batch drill-down 모델로 정리한다.
// 어디서 쓰이는지:
// - WalkPoiAdminReadOnlyScreen의 status filter, batch selector, batch summary 표시에서 사용된다.
// 핵심 역할:
// - 서버 RPC 계약을 바꾸지 않고 최근 import batch와 review queue를 클라이언트에서 안전하게 필터링한다.
import type {
  WalkPoiAdminImportBatch,
  WalkPoiAdminReviewQueueItem,
} from './walkPoiAdmin';

export type WalkPoiAdminQueueStatusFilter =
  | 'all'
  | WalkPoiAdminReviewQueueItem['reviewStatus'];

export type WalkPoiAdminBatchFilterOption = {
  id: string | null;
  label: string;
  helper: string;
};

export type WalkPoiAdminBatchDrillDownSummary = {
  batchCount: number;
  requestedCount: number;
  createdCount: number;
  duplicateCount: number;
  conflictCount: number;
  skippedCount: number;
  reviewCount: number;
  importStatusCounts: Record<string, number>;
};

export type WalkPoiAdminQueueStatusCounts = Record<
  WalkPoiAdminQueueStatusFilter,
  number
>;

const EMPTY_BATCH_SUMMARY: WalkPoiAdminBatchDrillDownSummary = {
  batchCount: 0,
  requestedCount: 0,
  createdCount: 0,
  duplicateCount: 0,
  conflictCount: 0,
  skippedCount: 0,
  reviewCount: 0,
  importStatusCounts: {},
};

export function filterWalkPoiAdminReviewQueue(
  items: ReadonlyArray<WalkPoiAdminReviewQueueItem>,
  statusFilter: WalkPoiAdminQueueStatusFilter,
): WalkPoiAdminReviewQueueItem[] {
  if (statusFilter === 'all') {
    return [...items];
  }

  return items.filter(item => item.reviewStatus === statusFilter);
}

export function getWalkPoiAdminQueueStatusCounts(
  items: ReadonlyArray<WalkPoiAdminReviewQueueItem>,
): WalkPoiAdminQueueStatusCounts {
  return items.reduce<WalkPoiAdminQueueStatusCounts>(
    (counts, item) => ({
      ...counts,
      all: counts.all + 1,
      [item.reviewStatus]: counts[item.reviewStatus] + 1,
    }),
    {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      held: 0,
    },
  );
}

export function filterWalkPoiAdminImportBatches(
  batches: ReadonlyArray<WalkPoiAdminImportBatch>,
  selectedBatchId: string | null,
): WalkPoiAdminImportBatch[] {
  if (!selectedBatchId) {
    return [...batches];
  }

  return batches.filter(batch => batch.id === selectedBatchId);
}

export function getWalkPoiAdminBatchFilterOptions(
  batches: ReadonlyArray<WalkPoiAdminImportBatch>,
): WalkPoiAdminBatchFilterOption[] {
  const batchOptions = batches.map(batch => ({
    id: batch.id,
    label: batch.sourceName ?? batch.id.slice(0, 8),
    helper: `${batch.sourceProvider} · ${batch.importStatus}`,
  }));

  return [
    {
      id: null,
      label: '전체 batch',
      helper: `${batches.length.toLocaleString('ko-KR')}개 batch`,
    },
    ...batchOptions,
  ];
}

export function summarizeWalkPoiAdminBatches(
  batches: ReadonlyArray<WalkPoiAdminImportBatch>,
): WalkPoiAdminBatchDrillDownSummary {
  if (batches.length === 0) {
    return EMPTY_BATCH_SUMMARY;
  }

  return batches.reduce<WalkPoiAdminBatchDrillDownSummary>(
    (summary, batch) => ({
      batchCount: summary.batchCount + 1,
      requestedCount:
        summary.requestedCount + batch.summary.requestedCount,
      createdCount: summary.createdCount + batch.summary.createdCount,
      duplicateCount:
        summary.duplicateCount + batch.summary.duplicateCount,
      conflictCount: summary.conflictCount + batch.summary.conflictCount,
      skippedCount: summary.skippedCount + batch.summary.skippedCount,
      reviewCount: summary.reviewCount + batch.summary.reviewCount,
      importStatusCounts: {
        ...summary.importStatusCounts,
        [batch.importStatus]:
          (summary.importStatusCounts[batch.importStatus] ?? 0) + 1,
      },
    }),
    EMPTY_BATCH_SUMMARY,
  );
}

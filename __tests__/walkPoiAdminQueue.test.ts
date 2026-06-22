import type {
  WalkPoiAdminImportBatch,
  WalkPoiAdminReviewQueueItem,
} from '../src/services/locationDiscovery/walkPoiAdmin';
import {
  filterWalkPoiAdminImportBatches,
  filterWalkPoiAdminReviewQueue,
  getWalkPoiAdminBatchFilterOptions,
  getWalkPoiAdminQueueStatusCounts,
  summarizeWalkPoiAdminBatches,
} from '../src/services/locationDiscovery/walkPoiAdminQueue';

function createQueueItem(
  id: string,
  reviewStatus: WalkPoiAdminReviewQueueItem['reviewStatus'],
): WalkPoiAdminReviewQueueItem {
  return {
    walkPoiId: id,
    name: `산책 POI ${id}`,
    categoryLabel: '산책 장소',
    address: '서울특별시 강남구',
    reviewStatus,
    visibilityStatus: reviewStatus === 'approved' ? 'public' : 'hidden',
    lifecycleStatus: reviewStatus === 'approved' ? 'active' : 'draft',
    sourceProvider: 'nuri_seed',
    externalSourceId: `external:${id}`,
    createdAt: null,
    reviewedAt: null,
    reviewNote: null,
  };
}

function createBatch(
  id: string,
  importStatus: string,
  requestedCount: number,
  createdCount: number,
): WalkPoiAdminImportBatch {
  return {
    id,
    sourceProvider: 'nuri_seed',
    importMode: 'insert_review',
    importStatus,
    sourceName: `전국 seed ${id}`,
    summary: {
      requestedCount,
      createdCount,
      duplicateCount: 2,
      conflictCount: 1,
      skippedCount: 0,
      reviewCount: createdCount,
    },
    createdAt: null,
    finishedAt: null,
  };
}

describe('walk POI admin queue helpers', () => {
  it('review queue를 status별로 필터링하고 count를 계산한다', () => {
    const queue = [
      createQueueItem('pending-1', 'pending'),
      createQueueItem('approved-1', 'approved'),
      createQueueItem('rejected-1', 'rejected'),
      createQueueItem('held-1', 'held'),
      createQueueItem('pending-2', 'pending'),
    ];

    expect(filterWalkPoiAdminReviewQueue(queue, 'pending')).toHaveLength(2);
    expect(filterWalkPoiAdminReviewQueue(queue, 'all')).toHaveLength(5);
    expect(getWalkPoiAdminQueueStatusCounts(queue)).toEqual({
      all: 5,
      pending: 2,
      approved: 1,
      rejected: 1,
      held: 1,
    });
  });

  it('batch selector와 drill-down summary를 최근 batch 응답만으로 계산한다', () => {
    const batches = [
      createBatch('batch-a', 'committed', 40, 36),
      createBatch('batch-b', 'committed', 30, 28),
      createBatch('batch-c', 'failed', 20, 0),
    ];

    const selected = filterWalkPoiAdminImportBatches(batches, 'batch-b');
    const summary = summarizeWalkPoiAdminBatches(selected);
    const options = getWalkPoiAdminBatchFilterOptions(batches);

    expect(selected).toHaveLength(1);
    expect(summary).toMatchObject({
      batchCount: 1,
      requestedCount: 30,
      createdCount: 28,
      duplicateCount: 2,
      conflictCount: 1,
      reviewCount: 28,
    });
    expect(summary.importStatusCounts).toEqual({ committed: 1 });
    expect(options.map(option => option.id)).toEqual([
      null,
      'batch-a',
      'batch-b',
      'batch-c',
    ]);
  });
});

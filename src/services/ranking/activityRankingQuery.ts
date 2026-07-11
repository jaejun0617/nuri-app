// 파일: src/services/ranking/activityRankingQuery.ts
// 역할:
// - 누리 랭킹 화면의 React Query key/cache 정책을 한 곳에 모아 탭별 cache와 stale 정책을 안정화한다.

import type { ActivityRankingCategoryKey } from './activityRanking';

export const ACTIVITY_RANKING_QUERY_STALE_TIME_MS = 60 * 1000;
export const ACTIVITY_RANKING_QUERY_GC_TIME_MS = 10 * 60 * 1000;

export function buildActivityRankingQueryKey(input: {
  category: ActivityRankingCategoryKey;
  includeQaFixture: boolean;
}) {
  return [
    'activity-ranking',
    input.category,
    input.includeQaFixture ? 'qa-fixture' : 'public',
  ] as const;
}


import {
  ACTIVITY_RANKING_QUERY_GC_TIME_MS,
  ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
  buildActivityRankingQueryKey,
} from '../src/services/ranking/activityRankingQuery';

describe('activity ranking React Query policy', () => {
  it('탭별 ranking cache key를 분리한다', () => {
    expect(
      buildActivityRankingQueryKey({
        category: 'overall',
        includeQaFixture: true,
      }),
    ).toEqual(['activity-ranking', 'overall', 'qa-fixture']);

    expect(
      buildActivityRankingQueryKey({
        category: 'comments',
        includeQaFixture: true,
      }),
    ).toEqual(['activity-ranking', 'comments', 'qa-fixture']);

    expect(
      buildActivityRankingQueryKey({
        category: 'comments',
        includeQaFixture: false,
      }),
    ).toEqual(['activity-ranking', 'comments', 'public']);
  });

  it('랭킹 화면은 짧은 staleTime과 충분한 gcTime으로 탭 전환 cache를 유지한다', () => {
    expect(ACTIVITY_RANKING_QUERY_STALE_TIME_MS).toBeGreaterThanOrEqual(30_000);
    expect(ACTIVITY_RANKING_QUERY_GC_TIME_MS).toBeGreaterThan(
      ACTIVITY_RANKING_QUERY_STALE_TIME_MS,
    );
  });
});


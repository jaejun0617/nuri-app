import {
  createCommunityRouteStateSnapshot,
  parseCommunityRouteStateSnapshot,
} from '../src/navigation/communityRouteState';

function makeListSnapshot() {
  return {
    activeFilter: 'popular' as const,
    activeCategory: 'all' as const,
    pageSize: 100 as const,
    currentPage: 2,
    cursor: 'cursor-next-page',
    hasMore: true,
    hasNextPage: true,
    hasPreviousPage: true,
    cursorHistory: {
      1: null,
      2: 'cursor-page-2',
    },
  };
}

describe('community route state snapshot', () => {
  it('round-trips the community route and list query state', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: {
        name: 'CommunityDetail',
        params: { postId: 'post-1', commentId: 'comment-1' },
      },
      list: makeListSnapshot(),
      savedAt: 1_000,
    });

    expect(snapshot).not.toBeNull();
    expect(parseCommunityRouteStateSnapshot(snapshot, 'user-1', 1_000)).toEqual(
      snapshot,
    );
  });

  it('rejects an unsupported version', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: { name: 'CommunityTabList' },
      list: makeListSnapshot(),
      savedAt: 1_000,
    });

    expect(
      parseCommunityRouteStateSnapshot(
        { ...snapshot, version: 999 },
        'user-1',
        1_000,
      ),
    ).toBeNull();
  });

  it('rejects a snapshot belonging to another user', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: { name: 'CommunityTabList' },
      list: makeListSnapshot(),
      savedAt: 1_000,
    });

    expect(
      parseCommunityRouteStateSnapshot(snapshot, 'user-2', 1_000),
    ).toBeNull();
  });

  it('rejects an expired snapshot and an incomplete cursor history', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: { name: 'CommunityTabList' },
      list: makeListSnapshot(),
      savedAt: 1_000,
    });

    expect(
      parseCommunityRouteStateSnapshot(snapshot, 'user-1', 1_000 + 86_400_001),
    ).toBeNull();

    expect(
      parseCommunityRouteStateSnapshot(
        {
          ...snapshot,
          list: {
            ...makeListSnapshot(),
            cursorHistory: { 1: null },
          },
        },
        'user-1',
        1_000,
      ),
    ).toBeNull();
  });

  it('normalizes missing or unsupported categories and notice categories', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: { name: 'CommunityTabList' },
      list: {
        ...makeListSnapshot(),
        activeFilter: 'notice',
        activeCategory: 'question',
      },
      savedAt: 1_000,
    });

    expect(snapshot?.list.activeCategory).toBe('all');
    expect(
      parseCommunityRouteStateSnapshot(
        {
          ...snapshot,
          list: { ...snapshot?.list, activeCategory: 'unsupported' },
        },
        'user-1',
        1_000,
      )?.list.activeCategory,
    ).toBe('all');
  });

  it('round-trips popular plus info without normalizing the valid combination', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: { name: 'CommunityTabList' },
      list: {
        ...makeListSnapshot(),
        activeFilter: 'popular',
        activeCategory: 'info',
      },
      savedAt: 1_000,
    });

    expect(snapshot?.list.activeFilter).toBe('popular');
    expect(snapshot?.list.activeCategory).toBe('info');
  });

  it('whitelists detail params and never serializes unrelated route data', () => {
    const snapshot = createCommunityRouteStateSnapshot({
      userId: 'user-1',
      route: {
        name: 'CommunityDetail',
        params: {
          postId: 'post-1',
          access_token: 'ignored',
          refresh_token: 'ignored',
        },
      },
      list: makeListSnapshot(),
      savedAt: 1_000,
    });

    expect(JSON.stringify(snapshot)).not.toContain('access_token');
    expect(JSON.stringify(snapshot)).not.toContain('refresh_token');
  });
});

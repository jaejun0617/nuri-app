import { supabase } from '../src/services/supabase/client';
import {
  HOME_COMMUNITY_CACHE_KEYS,
  HOME_COMMUNITY_HIGHLIGHTS_LIMIT,
  clearHomeCommunityHighlightsCache,
  encodeHomeCommunityHighlightsCursor,
  fetchHomeCommunityHighlights,
  fetchHomeCommunityHighlightsPage,
} from '../src/services/home/communityHighlights';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const mockedRpc = supabase.rpc as jest.Mock;

function makeRawItem(
  id: string,
  likeCount: number,
  category: string,
  createdAt: string,
) {
  return {
    id,
    user_id: `author-${id}`,
    pet_id: null,
    content: `게시글 내용 ${id}`,
    title: `게시글 ${id}`,
    image_url: null,
    image_urls: [],
    status: 'active',
    category,
    like_count: likeCount,
    comment_count: 0,
    view_count: 0,
    is_notice: false,
    notice_published_at: null,
    deleted_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    author_snapshot_nickname: 'QA 사용자',
    author_snapshot_avatar_url: null,
    pet_snapshot_name: null,
    pet_snapshot_species: null,
    pet_snapshot_breed: null,
    pet_snapshot_age_label: null,
    pet_snapshot_avatar_path: null,
    show_pet_age: true,
  };
}

function makeResponse(
  category: string,
  items: unknown[] = [],
  nextCursor: unknown = null,
) {
  return {
    data: {
      scope: 'home_highlights',
      items,
      hasMore: nextCursor !== null,
      nextCursor,
      pageSize: HOME_COMMUNITY_HIGHLIGHTS_LIMIT,
      category,
      cursorVersion: 1,
    },
    error: null,
  };
}

const cursor = {
  version: 1 as const,
  category: 'info' as const,
  pageSize: 3 as const,
  likeCount: 8,
  createdAt: '2026-08-17T00:00:00.000Z',
  id: 'post-cursor',
};

describe('home community highlights service adapter', () => {
  beforeEach(() => {
    clearHomeCommunityHighlightsCache();
    mockedRpc.mockReset();
  });

  it.each([
    ['popular', 'all'],
    ['question', 'question'],
    ['info', 'info'],
    ['daily', 'daily'],
    ['free', 'free'],
  ] as const)('%s maps to the threshold-free Home RPC category', async (tab, category) => {
    mockedRpc.mockResolvedValueOnce(
      makeResponse(category, [
        makeRawItem('high', 42, category === 'all' ? 'question' : category, '2026-08-17T00:02:00.000Z'),
        makeRawItem('zero', 0, category === 'all' ? 'info' : category, '2026-08-17T00:01:00.000Z'),
        makeRawItem('low', 3, category === 'all' ? 'daily' : category, '2026-08-17T00:00:00.000Z'),
      ]),
    );

    const result = await fetchHomeCommunityHighlights(tab);

    expect(mockedRpc).toHaveBeenCalledWith('community_home_highlights_v1', {
      p_category: category,
      p_limit: 3,
      p_cursor: null,
    });
    expect(result.map(post => post.id)).toEqual(['high', 'zero', 'low']);
    expect(result[1]?.likeCount).toBe(0);
    expect(mockedRpc.mock.calls.every(call => call[0] !== 'community_list_posts_v3')).toBe(true);
  });

  it('keeps all-zero server ordering unchanged', async () => {
    mockedRpc.mockResolvedValueOnce(
      makeResponse('all', [
        makeRawItem('newest', 0, 'question', '2026-08-17T00:02:00.000Z'),
        makeRawItem('older', 0, 'info', '2026-08-17T00:01:00.000Z'),
      ]),
    );

    const result = await fetchHomeCommunityHighlights('popular');

    expect(result.map(post => post.id)).toEqual(['newest', 'older']);
  });

  it('passes and returns an isolated Home cursor v1', async () => {
    mockedRpc.mockResolvedValueOnce(
      makeResponse('info', [makeRawItem('next', 4, 'info', '2026-08-17T00:00:00.000Z')], cursor),
    );

    const result = await fetchHomeCommunityHighlightsPage('info', cursor);

    expect(mockedRpc).toHaveBeenCalledWith('community_home_highlights_v1', {
      p_category: 'info',
      p_limit: 3,
      p_cursor: cursor,
    });
    expect(result.nextCursor).toEqual(cursor);
    expect(result.hasMore).toBe(true);
  });

  it('restarts from page one when a cursor belongs to another category', async () => {
    const mixedCursor = { ...cursor, category: 'question' as const };
    mockedRpc.mockResolvedValueOnce(makeResponse('info'));

    await fetchHomeCommunityHighlightsPage('info', mixedCursor);

    expect(mockedRpc).toHaveBeenCalledWith('community_home_highlights_v1', {
      p_category: 'info',
      p_limit: 3,
      p_cursor: null,
    });
  });

  it('retries once with page one for a stale server cursor', async () => {
    mockedRpc
      .mockResolvedValueOnce({ data: null, error: { code: 'community_cursor_invalid' } })
      .mockResolvedValueOnce(makeResponse('info'));

    await fetchHomeCommunityHighlightsPage('info', cursor);

    expect(mockedRpc).toHaveBeenNthCalledWith(1, 'community_home_highlights_v1', {
      p_category: 'info',
      p_limit: 3,
      p_cursor: cursor,
    });
    expect(mockedRpc).toHaveBeenNthCalledWith(2, 'community_home_highlights_v1', {
      p_category: 'info',
      p_limit: 3,
      p_cursor: null,
    });
  });

  it('rejects unsupported cursor versions locally to the first page', async () => {
    mockedRpc.mockResolvedValueOnce(makeResponse('info'));

    await fetchHomeCommunityHighlightsPage('info', { ...cursor, version: 2 });

    expect(mockedRpc).toHaveBeenCalledWith('community_home_highlights_v1', {
      p_category: 'info',
      p_limit: 3,
      p_cursor: null,
    });
    expect(encodeHomeCommunityHighlightsCursor({ ...cursor, version: 2 }, 'info')).toBeNull();
  });

  it('keeps category cache keys separate', async () => {
    mockedRpc
      .mockResolvedValueOnce(makeResponse('all', [makeRawItem('popular', 1, 'question', '2026-08-17T00:00:00.000Z')]))
      .mockResolvedValueOnce(makeResponse('question', [makeRawItem('question', 0, 'question', '2026-08-17T00:00:00.000Z')]));

    await fetchHomeCommunityHighlights('popular');
    await fetchHomeCommunityHighlights('question');

    expect(mockedRpc).toHaveBeenCalledTimes(2);
    expect(HOME_COMMUNITY_CACHE_KEYS.popular).toBe('home-community:popular:all');
    expect(HOME_COMMUNITY_CACHE_KEYS.question).toBe('home-community:popular:question');
  });

  it('deduplicates in-flight requests and serves the fresh cache', async () => {
    let resolveRequest!: (value: ReturnType<typeof makeResponse>) => void;
    const pending = new Promise<ReturnType<typeof makeResponse>>(resolve => {
      resolveRequest = resolve;
    });
    mockedRpc.mockReturnValueOnce(pending);

    const first = fetchHomeCommunityHighlights('popular');
    const second = fetchHomeCommunityHighlights('popular');
    resolveRequest(makeResponse('all', [makeRawItem('cached', 0, 'question', '2026-08-17T00:00:00.000Z')]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      [expect.objectContaining({ id: 'cached', likeCount: 0 })],
      [expect.objectContaining({ id: 'cached', likeCount: 0 })],
    ]);
    await fetchHomeCommunityHighlights('popular');

    expect(mockedRpc).toHaveBeenCalledTimes(1);
  });

  it('does not let a cleared stale response repopulate the cache', async () => {
    let resolveOldRequest!: (value: ReturnType<typeof makeResponse>) => void;
    const oldRequest = new Promise<ReturnType<typeof makeResponse>>(resolve => {
      resolveOldRequest = resolve;
    });
    mockedRpc
      .mockReturnValueOnce(oldRequest)
      .mockResolvedValueOnce(makeResponse('all', [makeRawItem('fresh', 0, 'question', '2026-08-17T00:00:00.000Z')]));

    const stale = fetchHomeCommunityHighlights('popular');
    clearHomeCommunityHighlightsCache();
    resolveOldRequest(makeResponse('all', [makeRawItem('stale', 0, 'question', '2026-08-17T00:00:00.000Z')]));
    await stale;

    const fresh = await fetchHomeCommunityHighlights('popular');

    expect(fresh.map(post => post.id)).toEqual(['fresh']);
    expect(mockedRpc).toHaveBeenCalledTimes(2);
  });

  it('preserves empty and error results for the caller retry path', async () => {
    mockedRpc
      .mockResolvedValueOnce(makeResponse('all'))
      .mockRejectedValueOnce(new Error('home_highlights_network_error'))
      .mockResolvedValueOnce(makeResponse('all', [makeRawItem('retry', 0, 'question', '2026-08-17T00:00:00.000Z')]));

    await expect(fetchHomeCommunityHighlights('popular')).resolves.toEqual([]);
    await expect(fetchHomeCommunityHighlights('popular', { force: true })).rejects.toThrow('home_highlights_network_error');
    await expect(fetchHomeCommunityHighlights('popular', { force: true })).resolves.toEqual([
      expect.objectContaining({ id: 'retry' }),
    ]);
  });
});

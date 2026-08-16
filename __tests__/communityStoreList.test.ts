import type {
  CommunityListFilter,
  CommunityPageSize,
  CommunityPost,
} from '../src/types/community';
import { fetchCommunityPosts } from '../src/services/supabase/community';
import { useCommunityStore } from '../src/store/communityStore';

jest.mock('../src/services/supabase/community', () => ({
  ...jest.requireActual('../src/services/supabase/community'),
  fetchCommunityPosts: jest.fn(),
}));

const mockedFetchCommunityPosts = fetchCommunityPosts as jest.MockedFunction<
  typeof fetchCommunityPosts
>;
type CommunityPostsResult = Awaited<ReturnType<typeof fetchCommunityPosts>>;
type CommunityPostsResolver = (value: CommunityPostsResult) => void;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function makePost(
  id: string,
  overrides: Partial<CommunityPost> = {},
): CommunityPost {
  return {
    id,
    authorId: `author-${id}`,
    authorNickname: 'QA 사용자',
    authorAvatarUrl: null,
    petId: null,
    petName: null,
    petBreed: null,
    petSpecies: null,
    petAgeLabel: null,
    petAvatarUrl: null,
    showPetAge: true,
    title: id,
    content: id,
    imagePath: null,
    imageUrl: null,
    imagePaths: [],
    imageUrls: [],
    hasImage: false,
    status: 'active',
    category: 'question',
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    isNotice: false,
    noticePublishedAt: null,
    isLikedByMe: false,
    deletedAt: null,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeCursor(
  filter: CommunityListFilter,
  pageSize: CommunityPageSize,
  id: string,
) {
  return JSON.stringify({
    version: 3,
    filter,
    category: 'all',
    pageSize,
    createdAt: '2026-08-10T00:00:00.000Z',
    id,
    ...(filter === 'popular' ? { likeCount: 10, commentCount: 0 } : {}),
    ...(filter === 'notice'
      ? { noticePublishedAt: '2026-08-10T00:00:00.000Z' }
      : {}),
  });
}

describe('community list store pagination', () => {
  beforeEach(() => {
    mockedFetchCommunityPosts.mockReset();
    useCommunityStore.getState().clearAll();
  });

  it('uses the default 30 page size and keeps next/previous cursor history', async () => {
    mockedFetchCommunityPosts
      .mockResolvedValueOnce({
        items: [makePost('page-1')],
        nextCursor: makeCursor('all', 30, 'page-1'),
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [makePost('page-2')],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('page-1')],
        nextCursor: makeCursor('all', 30, 'page-1'),
        hasMore: true,
      });

    await useCommunityStore.getState().fetchPosts('all');
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'all',
      category: 'all',
      cursor: null,
      limit: 30,
    });
    expect(useCommunityStore.getState().pageSize).toBe(30);

    await useCommunityStore.getState().loadMorePosts();
    expect(useCommunityStore.getState().currentPage).toBe(2);
    expect(useCommunityStore.getState().hasPreviousPage).toBe(true);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'page-2',
    ]);

    await useCommunityStore.getState().loadPreviousPosts();
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'page-1',
    ]);
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'all',
      category: 'all',
      cursor: null,
      limit: 30,
    });
  });

  it('resets page and cursor history when filter or page size changes', async () => {
    mockedFetchCommunityPosts
      .mockResolvedValueOnce({
        items: [makePost('all-1')],
        nextCursor: makeCursor('all', 30, 'all-1'),
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [makePost('all-2')],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('popular-1', { likeCount: 10 })],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('popular-1', { likeCount: 10 })],
        nextCursor: null,
        hasMore: false,
      });

    await useCommunityStore.getState().fetchPosts('all');
    await useCommunityStore.getState().loadMorePosts();
    await useCommunityStore.getState().fetchPosts('popular');
    expect(useCommunityStore.getState().activeFilter).toBe('popular');
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().hasPreviousPage).toBe(false);
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'popular',
      category: 'all',
      cursor: null,
      limit: 30,
    });

    await useCommunityStore.getState().setPageSize(50);
    expect(useCommunityStore.getState().pageSize).toBe(50);
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().hasPreviousPage).toBe(false);
    expect(Object.keys(useCommunityStore.getState().cursorHistory)).toEqual([
      'popular:all:50',
    ]);
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'popular',
      category: 'all',
      cursor: null,
      limit: 50,
    });
  });

  it('keeps category in every filter combination and resets its own cursor key', async () => {
    mockedFetchCommunityPosts
      .mockResolvedValueOnce({
        items: [makePost('info-1')],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('popular-info-1', { likeCount: 10 })],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('notice-1', { isNotice: true })],
        nextCursor: null,
        hasMore: false,
      });

    await useCommunityStore.getState().fetchPosts('all', 'info');
    expect(useCommunityStore.getState().activeCategory).toBe('info');
    expect(Object.keys(useCommunityStore.getState().cursorHistory)).toEqual([
      'all:info:30',
    ]);
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'all',
      category: 'info',
      cursor: null,
      limit: 30,
    });

    await useCommunityStore.getState().fetchPosts('popular');
    expect(useCommunityStore.getState().activeCategory).toBe('info');
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'popular',
      category: 'info',
      cursor: null,
      limit: 30,
    });

    await useCommunityStore.getState().fetchPosts('notice');
    expect(useCommunityStore.getState().activeCategory).toBe('all');
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'notice',
      category: 'all',
      cursor: null,
      limit: 30,
    });
  });

  it('ignores a stale category response after a fast category switch', async () => {
    let resolveQuestion: CommunityPostsResolver | null = null;
    let resolveInfo: CommunityPostsResolver | null = null;

    mockedFetchCommunityPosts
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveQuestion = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveInfo = resolve;
          }),
      );

    const questionRequest = useCommunityStore
      .getState()
      .fetchPosts('all', 'question');
    const infoRequest = useCommunityStore.getState().setCategory('info');

    if (!resolveQuestion || !resolveInfo) {
      throw new Error('test resolvers were not initialized');
    }
    const resolveQuestionRequest = resolveQuestion as CommunityPostsResolver;
    const resolveInfoRequest = resolveInfo as CommunityPostsResolver;

    resolveQuestionRequest({
      items: [makePost('stale-question')],
      nextCursor: null,
      hasMore: false,
    });
    await questionRequest;
    expect(useCommunityStore.getState().activeCategory).toBe('info');
    expect(useCommunityStore.getState().posts).toEqual([]);

    resolveInfoRequest({
      items: [makePost('info-1')],
      nextCursor: null,
      hasMore: false,
    });
    await infoRequest;
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'info-1',
    ]);
  });

  it('ignores a stale response after a fast filter switch', async () => {
    let resolveAll: CommunityPostsResolver | null = null;
    let resolveNotice: CommunityPostsResolver | null = null;

    mockedFetchCommunityPosts
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveAll = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveNotice = resolve;
          }),
      );

    const allRequest = useCommunityStore.getState().fetchPosts('all');
    const noticeRequest = useCommunityStore.getState().fetchPosts('notice');

    if (!resolveAll || !resolveNotice) {
      throw new Error('test resolvers were not initialized');
    }
    const resolveAllRequest = resolveAll as CommunityPostsResolver;
    const resolveNoticeRequest = resolveNotice as CommunityPostsResolver;

    resolveAllRequest({
      items: [makePost('stale-all')],
      nextCursor: null,
      hasMore: false,
    });
    await allRequest;
    expect(useCommunityStore.getState().activeFilter).toBe('notice');
    expect(useCommunityStore.getState().posts).toEqual([]);

    resolveNoticeRequest({
      items: [makePost('notice-1', { isNotice: true })],
      nextCursor: null,
      hasMore: false,
    });
    await noticeRequest;
    expect(useCommunityStore.getState().activeFilter).toBe('notice');
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'notice-1',
    ]);
  });

  it('restarts the first page when a legacy cursor is rejected', async () => {
    mockedFetchCommunityPosts
      .mockResolvedValueOnce({
        items: [makePost('page-1')],
        nextCursor: makeCursor('all', 30, 'page-1'),
        hasMore: true,
      })
      .mockRejectedValueOnce(new Error('community_cursor_invalid'))
      .mockResolvedValueOnce({
        items: [makePost('restarted-page-1')],
        nextCursor: null,
        hasMore: false,
      });

    await useCommunityStore.getState().fetchPosts('all');
    await useCommunityStore.getState().loadMorePosts();

    expect(mockedFetchCommunityPosts).toHaveBeenNthCalledWith(2, {
      filter: 'all',
      category: 'all',
      cursor: makeCursor('all', 30, 'page-1'),
      limit: 30,
    });
    expect(mockedFetchCommunityPosts).toHaveBeenNthCalledWith(3, {
      filter: 'all',
      category: 'all',
      cursor: null,
      limit: 30,
    });
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'restarted-page-1',
    ]);
    expect(useCommunityStore.getState().listStatus).toBe('ready');
  });

  it('resumes the saved filter, page size, and current page cursor', async () => {
    mockedFetchCommunityPosts.mockResolvedValueOnce({
      items: [makePost('popular-page-2', { likeCount: 10 })],
      nextCursor: 'cursor-page-3',
      hasMore: true,
    });

    useCommunityStore.getState().restoreListSnapshot({
      activeFilter: 'popular',
      activeCategory: 'all',
      pageSize: 100,
      currentPage: 2,
      cursor: 'cursor-page-3',
      hasMore: true,
      hasNextPage: true,
      hasPreviousPage: true,
      cursorHistory: {
        1: null,
        2: 'cursor-page-2',
      },
    });

    await useCommunityStore.getState().resumePosts();

    expect(mockedFetchCommunityPosts).toHaveBeenCalledWith({
      filter: 'popular',
      category: 'all',
      cursor: 'cursor-page-2',
      limit: 100,
    });
    expect(useCommunityStore.getState().activeFilter).toBe('popular');
    expect(useCommunityStore.getState().pageSize).toBe(100);
    expect(useCommunityStore.getState().currentPage).toBe(2);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'popular-page-2',
    ]);
  });

  it('keeps the filter and page size when a saved cursor is stale', async () => {
    mockedFetchCommunityPosts
      .mockRejectedValueOnce(new Error('community_cursor_invalid'))
      .mockResolvedValueOnce({
        items: [makePost('popular-restarted', { likeCount: 10 })],
        nextCursor: null,
        hasMore: false,
      });

    useCommunityStore.getState().restoreListSnapshot({
      activeFilter: 'popular',
      activeCategory: 'all',
      pageSize: 100,
      currentPage: 2,
      cursor: 'cursor-page-3',
      hasMore: true,
      hasNextPage: true,
      hasPreviousPage: true,
      cursorHistory: {
        1: null,
        2: 'stale-cursor',
      },
    });

    await useCommunityStore.getState().resumePosts();

    expect(mockedFetchCommunityPosts).toHaveBeenNthCalledWith(1, {
      filter: 'popular',
      category: 'all',
      cursor: 'stale-cursor',
      limit: 100,
    });
    expect(mockedFetchCommunityPosts).toHaveBeenNthCalledWith(2, {
      filter: 'popular',
      category: 'all',
      cursor: null,
      limit: 100,
    });
    expect(useCommunityStore.getState().activeFilter).toBe('popular');
    expect(useCommunityStore.getState().pageSize).toBe(100);
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'popular-restarted',
    ]);
  });

  it('renders the server-provided notice-first order without client sorting', async () => {
    mockedFetchCommunityPosts.mockResolvedValueOnce({
      items: [
        makePost('notice-1', { isNotice: true }),
        makePost('regular-1'),
      ],
      nextCursor: null,
      hasMore: false,
    });

    await useCommunityStore.getState().fetchPosts('all');

    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'notice-1',
      'regular-1',
    ]);
  });

  it('keeps the current list visible while changing page size', async () => {
    mockedFetchCommunityPosts.mockResolvedValueOnce({
      items: [makePost('all-1')],
      nextCursor: makeCursor('all', 30, 'all-1'),
      hasMore: true,
    });
    await useCommunityStore.getState().fetchPosts('all');

    const pageSizeRequest = createDeferred<CommunityPostsResult>();
    mockedFetchCommunityPosts.mockReturnValueOnce(pageSizeRequest.promise);

    const request = useCommunityStore.getState().setPageSize(50);

    expect(useCommunityStore.getState().pageSize).toBe(50);
    expect(useCommunityStore.getState().listStatus).toBe('loading');
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'all-1',
    ]);

    pageSizeRequest.resolve({
      items: [makePost('all-50')],
      nextCursor: null,
      hasMore: false,
    });
    await request;

    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'all-50',
    ]);
    expect(useCommunityStore.getState().listStatus).toBe('ready');
  });

  it('applies only the latest page size response', async () => {
    mockedFetchCommunityPosts.mockResolvedValueOnce({
      items: [makePost('all-1')],
      nextCursor: null,
      hasMore: false,
    });
    await useCommunityStore.getState().fetchPosts('all');

    const firstPageSizeRequest = createDeferred<CommunityPostsResult>();
    const secondPageSizeRequest = createDeferred<CommunityPostsResult>();
    mockedFetchCommunityPosts
      .mockReturnValueOnce(firstPageSizeRequest.promise)
      .mockReturnValueOnce(secondPageSizeRequest.promise);

    const firstRequest = useCommunityStore.getState().setPageSize(50);
    const secondRequest = useCommunityStore.getState().setPageSize(100);

    firstPageSizeRequest.resolve({
      items: [makePost('stale-50')],
      nextCursor: null,
      hasMore: false,
    });
    await firstRequest;
    expect(useCommunityStore.getState().pageSize).toBe(100);
    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'all-1',
    ]);

    secondPageSizeRequest.resolve({
      items: [makePost('current-100')],
      nextCursor: null,
      hasMore: false,
    });
    await secondRequest;

    expect(useCommunityStore.getState().posts.map(post => post.id)).toEqual([
      'current-100',
    ]);
  });

  it('blocks duplicate requests for the same page size', async () => {
    mockedFetchCommunityPosts.mockResolvedValueOnce({
      items: [makePost('all-1')],
      nextCursor: null,
      hasMore: false,
    });
    await useCommunityStore.getState().fetchPosts('all');

    const pageSizeRequest = createDeferred<CommunityPostsResult>();
    mockedFetchCommunityPosts.mockReturnValueOnce(pageSizeRequest.promise);

    const firstRequest = useCommunityStore.getState().setPageSize(50);
    const duplicateRequest = useCommunityStore.getState().setPageSize(50);

    expect(mockedFetchCommunityPosts).toHaveBeenCalledTimes(2);

    pageSizeRequest.resolve({
      items: [makePost('all-50')],
      nextCursor: null,
      hasMore: false,
    });
    await Promise.all([firstRequest, duplicateRequest]);
  });
});

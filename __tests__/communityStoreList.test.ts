import type {
  CommunityListFilter,
  CommunityPageSize,
  CommunityPost,
} from '../src/types/community';
import { fetchCommunityPosts } from '../src/services/supabase/community';
import { useCommunityStore } from '../src/store/communityStore';

jest.mock('../src/services/supabase/community', () => ({
  fetchCommunityPosts: jest.fn(),
}));

const mockedFetchCommunityPosts = fetchCommunityPosts as jest.MockedFunction<
  typeof fetchCommunityPosts
>;
type CommunityPostsResult = Awaited<ReturnType<typeof fetchCommunityPosts>>;
type CommunityPostsResolver = (value: CommunityPostsResult) => void;

function makePost(id: string, overrides: Partial<CommunityPost> = {}): CommunityPost {
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
    filter,
    pageSize,
    createdAt: '2026-08-10T00:00:00.000Z',
    id,
    ...(filter === 'popular'
      ? { likeCount: 10, commentCount: 0 }
      : {}),
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
      cursor: null,
      limit: 30,
    });

    await useCommunityStore.getState().setPageSize(50);
    expect(useCommunityStore.getState().pageSize).toBe(50);
    expect(useCommunityStore.getState().currentPage).toBe(1);
    expect(useCommunityStore.getState().hasPreviousPage).toBe(false);
    expect(mockedFetchCommunityPosts).toHaveBeenLastCalledWith({
      filter: 'popular',
      cursor: null,
      limit: 50,
    });
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
});

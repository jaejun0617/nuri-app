import type { CommunityPost } from '../src/types/community';
import {
  HOME_COMMUNITY_CACHE_KEYS,
  clearHomeCommunityHighlightsCache,
  fetchHomeCommunityHighlights,
} from '../src/services/home/communityHighlights';
import { fetchCommunityPosts } from '../src/services/supabase/community';

jest.mock('../src/services/supabase/community', () => ({
  fetchCommunityPosts: jest.fn(),
}));

const mockedFetchCommunityPosts = fetchCommunityPosts as jest.MockedFunction<
  typeof fetchCommunityPosts
>;

function makePost(
  id: string,
  likeCount: number,
  category: CommunityPost['category'] = 'question',
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
    title: `게시글 ${id}`,
    content: `게시글 내용 ${id}`,
    imagePath: null,
    imageUrl: null,
    imagePaths: [],
    imageUrls: [],
    hasImage: false,
    status: 'active',
    category,
    likeCount,
    commentCount: 2,
    viewCount: 0,
    isNotice: false,
    noticePublishedAt: null,
    isLikedByMe: false,
    deletedAt: null,
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };
}

describe('home community highlights service', () => {
  beforeEach(() => {
    clearHomeCommunityHighlightsCache();
    mockedFetchCommunityPosts.mockReset();
  });

  it.each([
    ['popular', 'popular', 'all'],
    ['question', 'popular', 'question'],
    ['info', 'popular', 'info'],
    ['daily', 'popular', 'daily'],
    ['free', 'popular', 'free'],
  ] as const)('%s maps to the approved popular RPC filter/category', async (tab, filter, category) => {
    mockedFetchCommunityPosts.mockResolvedValue({
      items: [
        makePost('first', 42, category === 'all' ? 'question' : category),
        // The server owns the popular threshold. Home must not re-filter this
        // response or replace the server order with a client ranking.
        makePost('second', 1, category === 'all' ? 'info' : category),
        makePost('third', 18, category === 'all' ? 'daily' : category),
        makePost('fourth', 99, category === 'all' ? 'free' : category),
      ],
      nextCursor: null,
      hasMore: false,
    });

    const result = await fetchHomeCommunityHighlights(tab);

    expect(mockedFetchCommunityPosts).toHaveBeenCalledWith({
      filter,
      category,
      limit: 30,
    });
    expect(result.map(post => post.id)).toEqual(['first', 'second', 'third']);
  });

  it('keeps tab caches separate', async () => {
    mockedFetchCommunityPosts
      .mockResolvedValueOnce({
        items: [makePost('popular', 20)],
        nextCursor: null,
        hasMore: false,
      })
      .mockResolvedValueOnce({
        items: [makePost('question', 1, 'question')],
        nextCursor: null,
        hasMore: false,
      });

    await fetchHomeCommunityHighlights('popular');
    await fetchHomeCommunityHighlights('question');

    expect(mockedFetchCommunityPosts).toHaveBeenCalledTimes(2);
    expect(HOME_COMMUNITY_CACHE_KEYS.popular).toBe('home-community:popular:all');
    expect(HOME_COMMUNITY_CACHE_KEYS.question).toBe('home-community:popular:question');
    expect(HOME_COMMUNITY_CACHE_KEYS.info).toBe('home-community:popular:info');
    expect(HOME_COMMUNITY_CACHE_KEYS.daily).toBe('home-community:popular:daily');
    expect(HOME_COMMUNITY_CACHE_KEYS.free).toBe('home-community:popular:free');
  });

  it('deduplicates concurrent requests and serves a fresh cache without refetching', async () => {
    let resolveRequest!: (value: Awaited<ReturnType<typeof fetchCommunityPosts>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof fetchCommunityPosts>>>(resolve => {
      resolveRequest = resolve;
    });
    mockedFetchCommunityPosts.mockReturnValueOnce(pending);

    const firstRequest = fetchHomeCommunityHighlights('popular');
    const secondRequest = fetchHomeCommunityHighlights('popular');
    resolveRequest({ items: [makePost('cached', 20)], nextCursor: null, hasMore: false });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      [expect.objectContaining({ id: 'cached' })],
      [expect.objectContaining({ id: 'cached' })],
    ]);
    await fetchHomeCommunityHighlights('popular');

    expect(mockedFetchCommunityPosts).toHaveBeenCalledTimes(1);
  });
});

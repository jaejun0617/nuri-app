jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));

import { fetchCommunityPosts } from '../src/services/supabase/community';

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock;
    from: jest.Mock;
    auth: { getSession: jest.Mock };
  };
};

function postRow() {
  return {
    id: 'post-1',
    user_id: 'user-1',
    pet_id: null,
    visibility: 'public',
    title: '질문 글',
    content: '내용',
    image_url: null,
    image_urls: null,
    status: 'active',
    category: 'question',
    like_count: 10,
    comment_count: 2,
    view_count: 0,
    is_notice: false,
    notice_published_at: null,
    deleted_at: null,
    created_at: '2026-08-17T00:00:00.000Z',
    updated_at: '2026-08-17T00:00:00.000Z',
  };
}

function mockListDependencies() {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'viewer-1' } } },
  });
  supabase.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    }
    if (table === 'pets') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    }
    if (table === 'likes') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe('community category list v2 service contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListDependencies();
    supabase.rpc.mockResolvedValue({
      data: {
        items: [postRow()],
        hasMore: true,
        nextCursor: {
          version: 3,
          filter: 'popular',
          category: 'question',
          pageSize: 50,
          likeCount: 10,
          commentCount: 2,
          createdAt: '2026-08-17T00:00:00.000Z',
          id: 'post-1',
        },
        cursorVersion: 3,
      },
      error: null,
    });
  });

  it('passes filter, category, page size, and opaque cursor to v2', async () => {
    const result = await fetchCommunityPosts({
      filter: 'popular',
      category: 'question',
      limit: 50,
      cursor: JSON.stringify({
        version: 3,
        filter: 'popular',
        category: 'question',
        pageSize: 50,
        likeCount: 11,
        commentCount: 0,
        createdAt: '2026-08-16T00:00:00.000Z',
        id: 'previous-post',
      }),
    });

    expect(supabase.rpc).toHaveBeenCalledWith('community_list_posts_v2', {
      p_filter: 'popular',
      p_category: 'question',
      p_limit: 50,
      p_cursor: {
        version: 3,
        filter: 'popular',
        category: 'question',
        pageSize: 50,
        likeCount: 11,
        commentCount: 0,
        createdAt: '2026-08-16T00:00:00.000Z',
        id: 'previous-post',
      },
    });
    expect(result.items[0]?.category).toBe('question');
    expect(JSON.parse(result.nextCursor ?? '')).toMatchObject({
      version: 3,
      category: 'question',
    });
  });

  it('normalizes notice category to all before the server call', async () => {
    await fetchCommunityPosts({
      filter: 'notice',
      category: 'info',
      limit: 30,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'community_list_posts_v2',
      expect.objectContaining({
        p_filter: 'notice',
        p_category: 'all',
      }),
    );
  });

  it.each(['info', 'question', 'daily', 'free'] as const)(
    'passes popular + %s to the v2 RPC without changing the filter',
    async category => {
      await fetchCommunityPosts({
        filter: 'popular',
        category,
        limit: 30,
      });

      expect(supabase.rpc).toHaveBeenLastCalledWith(
        'community_list_posts_v2',
        expect.objectContaining({
          p_filter: 'popular',
          p_category: category,
        }),
      );
    },
  );
});

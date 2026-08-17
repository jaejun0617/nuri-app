jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));

import {
  decodeCommunityListCursor,
  encodeCommunityListCursor,
  fetchCommunityPosts,
  getCommunityListErrorMessage,
} from '../src/services/supabase/community';
import type {
  CommunityCategory,
  CommunityListCursor,
  CommunityListFilter,
  CommunityPageSize,
} from '../src/types/community';

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

function makeCursor(
  filter: CommunityListFilter,
  category: CommunityCategory,
  pageSize: CommunityPageSize,
  id = 'post-1',
): CommunityListCursor {
  const common = {
    version: 4 as const,
    filter,
    category,
    pageSize,
    createdAt: '2026-08-17T00:00:00.000Z',
    id,
  };

  if (filter === 'popular') {
    return { ...common, filter, likeCount: 10 };
  }
  if (filter === 'notice') {
    return {
      ...common,
      filter,
      category: 'all',
      noticePublishedAt: '2026-08-17T00:00:00.000Z',
    };
  }
  return {
    ...common,
    filter,
    isNotice: true,
    noticePublishedAt: '2026-08-17T00:00:00.000Z',
  };
}

function mockV3Response(
  filter: CommunityListFilter,
  category: CommunityCategory,
  pageSize: CommunityPageSize,
) {
  const responseCursor = makeCursor(filter, category, pageSize);
  supabase.rpc.mockResolvedValueOnce({
    data: {
      items: [postRow()],
      hasMore: true,
      nextCursor: responseCursor,
      cursorVersion: 4,
      filter,
      category,
      pageSize,
    },
    error: null,
  });
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

describe('community list v3 service adapter contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListDependencies();
  });

  it.each([
    ['all', 'all'],
    ['all', 'question'],
    ['all', 'info'],
    ['all', 'daily'],
    ['all', 'free'],
    ['popular', 'all'],
    ['popular', 'question'],
    ['popular', 'info'],
    ['popular', 'daily'],
    ['popular', 'free'],
    ['notice', 'all'],
  ] as const)('%s + %s maps to the v3 RPC contract', async (filter, category) => {
    mockV3Response(filter, category, 30);

    await fetchCommunityPosts({ filter, category, limit: 30 });

    expect(supabase.rpc).toHaveBeenCalledWith('community_list_posts_v3', {
      p_filter: filter,
      p_category: category,
      p_limit: 30,
      p_cursor: null,
    });
  });

  it('passes an opaque v4 cursor and excludes commentCount from popular ranking', async () => {
    const cursor = makeCursor('popular', 'question', 50);
    mockV3Response('popular', 'question', 50);

    const result = await fetchCommunityPosts({
      filter: 'popular',
      category: 'question',
      limit: 50,
      cursor: JSON.stringify(cursor),
    });

    expect(supabase.rpc).toHaveBeenCalledWith('community_list_posts_v3', {
      p_filter: 'popular',
      p_category: 'question',
      p_limit: 50,
      p_cursor: cursor,
    });
    expect(result.nextCursor).not.toBeNull();
    expect(JSON.parse(result.nextCursor ?? '')).toEqual(cursor);
    expect(JSON.parse(result.nextCursor ?? '')).not.toHaveProperty(
      'commentCount',
    );
  });

  it('round-trips a v4 cursor without converting its ranking fields', () => {
    const cursor = makeCursor('popular', 'info', 100);

    expect(decodeCommunityListCursor(JSON.stringify(cursor))).toEqual(cursor);
    expect(JSON.parse(encodeCommunityListCursor(cursor) ?? '')).toEqual(
      cursor,
    );
  });

  it('rejects filter, category, and page-size cursor mixing before the RPC call', async () => {
    const cursor = makeCursor('popular', 'question', 50);

    await expect(
      fetchCommunityPosts({
        filter: 'popular',
        category: 'info',
        limit: 50,
        cursor: JSON.stringify(cursor),
      }),
    ).rejects.toThrow('community_cursor_invalid');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it.each([
    JSON.stringify({
      version: 3,
      filter: 'popular',
      category: 'all',
      pageSize: 30,
      likeCount: 10,
      createdAt: '2026-08-17T00:00:00.000Z',
      id: 'post-1',
    }),
    JSON.stringify({
      version: 2,
      filter: 'popular',
      category: 'all',
      pageSize: 30,
      likeCount: 10,
      createdAt: '2026-08-17T00:00:00.000Z',
      id: 'post-1',
    }),
    JSON.stringify({
      filter: 'popular',
      category: 'all',
      pageSize: 30,
      likeCount: 10,
      createdAt: '2026-08-17T00:00:00.000Z',
      id: 'post-1',
    }),
  ])('rejects legacy or unsupported cursor %s', async cursor => {
    await expect(
      fetchCommunityPosts({ filter: 'popular', category: 'all', cursor }),
    ).rejects.toThrow('community_cursor_version_unsupported');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('passes notice + non-all through to the backend stable error contract', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'community_notice_category_unsupported' },
    });

    await expect(
      fetchCommunityPosts({ filter: 'notice', category: 'info', limit: 30 }),
    ).rejects.toMatchObject({
      message: 'community_notice_category_unsupported',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('community_list_posts_v3', {
      p_filter: 'notice',
      p_category: 'info',
      p_limit: 30,
      p_cursor: null,
    });
    expect(
      getCommunityListErrorMessage({
        message: 'community_notice_category_unsupported',
      }),
    ).toBe('공지 목록에서는 카테고리를 선택할 수 없어요.');
  });

  it('rejects a popular cursor that includes the removed commentCount ranking field', async () => {
    const cursor = {
      ...makeCursor('popular', 'all', 30),
      commentCount: 2,
    };

    await expect(
      fetchCommunityPosts({
        filter: 'popular',
        category: 'all',
        cursor: JSON.stringify(cursor),
      }),
    ).rejects.toThrow('community_cursor_invalid');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

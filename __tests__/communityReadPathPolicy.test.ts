jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    from: jest.Mock;
  };
};

import { fetchCommunityPostById } from '../src/services/supabase/community';

function postDetailQuery(data: unknown) {
  const maybeSingle = jest.fn(() => Promise.resolve({ data, error: null }));
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
}

function postRow(overrides: Record<string, unknown>) {
  return {
    id: 'post-1',
    user_id: 'user-1',
    pet_id: null,
    visibility: 'public',
    title: '테스트 글',
    content: '테스트 본문',
    image_url: null,
    image_urls: null,
    status: 'active',
    category: 'daily',
    like_count: 0,
    comment_count: 0,
    view_count: 0,
    deleted_at: null,
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('community public read path policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['hidden visibility', { visibility: 'hidden' }],
    ['private visibility', { visibility: 'private' }],
    ['hidden status', { status: 'hidden' }],
    ['deleted row', { deleted_at: '2026-07-13T01:00:00.000Z' }],
  ])('직접 상세 접근에서도 %s 게시글을 노출하지 않는다', async (_label, overrides) => {
    const postsQuery = postDetailQuery(postRow(overrides));
    supabase.from.mockImplementation((table: string) => {
      if (table === 'posts') return postsQuery;
      throw new Error(`Unexpected table read: ${table}`);
    });

    await expect(fetchCommunityPostById('post-1')).resolves.toBeNull();

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('posts');
    expect(postsQuery.eq).toHaveBeenCalledWith('id', 'post-1');
  });
});

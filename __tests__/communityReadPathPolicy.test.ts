jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    from: jest.Mock;
    rpc: jest.Mock;
    auth: {
      getSession: jest.Mock;
    };
  };
};

import {
  CommunityDetailReadError,
  deleteCommunityComment,
  fetchCommunityPostById,
} from '../src/services/supabase/community';

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
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('protected detail RPC의 item:null을 unavailable로 매핑하고 direct posts fallback을 호출하지 않는다', async () => {
    supabase.rpc.mockResolvedValue({
      data: { item: null },
      error: null,
    });

    await expect(fetchCommunityPostById('post-1')).resolves.toBeNull();

    expect(supabase.rpc).toHaveBeenCalledWith('community_get_post_detail_v1', {
      p_post_id: 'post-1',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('protected detail RPC의 item object를 기존 Community post model로 매핑한다', async () => {
    const profileQuery = {
      select: jest.fn(() => ({
        in: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                user_id: 'user-1',
                nickname: 'QA 사용자',
                nickname_confirmed: true,
                avatar_url: null,
              },
            ],
            error: null,
          }),
        ),
      })),
    };
    supabase.rpc.mockResolvedValue({
      data: { item: postRow({}) },
      error: null,
    });
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileQuery;
      throw new Error(`Unexpected table read: ${table}`);
    });

    await expect(fetchCommunityPostById('post-1')).resolves.toMatchObject({
      id: 'post-1',
      title: '테스트 글',
      authorNickname: 'QA 사용자',
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('RPC 오류는 retryable detail error로 유지하고 not-found로 매핑하지 않는다', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST002', message: 'network failure' },
    });

    await expect(fetchCommunityPostById('post-1')).rejects.toEqual(
      expect.objectContaining<Partial<CommunityDetailReadError>>({
        code: 'RETRYABLE_ERROR',
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('malformed detail RPC response는 안전한 parser error로 거부한다', async () => {
    supabase.rpc.mockResolvedValue({ data: { item: {} }, error: null });

    await expect(fetchCommunityPostById('post-1')).rejects.toEqual(
      expect.objectContaining({ code: 'MALFORMED_RESPONSE' }),
    );
  });

  it('댓글 삭제는 legacy schema error에서도 hard delete fallback을 호출하지 않는다', async () => {
    const hardDelete = jest.fn();
    const eq = jest.fn(() =>
      Promise.resolve({
        data: null,
        error: {
          code: 'PGRST204',
          message: 'deleted_at column missing',
        },
      }),
    );
    const update = jest.fn(() => ({ eq }));

    supabase.from.mockImplementation((table: string) => {
      if (table === 'comments') {
        return {
          update,
          delete: hardDelete,
        };
      }
      throw new Error(`Unexpected table write: ${table}`);
    });

    await expect(deleteCommunityComment('comment-1')).rejects.toMatchObject({
      code: 'PGRST204',
    });

    expect(update).toHaveBeenCalledWith({
      status: 'deleted',
      deleted_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'comment-1');
    expect(hardDelete).not.toHaveBeenCalled();
  });
});

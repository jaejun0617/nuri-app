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
  CommunityCommentDeleteError,
  CommunityDetailReadError,
  createCommunityComment,
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

function commentRow(overrides: Record<string, unknown>) {
  return {
    id: 'comment-1',
    post_id: 'post-1',
    user_id: 'user-1',
    content: '테스트 댓글',
    parent_comment_id: null,
    depth: 0,
    reply_count: 0,
    like_count: 0,
    reply_to_comment_id: null,
    reply_target_user_id: null,
    status: 'active',
    deleted_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

function mockProfileRead(rows: Array<Record<string, unknown>>) {
  supabase.from.mockReturnValue({
    select: jest.fn(() => ({
      in: jest.fn().mockResolvedValue({ data: rows, error: null }),
    })),
  });
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

  it('root comment는 canonical create RPC에 parent와 target을 null로 전달한다', async () => {
    supabase.rpc.mockResolvedValue({
      data: { item: commentRow({}) },
      error: null,
    });
    mockProfileRead([
      {
        user_id: 'user-1',
        nickname: 'QA 사용자',
        nickname_confirmed: true,
        avatar_url: null,
      },
    ]);

    await expect(
      createCommunityComment({ postId: 'post-1', content: '새 댓글' }),
    ).resolves.toMatchObject({
      parentCommentId: null,
      replyToCommentId: null,
      replyTargetUserId: null,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('community_create_comment_v1', {
      p_post_id: 'post-1',
      p_content: '새 댓글',
      p_parent_comment_id: null,
      p_reply_to_comment_id: null,
    });
    expect(supabase.from).not.toHaveBeenCalledWith('comments');
  });

  it('reply-to-reply는 root parent와 선택된 reply target을 함께 전달하고 target identity를 매핑한다', async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        item: commentRow({
          id: 'reply-c',
          user_id: 'user-c',
          parent_comment_id: 'root-a',
          depth: 1,
          reply_to_comment_id: 'reply-b',
          reply_target_user_id: 'user-b',
        }),
      },
      error: null,
    });
    mockProfileRead([
      {
        user_id: 'user-c',
        nickname: 'QA 작성자',
        nickname_confirmed: true,
        avatar_url: null,
      },
      {
        user_id: 'user-b',
        nickname: 'QA 대상',
        nickname_confirmed: true,
        avatar_url: null,
      },
    ]);

    await expect(
      createCommunityComment({
        postId: 'post-1',
        content: '답글 내용',
        parentCommentId: 'root-a',
        replyToCommentId: 'reply-b',
      }),
    ).resolves.toMatchObject({
      parentCommentId: 'root-a',
      replyToCommentId: 'reply-b',
      replyTargetUserId: 'user-b',
      replyTargetNickname: 'QA 대상',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('community_create_comment_v1', {
      p_post_id: 'post-1',
      p_content: '답글 내용',
      p_parent_comment_id: 'root-a',
      p_reply_to_comment_id: 'reply-b',
    });
    expect(supabase.from).not.toHaveBeenCalledWith('comments');
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

  it('댓글 삭제는 protected soft-delete RPC와 comment id만 사용한다', async () => {
    supabase.rpc.mockResolvedValue({ data: true, error: null });

    await expect(deleteCommunityComment('comment-1')).resolves.toBe(true);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'community_soft_delete_comment_v1',
      { p_comment_id: 'comment-1' },
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('community_comment_delete_forbidden은 내부 RPC/RLS 메시지를 노출하지 않고 stable error로 매핑한다', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'community_comment_delete_forbidden',
      },
    });

    await expect(deleteCommunityComment('comment-1')).rejects.toEqual(
      expect.objectContaining<Partial<CommunityCommentDeleteError>>({
        code: 'community_comment_delete_forbidden',
        message: '이 댓글을 삭제할 권한이 없어요.',
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('generic RPC error는 delete failure로 매핑하고 direct UPDATE fallback을 호출하지 않는다', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST002', message: 'temporary rpc failure' },
    });

    await expect(deleteCommunityComment('comment-1')).rejects.toEqual(
      expect.objectContaining<Partial<CommunityCommentDeleteError>>({
        code: 'community_comment_delete_failed',
      }),
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('RPC가 true가 아닌 응답을 반환하면 성공으로 처리하지 않는다', async () => {
    supabase.rpc.mockResolvedValue({ data: false, error: null });

    await expect(deleteCommunityComment('comment-1')).rejects.toEqual(
      expect.objectContaining<Partial<CommunityCommentDeleteError>>({
        code: 'community_comment_delete_failed',
      }),
    );
  });
});

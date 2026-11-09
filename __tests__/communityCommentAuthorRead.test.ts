jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));

import { hydrateCommunityCommentRows } from '../src/services/supabase/community';
import type { CommunityCommentRow } from '../src/types/community';

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    rpc: jest.Mock;
    from: jest.Mock;
    auth: { getSession: jest.Mock };
  };
};

const comment: CommunityCommentRow = {
  id: 'comment-1',
  post_id: 'post-1',
  user_id: 'another-user',
  content: 'QA',
  status: 'active',
  deleted_at: null,
  created_at: '2026-11-09T00:00:00Z',
  updated_at: '2026-11-09T00:00:00Z',
};

test('uses only a nickname returned for the requested comment', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  supabase.from.mockReturnValue({
    select: () => ({ in: async () => ({ data: [], error: null }) }),
  });
  supabase.rpc.mockResolvedValueOnce({
    data: [
      { comment_id: 'comment-1', nickname: '  confirmed QA  ' },
      { comment_id: 'other-comment', nickname: 'not requested' },
      { comment_id: 'comment-2', nickname: '  ' },
    ],
    error: null,
  });
  await expect(
    hydrateCommunityCommentRows([comment, { ...comment, id: 'comment-2' }]),
  ).resolves.toMatchObject([
    { id: 'comment-1', authorNickname: 'confirmed QA', authorAvatarUrl: null },
    { id: 'comment-2', authorNickname: '알 수 없는 사용자', authorAvatarUrl: null },
  ]);
  expect(supabase.rpc).toHaveBeenCalledWith(
    'community_get_comment_author_nicknames_v1',
    { p_comment_ids: ['comment-1', 'comment-2'] },
  );
  expect(supabase.from).toHaveBeenCalledTimes(1);
  expect(supabase.from).toHaveBeenCalledWith('comment_likes');
});

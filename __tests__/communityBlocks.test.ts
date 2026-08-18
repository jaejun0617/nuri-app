jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../src/services/home/communityHighlights', () => ({
  clearHomeCommunityHighlightsCache: jest.fn(),
}));

import {
  blockCommunityUser,
  CommunityBlockError,
  fetchCommunityBlockedUsers,
  getCommunityBlockErrorMessage,
  unblockCommunityUser,
} from '../src/services/supabase/communityBlocks';

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    from: jest.Mock;
    auth: { getUser: jest.Mock };
  };
};

const { clearHomeCommunityHighlightsCache } = jest.requireMock(
  '../src/services/home/communityHighlights',
) as { clearHomeCommunityHighlightsCache: jest.Mock };

describe('community block service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'viewer-1' } },
      error: null,
    });
  });

  it('uses the authenticated user as blocker and invalidates Home cache', async () => {
    const insert = jest.fn(() => Promise.resolve({ error: null }));
    supabase.from.mockReturnValue({ insert });

    await expect(blockCommunityUser('author-1')).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith({
      blocker_user_id: 'viewer-1',
      blocked_user_id: 'author-1',
    });
    expect(clearHomeCommunityHighlightsCache).toHaveBeenCalledTimes(1);
  });

  it('rejects self block before calling Supabase', async () => {
    await expect(blockCommunityUser('viewer-1')).rejects.toMatchObject({
      code: 'SELF_BLOCK',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('maps duplicate and unauthenticated failures to stable codes', async () => {
    const insert = jest.fn(() =>
      Promise.resolve({ error: { code: '23505' } }),
    );
    supabase.from.mockReturnValue({ insert });

    await expect(blockCommunityUser('author-1')).rejects.toMatchObject({
      code: 'ALREADY_BLOCKED',
    });

    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    await expect(blockCommunityUser('author-2')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('unblocks only the authenticated user outgoing relation', async () => {
    const select = jest.fn(() =>
      Promise.resolve({ data: [{ blocked_user_id: 'author-1' }], error: null }),
    );
    const eqBlocked = jest.fn(() => ({ select }));
    const eqBlocker = jest.fn(() => ({ eq: eqBlocked }));
    const remove = jest.fn(() => ({ eq: eqBlocker }));
    supabase.from.mockReturnValue({ delete: remove });

    await expect(unblockCommunityUser('author-1')).resolves.toBeUndefined();

    expect(eqBlocker).toHaveBeenCalledWith('blocker_user_id', 'viewer-1');
    expect(eqBlocked).toHaveBeenCalledWith('blocked_user_id', 'author-1');
    expect(clearHomeCommunityHighlightsCache).toHaveBeenCalledTimes(1);
  });

  it('maps an empty delete result to NOT_BLOCKED', async () => {
    const select = jest.fn(() => Promise.resolve({ data: [], error: null }));
    const eqBlocked = jest.fn(() => ({ select }));
    const eqBlocker = jest.fn(() => ({ eq: eqBlocked }));
    supabase.from.mockReturnValue({
      delete: jest.fn(() => ({ eq: eqBlocker })),
    });

    await expect(unblockCommunityUser('author-1')).rejects.toMatchObject({
      code: 'NOT_BLOCKED',
    });
  });

  it('reads only outgoing blocks and resolves confirmed public nicknames', async () => {
    const order = jest.fn(() =>
      Promise.resolve({
        data: [
          {
            blocked_user_id: 'author-1',
            created_at: '2026-08-18T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    );
    const blockSelect = jest.fn(() => ({ order }));
    const profileIn = jest.fn(() =>
      Promise.resolve({
        data: [
          {
            user_id: 'author-1',
            nickname: '차단 대상',
            nickname_confirmed: true,
          },
        ],
        error: null,
      }),
    );
    const profileSelect = jest.fn(() => ({ in: profileIn }));
    supabase.from.mockImplementation((table: string) =>
      table === 'community_user_blocks'
        ? { select: blockSelect }
        : { select: profileSelect },
    );

    await expect(fetchCommunityBlockedUsers()).resolves.toEqual([
      {
        userId: 'author-1',
        nickname: '차단 대상',
        blockedAt: '2026-08-18T00:00:00.000Z',
      },
    ]);
    expect(blockSelect).toHaveBeenCalledWith('blocked_user_id, created_at');
    expect(profileSelect).toHaveBeenCalledWith(
      'user_id, nickname, nickname_confirmed',
    );
  });

  it('exposes stable user-facing messages without raw backend text', () => {
    expect(
      getCommunityBlockErrorMessage(new CommunityBlockError('FORBIDDEN')),
    ).toBe('차단 상태를 변경할 권한이 없어요.');
    expect(getCommunityBlockErrorMessage(new Error('raw backend detail'))).toBe(
      '차단 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  });
});

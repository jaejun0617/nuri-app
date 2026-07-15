jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: {
    auth: {
      exchangeCodeForSession: jest.Mock<Promise<{ error: null }>, [string]>;
      setSession: jest.Mock<
        Promise<{ error: null }>,
        [{ access_token: string; refresh_token: string }]
      >;
      verifyOtp: jest.Mock<
        Promise<{ error: null }>,
        [{ type: 'magiclink' | 'signup' | 'email_change'; token_hash: string }]
      >;
    };
  };
};

import { completeOAuthCallbackSession } from '../src/services/supabase/auth';

describe('completeOAuthCallbackSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    supabase.auth.setSession.mockResolvedValue({ error: null });
    supabase.auth.verifyOtp.mockResolvedValue({ error: null });
  });

  it('Supabase token_hash callback은 앱 안에서 magiclink 세션으로 교환한다', async () => {
    await completeOAuthCallbackSession({
      tokenHash: 'hashed-token',
      verificationType: 'magiclink',
      provider: 'google',
    });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'hashed-token',
    });
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('verification type이 비어 있으면 magiclink로 안전하게 처리한다', async () => {
    await completeOAuthCallbackSession({
      tokenHash: 'hashed-token',
      verificationType: null,
      provider: 'google',
    });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'hashed-token',
    });
  });

  it('기존 access/refresh token callback은 setSession 경로를 유지한다', async () => {
    await completeOAuthCallbackSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      provider: 'kakao',
    });

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });
});

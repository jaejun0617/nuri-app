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
  beforeAll(() => jest.useFakeTimers());
  beforeEach(() => {
    jest.advanceTimersByTime(60_001);
    jest.clearAllMocks();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    supabase.auth.setSession.mockResolvedValue({ error: null });
    supabase.auth.verifyOtp.mockResolvedValue({ error: null });
  });
  afterAll(() => jest.useRealTimers());

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

  it('the same code callback exchanges once across concurrent and completed deliveries', async () => {
    await Promise.all([
      completeOAuthCallbackSession({ code: 'same-code', provider: 'kakao' }),
      completeOAuthCallbackSession({ code: 'same-code', provider: 'kakao' }),
    ]);
    await completeOAuthCallbackSession({ code: 'same-code', provider: 'kakao' });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('failed callback does not attempt a token fallback or a partial session', async () => {
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { status: 400 } } as unknown as { error: null });
    await expect(completeOAuthCallbackSession({ code: 'invalid-code', provider: 'kakao' })).rejects.toMatchObject({ code: 'session_exchange_failed' });
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('a slow pending exchange cannot expire and run twice', async () => {
    let finish: (() => void) | undefined;
    supabase.auth.exchangeCodeForSession.mockReturnValueOnce(new Promise(resolve => {
      finish = () => resolve({ error: null });
    }));
    const first = completeOAuthCallbackSession({ code: 'slow-code', provider: 'kakao' });
    jest.advanceTimersByTime(120_000);
    const second = completeOAuthCallbackSession({ code: 'slow-code', provider: 'kakao' });
    expect(first).toBe(second);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    finish?.();
    await Promise.all([first, second]);
  });
});

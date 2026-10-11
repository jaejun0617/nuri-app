jest.mock('../src/services/supabase/client', () => ({
  supabase: { auth: { exchangeCodeForSession: jest.fn(), setSession: jest.fn(), verifyOtp: jest.fn() } },
}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeOAuthCallbackSession } from '../src/services/supabase/auth';
import { beginPendingOAuth, consumePendingOAuth, PENDING_OAUTH_KEY } from '../src/services/auth/pendingOAuth';
import { registerAuthTransitionOwner } from '../src/services/auth/transition';
const { supabase } = jest.requireMock('../src/services/supabase/client') as {
  supabase: { auth: { exchangeCodeForSession: jest.Mock; setSession: jest.Mock; verifyOtp: jest.Mock } };
};
const storage = new Map<string, string>();
const success = { data: { session: { user: { id: 'isolated-test-user' } } }, error: null };

beforeAll(() => jest.useFakeTimers());
beforeEach(() => {
  registerAuthTransitionOwner(async () => ({ name: 'AppTabs', params: undefined }));
  jest.advanceTimersByTime(60_001);
  jest.clearAllMocks();
  storage.clear();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => { storage.delete(key); });
  supabase.auth.exchangeCodeForSession.mockResolvedValue(success);
});
afterAll(() => jest.useRealTimers());

test.each(['google', 'kakao'] as const)('device-started %s code uses PKCE exchange', async provider => {
  await beginPendingOAuth(provider);
  await completeOAuthCallbackSession({ code: 'valid-' + provider, provider });
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-' + provider);
  expect(storage.has(PENDING_OAUTH_KEY)).toBe(false);
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
});
test.each([
  { tokenHash: 'untrusted-hash', verificationType: 'magiclink' },
  { accessToken: 'untrusted-access', refreshToken: 'untrusted-refresh' },
  { code: 'mixed', accessToken: 'untrusted-access' },
])('rejects token callback without an implicit fallback: %j', async input => {
  await beginPendingOAuth('google');
  await expect(completeOAuthCallbackSession(input)).rejects.toMatchObject({ code: 'callback_not_expected' });
  expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
test('unsolicited code has no pending device flow', async () => {
  await expect(completeOAuthCallbackSession({ code: 'unsolicited' })).rejects.toMatchObject({ code: 'callback_not_expected' });
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
test('cold return reads persisted pending metadata with no bearer credentials', async () => {
  storage.set(PENDING_OAUTH_KEY, JSON.stringify({ version: 1, provider: 'kakao', startedAt: Date.now() }));
  await completeOAuthCallbackSession({ code: 'cold-return' });
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
});
test('expired, malformed and provider-mismatched flows are rejected', async () => {
  await beginPendingOAuth('google');
  await expect(completeOAuthCallbackSession({ code: 'wrong-provider', provider: 'kakao' })).rejects.toMatchObject({ code: 'callback_not_expected' });
  jest.advanceTimersByTime(16 * 60_000);
  await expect(completeOAuthCallbackSession({ code: 'expired' })).rejects.toMatchObject({ code: 'callback_not_expected' });
  storage.set(PENDING_OAUTH_KEY, '{broken');
  await expect(completeOAuthCallbackSession({ code: 'malformed' })).rejects.toMatchObject({ code: 'callback_not_expected' });
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
test.each(['google', 'kakao'] as const)('%s cancellation invalidates pending metadata only', async provider => {
  await beginPendingOAuth(provider);
  expect(await consumePendingOAuth(provider)).toBe(provider);
  await expect(completeOAuthCallbackSession({ code: 'cancelled-' + provider })).rejects.toMatchObject({ code: 'callback_not_expected' });
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
});
test('concurrent and repeated delivery exchanges the same code once', async () => {
  const owner = jest.fn(async () => ({ name: 'AppTabs' as const, params: undefined }));
  registerAuthTransitionOwner(owner);
  await beginPendingOAuth('kakao');
  const first = completeOAuthCallbackSession({ code: 'same-code' });
  const second = completeOAuthCallbackSession({ code: 'same-code' });
  expect(first).toBe(second);
  await first;
  await completeOAuthCallbackSession({ code: 'same-code' });
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  expect(owner).toHaveBeenCalledTimes(1);
});
test('invalid verifier never falls back to token exchange', async () => {
  const owner = jest.fn(async () => ({ name: 'AppTabs' as const, params: undefined }));
  registerAuthTransitionOwner(owner);
  await beginPendingOAuth('kakao');
  supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { session: null }, error: { code: 'bad_code_verifier' } });
  await expect(completeOAuthCallbackSession({ code: 'invalid-verifier' })).rejects.toMatchObject({ code: 'session_exchange_failed' });
  expect(supabase.auth.setSession).not.toHaveBeenCalled();
  expect(storage.has(PENDING_OAUTH_KEY)).toBe(false);
  expect(owner).not.toHaveBeenCalled();
});
test('slow exchange cannot expire or accept a different concurrent code', async () => {
  await beginPendingOAuth('kakao');
  let finish: (() => void) | undefined;
  supabase.auth.exchangeCodeForSession.mockReturnValueOnce(new Promise(resolve => {
    finish = () => resolve(success);
  }));
  const first = completeOAuthCallbackSession({ code: 'slow-code' });
  for (let i=0; i<10; i++) await Promise.resolve();
  jest.advanceTimersByTime(120_000);
  expect(completeOAuthCallbackSession({ code: 'slow-code' })).toBe(first);
  await expect(completeOAuthCallbackSession({ code: 'other-code' })).rejects.toMatchObject({ code: 'callback_not_expected' });
  expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  finish?.();
  await first;
});

import { Linking, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { webcrypto } from 'crypto';
// Keep the authorization-origin contract independent of both CI and production inputs.
jest.mock('../src/services/supabase/config', () => ({
  SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_contract_test_public_input',
}));
jest.mock('../src/services/supabase/client', () => ({ supabase: { auth: { signInWithOAuth: jest.fn(), exchangeCodeForSession: jest.fn() } } }));
import { supabase } from '../src/services/supabase/client';
import { completeOAuthCallbackSession, signInWithGoogle, signInWithKakao } from '../src/services/supabase/auth';
import { AUTH_APP_LINK_CALLBACK, LEGACY_AUTH_CALLBACK } from '../src/services/auth/appLinks';
import { markExplicitLogout, clearExplicitLogoutAfterSignIn } from '../src/services/auth/localSession';
import { PENDING_OAUTH_KEY } from '../src/services/auth/pendingOAuth';

describe('provider-specific redirect contract', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    jest.clearAllMocks();
    jest.mocked(supabase.auth.signInWithOAuth).mockImplementation(async ({ provider }) => ({ data: { provider, url: `https://aaaaaaaaaaaaaaaaaaaa.supabase.co/auth/v1/authorize?provider=${provider}&code_challenge_method=s256&code_challenge=${'A'.repeat(43)}` }, error: null }));
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });
  afterEach(async () => {
    delete NativeModules.NuriOAuthBrowser;
    await clearExplicitLogoutAfterSignIn();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  it('Kakao starts Supabase OAuth with the exact HTTPS app callback', async () => {
    await signInWithKakao();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'kakao', options: { redirectTo: AUTH_APP_LINK_CALLBACK, skipBrowserRedirect: true } });
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });
  it('Google retains its existing legacy callback', async () => {
    await signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: LEGACY_AUTH_CALLBACK, skipBrowserRedirect: true } });
  });
  it('uses the provider account picker after explicit logout, without a login hint', async () => {
    await markExplicitLogout();
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('true');
    await signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: LEGACY_AUTH_CALLBACK,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
  });
  it.each(['returned', 'cancelled', 'unsupported'])(
    'uses the Android browser result without double opening: %s',
    async outcome => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const open = jest.fn().mockResolvedValue(outcome);
      NativeModules.NuriOAuthBrowser = { open };
      await signInWithKakao();
      expect(open).toHaveBeenCalledWith(expect.any(String), AUTH_APP_LINK_CALLBACK);
      expect(Linking.openURL).toHaveBeenCalledTimes(outcome === 'unsupported' ? 1 : 0);
      if (outcome === 'cancelled') {
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PENDING_OAUTH_KEY);
      }
    },
  );
  it('accepts the callback while the native result is still pending, but blocks a second login', async () => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
      JSON.stringify({ version: 1, provider: 'kakao', startedAt: Date.now() }),
    );
    jest.mocked(supabase.auth.exchangeCodeForSession).mockRejectedValueOnce(new Error('exchange transport'));
    NativeModules.NuriOAuthBrowser = { open: async () => {
      await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'callback_not_expected' });
      await expect(completeOAuthCallbackSession({ code: 'qa-browser-result' })).rejects.toThrow('exchange transport');
      return 'returned';
    } };
    await signInWithKakao();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
  });
  it.each([
    'https://foreign.example.test/auth/v1/authorize?code_challenge_method=s256',
    'https://aaaaaaaaaaaaaaaaaaaa.supabase.co/auth/v1/authorize?code_challenge_method=plain',
  ])('rejects a foreign origin or downgraded challenge: %s', async url => {
    jest.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: { provider: 'kakao', url }, error: null });
    await expect(signInWithKakao()).rejects.toMatchObject({ code: 'browser_open_failed' });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});

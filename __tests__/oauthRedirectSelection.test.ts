import { Linking } from 'react-native';
import { webcrypto } from 'crypto';
// Keep the authorization-origin contract independent of both CI and production inputs.
jest.mock('../src/services/supabase/config', () => ({
  SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_contract_test_public_input',
}));
jest.mock('../src/services/supabase/client', () => ({ supabase: { auth: { signInWithOAuth: jest.fn() } } }));
import { supabase } from '../src/services/supabase/client';
import { signInWithGoogle, signInWithKakao } from '../src/services/supabase/auth';
import { AUTH_APP_LINK_CALLBACK, LEGACY_AUTH_CALLBACK } from '../src/services/auth/appLinks';

describe('provider-specific redirect contract', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    jest.clearAllMocks();
    jest.mocked(supabase.auth.signInWithOAuth).mockImplementation(async ({ provider }) => ({ data: { provider, url: `https://aaaaaaaaaaaaaaaaaaaa.supabase.co/auth/v1/authorize?provider=${provider}&code_challenge_method=s256&code_challenge=${'A'.repeat(43)}` }, error: null }));
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('Kakao starts Supabase OAuth with the exact HTTPS app callback', async () => {
    await signInWithKakao();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'kakao', options: { redirectTo: AUTH_APP_LINK_CALLBACK, skipBrowserRedirect: true } });
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });
  it('Google retains its existing legacy callback', async () => {
    await signInWithGoogle();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: LEGACY_AUTH_CALLBACK, skipBrowserRedirect: true } });
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

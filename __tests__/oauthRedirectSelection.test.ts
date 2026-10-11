import { Linking } from 'react-native';
import { webcrypto } from 'crypto';
jest.mock('../src/services/supabase/client', () => ({ supabase: { auth: { signInWithOAuth: jest.fn() } } }));
import { supabase } from '../src/services/supabase/client';
import { signInWithGoogle, signInWithKakao } from '../src/services/supabase/auth';
import { AUTH_APP_LINK_CALLBACK, LEGACY_AUTH_CALLBACK } from '../src/services/auth/appLinks';

describe('provider-specific redirect contract', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    jest.clearAllMocks();
    jest.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: { provider: 'kakao', url: `https://grmekesqoydylqmyvfke.supabase.co/auth/v1/authorize?provider=kakao&code_challenge_method=s256&code_challenge=${'A'.repeat(43)}` }, error: null });
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
});

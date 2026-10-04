import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SESSION_STORAGE_KEY, clearExplicitLogoutAfterSignIn, hasExplicitLogout, markExplicitLogout, readPersistedAuthSession } from '../src/services/auth/localSession';

describe('Supabase local session and explicit logout intent', () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([null, '{invalid', '{}', '{"access_token":"only"}'])('does not fabricate a session from %s', async value => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(value);
    expect(await readPersistedAuthSession()).toBeNull();
  });
  it('reads SDK storage without creating a second credential writer', async () => {
    const session = { access_token: 'qa-access', refresh_token: 'qa-refresh', expires_at: 100, user: { id: 'qa-existing' } };
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(session));
    expect(await readPersistedAuthSession()).toEqual(session);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_SESSION_STORAGE_KEY);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
  it('persists logout and clears intent only after successful interactive sign-in', async () => {
    await markExplicitLogout();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('NURI_AUTH_EXPLICIT_LOGOUT_V1', 'true');
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');
    expect(await hasExplicitLogout()).toBe(true);
    await clearExplicitLogoutAfterSignIn();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('NURI_AUTH_EXPLICIT_LOGOUT_V1');
  });
});

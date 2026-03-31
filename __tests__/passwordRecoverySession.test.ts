jest.mock('../src/services/supabase/auth', () => ({
  clearLocalAuthSession: jest.fn(() => Promise.resolve()),
  deleteMyAccount: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  signOutBestEffort: jest.fn(),
}));

jest.mock('../src/services/local/placeTravelSearch', () => ({
  clearAllRecentPersonalSearches: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
  setMonitoringUser: jest.fn(),
}));

import type { Session } from '@supabase/supabase-js';

import { disposePasswordRecoverySession } from '../src/services/auth/session';
import { useAuthStore } from '../src/store/authStore';
import { signOut, clearLocalAuthSession } from '../src/services/supabase/auth';

function createSession(userId = 'user-1'): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_762_000_000,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'qa@example.com',
      email_confirmed_at: '2026-03-31T00:00:00.000Z',
      phone: '',
      confirmed_at: '2026-03-31T00:00:00.000Z',
      last_sign_in_at: '2026-03-31T00:00:00.000Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z',
      is_anonymous: false,
    },
  } as Session;
}

describe('disposePasswordRecoverySession', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useAuthStore.getState().signOutLocal();
    useAuthStore.setState({
      booted: true,
      isLoggedIn: true,
      passwordRecoveryFlow: {
        status: 'active',
        startedAt: Date.now(),
      },
      profile: { nickname: '누리', role: 'user' },
      profileSyncStatus: 'ready',
      session: createSession(),
      status: 'logged_in',
    });
  });

  it('recovery cleanup은 flag와 local session을 같이 정리한다', async () => {
    await disposePasswordRecoverySession();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearLocalAuthSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().passwordRecoveryFlow).toEqual({
      status: 'inactive',
      startedAt: null,
    });
    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });
});

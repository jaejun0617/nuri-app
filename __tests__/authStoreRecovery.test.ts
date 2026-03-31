import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { useAuthStore } from '../src/store/authStore';

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

describe('authStore password recovery guard', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useAuthStore.getState().signOutLocal();
    useAuthStore.setState({ booted: false });
  });

  it('hydrate는 유효한 recovery flag를 복원한다', async () => {
    const startedAt = Date.now();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nuri.auth.passwordRecovery.v1') {
        return Promise.resolve(
          JSON.stringify({
            status: 'active',
            startedAt,
          }),
        );
      }

      return Promise.resolve(null);
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().passwordRecoveryFlow).toEqual({
      status: 'active',
      startedAt,
    });
  });

  it('hydrate는 만료된 recovery flag를 제거한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nuri.auth.passwordRecovery.v1') {
        return Promise.resolve(
          JSON.stringify({
            status: 'active',
            startedAt: Date.now() - 31 * 60 * 1000,
          }),
        );
      }

      return Promise.resolve(null);
    });

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().passwordRecoveryFlow).toEqual({
      status: 'inactive',
      startedAt: null,
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      'nuri.auth.passwordRecovery.v1',
    );
  });

  it('recovery flag가 active면 세션을 넣어도 logged_in으로 승격하지 않는다', async () => {
    await useAuthStore.getState().activatePasswordRecovery();
    await useAuthStore.getState().setSession(createSession());

    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('local sign out은 recovery flag까지 함께 정리한다', async () => {
    await useAuthStore.getState().activatePasswordRecovery();
    await useAuthStore.getState().signOutLocal();

    expect(useAuthStore.getState().passwordRecoveryFlow).toEqual({
      status: 'inactive',
      startedAt: null,
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      'nuri.auth.passwordRecovery.v1',
    );
  });
});

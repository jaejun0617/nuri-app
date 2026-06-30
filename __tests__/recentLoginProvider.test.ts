import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import {
  clearRecentLoginProvider,
  getRecentLoginProvider,
  normalizeRecentLoginProvider,
  RECENT_LOGIN_PROVIDER_STORAGE_KEY_FOR_TEST,
  rememberRecentLoginProviderFromSession,
  resolveRecentLoginProviderFromSession,
  setRecentLoginProvider,
} from '../src/services/auth/recentLoginProvider';

function createSession(provider: string, email = 'qa@example.com'): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1_762_000_000,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: '2026-03-31T00:00:00.000Z',
      phone: '',
      confirmed_at: '2026-03-31T00:00:00.000Z',
      last_sign_in_at: '2026-03-31T00:00:00.000Z',
      app_metadata: { provider, providers: [provider] },
      user_metadata: {},
      identities: [{ provider }],
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z',
      is_anonymous: false,
    },
  } as Session;
}

describe('recent login provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('허용 provider만 정규화한다', () => {
    expect(normalizeRecentLoginProvider('email')).toBe('email');
    expect(normalizeRecentLoginProvider('google')).toBe('google');
    expect(normalizeRecentLoginProvider('kakao')).toBe('kakao');
    expect(normalizeRecentLoginProvider('naver')).toBeNull();
    expect(normalizeRecentLoginProvider('apple')).toBeNull();
  });

  it('세션에서 최근 로그인 provider를 읽고 민감 정보 없이 저장한다', async () => {
    const session = createSession('google');

    expect(resolveRecentLoginProviderFromSession(session)).toBe('google');

    await rememberRecentLoginProviderFromSession(session);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      RECENT_LOGIN_PROVIDER_STORAGE_KEY_FOR_TEST,
      'google',
    );
  });

  it('이메일 세션은 provider가 명확할 때만 email로 저장한다', () => {
    const session = createSession('email');

    expect(resolveRecentLoginProviderFromSession(session)).toBe('email');
  });

  it('알 수 없는 provider는 이메일 주소가 있어도 표시하지 않는다', () => {
    const session = createSession('unknown');

    expect(resolveRecentLoginProviderFromSession(session)).toBeNull();
  });

  it('저장/조회/삭제는 provider key만 사용한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('kakao');

    await setRecentLoginProvider('kakao');
    await expect(getRecentLoginProvider()).resolves.toBe('kakao');
    await clearRecentLoginProvider();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      RECENT_LOGIN_PROVIDER_STORAGE_KEY_FOR_TEST,
      'kakao',
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      RECENT_LOGIN_PROVIDER_STORAGE_KEY_FOR_TEST,
    );
  });
});

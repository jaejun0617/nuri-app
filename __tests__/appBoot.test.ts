import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import {
  createBootTimeoutError,
  resolveBootRoute,
  shouldKeepGuestSandboxForRecovery,
  shouldReloadUserScopedState,
  withTimeout,
} from '../src/services/app/boot';
import { usePetStore } from '../src/store/petStore';

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

describe('app boot helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePetStore.getState().clear();
  });

  it('same-user token refresh에서는 user-scoped reload를 건너뛴다', () => {
    expect(
      shouldReloadUserScopedState({
        event: 'TOKEN_REFRESHED',
        prevUserId: 'user-1',
        nextUserId: 'user-1',
      }),
    ).toBe(false);

    expect(
      shouldReloadUserScopedState({
        event: 'SIGNED_OUT',
        prevUserId: 'user-1',
        nextUserId: null,
      }),
    ).toBe(true);
  });

  it('닉네임/펫 fetch 실패 상태를 온보딩 미완료와 구분해 route를 계산한다', () => {
    expect(
      resolveBootRoute({
        isLoggedIn: true,
        nickname: null,
        profileSyncStatus: 'error',
        petsCount: 0,
        petErrorMessage: '반려동물 목록 동기화 실패',
      }),
    ).toEqual({ name: 'AppTabs', params: undefined });

    expect(
      resolveBootRoute({
        isLoggedIn: true,
        nickname: null,
        profileSyncStatus: 'ready',
        petsCount: 0,
        petErrorMessage: null,
      }),
    ).toEqual({ name: 'NicknameSetup', params: undefined });
  });

  it('password recovery 중에는 로그인 bootstrap 대신 SignIn으로 되돌린다', () => {
    expect(
      resolveBootRoute({
        isLoggedIn: true,
        nickname: '누리',
        profileSyncStatus: 'ready',
        petsCount: 2,
        petErrorMessage: null,
        passwordRecoveryFlow: {
          status: 'active',
          startedAt: Date.now(),
        },
      }),
    ).toEqual({ name: 'SignIn', params: undefined });
  });

  it('recovery 세션은 사용자 세션이 있어도 guest sandbox에 머문다', () => {
    expect(
      shouldKeepGuestSandboxForRecovery({
        passwordRecoveryFlow: {
          status: 'active',
          startedAt: Date.now(),
        },
        session: createSession(),
      }),
    ).toBe(true);

    expect(
      shouldKeepGuestSandboxForRecovery({
        passwordRecoveryFlow: {
          status: 'active',
          startedAt: Date.now(),
        },
        session: null,
      }),
    ).toBe(false);
  });

  it('selectedPetId hydrate는 1회만 수행해 런타임 선택값을 다시 덮어쓰지 않는다', async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce('pet-1')
      .mockResolvedValueOnce('pet-2');

    await usePetStore.getState().hydrateSelectedPetId();
    usePetStore.getState().setPets([
      { id: 'pet-1', name: '하나' },
      { id: 'pet-2', name: '둘' },
    ]);
    usePetStore.getState().selectPet('pet-1');
    await usePetStore.getState().hydrateSelectedPetId();

    expect(usePetStore.getState().selectedPetId).toBe('pet-1');
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it('동일 사용자 pets 캐시는 리로드 후에도 selectedPetId와 함께 복원된다', async () => {
    usePetStore.getState().setPets(
      [
        { id: 'pet-1', name: '하나' },
        { id: 'pet-2', name: '둘' },
      ],
      { userId: 'user-1' },
    );
    usePetStore.getState().selectPet('pet-2');
    usePetStore.getState().clear();

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'nuri.selectedPetId.v1') {
        return Promise.resolve('pet-2');
      }
      if (key === 'nuri.pets.cache.v1') {
        return Promise.resolve(
          JSON.stringify({
            userId: 'user-1',
            pets: [
              { id: 'pet-1', name: '하나' },
              { id: 'pet-2', name: '둘' },
            ],
          }),
        );
      }
      return Promise.resolve(null);
    });

    await usePetStore.getState().hydrateSelectedPetId();
    const cachedPets = await usePetStore.getState().hydratePetsCache('user-1');

    expect(cachedPets).toHaveLength(2);
    expect(usePetStore.getState().pets).toHaveLength(2);
    expect(usePetStore.getState().selectedPetId).toBe('pet-2');
  });

  it('boot timeout helper는 지연된 작업을 에러로 끊는다', async () => {
    await expect(
      withTimeout(
        new Promise(() => {}),
        10,
        'boot-check',
      ),
    ).rejects.toEqual(createBootTimeoutError('boot-check', 10));
  });
});

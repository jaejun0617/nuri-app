import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

jest.mock('../src/services/auth/session', () => ({
  createAuthBoundaryCleanupQueue: jest.fn(),
  shouldClearAuthBoundScheduleNotifications: jest.fn(),
}));

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../src/services/supabase/profile', () => ({
  fetchMyProfile: jest.fn(),
}));

jest.mock('../src/services/supabase/pets', () => ({
  fetchMyPets: jest.fn(),
}));

jest.mock('../src/services/supabase/auth', () => ({
  fetchMyAccountDeletionGate: jest.fn(),
}));

jest.mock('../src/services/legal/consents', () => ({
  flushPendingConsentSnapshot: jest.fn(),
}));

jest.mock('../src/services/local/uploadQueue', () => ({
  processPendingMemoryUploads: jest.fn(),
}));

jest.mock('../src/services/supabase/storageMemories', () => ({
  clearMemorySignedUrlCache: jest.fn(),
}));

jest.mock('../src/services/supabase/storageCommunity', () => ({
  flushPendingCommunityImageCleanup: jest.fn(),
}));

jest.mock('../src/services/local/homeRecordScheduleCache', () => ({
  clearAllHomeRecordScheduleCaches: jest.fn(),
}));

jest.mock('../src/services/monitoring/sentry', () => ({
  captureMonitoringException: jest.fn(),
  setMonitoringUser: jest.fn(),
}));

jest.mock('../src/store/uiStore', () => ({
  showToast: jest.fn(),
}));

jest.mock('../src/store/authStore', () => {
  const state = {
    session: null as unknown,
    passwordRecoveryFlow: { status: 'inactive', startedAt: null },
    accountDeletionGate: null as unknown,
    hydrate: jest.fn(() => Promise.resolve()),
    setSession: jest.fn(async (session: unknown) => {
      state.session = session;
    }),
    setProfile: jest.fn(() => Promise.resolve()),
    setProfileSyncState: jest.fn(),
    setAccountDeletionGate: jest.fn((gate: unknown) => {
      state.accountDeletionGate = gate as unknown;
    }),
    setBooted: jest.fn(),
  };

  const useAuthStore = Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    {
      getState: () => state,
      subscribe: jest.fn(() => jest.fn()),
    },
  );

  return { useAuthStore };
});

jest.mock('../src/store/petStore', () => {
  const state = {
    pets: [] as Array<{ id: string; name: string }>,
    selectedPetId: null as string | null,
    hydrateSelectedPetId: jest.fn(() => Promise.resolve()),
    hydratePetsCache: jest.fn(() => Promise.resolve([])),
    setPets: jest.fn((pets: Array<{ id: string; name: string }>) => {
      state.pets = pets;
    }),
    setLoading: jest.fn(),
    setBooted: jest.fn(),
    setErrorMessage: jest.fn(),
  };

  const usePetStore = Object.assign(
    (selector: (value: typeof state) => unknown) => selector(state),
    { getState: () => state },
  );

  return {
    resolveSelectedPetId: jest.fn(() => null),
    usePetStore,
  };
});

jest.mock('../src/store/recordStore', () => {
  const actions = {
    clearAll: jest.fn(),
    refresh: jest.fn(() => Promise.resolve()),
    clearPet: jest.fn(),
    bootstrap: jest.fn(() => Promise.resolve()),
  };
  const useRecordStore = Object.assign(
    (selector: (value: typeof actions) => unknown) => selector(actions),
    { getState: () => actions },
  );
  return { useRecordStore };
});

jest.mock('../src/store/scheduleStore', () => {
  const actions = {
    clearAll: jest.fn(),
    clearPet: jest.fn(),
    bootstrap: jest.fn(() => Promise.resolve()),
  };
  const useScheduleStore = Object.assign(
    (selector: (value: typeof actions) => unknown) => selector(actions),
    { getState: () => actions },
  );
  return { useScheduleStore };
});

jest.mock('../src/store/communityStore', () => {
  const actions = { clearAll: jest.fn() };
  const useCommunityStore = Object.assign(
    (selector: (value: typeof actions) => unknown) => selector(actions),
    { getState: () => actions },
  );
  return { useCommunityStore };
});

import AppProviders from '../src/app/providers/AppProviders';
import {
  createAuthBoundaryCleanupQueue,
  shouldClearAuthBoundScheduleNotifications,
} from '../src/services/auth/session';
import { supabase } from '../src/services/supabase/client';
import { fetchMyProfile } from '../src/services/supabase/profile';
import { fetchMyPets } from '../src/services/supabase/pets';
import { useAuthStore } from '../src/store/authStore';

type AuthStateCallback = Parameters<typeof supabase.auth.onAuthStateChange>[0];

function createSession(userId: string): Session {
  return {
    access_token: `access-${userId}`,
    refresh_token: `refresh-${userId}`,
    expires_in: 3600,
    expires_at: 1_762_000_000,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userId}@example.com`,
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

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(nextResolve => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createBoundaryQueue(cleanup: () => Promise<void>) {
  let tail = Promise.resolve();
  const waitForBoundary = jest.fn((shouldCleanup: boolean) => {
    const next = tail.then(async () => {
      if (shouldCleanup) await cleanup();
    });
    tail = next.catch(() => undefined);
    return next;
  });
  return { waitForBoundary };
}

describe('AppProviders auth boundary notification cleanup', () => {
  let authStateCallback: AuthStateCallback | null = null;
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  const mockGetSession = jest.mocked(supabase.auth.getSession);
  const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange);
  const mockFetchMyProfile = jest.mocked(fetchMyProfile);
  const mockFetchMyPets = jest.mocked(fetchMyPets);
  const mockCreateQueue = jest.mocked(createAuthBoundaryCleanupQueue);
  const mockShouldClear = jest.mocked(
    shouldClearAuthBoundScheduleNotifications,
  );
  const mockSetSession = jest.mocked(useAuthStore.getState().setSession);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    authStateCallback = null;
    renderer = null;

    useAuthStore.getState().session = null;
    useAuthStore.getState().passwordRecoveryFlow = {
      status: 'inactive',
      startedAt: null,
    };
    useAuthStore.getState().accountDeletionGate = null;

    mockGetSession.mockReturnValue(new Promise(() => {}));
    mockOnAuthStateChange.mockImplementation(callback => {
      authStateCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
    });
    mockFetchMyProfile.mockImplementation(async () => ({
      nickname: '누리',
      role: 'user',
    }));
    mockFetchMyPets.mockResolvedValue([]);
    mockShouldClear.mockImplementation(
      ({ event, previousUserId, nextUserId }) =>
        event === 'boot'
          ? !nextUserId
          : Boolean(previousUserId && previousUserId !== nextUserId),
    );
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => {
        renderer?.unmount();
        await Promise.resolve();
      });
    }
    jest.useRealTimers();
  });

  async function renderProvider() {
    await act(async () => {
      renderer = TestRenderer.create(
        <AppProviders>
          <React.Fragment />
        </AppProviders>,
      );
      await Promise.resolve();
    });
  }

  async function emitAuthEvent(
    event: AuthChangeEvent,
    session: Session | null,
  ) {
    await act(async () => {
      authStateCallback?.(event, session);
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
  }

  it('keeps B alarms during a pending B bootstrap when B emits TOKEN_REFRESHED', async () => {
    const cleanupDeferred = createDeferred<void>();
    const cleanup = jest.fn(() => cleanupDeferred.promise);
    mockCreateQueue.mockReturnValue(createBoundaryQueue(cleanup));

    const sessionA = createSession('user-a');
    const sessionB = createSession('user-b');
    const profileB = createDeferred<{ nickname: string; role: 'user' }>();
    mockFetchMyProfile.mockImplementation((userIdInput?: string | null) => {
      const userId = userIdInput ?? '';
      return userId === 'user-a'
        ? Promise.resolve({ nickname: 'A', role: 'user' })
        : profileB.promise;
    });

    await renderProvider();
    await emitAuthEvent('SIGNED_IN', sessionA);
    await emitAuthEvent('SIGNED_IN', sessionB);

    expect(mockSetSession).toHaveBeenCalledTimes(1);

    cleanupDeferred.resolve();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetSession).toHaveBeenLastCalledWith(sessionB);
    expect(useAuthStore.getState().session?.user.id).toBe('user-b');

    await emitAuthEvent('TOKEN_REFRESHED', sessionB);

    expect(cleanup).toHaveBeenCalledTimes(1);

    profileB.resolve({ nickname: 'B', role: 'user' });
  });

  it('drops a stale queued session and publishes only the latest session after cleanup', async () => {
    const cleanupDeferred = createDeferred<void>();
    const cleanup = jest.fn(() => cleanupDeferred.promise);
    mockCreateQueue.mockReturnValue(createBoundaryQueue(cleanup));

    const sessionA = createSession('user-a');
    const sessionB = createSession('user-b');
    const sessionC = createSession('user-c');

    await renderProvider();
    await emitAuthEvent('SIGNED_IN', sessionA);
    await emitAuthEvent('SIGNED_IN', sessionB);
    await emitAuthEvent('SIGNED_IN', sessionC);

    expect(mockSetSession).toHaveBeenCalledTimes(1);
    expect(mockSetSession).toHaveBeenLastCalledWith(sessionA);

    cleanupDeferred.resolve();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetSession).not.toHaveBeenCalledWith(sessionB);
    expect(mockSetSession).toHaveBeenLastCalledWith(sessionC);
    expect(useAuthStore.getState().session?.user.id).toBe('user-c');
  });
});

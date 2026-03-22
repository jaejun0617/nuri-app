// 파일: src/app/providers/AppProviders.tsx
// 파일 목적:
// - 앱 전역 Provider를 묶고, 로그인 사용자 기준 부트스트랩 순서를 한 곳에서 통제한다.
// 어디서 쓰이는지:
// - App.tsx에서 NavigationContainer를 감싸는 최상위 provider로 사용된다.
// 핵심 역할:
// - ThemeProvider와 QueryClientProvider를 제공한다.
// - 세션 확인, 프로필 조회, 펫 목록 hydrate, 선택 펫 복원, auth 이벤트 동기화를 처리한다.
// - 로그아웃/계정 전환 시 pets, records, schedules, signed URL 캐시를 정리한다.
// 데이터·상태 흐름:
// - Supabase 세션/프로필/펫 데이터를 읽어 authStore, petStore, recordStore, scheduleStore의 초기 상태를 맞춘다.
// - 앱 활성화 시 미처리 동의서 flush와 메모리 이미지 업로드 큐 복구도 여기서 트리거된다.
// 수정 시 주의:
// - 부트 순서와 timeout/fallback 정책을 바꾸면 Splash 이후 진입 가드가 쉽게 어긋난다.
// - 여러 store를 동시에 만지는 파일이므로 selector 범위와 effect 의존성을 넓히면 불필요한 재실행과 회귀가 커진다.

import React, { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

import { supabase } from '../../services/supabase/client';
import { fetchMyProfile } from '../../services/supabase/profile';
import { fetchMyPets } from '../../services/supabase/pets';
import {
  captureMonitoringException,
  setMonitoringUser,
} from '../../services/monitoring/sentry';
import { flushPendingConsentSnapshot } from '../../services/legal/consents';
import { processPendingMemoryUploads } from '../../services/local/uploadQueue';
import { clearMemorySignedUrlCache } from '../../services/supabase/storageMemories';
import { flushPendingCommunityImageCleanup } from '../../services/supabase/storageCommunity';
import {
  getSessionUserId,
  shouldReloadUserScopedState,
  withTimeout,
} from '../../services/app/boot';
import { showToast } from '../../store/uiStore';

import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore, type Pet } from '../../store/petStore';
import { useCommunityStore } from '../../store/communityStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';

type Props = {
  children: React.ReactNode;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

const LOCAL_HYDRATION_TIMEOUT_MS = 3_000;
const SESSION_READ_TIMEOUT_MS = 4_000;
const SESSION_VALIDATE_TIMEOUT_MS = 5_000;
const USER_SCOPED_FETCH_TIMEOUT_MS = 6_000;

export default function AppProviders({ children }: Props) {
  // ---------------------------------------------------------
  // 0) Theme
  // ---------------------------------------------------------
  const { mode } = useThemeMode({ followSystem: false, defaultMode: 'light' });
  const theme = useMemo(() => createTheme(mode), [mode]);

  // ---------------------------------------------------------
  // 1) stores
  // ---------------------------------------------------------
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const setSession = useAuthStore(s => s.setSession);
  const setProfile = useAuthStore(s => s.setProfile);
  const setProfileSyncState = useAuthStore(s => s.setProfileSyncState);
  const setAuthBooted = useAuthStore(s => s.setBooted);

  const hydrateSelectedPetId = usePetStore(s => s.hydrateSelectedPetId);
  const hydratePetsCache = usePetStore(s => s.hydratePetsCache);
  const setPets = usePetStore(s => s.setPets);
  const setPetLoading = usePetStore(s => s.setLoading);
  const setPetBooted = usePetStore(s => s.setBooted);
  const setPetErrorMessage = usePetStore(s => s.setErrorMessage);

  const clearRecords = useRecordStore(s => s.clearAll);
  const refreshRecords = useRecordStore(s => s.refresh);
  const clearSchedules = useScheduleStore(s => s.clearAll);
  const clearCommunity = useCommunityStore(s => s.clearAll);
  const transitionSeqRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  const localHydrationPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const processDeferredTasks = async () => {
      const session = useAuthStore.getState().session;
      const userId = session?.user?.id ?? null;
      if (!userId) return;

      try {
        await flushPendingConsentSnapshot(userId);
      } catch (error: unknown) {
        captureMonitoringException(error);
      }

      try {
        const result = await processPendingMemoryUploads({ userId });
        if (result.succeeded > 0) {
          result.touchedPetIds.forEach(petId => {
            refreshRecords(petId).catch(() => {});
          });
          showToast({
            tone: 'success',
            title: '업로드 복구 완료',
            message: `${result.succeeded}건의 대기 이미지 업로드를 마쳤어요.`,
            durationMs: 2800,
          });
        }
      } catch (error: unknown) {
        captureMonitoringException(error);
      }

      try {
        await flushPendingCommunityImageCleanup();
      } catch (error: unknown) {
        captureMonitoringException(error);
      }
    };

    processDeferredTasks().catch(() => {});

    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      processDeferredTasks().catch(() => {});
    });

    return () => {
      sub.remove();
    };
  }, [refreshRecords]);

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;
    let alive = true;

    const resolveValidSession = async () => {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_READ_TIMEOUT_MS,
        'auth.getSession',
      );
      const session = data.session ?? null;
      if (!session) return null;

      const userResult = await withTimeout(
        supabase.auth.getUser(),
        SESSION_VALIDATE_TIMEOUT_MS,
        'auth.getUser',
      ).catch(error => {
        captureMonitoringException(error);
        return null;
      });

      if (!userResult) {
        return session;
      }

      const { data: userData, error: userError } = userResult;
      if (userError || !userData.user) {
        await supabase.auth.signOut();
        return null;
      }

      return session;
    };

    const beginTransition = () => {
      setAuthBooted(false);
      setPetBooted(false);
      setPetLoading(true);
    };

    const finishTransition = (seq: number) => {
      if (!alive || transitionSeqRef.current !== seq) return;
      setAuthBooted(true);
      setPetBooted(true);
    };

    const clearUserScopedStores = () => {
      clearMemorySignedUrlCache();
      setPets([], { userId: null });
      clearRecords();
      clearSchedules();
      clearCommunity();
      setPetErrorMessage(null);
    };

    const pruneRemovedPetScopedState = (prevPets: Pet[], nextPets: Pet[]) => {
      const nextPetIdSet = new Set(nextPets.map(pet => pet.id));
      const recordStore = useRecordStore.getState();
      const scheduleStore = useScheduleStore.getState();

      prevPets.forEach(pet => {
        if (nextPetIdSet.has(pet.id)) return;
        recordStore.clearPet(pet.id);
        scheduleStore.clearPet(pet.id);
      });
    };

    const warmSelectedPetScopedState = () => {
      const petState = usePetStore.getState();
      const nextSelectedPetId = resolveSelectedPetId(
        petState.pets,
        petState.selectedPetId,
      );
      if (!nextSelectedPetId) return;

      useRecordStore.getState().bootstrap(nextSelectedPetId).catch(() => {});
      useScheduleStore.getState().bootstrap(nextSelectedPetId).catch(() => {});
    };

    const loadUserScopedState = async (userId: string) => {
      setProfileSyncState('loading');
      setPetLoading(true);

      const fetchPetsSafely = async () => {
        const first = await withTimeout(
          fetchMyPets(userId),
          USER_SCOPED_FETCH_TIMEOUT_MS,
          'fetchMyPets',
        );

        if (first.length > 0) {
          return first;
        }

        const { data: validatedUser } = await withTimeout(
          supabase.auth.getUser(),
          SESSION_VALIDATE_TIMEOUT_MS,
          'auth.getUser(pets retry)',
        );
        if (validatedUser.user?.id !== userId) {
          return first;
        }

        return withTimeout(
          fetchMyPets(userId),
          USER_SCOPED_FETCH_TIMEOUT_MS,
          'fetchMyPets(retry)',
        );
      };

      const [profileResult, petsResult] = await Promise.allSettled([
        withTimeout(
          fetchMyProfile(userId),
          USER_SCOPED_FETCH_TIMEOUT_MS,
          'fetchMyProfile',
        ),
        fetchPetsSafely(),
      ]);

      return { profileResult, petsResult };
    };

    const applyGuestState = async (seq: number) => {
      await setProfile({ nickname: null, role: 'user' });
      setProfileSyncState('ready');
      clearUserScopedStores();
      setPetLoading(false);
      lastUserIdRef.current = null;
      finishTransition(seq);
    };

    const applyLoggedInState = async (
      session: Session,
      seq: number,
      options: { forceReload: boolean },
    ) => {
      const userId = getSessionUserId(session);
      if (!userId) {
        await applyGuestState(seq);
        return;
      }

      const prevUserId = lastUserIdRef.current;
      const didUserChange = !!prevUserId && prevUserId !== userId;
      if (didUserChange) {
        await setProfile({ nickname: null, role: 'user' });
        clearUserScopedStores();
      }

      const shouldReload = options.forceReload || lastUserIdRef.current !== userId;
      const cachedPets = await hydratePetsCache(userId);
      if (cachedPets.length > 0) {
        warmSelectedPetScopedState();
      }
      if (!shouldReload) {
        setProfileSyncState('ready');
        setPetErrorMessage(null);
        setPetLoading(false);
        warmSelectedPetScopedState();
        lastUserIdRef.current = userId;
        finishTransition(seq);
        return;
      }

      const { profileResult, petsResult } = await loadUserScopedState(userId);
      if (!alive || transitionSeqRef.current !== seq) return;

      try {
        if (profileResult.status === 'fulfilled') {
          await setProfile(profileResult.value);
          setProfileSyncState('ready');
        } else {
          captureMonitoringException(profileResult.reason);
          setProfileSyncState('error', '프로필 동기화 실패');
        }

        if (petsResult.status === 'fulfilled') {
          const pets = petsResult.value;
          const prevPets = usePetStore.getState().pets;
          setPets(pets, { userId });
          pruneRemovedPetScopedState(prevPets, pets);
          setPetErrorMessage(null);
          warmSelectedPetScopedState();
        } else {
          captureMonitoringException(petsResult.reason);
          if (cachedPets.length > 0) {
            setPetErrorMessage('최근 반려동물 목록을 먼저 보여드리고 있어요');
            warmSelectedPetScopedState();
          } else {
            const prevPets = usePetStore.getState().pets;
            setPets([], { userId });
            pruneRemovedPetScopedState(prevPets, []);
            setPetErrorMessage('반려동물 목록 동기화 실패');
          }
        }
      } finally {
        setPetLoading(false);
      }

      lastUserIdRef.current = userId;
      finishTransition(seq);
    };

    const applySessionTransition = async (
      event: AuthChangeEvent | 'boot',
      session: Session | null,
    ) => {
      const seq = transitionSeqRef.current + 1;
      transitionSeqRef.current = seq;
      beginTransition();

      await setSession(session);
      setMonitoringUser({
        id: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });

      if (!session) {
        await applyGuestState(seq);
        return;
      }

      await applyLoggedInState(session, seq, {
        forceReload: shouldReloadUserScopedState({
          event,
          prevUserId: lastUserIdRef.current,
          nextUserId: getSessionUserId(session),
        }),
      });
    };

    const boot = async () => {
      localHydrationPromiseRef.current = withTimeout(
        Promise.all([hydrateAuth(), hydrateSelectedPetId()]).then(() => undefined),
        LOCAL_HYDRATION_TIMEOUT_MS,
        'local hydration',
      ).catch(error => {
        captureMonitoringException(error);
      });
      await localHydrationPromiseRef.current;

      const session = await resolveValidSession();
      await applySessionTransition('boot', session);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        try {
          await localHydrationPromiseRef.current;
          const resolvedSession = nextSession?.user
            ? nextSession
            : await resolveValidSession();
          await applySessionTransition(event, resolvedSession);
        } catch (error: unknown) {
          captureMonitoringException(error);
          setAuthBooted(true);
          setPetBooted(true);
          setPetLoading(false);
        }
      },
    );

    unsub = listener.subscription;

    boot().catch(error => {
      captureMonitoringException(error);
      const message =
        error instanceof Error && error.message.includes('timed out')
          ? '앱 준비가 지연되고 있어요'
          : '앱 부트 실패';
      setProfileSyncState('error', message);
      setPetErrorMessage(message);
      setPetLoading(false);
      setAuthBooted(true);
      setPetBooted(true);
    });

    return () => {
      alive = false;
      if (unsub) unsub.unsubscribe();
    };
  }, [
    hydrateAuth,
    setSession,
    setProfile,
    setProfileSyncState,
    setAuthBooted,

    hydrateSelectedPetId,
    hydratePetsCache,
    setPets,
    setPetLoading,
    setPetBooted,
    setPetErrorMessage,

    clearRecords,
    clearSchedules,
    clearCommunity,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

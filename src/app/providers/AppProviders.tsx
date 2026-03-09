// 파일: src/app/providers/AppProviders.tsx
// 목적:
// - ThemeProvider
// - 앱 부트 시퀀스(세션/닉네임/펫/선택펫) 정렬
// - auth 이벤트 동기화
// - 로그아웃 시 pets/records 정리
//
// ✅ Chapter 5 반영
// - recordStore 전체 구독(useRecordStore()) 제거
// - clearAll만 selector로 구독하여 불필요 렌더/스냅샷 변동 리스크 최소화

import React, { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';

import { supabase } from '../../services/supabase/client';
import { fetchMyNickname } from '../../services/supabase/profile';
import { fetchMyPets } from '../../services/supabase/pets';
import {
  captureMonitoringException,
  setMonitoringUser,
} from '../../services/monitoring/sentry';
import { flushPendingConsentSnapshot } from '../../services/legal/consents';
import { processPendingMemoryUploads } from '../../services/local/uploadQueue';
import {
  getSessionUserId,
  shouldReloadUserScopedState,
  withTimeout,
} from '../../services/app/boot';
import { showToast } from '../../store/uiStore';

import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
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
  const { mode } = useThemeMode({ followSystem: true, defaultMode: 'dark' });
  const theme = useMemo(() => createTheme(mode), [mode]);

  // ---------------------------------------------------------
  // 1) stores
  // ---------------------------------------------------------
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const setSession = useAuthStore(s => s.setSession);
  const setNickname = useAuthStore(s => s.setNickname);
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
        const result = await processPendingMemoryUploads();
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
      setPets([], { userId: null });
      clearRecords();
      clearSchedules();
      setPetErrorMessage(null);
    };

    const loadUserScopedState = async (userId: string) => {
      setProfileSyncState('loading');
      setPetLoading(true);

      const currentSelectedPetId = usePetStore.getState().selectedPetId;
      const cachedPets = usePetStore.getState().pets;

      const fetchPetsSafely = async () => {
        const first = await withTimeout(
          fetchMyPets(userId),
          USER_SCOPED_FETCH_TIMEOUT_MS,
          'fetchMyPets',
        );

        if (
          first.length > 0 ||
          (!currentSelectedPetId && cachedPets.length === 0)
        ) {
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

      const [nicknameResult, petsResult] = await Promise.allSettled([
        withTimeout(
          fetchMyNickname(userId),
          USER_SCOPED_FETCH_TIMEOUT_MS,
          'fetchMyNickname',
        ),
        fetchPetsSafely(),
      ]);

      return { nicknameResult, petsResult };
    };

    const applyGuestState = async (seq: number) => {
      await setNickname(null);
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

      const shouldReload = options.forceReload || lastUserIdRef.current !== userId;
      await hydratePetsCache(userId);
      if (!shouldReload) {
        setProfileSyncState('ready');
        setPetErrorMessage(null);
        lastUserIdRef.current = userId;
        finishTransition(seq);
        return;
      }

      const { nicknameResult, petsResult } = await loadUserScopedState(userId);
      if (!alive || transitionSeqRef.current !== seq) return;

      try {
        if (nicknameResult.status === 'fulfilled') {
          await setNickname(nicknameResult.value);
          setProfileSyncState('ready');
        } else {
          captureMonitoringException(nicknameResult.reason);
          setProfileSyncState('error', '닉네임 동기화 실패');
        }

        if (petsResult.status === 'fulfilled') {
          const pets = petsResult.value;
          if (pets.length === 0 && usePetStore.getState().pets.length > 0) {
            setPetErrorMessage('반려동물 목록 재동기화가 지연되고 있어요');
          } else {
            setPets(pets, { userId });
            setPetErrorMessage(null);
          }
        } else {
          captureMonitoringException(petsResult.reason);
          setPetErrorMessage('반려동물 목록 동기화 실패');
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
    setNickname,
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
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

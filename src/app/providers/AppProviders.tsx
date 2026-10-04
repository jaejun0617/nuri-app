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
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../theme/theme';
import { useThemeMode } from '../theme/useThemeMode';
import { AppFontPreferenceProvider } from './AppFontPreferenceProvider';
import { SeasonPreferenceProvider } from './SeasonPreferenceProvider';

import { supabase } from '../../services/supabase/client';
import { resolveAuthBoot, type AuthBootDecision } from '../../services/auth/bootstrap';
import {
  hasExplicitLogout,
  markExplicitLogout,
  readPersistedAuthSession,
} from '../../services/auth/localSession';
import { fetchMyProfile } from '../../services/supabase/profile';
import { fetchMyPets } from '../../services/supabase/pets';
import {
  fetchMyAccountDeletionGate,
  type AccountDeletionGate,
} from '../../services/supabase/auth';
import {
  captureMonitoringException,
  setMonitoringUser,
} from '../../services/monitoring/sentry';
import { flushPendingConsentSnapshot } from '../../services/legal/consents';
import { processPendingMemoryUploads } from '../../services/local/uploadQueue';
import { clearMemorySignedUrlCache } from '../../services/supabase/storageMemories';
import { flushPendingCommunityImageCleanup } from '../../services/supabase/storageCommunity';
import { clearAllHomeRecordScheduleCaches } from '../../services/local/homeRecordScheduleCache';
import {
  getSessionUserId,
  shouldKeepGuestSandboxForRecovery,
  shouldReloadUserScopedState,
  withTimeout,
} from '../../services/app/boot';
import {
  createAuthBoundaryCleanupQueue,
  shouldClearAuthBoundScheduleNotifications,
} from '../../services/auth/session';
import { showToast } from '../../store/uiStore';
import {
  appQueryClient,
  clearAppQueryCache,
} from '../../services/query/appQueryClient';

import { useAuthStore } from '../../store/authStore';
import { resolveSelectedPetId, usePetStore, type Pet } from '../../store/petStore';
import { useCommunityStore } from '../../store/communityStore';
import { useRecordStore } from '../../store/recordStore';
import { useScheduleStore } from '../../store/scheduleStore';

type Props = {
  children: React.ReactNode;
};

const LOCAL_HYDRATION_TIMEOUT_MS = 3_000;
const SESSION_VALIDATE_TIMEOUT_MS = 5_000;
const USER_SCOPED_FETCH_TIMEOUT_MS = 6_000;
const ACCOUNT_DELETION_GATE_TIMEOUT_MS = 2_500;

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
  const setAccountDeletionGate = useAuthStore(s => s.setAccountDeletionGate);
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
    const pendingAuthTransitionTimers = new Set<ReturnType<typeof setTimeout>>();
    const authBoundaryCleanupQueue = createAuthBoundaryCleanupQueue();
    let authResolutionVersion = 0;
    let offlineUnverified = false;
    let revalidating = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let sessionRead: ReturnType<typeof supabase.auth.getSession> | null = null;
    const resolveValidSession = (provided?: Session) => resolveAuthBoot({
      readLocalSession: readPersistedAuthSession,
      hasExplicitLogout,
      getSession: () => {
        if (provided) return Promise.resolve({ data: { session: provided }, error: null });
        // A timed-out SDK refresh may still hold its lock. Share it until it
        // settles rather than queuing more reads/refreshes behind that lock.
        if (!sessionRead) {
          sessionRead = supabase.auth.getSession().finally(() => { sessionRead = null; });
        }
        return sessionRead;
      },
      getUser: jwt => supabase.auth.getUser(jwt),
    });

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
      clearAppQueryCache();
      clearMemorySignedUrlCache();
      clearAllHomeRecordScheduleCaches().catch(captureMonitoringException);
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

      const fetchProfileSafely = async () => {
        try {
          return await withTimeout(
            fetchMyProfile(userId),
            USER_SCOPED_FETCH_TIMEOUT_MS,
            'fetchMyProfile',
          );
        } catch (firstError: unknown) {
          const { data: validatedUser } = await withTimeout(
            supabase.auth.getUser(),
            SESSION_VALIDATE_TIMEOUT_MS,
            'auth.getUser(profile retry)',
          );
          if (validatedUser.user?.id !== userId) {
            throw firstError;
          }

          return withTimeout(
            fetchMyProfile(userId),
            USER_SCOPED_FETCH_TIMEOUT_MS,
            'fetchMyProfile(retry)',
          );
        }
      };

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
        fetchProfileSafely(),
        fetchPetsSafely(),
      ]);

      return { profileResult, petsResult };
    };

    const applyGuestState = async (seq: number) => {
      setAccountDeletionGate(null);
      await setProfile({ nickname: null, role: 'user' });
      setProfileSyncState('ready');
      clearUserScopedStores();
      setMonitoringUser({ id: null });
      setPetErrorMessage(null);
      setPetLoading(false);
      lastUserIdRef.current = null;
      finishTransition(seq);
    };

    const applyPasswordRecoverySandboxState = async (seq: number) => {
      // Recovery session은 비밀번호 변경 전용 임시 세션이므로
      // 일반 로그인 bootstrap과 사용자 write path를 열지 않는다.
      setAccountDeletionGate(null);
      await setProfile({ nickname: null, role: 'user' });
      setProfileSyncState('idle');
      clearUserScopedStores();
      setMonitoringUser({ id: null });
      setPetErrorMessage(null);
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

      setAccountDeletionGate(null);

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
      if (offlineUnverified) {
        setProfileSyncState('error', '오프라인에서 최근 정보를 보여드리고 있어요');
        setPetErrorMessage('오프라인에서 최근 반려동물 목록을 보여드리고 있어요');
        setPetLoading(false);
        lastUserIdRef.current = userId;
        finishTransition(seq);
        return;
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

    const applyAccountDeletionGuardState = async (
      seq: number,
      gate: AccountDeletionGate,
    ) => {
      setAccountDeletionGate(gate);
      await setProfile({ nickname: null, role: 'user' });
      setProfileSyncState('idle');
      clearUserScopedStores();
      setPetErrorMessage(null);
      setPetLoading(false);
      lastUserIdRef.current = null;
      finishTransition(seq);
    };

    const loadAccountDeletionGate = async (session: Session) => {
      try {
        return await withTimeout(
          fetchMyAccountDeletionGate(),
          ACCOUNT_DELETION_GATE_TIMEOUT_MS,
          'fetchMyAccountDeletionGate',
        );
      } catch (error: unknown) {
        captureMonitoringException(error);
        const currentGate = useAuthStore.getState().accountDeletionGate;
        if (currentGate?.userId === session.user.id) {
          return currentGate;
        }
        return null;
      }
    };

    const applySessionTransition = async (
      event: AuthChangeEvent | 'boot',
      session: Session | null,
    ) => {
      const seq = transitionSeqRef.current + 1;
      transitionSeqRef.current = seq;
      beginTransition();

      const previousUserId =
        getSessionUserId(useAuthStore.getState().session) ??
        lastUserIdRef.current;
      const nextUserId = getSessionUserId(session);
      await authBoundaryCleanupQueue.waitForBoundary(
        shouldClearAuthBoundScheduleNotifications({
          event,
          previousUserId,
          nextUserId,
        }),
      );
      if (!alive || transitionSeqRef.current !== seq) return;

      await setSession(session);
      if (!alive || transitionSeqRef.current !== seq) return;

      if (
        shouldKeepGuestSandboxForRecovery({
          passwordRecoveryFlow: useAuthStore.getState().passwordRecoveryFlow,
          session,
        })
      ) {
        await applyPasswordRecoverySandboxState(seq);
        return;
      }

      if (!session) {
        await applyGuestState(seq);
        return;
      }

      setMonitoringUser({
        id: session.user.id,
      });

      const cachedGate = useAuthStore.getState().accountDeletionGate;
      const accountDeletionGate = offlineUnverified
        ? (cachedGate?.userId === session.user.id ? cachedGate : null)
        : await loadAccountDeletionGate(session);
      if (accountDeletionGate) {
        await applyAccountDeletionGuardState(seq, accountDeletionGate);
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

    const cancelRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const scheduleRevalidation = () => {
      cancelRetry();
      if (!alive || !offlineUnverified) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        revalidate().catch(captureMonitoringException);
      }, 5_000);
    };

    const applyDecision = async (event: AuthChangeEvent | 'boot', decision: AuthBootDecision) => {
      offlineUnverified = decision.state === 'offline_unverified';
      if (decision.state === 'invalid') {
        await markExplicitLogout();
        await supabase.auth.signOut({ scope: 'local' });
      }
      await applySessionTransition(event, decision.session);
      scheduleRevalidation();
    };

    const revalidate = async () => {
      if (!alive || !offlineUnverified || revalidating || AppState.currentState === 'background') return;
      revalidating = true;
      const version = authResolutionVersion;
      const previousUserId = getSessionUserId(useAuthStore.getState().session);
      try {
        const decision = await resolveValidSession();
        if (!alive || version !== authResolutionVersion ||
          getSessionUserId(useAuthStore.getState().session) !== previousUserId) return;
        if (decision.state === 'offline_unverified') return;
        offlineUnverified = false;
        if (decision.state === 'validated' && decision.session.user.id === previousUserId) {
          useAuthStore.getState().updateSessionTokens(decision.session);
          const gate = await loadAccountDeletionGate(decision.session);
          if (!alive || version !== authResolutionVersion) return;
          if (gate) {
            await applyAccountDeletionGuardState(transitionSeqRef.current, gate);
          } else {
            await applyLoggedInState(decision.session, transitionSeqRef.current, { forceReload: true });
          }
        } else {
          await applyDecision('boot', decision);
        }
      } finally {
        revalidating = false;
        scheduleRevalidation();
      }
    };

    const networkRecoverySub = AppState.addEventListener('change', state => {
      if (state === 'active') revalidate().catch(captureMonitoringException);
      else cancelRetry();
    });

    const boot = async () => {
      const version = authResolutionVersion;
      localHydrationPromiseRef.current = withTimeout(
        Promise.all([hydrateAuth(), hydrateSelectedPetId()]).then(() => undefined),
        LOCAL_HYDRATION_TIMEOUT_MS,
        'local hydration',
      ).catch(error => {
        captureMonitoringException(error);
      });
      await localHydrationPromiseRef.current;

      const decision = await resolveValidSession();
      if (!alive || version !== authResolutionVersion) return;
      await applyDecision('boot', decision);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        // Supabase holds its auth lock while this callback runs. Defer every
        // Supabase read so OAuth SIGNED_IN cannot deadlock profile/pet bootstrap.
        const version = ++authResolutionVersion;
        cancelRetry();
        const sameUserRefresh = !!nextSession && event === 'TOKEN_REFRESHED' &&
          getSessionUserId(nextSession) === getSessionUserId(useAuthStore.getState().session);
        if (!sameUserRefresh) beginTransition();
        const timer = setTimeout(() => {
          pendingAuthTransitionTimers.delete(timer);
          if (!alive) return;

          const runTransition = async () => {
            await localHydrationPromiseRef.current;
            if (!alive || version !== authResolutionVersion) return;
            if (event === 'SIGNED_OUT') {
              await markExplicitLogout();
              if (!alive || version !== authResolutionVersion) return;
              offlineUnverified = false;
              await applySessionTransition(event, null);
              return;
            }
            if (sameUserRefresh && nextSession) {
              useAuthStore.getState().updateSessionTokens(nextSession);
              if (offlineUnverified) await revalidate();
              return;
            }
            const decision = await resolveValidSession(nextSession ?? undefined);
            if (!alive || version !== authResolutionVersion) return;
            await applyDecision(event, decision);
          };

          runTransition().catch((error: unknown) => {
            captureMonitoringException(error);
            setAuthBooted(true);
            setPetBooted(true);
            setPetLoading(false);
          });
        }, 0);
        pendingAuthTransitionTimers.add(timer);
      },
    );

    unsub = listener.subscription;

    const unsubscribeGate = useAuthStore.subscribe((state, prevState) => {
      if (prevState.session && !state.session) {
        ++authResolutionVersion;
        offlineUnverified = false;
        cancelRetry();
      }
      const prevGate = prevState.accountDeletionGate;
      const nextGate = state.accountDeletionGate;
      if (!prevGate || nextGate) return;

      const currentSession = useAuthStore.getState().session;
      if (!currentSession) return;

      applySessionTransition('boot', currentSession).catch(error => {
        captureMonitoringException(error);
      });
    });

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
      cancelRetry();
      networkRecoverySub.remove();
      pendingAuthTransitionTimers.forEach(timer => clearTimeout(timer));
      pendingAuthTransitionTimers.clear();
      unsubscribeGate();
      if (unsub) unsub.unsubscribe();
    };
  }, [
    hydrateAuth,
    setSession,
    setProfile,
    setProfileSyncState,
    setAccountDeletionGate,
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
    <QueryClientProvider client={appQueryClient}>
      <AppFontPreferenceProvider>
        <SeasonPreferenceProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </SeasonPreferenceProvider>
      </AppFontPreferenceProvider>
    </QueryClientProvider>
  );
}

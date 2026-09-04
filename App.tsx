// 파일: App.tsx
// 파일 목적:
// - Nuri 앱의 최상위 엔트리 포인트로, 런타임 전체를 한 번만 조립한다.
// 어디서 쓰이는지:
// - React Native 앱 시작 시 가장 먼저 실행되며, 모든 화면과 Provider 체인의 시작점이다.
// 핵심 역할:
// - GestureHandler / SafeArea / NavigationContainer / AppProviders / GlobalToast를 올바른 순서로 감싼다.
// - Sentry 초기화와 네비게이션 트래킹 연결을 부팅 직후부터 유지한다.
// 데이터·상태 흐름:
// - 실제 세션/프로필/펫 부트스트랩은 AppProviders가 담당하고, 이 파일은 그 컨테이너와 네비게이션 루트만 제공한다.
// 수정 시 주의:
// - Provider 순서와 NavigationContainer 등록 순서를 바꾸면 제스처, safe area, 전역 상태, 모니터링이 함께 깨질 수 있다.
// - 부팅 시점 코드이므로 무거운 로직을 직접 넣지 말고 하위 provider/service로 내려야 한다.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import AppProviders from './src/app/providers/AppProviders';
import GlobalToast from './src/components/common/GlobalToast';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import { appLinking } from './src/navigation/linking';
import {
  getInitialScheduleNotificationTap,
  markScheduleNotificationTapConsumerNotReady,
  markScheduleNotificationTapConsumerReady,
  resolveScheduleNotificationTapRoute,
  subscribeToScheduleNotificationTaps,
  type ScheduleNotificationTapPayload,
} from './src/services/schedules/notificationTap';
import {
  clearCommunityRouteStateSnapshot,
  createCommunityRouteStateSnapshot,
  saveCommunityRouteStateSnapshot,
} from './src/navigation/communityRouteState';
import {
  initMonitoring,
  registerSentryNavigation,
  wrapWithSentry,
} from './src/services/monitoring/sentry';
import { useAuthStore } from './src/store/authStore';
import { useCommunityStore } from './src/store/communityStore';
import { usePetStore } from './src/store/petStore';

enableScreens(true);
initMonitoring();

function App() {
  const navigationRef = useRef(
    createNavigationContainerRef<RootStackParamList>(),
  );
  const communitySnapshotExistsRef = useRef(false);
  const pendingScheduleTapRef = useRef<ScheduleNotificationTapPayload | null>(
    null,
  );
  const [navigationReady, setNavigationReady] = useState(false);
  const [navigationStateRevision, setNavigationStateRevision] = useState(0);
  const authBooted = useAuthStore(state => state.booted);
  const petBooted = usePetStore(state => state.booted);
  const sessionUserId = useAuthStore(state => state.session?.user.id ?? null);
  const pets = usePetStore(state => state.pets);

  const persistCommunityRouteState = useCallback(() => {
    if (!navigationRef.current.isReady()) return;

    const userId = useAuthStore.getState().session?.user.id ?? null;
    const currentRoute = navigationRef.current.getCurrentRoute();
    const currentRouteName = String(currentRoute?.name ?? '');
    const isCommunityRoute =
      currentRouteName === 'CommunityTab' ||
      currentRouteName === 'CommunityTabList' ||
      currentRouteName === 'CommunityList' ||
      currentRouteName === 'CommunityDetail';

    if (!userId || !isCommunityRoute || !currentRoute) {
      if (!communitySnapshotExistsRef.current) return;
      communitySnapshotExistsRef.current = false;
      clearCommunityRouteStateSnapshot().catch(() => {});
      return;
    }

    const snapshot = createCommunityRouteStateSnapshot({
      userId,
      route: {
        name: currentRouteName,
        params: currentRoute.params,
      },
      list: useCommunityStore.getState().getListSnapshot(),
    });

    if (!snapshot) return;

    communitySnapshotExistsRef.current = true;
    saveCommunityRouteStateSnapshot(snapshot).catch(() => {});
  }, []);

  const queueScheduleNotificationTap = useCallback(
    (tap: ScheduleNotificationTapPayload) => {
      const key = `${tap.scheduleId}:${tap.petId}`;
      if (
        pendingScheduleTapRef.current &&
        `${pendingScheduleTapRef.current.scheduleId}:${pendingScheduleTapRef.current.petId}` ===
          key
      ) {
        return;
      }

      pendingScheduleTapRef.current = tap;
      setNavigationStateRevision(previous => previous + 1);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToScheduleNotificationTaps(tap => {
      if (active) queueScheduleNotificationTap(tap);
    });

    // Native releases a cold-start notification tap only after this listener
    // exists, preventing a startup event from being emitted into the void.
    markScheduleNotificationTapConsumerReady();

    getInitialScheduleNotificationTap()
      .then(tap => {
        if (active && tap) queueScheduleNotificationTap(tap);
      })
      .catch(() => {});

    return () => {
      active = false;
      unsubscribe();
      markScheduleNotificationTapConsumerNotReady();
    };
  }, [queueScheduleNotificationTap]);

  useEffect(() => {
    const tap = pendingScheduleTapRef.current;
    if (!tap) return;

    const currentRouteName = navigationRef.current.isReady()
      ? String(navigationRef.current.getCurrentRoute()?.name ?? '')
      : null;
    const target = resolveScheduleNotificationTapRoute({
      tap,
      navigationReady,
      appBooted: authBooted && petBooted,
      currentRouteName,
      sessionUserId,
      pets,
    });

    if (target) {
      pendingScheduleTapRef.current = null;
      navigationRef.current.navigate('ScheduleList', {
        petId: target.petId,
      });
      return;
    }

    // A tap for a missing session or an unowned pet must not be replayed after
    // logout. Splash and incomplete boot states intentionally keep it queued.
    if (
      navigationReady &&
      authBooted &&
      petBooted &&
      currentRouteName &&
      currentRouteName !== 'Splash' &&
      (!sessionUserId || !pets.some(pet => pet.id === tap.petId))
    ) {
      pendingScheduleTapRef.current = null;
    }
  }, [
    authBooted,
    navigationReady,
    navigationStateRevision,
    petBooted,
    pets,
    sessionUserId,
  ]);

  const handleNavigationReady = useCallback(() => {
    if (!navigationRef.current.isReady()) return;
    setNavigationReady(true);
    registerSentryNavigation(navigationRef.current);
    persistCommunityRouteState();
  }, [persistCommunityRouteState]);

  const handleNavigationStateChange = useCallback(() => {
    persistCommunityRouteState();
    if (pendingScheduleTapRef.current) {
      setNavigationStateRevision(previous => previous + 1);
    }
  }, [persistCommunityRouteState]);

  useEffect(() => {
    return useCommunityStore.subscribe((state, previousState) => {
      if (
        state.activeFilter === previousState.activeFilter &&
        state.pageSize === previousState.pageSize &&
        state.currentPage === previousState.currentPage &&
        state.cursor === previousState.cursor &&
        state.hasNextPage === previousState.hasNextPage &&
        state.hasPreviousPage === previousState.hasPreviousPage &&
        state.cursorHistory === previousState.cursorHistory
      ) {
        return;
      }

      persistCommunityRouteState();
    });
  }, [persistCommunityRouteState]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ✅ 흰 배경에서 시간/아이콘이 안 보이는 문제 방지 */}
      <StatusBar
        barStyle="dark-content"
      />

      <KeyboardProvider>
        <SafeAreaProvider>
          <AppProviders>
            <NavigationContainer
              linking={appLinking}
              ref={navigationRef}
              onReady={handleNavigationReady}
              onStateChange={handleNavigationStateChange}
            >
              <RootNavigator />
            </NavigationContainer>
            <GlobalToast />
          </AppProviders>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);

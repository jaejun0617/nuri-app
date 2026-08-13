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

import React, { useCallback, useEffect, useRef } from 'react';
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

enableScreens(true);
initMonitoring();

function App() {
  const navigationRef = useRef(
    createNavigationContainerRef<RootStackParamList>(),
  );
  const communitySnapshotExistsRef = useRef(false);

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

  const handleNavigationReady = useCallback(() => {
    if (!navigationRef.current.isReady()) return;
    registerSentryNavigation(navigationRef.current);
    persistCommunityRouteState();
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
        backgroundColor="transparent"
        translucent
      />

      <KeyboardProvider>
        <SafeAreaProvider>
          <AppProviders>
            <NavigationContainer
              linking={appLinking}
              ref={navigationRef}
              onReady={handleNavigationReady}
              onStateChange={persistCommunityRouteState}
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

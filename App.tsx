// 파일: App.tsx
// 역할:
// - 앱 전체의 최상위 엔트리 포인트
// - GestureHandler, SafeArea, NavigationContainer, AppProviders를 순서대로 감싸 런타임 기반을 준비
// - Sentry 초기화와 네비게이션 트래킹 등록을 통해 부팅 직후부터 모니터링이 연결되도록 유지

import React, { useCallback, useRef } from 'react';
import { StatusBar } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppProviders from './src/app/providers/AppProviders';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import {
  initMonitoring,
  registerSentryNavigation,
  wrapWithSentry,
} from './src/services/monitoring/sentry';

enableScreens(true);
initMonitoring();

function App() {
  const navigationRef = useRef(
    createNavigationContainerRef<RootStackParamList>(),
  );

  const handleNavigationReady = useCallback(() => {
    if (!navigationRef.current.isReady()) return;
    registerSentryNavigation(navigationRef.current);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ✅ 흰 배경에서 시간/아이콘이 안 보이는 문제 방지 */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer
            ref={navigationRef}
            onReady={handleNavigationReady}
          >
            <RootNavigator />
          </NavigationContainer>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);

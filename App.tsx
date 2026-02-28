// 파일: App.tsx
// 목적:
// - 앱 최상단 Root 컴포넌트
// - GestureHandlerRootView: RNGH 루트 래핑(특정 네비게이션/제스처에서 안정화)
// - SafeAreaProvider: 노치/상단바/하단 제스처 영역 대응
// - NavigationContainer: 네비게이션 컨텍스트 제공
//
// 앱 구동 순서:
// index.js → App.tsx → RootNavigator → Splash → Main

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppProviders from './src/app/providers/AppProviders';
import RootNavigator from './src/navigation/RootNavigator';

// RN Navigation 성능/안정 최적화
enableScreens(true);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

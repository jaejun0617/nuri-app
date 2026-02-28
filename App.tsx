// 파일: App.tsx
// 목적:
// - 앱 최상단 Root 컴포넌트
// - SafeAreaProvider: 노치/상단바/하단 제스처 영역 대응
// - NavigationContainer: 네비게이션 컨텍스트 제공
//
// 앱 구동 순서:
// index.js → App.tsx → RootNavigator → Splash → Main

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppProviders from './src/app/providers/AppProviders';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}

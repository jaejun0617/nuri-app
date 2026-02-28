// 파일: App.tsx
// 목적:
// - 앱 최상단 Root 컴포넌트
// - GestureHandlerRootView: RNGH 루트 래핑(1회만)
// - SafeAreaProvider: 노치/제스처 대응
// - NavigationContainer: 네비 컨텍스트
// - AppProviders: ThemeProvider + (앱 부팅 로직 포함)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppProviders from './src/app/providers/AppProviders';
import RootNavigator from './src/navigation/RootNavigator';

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

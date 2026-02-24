// 파일: App.tsx
// 목적:
// - 앱 최상단 Root 컴포넌트
// - NavigationContainer로 네비게이션 상태/컨텍스트를 제공
//
// 앱 구동 순서:
// index.js → App.tsx → RootNavigator → Splash(HomeScreen) → Main(MainScreen)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AppProviders from './src/app/providers/AppProviders';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}

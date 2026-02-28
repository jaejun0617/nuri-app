// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Native Stack 기반 라우팅 구성
// - Splash(브랜딩) → Main(실제 홈) 흐름 제공
// - DevTest는 Supabase Auth/DB/Storage E2E 검증용 (개발 환경에서만 노출)

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  DevTest: undefined; // 개발 전용
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerBackTitle: '뒤로',
      }}
    >
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{ title: '홈' }}
      />

      {__DEV__ ? (
        <Stack.Screen
          name="DevTest"
          getComponent={() =>
            require('../screens/DevTest/DevTestScreen').default
          }
          options={{ title: 'Dev Test' }}
        />
      ) : null}
    </Stack.Navigator>
  );
}

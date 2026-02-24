// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Native Stack 기반 라우팅 구성
// - Splash는 헤더 숨김
// - Main은 헤더 표시 → 자동 뒤로가기 버튼 활성화

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash">
      {/* Splash 화면은 헤더 숨김 */}
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* Main 화면은 헤더 표시 → 자동 뒤로가기 버튼 생성 */}
      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{
          title: '홈',
          headerBackTitle: '뒤로',
        }}
      />
    </Stack.Navigator>
  );
}

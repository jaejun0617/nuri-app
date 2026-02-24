// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - 앱의 라우팅(화면 전환) 뼈대
// - Native Stack 기반으로 화면 전환 구현
//
// 네비 흐름:
// Splash(HomeScreen) → (2초 뒤) Main(MainScreen)
// ※ 뒤로가기를 살리려면 HomeScreen에서 reset 대신 navigate를 사용해야 한다.

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
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={HomeScreen} />
      <Stack.Screen name="Main" component={MainScreen} />
    </Stack.Navigator>
  );
}

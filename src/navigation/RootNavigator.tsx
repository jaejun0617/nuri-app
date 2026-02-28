// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Native Stack 기반 라우팅 구성
// - Splash(브랜딩) → Main(실제 홈) 흐름 제공
// - DevTest는 Supabase Auth/DB/Storage E2E 검증용 (개발 환경에서만 노출)
//
// 운영 원칙:
// - 개발(__DEV__)에서도 기본은 Splash → Main 플로우를 태우는 것을 권장
// - DevTest는 필요할 때만 진입 (초기 라우트로 두지 않음)
//   → 앱 UX 흐름이 흔들리지 않게 유지

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;

  // ✅ 개발 전용 (DevTestScreen 파일은 남겨두되, 라우트는 개발에서만 등록)
  DevTest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      // ---------------------------------------------------------
      // 1) 초기 화면 정책
      // - 기본: Splash (브랜딩/감성)
      // - DevTest는 "필요할 때만" 네비게이션으로 진입
      // ---------------------------------------------------------
      initialRouteName="Splash"
      screenOptions={{
        headerBackTitle: '뒤로',
      }}
    >
      {/* ---------------------------------------------------------
          2) Splash 화면
          - 브랜딩/애니메이션
          - 헤더 숨김
      --------------------------------------------------------- */}
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />

      {/* ---------------------------------------------------------
          3) Main 화면
          - 실제 홈 화면 (게스트/로그인/멀티펫 분기)
      --------------------------------------------------------- */}
      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{
          title: '홈',
        }}
      />

      {/* ---------------------------------------------------------
          4) DevTest (개발 전용)
          - Supabase Auth/DB/Storage end-to-end 검증용
          - 운영 빌드에는 라우트 자체를 포함하지 않음
      --------------------------------------------------------- */}
      {__DEV__ ? (
        <Stack.Screen
          name="DevTest"
          getComponent={() =>
            require('../screens/DevTest/DevTestScreen').default
          }
          options={{
            title: 'Dev Test',
          }}
        />
      ) : null}
    </Stack.Navigator>
  );
}

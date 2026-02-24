// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Native Stack 기반 라우팅 구성
// - Splash는 헤더 숨김
// - Main은 헤더 표시 → 자동 뒤로가기 버튼 활성화
// - DevTest는 Supabase 전체 동작 검증용 개발 화면
//   (개발 환경(__DEV__)에서만 초기 화면으로 설정)

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';
import DevTestScreen from '../screens/DevTest/DevTestScreen'; // ✅ 개발 테스트 화면 추가

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  DevTest: undefined; // ✅ 개발 전용 라우트 타입 추가
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      // ---------------------------------------------------------
      // 개발 중에는 DevTest부터 실행
      // 배포/프로덕션에서는 Splash부터 시작
      // ---------------------------------------------------------
      initialRouteName={__DEV__ ? 'DevTest' : 'Splash'}
    >
      {/* ---------------------------------------------------------
          DevTest (개발 전용)
          - Supabase Auth / DB / Storage end-to-end 검증용
          - headerShown: true (뒤로가기 필요 없음)
      --------------------------------------------------------- */}
      <Stack.Screen
        name="DevTest"
        component={DevTestScreen}
        options={{
          title: 'Dev Test',
        }}
      />

      {/* ---------------------------------------------------------
          Splash 화면
          - 브랜딩/애니메이션 화면
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
          Main 화면
          - 실제 홈 화면
          - header 표시 → 자동 뒤로가기 버튼 생성
      --------------------------------------------------------- */}
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

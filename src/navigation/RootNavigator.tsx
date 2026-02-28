// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Native Stack 기반 라우팅 구성
// - Splash → Main 흐름 유지
// - Auth 플로우(AuthLanding/SignIn/SignUp/NicknameSetup) 추가
//
// 운영 원칙:
// - “게스트 우선” 전략 유지
// - Main은 항상 진입 가능(게스트/로그인 분기)
// - Auth는 필요할 때만(게스트가 로그인 버튼 누를 때) 진입
// - 로그인/회원가입 성공 시 Main으로 reset

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

import AuthLandingScreen from '../screens/Auth/AuthLandingScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import NicknameSetupScreen from '../screens/Auth/NicknameSetupScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;

  AuthLanding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  NicknameSetup: { after?: 'signin' | 'signup' } | undefined;

  DevTest: undefined; // 개발용
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
      {/* Splash */}
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      {/* Main */}
      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{ title: '홈' }}
      />

      {/* Auth */}
      <Stack.Screen
        name="AuthLanding"
        component={AuthLandingScreen}
        options={{ title: '로그인' }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: '로그인' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: '회원가입' }}
      />
      <Stack.Screen
        name="NicknameSetup"
        component={NicknameSetupScreen}
        options={{ title: '닉네임 설정' }}
      />

      {/* DevTest */}
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

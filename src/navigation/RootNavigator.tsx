// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Splash → Main 기본 흐름 유지
// - Auth 플로우(AuthLanding/SignIn/SignUp/NicknameSetup) 추가
// - PetCreate 추가 (로그인 후 펫 없으면 유도)
// - Records(Timeline/Create/Detail/Edit) 라우팅 제공
// - DevTest는 dev-only

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

import AuthLandingScreen from '../screens/Auth/AuthLandingScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import NicknameSetupScreen from '../screens/Auth/NicknameSetupScreen';

import PetCreateScreen from '../screens/Pets/PetCreateScreen';

// Records
import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;

  AuthLanding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  NicknameSetup: { after?: 'signin' | 'signup' } | undefined;

  PetCreate: { from?: 'auto' | 'cta' | 'header_plus' } | undefined;

  DevTest: undefined;

  // Records
  Timeline: { petId: string };
  RecordCreate: { petId: string };
  RecordDetail: { petId: string; memoryId: string };
  RecordEdit: { petId: string; memoryId: string };
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

      {/* Pet */}
      <Stack.Screen
        name="PetCreate"
        component={PetCreateScreen}
        options={{ title: '반려동물 등록' }}
      />

      {/* Records */}
      <Stack.Screen name="Timeline" component={TimelineScreen} />
      <Stack.Screen name="RecordCreate" component={RecordCreateScreen} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="RecordEdit" component={RecordEditScreen} />

      {/* Dev only */}
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

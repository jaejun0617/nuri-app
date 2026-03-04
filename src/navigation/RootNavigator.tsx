// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Splash(탭 없음) → AppTabs(공통 하단 탭) 기본 흐름 유지
// - Auth 플로우(AuthLanding/SignIn/SignUp/NicknameSetup) 라우팅 제공
// - PetCreate 라우팅 제공 (로그인 후 펫 0마리면 유도 진입)
// - Records: RecordDetail/Edit는 "몰입 화면"으로 탭 밖(Stack)에서 표시
// - ✅ UX: 스택 헤더의 모든 글씨(타이틀/뒤로가기 텍스트) 제거
// - DevTest는 dev-only

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';

import AuthLandingScreen from '../screens/Auth/AuthLandingScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import NicknameSetupScreen from '../screens/Auth/NicknameSetupScreen';

import PetCreateScreen from '../screens/Pets/PetCreateScreen';
import PetProfileEditScreen from '../screens/Pets/PetProfileEditScreen';
import PetProfileEditDoneScreen from '../screens/Pets/PetProfileEditDoneScreen';
import ScheduleListScreen from '../screens/Schedules/ScheduleListScreen';
import ScheduleCreateScreen from '../screens/Schedules/ScheduleCreateScreen';
import ScheduleDetailScreen from '../screens/Schedules/ScheduleDetailScreen';
import ScheduleEditScreen from '../screens/Schedules/ScheduleEditScreen';

// Records (Detail/Edit는 탭 밖으로 빼는 전략)
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';

import AppTabsNavigator from './AppTabsNavigator';

export type RootStackParamList = {
  Splash: undefined;

  // ✅ 공통 탭 영역
  AppTabs: undefined;

  // Auth
  AuthLanding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  NicknameSetup: { after?: 'signin' | 'signup' } | undefined;

  // Pet
  PetCreate: { from?: 'auto' | 'cta' | 'header_plus' } | undefined;
  PetProfileEdit: { petId: string };
  PetProfileEditDone: { petId: string; petName: string };
  ScheduleList: { petId?: string } | undefined;
  ScheduleCreate: { petId?: string; startsAt?: string } | undefined;
  ScheduleDetail: { petId?: string; scheduleId: string };
  ScheduleEdit: { petId?: string; scheduleId: string };

  // Records (탭 밖)
  RecordDetail: { petId: string; memoryId: string };
  RecordEdit: { petId: string; memoryId: string };

  // Dev
  DevTest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        // ---------------------------------------------------------
        // ✅ 공통: 스택 헤더 텍스트 제거
        // - headerBackTitleVisible는 버전에 따라 없을 수 있어 사용하지 않음
        // ---------------------------------------------------------
        headerTitle: '',
        headerBackTitle: '',
        headerShadowVisible: false,
      }}
    >
      {/* Splash (탭 없음) */}
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      {/* ✅ 앱 본 화면: 공통 하단 탭 */}
      <Stack.Screen
        name="AppTabs"
        component={AppTabsNavigator}
        options={{ headerShown: false }}
      />

      {/* Auth */}
      <Stack.Screen name="AuthLanding" component={AuthLandingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="NicknameSetup" component={NicknameSetupScreen} />

      {/* Pet */}
      <Stack.Screen name="PetCreate" component={PetCreateScreen} />
      <Stack.Screen
        name="PetProfileEdit"
        component={PetProfileEditScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetProfileEditDone"
        component={PetProfileEditDoneScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleList"
        component={ScheduleListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleCreate"
        component={ScheduleCreateScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ScheduleEdit"
        component={ScheduleEditScreen}
        options={{ headerShown: false }}
      />

      {/* Records (탭 밖) */}
      <Stack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: false }} // 화면 내 커스텀 헤더 사용 중이므로 숨김
      />
      <Stack.Screen
        name="RecordEdit"
        component={RecordEditScreen}
        options={{ headerShown: false }} // 화면 내 커스텀 헤더 사용 중이므로 숨김
      />

      {/* Dev only */}
      {__DEV__ ? (
        <Stack.Screen
          name="DevTest"
          getComponent={() =>
            require('../screens/DevTest/DevTestScreen').default
          }
        />
      ) : null}
    </Stack.Navigator>
  );
}

// 파일: src/navigation/RootNavigator.tsx
// 목적:
// - Splash(탭 없음) → AppTabs(공통 하단 탭) 기본 흐름 유지
// - Auth 플로우(SignIn/SignUp/NicknameSetup) 라우팅 제공
// - PetCreate 라우팅 제공 (로그인 후 펫 0마리면 유도 진입)
// - ✅ UX: 스택 헤더의 모든 글씨(타이틀/뒤로가기 텍스트) 제거
// - DevTest는 dev-only

import React from 'react';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';

import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import NicknameSetupScreen from '../screens/Auth/NicknameSetupScreen';
import WelcomeTransitionScreen from '../screens/Auth/WelcomeTransitionScreen';

import PetCreateScreen from '../screens/Pets/PetCreateScreen';
import PetProfileEditScreen from '../screens/Pets/PetProfileEditScreen';
import PetProfileEditDoneScreen from '../screens/Pets/PetProfileEditDoneScreen';
import ScheduleListScreen from '../screens/Schedules/ScheduleListScreen';
import ScheduleCreateScreen from '../screens/Schedules/ScheduleCreateScreen';
import ScheduleDetailScreen from '../screens/Schedules/ScheduleDetailScreen';
import ScheduleEditScreen from '../screens/Schedules/ScheduleEditScreen';
import EditDoneScreen from '../screens/Common/EditDoneScreen';
import WeatherInsightScreen from '../screens/Weather/WeatherInsightScreen';
import IndoorActivityRecommendationsScreen from '../screens/Weather/IndoorActivityRecommendationsScreen';
import ActivityGuideScreen from '../screens/Weather/ActivityGuideScreen';
import WeatherActivityRecordScreen from '../screens/Weather/WeatherActivityRecordScreen';
import type { DeviceCoordinates } from '../services/location/currentPosition';
import type {
  IndoorActivityKey,
  WeatherGuideBundle,
} from '../services/weather/guide';

import AppTabsNavigator from './AppTabsNavigator';
import type { AppTabParamList } from './AppTabsNavigator';

export type RootStackParamList = {
  Splash: undefined;

  // ✅ 공통 탭 영역
  AppTabs: NavigatorScreenParams<AppTabParamList> | undefined;

  // Auth
  SignIn: undefined;
  SignUp: undefined;
  NicknameSetup: { after?: 'signin' | 'signup' } | undefined;
  WelcomeTransition: { petName?: string } | undefined;

  // Pet
  PetCreate: { from?: 'auto' | 'cta' | 'header_plus' } | undefined;
  PetProfileEdit: { petId: string };
  PetProfileEditDone: { petId: string; petName: string };
  ScheduleList: { petId?: string } | undefined;
  ScheduleCreate: { petId?: string; startsAt?: string } | undefined;
  ScheduleDetail: { petId?: string; scheduleId: string };
  ScheduleEdit: { petId?: string; scheduleId: string };
  WeatherInsight:
    | {
        district?: string;
        initialBundle?: WeatherGuideBundle;
        initialCoordinates?: DeviceCoordinates;
      }
    | undefined;
  IndoorActivityRecommendations:
    | {
        district?: string;
        initialBundle?: WeatherGuideBundle;
        initialCoordinates?: DeviceCoordinates;
      }
    | undefined;
  ActivityGuide: {
    guideKey: IndoorActivityKey;
    district?: string;
  };
  WeatherActivityRecord: {
    guideKey: IndoorActivityKey;
    district?: string;
  };
  EditDone: {
    title: string;
    bodyLines: [string, string?];
    buttonLabel?: string;
    navigateTo:
      | { type: 'home' }
      | { type: 'schedule-list'; petId?: string }
      | { type: 'record-detail'; petId: string; memoryId: string };
  };

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
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NicknameSetup"
        component={NicknameSetupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WelcomeTransition"
        component={WelcomeTransitionScreen}
        options={{ headerShown: false }}
      />

      {/* Pet */}
      <Stack.Screen
        name="PetCreate"
        component={PetCreateScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
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
      <Stack.Screen
        name="WeatherInsight"
        component={WeatherInsightScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IndoorActivityRecommendations"
        component={IndoorActivityRecommendationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActivityGuide"
        component={ActivityGuideScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WeatherActivityRecord"
        component={WeatherActivityRecordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditDone"
        component={EditDoneScreen}
        options={{ headerShown: false }}
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

// 파일: src/navigation/RootNavigator.tsx
// 파일 목적:
// - 앱 전체 스택 라우트의 source of truth를 정의한다.
// 어디서 쓰이는지:
// - App.tsx의 NavigationContainer 아래에서 최상위 스택 네비게이터로 사용된다.
// 핵심 역할:
// - Splash에서 시작해 AppTabs, Auth, Pets, Schedules, Weather, Guides, LocationDiscovery, PetTravel 등 도메인 라우트를 연결한다.
// - 앱 첫 진입과 탭 바깥 화면 전환에 필요한 스택 구조를 유지한다.
// 데이터·상태 흐름:
// - 실제 진입 분기는 Splash와 AppProviders가 결정하고, 이 파일은 그 결과를 받아 화면 간 이동 경로를 제공한다.
// - 각 화면이 navigation.navigate/reset에 사용하는 파라미터 타입도 여기서 관리한다.
// 수정 시 주의:
// - route name이나 param 타입을 바꾸면 여러 화면과 툴바, More 메뉴, 탭 복귀 흐름이 함께 깨질 수 있다.
// - 숨겨진 헤더 정책과 reset 진입 흐름을 함부로 바꾸면 앱 첫 진입 UX가 흔들린다.

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
import GuideListScreen from '../screens/Guides/GuideListScreen';
import GuideDetailScreen from '../screens/Guides/GuideDetailScreen';
import GuideAdminListScreen from '../screens/Guides/GuideAdminListScreen';
import GuideAdminEditorScreen from '../screens/Guides/GuideAdminEditorScreen';
import NearbyWalkListScreen from '../screens/LocationDiscovery/NearbyWalkListScreen';
import NearbyWalkDetailScreen from '../screens/LocationDiscovery/NearbyWalkDetailScreen';
import PetFriendlyPlaceListScreen from '../screens/LocationDiscovery/PetFriendlyPlaceListScreen';
import PetFriendlyPlaceDetailScreen from '../screens/LocationDiscovery/PetFriendlyPlaceDetailScreen';
import PetTravelListScreen from '../screens/PetTravel/PetTravelListScreen';
import PetTravelDetailScreen from '../screens/PetTravel/PetTravelDetailScreen';
import type { DeviceCoordinates } from '../services/location/currentPosition';
import type { LocationDiscoveryItem } from '../services/locationDiscovery/types';
import type { PetTravelItem } from '../services/petTravel/types';
import type { ScreenEntrySource } from './entry';
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
  PetProfileEdit: { petId: string; entrySource?: ScreenEntrySource };
  PetProfileEditDone: { petId: string; petName: string };
  ScheduleList:
    | { petId?: string; entrySource?: ScreenEntrySource }
    | undefined;
  ScheduleCreate:
    | { petId?: string; startsAt?: string; entrySource?: ScreenEntrySource }
    | undefined;
  ScheduleDetail: {
    petId?: string;
    scheduleId: string;
    entrySource?: ScreenEntrySource;
  };
  ScheduleEdit: {
    petId?: string;
    scheduleId: string;
    entrySource?: ScreenEntrySource;
  };
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
        entrySource?: ScreenEntrySource;
      }
    | undefined;
  ActivityGuide: {
    guideKey: IndoorActivityKey;
    district?: string;
    entrySource?: ScreenEntrySource;
  };
  WeatherActivityRecord: {
    guideKey: IndoorActivityKey;
    district?: string;
    entrySource?: ScreenEntrySource;
  };
  GuideList: { entrySource?: ScreenEntrySource } | undefined;
  GuideDetail: {
    guideId: string;
  };
  WalkSpotList: { entrySource?: ScreenEntrySource } | undefined;
  WalkSpotDetail: {
    item: LocationDiscoveryItem;
    resultItems?: LocationDiscoveryItem[];
  };
  PetFriendlyPlaceList: { entrySource?: ScreenEntrySource } | undefined;
  PetFriendlyPlaceDetail: {
    item: LocationDiscoveryItem;
    resultItems?: LocationDiscoveryItem[];
  };
  PetTravelList: { entrySource?: ScreenEntrySource } | undefined;
  PetTravelDetail: {
    item: PetTravelItem;
  };
  GuideAdminList: { entrySource?: ScreenEntrySource } | undefined;
  GuideAdminEditor:
    | { mode: 'create' }
    | { mode: 'edit'; guideId: string };
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
        name="GuideList"
        component={GuideListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GuideDetail"
        component={GuideDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WalkSpotList"
        component={NearbyWalkListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WalkSpotDetail"
        component={NearbyWalkDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetFriendlyPlaceList"
        component={PetFriendlyPlaceListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetFriendlyPlaceDetail"
        component={PetFriendlyPlaceDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetTravelList"
        component={PetTravelListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PetTravelDetail"
        component={PetTravelDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GuideAdminList"
        component={GuideAdminListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GuideAdminEditor"
        component={GuideAdminEditorScreen}
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

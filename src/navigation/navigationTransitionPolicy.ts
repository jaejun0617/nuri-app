import { Easing } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';
import type { TimelineStackParamList } from './TimelineStackNavigator';

type TransitionKind = 'preserve' | 'detail';

// Explicit classification keeps future auth, modal and Walk routes out of detail motion.
const rootRoutes: Record<keyof RootStackParamList, TransitionKind> = {
  Splash: 'preserve',
  AppTabs: 'preserve',
  SecurityValidation: 'preserve',
  DevTest: 'preserve',
  SignIn: 'preserve',
  NicknameSetup: 'preserve',
  WelcomeTransition: 'preserve',
  PasswordResetRequest: 'preserve',
  PasswordResetRecovery: 'preserve',
  PasswordResetForm: 'preserve',
  OAuthCallback: 'preserve',
  PetCreate: 'preserve',
  PetManagement: 'detail',
  PetActivityAchievements: 'detail',
  PetProfileEdit: 'detail',
  PetProfileEditDone: 'detail',
  HealthReport: 'detail',
  ScheduleList: 'detail',
  ScheduleCreate: 'detail',
  ScheduleDetail: 'detail',
  ScheduleEdit: 'detail',
  WeatherInsight: 'detail',
  IndoorActivityRecommendations: 'detail',
  ActivityGuide: 'detail',
  WeatherActivityRecord: 'detail',
  GuideList: 'detail',
  GuideDetail: 'detail',
  WalkSpotList: 'detail',
  WalkSpotDetail: 'detail',
  WalkPoiAdminReadOnly: 'detail',
  AnimalHospitalList: 'detail',
  AnimalHospitalDetail: 'detail',
  AnimalHospitalAdmin: 'detail',
  CommunityList: 'detail',
  CommunityDetail: 'detail',
  CommunityComments: 'detail',
  CommunityCreate: 'detail',
  CommunityEdit: 'detail',
  CommunityBlockedUsers: 'detail',
  UserNotifications: 'detail',
  NuriRanking: 'detail',
  PolicyCenter: 'detail',
  PolicyDetail: 'detail',
  RecordCreate: 'detail',
  WalkHistory: 'detail',
  GuideAdminList: 'detail',
  GuideAdminEditor: 'detail',
  EditDone: 'detail',
};

const timelineRoutes: Record<keyof TimelineStackParamList, TransitionKind> = {
  TimelineMain: 'preserve',
  TimelineEntryGate: 'preserve',
  RecordDetail: 'detail',
  RecordEdit: 'detail',
  MonthlyExpenses: 'detail',
};

const tabFade: BottomTabNavigationOptions = {
  animation: 'fade',
  transitionSpec: {
    animation: 'timing',
    config: { duration: 220, easing: Easing.inOut(Easing.ease) },
  },
};
const noTabMotion: BottomTabNavigationOptions = { animation: 'none' };
const preserved: NativeStackNavigationOptions = {};
const detailSlide: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
};
const reducedDetail: NativeStackNavigationOptions = { animation: 'fade' };

export function rootTransitionOptions(
  name: keyof RootStackParamList,
  reduceMotion: boolean,
) {
  return rootRoutes[name] === 'detail'
    ? reduceMotion
      ? reducedDetail
      : detailSlide
    : preserved;
}

export function timelineTransitionOptions(
  name: keyof TimelineStackParamList,
  reduceMotion: boolean,
) {
  return timelineRoutes[name] === 'detail'
    ? reduceMotion
      ? reducedDetail
      : detailSlide
    : preserved;
}

export function tabTransitionOptions(reduceMotion: boolean) {
  return reduceMotion ? noTabMotion : tabFade;
}

export function isRootTabBarVisible(
  tab: string | undefined,
  nestedRoute: string | undefined,
) {
  return (
    tab !== 'TimelineTab' ||
    !Object.entries(timelineRoutes).some(
      ([name, kind]) => name === nestedRoute && kind === 'detail',
    )
  );
}

import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from './RootNavigator';
import type { TimelineStackParamList } from './TimelineStackNavigator';

export type RootScreenRoute<Name extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  Name
>;

export type RootScreenNavigation<Name extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, Name>;

export type TimelineScreenRoute<Name extends keyof TimelineStackParamList> =
  RouteProp<TimelineStackParamList, Name>;

export type TimelineScreenNavigation<Name extends keyof TimelineStackParamList> =
  NativeStackNavigationProp<TimelineStackParamList, Name>;

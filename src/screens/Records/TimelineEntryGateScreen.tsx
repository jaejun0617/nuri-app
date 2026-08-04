import React, { useLayoutEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CommonActions,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';

import { useEntryAwareBackAction } from '../../hooks/useEntryAwareBackAction';
import type { AppTabParamList } from '../../navigation/AppTabsNavigator';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { TimelineStackParamList } from '../../navigation/TimelineStackNavigator';
import {
  getLatestTimelineEntrySnapshot,
  HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
  invalidateTimelineEntryRequest,
  isLatestTimelineEntryRequest,
} from './timelineEntry';

type GateRoute = RouteProp<TimelineStackParamList, 'TimelineEntryGate'>;
type GateStackNav = NativeStackNavigationProp<
  TimelineStackParamList,
  'TimelineEntryGate'
>;
type TimelineTabNav = BottomTabNavigationProp<AppTabParamList, 'TimelineTab'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;
type GateNav = CompositeNavigationProp<
  GateStackNav,
  CompositeNavigationProp<TimelineTabNav, RootNav>
>;

/**
 * 기존 TimelineMain native view가 다시 붙기 전에 불투명 화면을 유지한다.
 * reset으로 Timeline stack을 Main 한 장으로 정리해 Gate와 이전 Main이 누적되지 않게 한다.
 */
export default function TimelineEntryGateScreen() {
  const theme = useTheme();
  const navigation = useNavigation<GateNav>();
  const route = useRoute<GateRoute>();
  const isFocused = useIsFocused();
  const committedRef = useRef(false);

  const leaveGate = () => {
    invalidateTimelineEntryRequest(route.params.entryRequestId);
    navigation.navigate('HomeTab');
  };

  useEntryAwareBackAction({
    entrySource: route.params.entrySource,
    onHome: leaveGate,
    onMore: leaveGate,
    onFallback: leaveGate,
  });

  useLayoutEffect(() => {
    if (!isFocused || committedRef.current) return;

    const latest = getLatestTimelineEntrySnapshot();
    if (
      !latest ||
      !isLatestTimelineEntryRequest(route.params.entryRequestId)
    ) {
      return;
    }
    if (latest.request.entryRequestId !== route.params.entryRequestId) return;

    committedRef.current = true;
    navigation.dispatch(
      {
        ...CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'TimelineMain',
              params: {
                petId: latest.request.petId,
                mainCategory: latest.request.mainCategory,
                otherSubCategory: latest.request.otherSubCategory ?? undefined,
                ymFilter: latest.request.ymFilter,
                entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
                entryRequestId: latest.request.entryRequestId,
                entryGeneration: latest.generation,
              },
            },
          ],
        }),
        target: navigation.getState().key,
      },
    );
  }, [isFocused, navigation, route.params.entryRequestId]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}
      accessibilityLabel="타임라인을 준비하는 중"
    >
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );
}

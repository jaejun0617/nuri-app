import React, { useLayoutEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
  publishTimelineEntryRequest,
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
  const entryRequest = route.params;
  const isFocused = useIsFocused();
  const committedRequestIdRef = useRef<number | null>(null);

  const leaveGate = () => {
    invalidateTimelineEntryRequest(route.params.entryRequestId);
    if (navigation.canGoBack()) {
      navigation.pop();
    }
    navigation.navigate('HomeTab');
  };

  useEntryAwareBackAction({
    entrySource: route.params.entrySource,
    onHome: leaveGate,
    onMore: leaveGate,
    onFallback: leaveGate,
  });

  useLayoutEffect(() => {
    if (!isFocused) return;
    if (
      committedRequestIdRef.current === entryRequest.entryRequestId
    ) {
      return;
    }

    // Wait for the native stack to commit the focused Gate before resetting
    // it. A frame boundary avoids racing the previous Back/tab transition.
    const frame = requestAnimationFrame(() => {
      if (
        committedRequestIdRef.current === entryRequest.entryRequestId
      ) {
        return;
      }

      // The module snapshot is the latest-wins source. The route payload is a
      // safe recovery source for a remounted Gate when the module snapshot was
      // cleared during a fast back/re-entry cycle.
      const latest =
        getLatestTimelineEntrySnapshot() ??
        publishTimelineEntryRequest(entryRequest);
      const timelineMainParams = {
        petId: latest.request.petId,
        mainCategory: latest.request.mainCategory,
        otherSubCategory: latest.request.otherSubCategory ?? undefined,
        ymFilter: latest.request.ymFilter,
        entrySource: HOME_TOTAL_SUMMARY_ENTRY_SOURCE,
        entryRequestId: latest.request.entryRequestId,
        entryGeneration: latest.generation,
      } as const;

      // Call reset on the nearest Timeline stack instead of dispatching a
      // targeted root action. This guarantees that a stale Main route and the
      // Gate cannot remain in the stack when the screen is re-entered quickly.
      navigation.reset({
        index: 0,
        routes: [{ name: 'TimelineMain', params: timelineMainParams }],
      });
      committedRequestIdRef.current = latest.request.entryRequestId;
    });

    return () => cancelAnimationFrame(frame);
  }, [entryRequest, isFocused, navigation]);

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

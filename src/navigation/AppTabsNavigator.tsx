// 파일: src/navigation/AppTabsNavigator.tsx
// 파일 목적:
// - 로그인 후 메인 사용 흐름의 공통 하단 탭 구조를 정의한다.
// 어디서 쓰이는지:
// - RootNavigator의 `AppTabs` 라우트에서 메인 네비게이터로 사용된다.
// 핵심 역할:
// - Home, Timeline, Community, More 진입을 하나의 탭 레이아웃으로 묶는다.
// - More 오버레이 드로어를 탭 구조 안에서 특수 동작으로 연결한다.
// 데이터·상태 흐름:
// - 현재 탭 상태를 AppNavigationToolbar에 전달하고, More 드로어 open/close 상태는 uiStore가 관리한다.
// 수정 시 주의:
// - 탭 목록이나 param 타입을 바꾸면 하단 툴바, 기록 작성 복귀 흐름, More 드로어 동작이 함께 영향을 받는다.
// - MoreTab은 실제 화면 이동이 아니라 오버레이를 여는 동작이므로 일반 탭처럼 취급하면 안 된다.

import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, NavigationContainerRefContext, StackActions, getFocusedRouteNameFromRoute, type NavigatorScreenParams } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';

import MainScreen from '../screens/Main/MainScreen';
import TimelineStackNavigator, {
  type TimelineStackParamList,
} from './TimelineStackNavigator';
import CommunityTabStackNavigator from './CommunityTabStackNavigator';
import GuestbookScreen from '../screens/Guestbook/GuestbookScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';
import AppNavigationToolbar, { type ActiveTabKey } from '../components/navigation/AppNavigationToolbar';
import { ToolbarHeightContext } from '../components/navigation/ToolbarHeightContext';
import { useUiStore } from '../store/uiStore';
import type { HealthReportTabKey } from '../services/health-report/viewModel';
import { FixedTypographyBoundary } from '../app/providers/AppFontPreferenceProvider';
import type { ScheduleDetailReturnContext } from './scheduleReturn';
import { isRootTabBarVisible, tabTransitionOptions } from './navigationTransitionPolicy';
import { useNavigationMotion } from './useNavigationMotion';

export type RecordCreateReturnTo =
  | { tab: 'WalkHistory'; petId: string }
  | { tab: 'ScheduleDetail'; params: ScheduleDetailReturnContext }
  | { tab: 'HomeTab'; afterCreate?: 'detail' | 'home' }
  | {
      tab: 'TimelineTab';
      params?: NavigatorScreenParams<TimelineStackParamList>;
    }
  | { tab: 'GuestbookTab' }
  | { tab: 'MoreTab' }
  | {
      tab: 'HealthReport';
      petId?: string;
      initialTab?: HealthReportTabKey;
      focusYmd?: string;
    };

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: NavigatorScreenParams<TimelineStackParamList> | undefined;
  CommunityTab: undefined;
  GuestbookTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const toolbarRoutes = {
  home: 'HomeTab', timeline: 'TimelineTab', community: 'CommunityTab', guestbook: 'GuestbookTab',
} satisfies Record<Exclude<ActiveTabKey, 'more'>, keyof AppTabParamList>;

function MoreNull() {
  const theme = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

function FixedCommunityTabStack() {
  return (
    <FixedTypographyBoundary>
      <CommunityTabStackNavigator />
    </FixedTypographyBoundary>
  );
}

function CustomTabBar(
  props: BottomTabBarProps & {
    onToolbarLayout: (event: LayoutChangeEvent) => void;
  },
) {
  const { state } = props;
  const rootNavigation = useContext(NavigationContainerRefContext);
  const currentRoute = state.routes[state.index];
  const currentRouteName = currentRoute?.name;
  const activeKey =
    currentRouteName === 'TimelineTab'
      ? 'timeline'
      : currentRouteName === 'CommunityTab'
      ? 'community'
      : currentRouteName === 'GuestbookTab'
      ? 'guestbook'
      : currentRouteName === 'MoreTab'
      ? 'more'
      : 'home';

  // Only the real tab bar emits reselect. Shared detail/drawer toolbars still navigate.
  const onPressActiveHome = () => {
    const route = state.routes[state.index];
    if (route?.name !== 'HomeTab') return;
    // A rapid tap may reach the old toolbar before the overlay's native tree mounts.
    if (useUiStore.getState().moreDrawerOpen) useUiStore.getState().closeMoreDrawer();
    props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
  };
  if (!isRootTabBarVisible(currentRouteName, currentRoute && getFocusedRouteNameFromRoute(currentRoute))) {
    return null;
  }
  const onNavigateTab = (target: Exclude<ActiveTabKey, 'more'>) => {
    const route = state.routes.find(item => item.name === toolbarRoutes[target]);
    if (!route) return;
    const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      if (useUiStore.getState().moreDrawerOpen) useUiStore.getState().closeMoreDrawer();
      if (target === 'timeline' && getFocusedRouteNameFromRoute(route) !== 'TimelineMain') {
        // Reuse the existing main route instead of restoring a leftover expense/detail scene.
        // The container assembles lazy child state that isn't always present in tab-bar state.
        const rootState = rootNavigation?.getRootState();
        const tabState = rootState?.key === state.key
          ? rootState
          : rootState?.routes.find(item => item.name === 'AppTabs')?.state;
        const childState = tabState?.routes.find(item => item.key === route.key)?.state;
        if (childState?.key) {
          props.navigation.dispatch({ ...CommonActions.navigate({ name: route.name, merge: true }), target: state.key });
          props.navigation.dispatch({
            ...StackActions.popTo('TimelineMain', undefined, { merge: true }),
            target: childState.key,
          });
          return;
        } else {
          props.navigation.dispatch({
            ...CommonActions.navigate({ name: route.name, params: { screen: 'TimelineMain', merge: true, pop: true }, merge: true }),
            target: state.key,
          });
          return;
        }
      }
      props.navigation.dispatch({ ...CommonActions.navigate({ name: route.name, merge: true }), target: state.key });
    }
  };
  return (
    <AppNavigationToolbar
      activeKey={activeKey}
      homeHero={activeKey === 'home'}
      onPressActiveHome={onPressActiveHome}
      onNavigateTab={onNavigateTab}
      onLayout={props.onToolbarLayout}
    />
  );
}

export default function AppTabsNavigator({ onPrepared }: { onPrepared?: () => void }) {
  const reduceMotion = useNavigationMotion();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toolbarHeight, setToolbarHeight] = useState<number | null>(null);
  const [moreVisible, setMoreVisible] = useState(false);
  const handleShellLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) onPrepared?.();
  }, [onPrepared]);
  const handleToolbarLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0) setToolbarHeight(height);
  }, []);
  const moreOpen = useUiStore(s => s.moreDrawerOpen);
  const openMore = useUiStore(s => s.openMoreDrawer);
  const closeMore = useUiStore(s => s.closeMoreDrawer);
  const renderTabBar = useCallback(
    (p: BottomTabBarProps) => (
      <CustomTabBar {...p} onToolbarLayout={handleToolbarLayout} />
    ),
    [handleToolbarLayout],
  );

  return (
    <ToolbarHeightContext.Provider
      value={
        toolbarHeight ??
        56 + Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 10)
      }
    >
      <View testID="app-tabs-shell" style={[styles.root, { backgroundColor: theme.colors.background }]} onLayout={handleShellLayout}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            ...tabTransitionOptions(reduceMotion, moreOpen || moreVisible),
          }}
          tabBar={renderTabBar}
        >
          <Tab.Screen name="HomeTab" component={MainScreen} />
          <Tab.Screen name="TimelineTab" component={TimelineStackNavigator} />
          <Tab.Screen name="CommunityTab" component={FixedCommunityTabStack} />
          <Tab.Screen name="GuestbookTab" component={GuestbookScreen} />
          <Tab.Screen
            name="MoreTab"
            component={MoreNull}
            // ✅ Tab.Navigator 기본 동작 방지하려면 listeners도 같이(안전)
            listeners={{
              tabPress: e => {
                e.preventDefault();
                openMore();
              },
            }}
          />
        </Tab.Navigator>

        {/* ✅ Overlay Drawer */}
        <MoreDrawer open={moreOpen} onClose={closeMore} onVisibilityChange={setMoreVisible} />
      </View>
    </ToolbarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

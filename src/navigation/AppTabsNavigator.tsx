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

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';

import MainScreen from '../screens/Main/MainScreen';
import TimelineStackNavigator, {
  type TimelineStackParamList,
} from './TimelineStackNavigator';
import CommunityTabStackNavigator from './CommunityTabStackNavigator';
import GuestbookScreen from '../screens/Guestbook/GuestbookScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';
import AppNavigationToolbar from '../components/navigation/AppNavigationToolbar';
import { useUiStore } from '../store/uiStore';

export type RecordCreateReturnTo =
  | { tab: 'HomeTab' }
  | {
      tab: 'TimelineTab';
      params?: NavigatorScreenParams<TimelineStackParamList>;
    }
  | { tab: 'GuestbookTab' }
  | { tab: 'MoreTab' };

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: NavigatorScreenParams<TimelineStackParamList> | undefined;
  CommunityTab: undefined;
  GuestbookTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function MoreNull() {
  const theme = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

function CustomTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const currentRouteName = state.routes[state.index]?.name;
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

  return <AppNavigationToolbar activeKey={activeKey} />;
}

export default function AppTabsNavigator() {
  const theme = useTheme();
  const moreOpen = useUiStore(s => s.moreDrawerOpen);
  const openMore = useUiStore(s => s.openMoreDrawer);
  const closeMore = useUiStore(s => s.closeMoreDrawer);
  const renderTabBar = useCallback(
    (p: BottomTabBarProps) => <CustomTabBar {...p} />,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
          }}
          tabBar={renderTabBar}
        >
          <Tab.Screen name="HomeTab" component={MainScreen} />
          <Tab.Screen name="TimelineTab" component={TimelineStackNavigator} />
          <Tab.Screen
            name="CommunityTab"
            component={CommunityTabStackNavigator}
          />
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
        <MoreDrawer open={moreOpen} onClose={closeMore} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

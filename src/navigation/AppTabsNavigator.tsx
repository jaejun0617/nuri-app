// 파일: src/navigation/AppTabsNavigator.tsx
// 목적:
// - 공통 하단 탭 유지 (Home/Timeline/RecordCreate/FAB/Guestbook/More)
// - ✅ RecordCreateTab: 가운데 떠있는 FAB 탭 버튼(원형 + 그림자)
// - ✅ MoreTab: 이동이 아니라 Drawer Overlay 오픈
// - ✅ 전역 SafeArea(top) 적용
// - ✅ 아이콘: react-native-vector-icons/Feather 통일

import React, { useCallback, useMemo } from 'react';
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
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';
import GuestbookScreen from '../screens/Guestbook/GuestbookScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';
import AppNavigationToolbar from '../components/navigation/AppNavigationToolbar';
import { useUiStore } from '../store/uiStore';

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: NavigatorScreenParams<TimelineStackParamList> | undefined;
  RecordCreateTab: { petId?: string } | undefined;
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
  const shouldHideTabBar = useMemo(() => {
    const current = state.routes[state.index];
    if (!current) return false;

    if (current.name === 'RecordCreateTab') {
      return true;
    }

    if (current.name === 'TimelineTab') {
      return true;
    }

    return false;
  }, [state]);

  if (shouldHideTabBar) return null;

  const currentRouteName = state.routes[state.index]?.name;
  const activeKey =
    currentRouteName === 'TimelineTab'
      ? 'timeline'
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
          <Tab.Screen name="RecordCreateTab" component={RecordCreateScreen} />
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

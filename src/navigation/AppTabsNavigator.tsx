// 파일: src/navigation/AppTabsNavigator.tsx
// 목적:
// - 공통 하단 탭 유지 (Home/Timeline/RecordCreate/FAB/Guestbook/More)
// - ✅ RecordCreateTab: 가운데 떠있는 FAB 탭 버튼(원형 + 그림자)
// - ✅ MoreTab: 이동이 아니라 Drawer Overlay 오픈
// - ✅ 전역 SafeArea(top) 적용
// - ✅ 아이콘: react-native-vector-icons/Feather 통일

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

import MainScreen from '../screens/Main/MainScreen';
import TimelineStackNavigator, {
  type TimelineStackParamList,
} from './TimelineStackNavigator';
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';
import GuestbookScreen from '../screens/Guestbook/GuestbookScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: NavigatorScreenParams<TimelineStackParamList> | undefined;
  RecordCreateTab: { petId?: string } | undefined;
  GuestbookTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function MoreNull() {
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}

/* ---------------------------------------------------------
 * 1) Custom TabBar (중앙 FAB)
 * -------------------------------------------------------- */
function CustomTabBar(props: BottomTabBarProps & { onOpenMore: () => void }) {
  const { state, navigation, onOpenMore } = props;
  const insets = useSafeAreaInsets();

  const ACTIVE = '#6D6AF8';
  const INACTIVE = '#777777';

  const go = useCallback(
    (routeName: string) => {
      navigation.navigate(routeName as never);
    },
    [navigation],
  );

  const currentIndex = state.index;
  const currentRoute = state.routes[currentIndex];
  const currentRouteName = currentRoute?.name;

  const isActive = useCallback(
    (name: string) => currentRouteName === name,
    [currentRouteName],
  );

  const tabBarHeight = useMemo(() => {
    // FAB 때문에 기본보다 약간 높은 탭바(스샷 느낌)
    const base = 64;
    const bottom = Math.min(insets.bottom, 18);
    return base + bottom;
  }, [insets.bottom]);

  const handlePress = useCallback(
    (routeName: string) => {
      if (routeName === 'MoreTab') {
        onOpenMore();
        return;
      }
      if (routeName === 'TimelineTab') {
        navigation.navigate({
          name: 'TimelineTab',
          params: { screen: 'TimelineMain', params: { mainCategory: 'all' } },
          merge: false,
        } as never);
        return;
      }
      go(routeName);
    },
    [go, navigation, onOpenMore],
  );

  const shouldHideTabBar = useMemo(() => {
    const current = state.routes[state.index];
    if (!current || current.name !== 'TimelineTab') return false;

    const nested = current.state as
      | {
          index?: number;
          routes?: Array<{ name?: string }>;
        }
      | undefined;

    const nestedIndex = nested?.index ?? 0;
    const nestedName = nested?.routes?.[nestedIndex]?.name ?? 'TimelineMain';
    return nestedName === 'RecordDetail' || nestedName === 'RecordEdit';
  }, [state]);

  if (shouldHideTabBar) return null;

  return (
    <View style={[styles.tabBarWrap, { height: tabBarHeight }]}>
      {/* 탭바 본체 */}
      <View style={styles.tabBar}>
        {/* Home */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.tabItem}
          onPress={() => handlePress('HomeTab')}
        >
          <Feather
            name="home"
            size={18}
            color={isActive('HomeTab') ? ACTIVE : INACTIVE}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isActive('HomeTab') ? ACTIVE : INACTIVE },
            ]}
          >
            홈
          </Text>
        </TouchableOpacity>

        {/* Timeline */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.tabItem}
          onPress={() => handlePress('TimelineTab')}
        >
          <Feather
            name="activity"
            size={18}
            color={isActive('TimelineTab') ? ACTIVE : INACTIVE}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isActive('TimelineTab') ? ACTIVE : INACTIVE },
            ]}
          >
            타임라인
          </Text>
        </TouchableOpacity>

        {/* 중앙 FAB 자리(공간 확보용) */}
        <View style={styles.fabSlot} />

        {/* Guestbook */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.tabItem}
          onPress={() => handlePress('GuestbookTab')}
        >
          <Feather
            name="book-open"
            size={18}
            color={isActive('GuestbookTab') ? ACTIVE : INACTIVE}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isActive('GuestbookTab') ? ACTIVE : INACTIVE },
            ]}
          >
            방명록
          </Text>
        </TouchableOpacity>

        {/* More */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.tabItem}
          onPress={() => handlePress('MoreTab')}
        >
          <Feather
            name="menu"
            size={18}
            color={isActive('MoreTab') ? ACTIVE : INACTIVE}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isActive('MoreTab') ? ACTIVE : INACTIVE },
            ]}
          >
            전체메뉴
          </Text>
        </TouchableOpacity>
      </View>

      {/* 중앙 FAB 버튼 */}
      <View pointerEvents="box-none" style={styles.fabLayer}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.fabBtn}
          onPress={() => handlePress('RecordCreateTab')}
        >
          <Feather name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppTabsNavigator() {
  // ---------------------------------------------------------
  // 1) drawer state
  // ---------------------------------------------------------
  const [moreOpen, setMoreOpen] = useState(false);
  const openMore = useCallback(() => setMoreOpen(true), []);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
          }}
          tabBar={p => <CustomTabBar {...p} onOpenMore={openMore} />}
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

const BRAND = '#6D6AF8';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ---------------------------------------------------------
  // TabBar
  // ---------------------------------------------------------
  tabBarWrap: {
    backgroundColor: 'transparent',
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },

  tabItem: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  // 중앙 FAB 자리 확보 (가운데 “구멍” 느낌)
  fabSlot: {
    width: 86,
  },

  // ---------------------------------------------------------
  // FAB
  // ---------------------------------------------------------
  fabLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  fabBtn: {
    width: 66,
    height: 66,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,

    // ✅ 떠있는 느낌(그림자)
    shadowColor: BRAND,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,

    // ✅ 탭바 위로 살짝 올라오게
    marginTop: -20,

    // ✅ 약간의 링 느낌
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.96)',
  },
});

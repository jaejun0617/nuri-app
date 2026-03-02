// 파일: src/navigation/AppTabsNavigator.tsx
// 목적:
// - 공통 하단 탭 유지
// - ✅ MoreTab은 "이동"이 아니라 Drawer Overlay 오픈
// - ✅ 전역 SafeArea(top) 적용: 탭 내부 모든 화면이 StatusBar 아래로 내려오게

import React, { useCallback, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MainScreen from '../screens/Main/MainScreen';
import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';

import MoreDrawer from '../components/MoreDrawer/MoreDrawer';

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: undefined;
  RecordCreateTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function MoreNull() {
  return <View style={styles.moreNull} />;
}

export default function AppTabsNavigator() {
  // ---------------------------------------------------------
  // 1) drawer state
  // ---------------------------------------------------------
  const [moreOpen, setMoreOpen] = useState(false);

  const openMore = useCallback(() => setMoreOpen(true), []);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  return (
    // ---------------------------------------------------------
    // ✅ 핵심: 탭 전체를 SafeArea(top)로 감싸서
    // - 모든 탭 화면(Main/Timeline/Create)이 StatusBar 아래로 내려감
    // - MoreDrawer(absolute overlay)도 같은 기준을 공유해서 일관성 유지
    // ---------------------------------------------------------
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarActiveTintColor: '#000000',
            tabBarInactiveTintColor: '#777777',
          }}
        >
          <Tab.Screen
            name="HomeTab"
            component={MainScreen}
            options={{
              title: '홈',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16 }}>⌂</Text>
              ),
            }}
          />

          <Tab.Screen
            name="TimelineTab"
            component={TimelineScreen}
            options={{
              title: '타임라인',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16 }}>🐾</Text>
              ),
            }}
          />

          <Tab.Screen
            name="RecordCreateTab"
            component={RecordCreateScreen}
            options={{
              title: '기록하기',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16 }}>＋</Text>
              ),
            }}
          />

          <Tab.Screen
            name="MoreTab"
            component={MoreNull}
            listeners={{
              tabPress: e => {
                // ✅ 이동 막고 Drawer 오픈
                e.preventDefault();
                openMore();
              },
            }}
            options={{
              title: '더보기',
              tabBarIcon: ({ color }) => (
                <Text style={{ color, fontSize: 16 }}>≡</Text>
              ),
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
  moreNull: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

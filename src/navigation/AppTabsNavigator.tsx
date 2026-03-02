// 파일: src/navigation/AppTabsNavigator.tsx
// 목적:
// - 공통 하단 탭 유지
// - ✅ MoreTab은 "이동"이 아니라 왼쪽 Drawer Overlay 오픈

import React, { useCallback, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

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
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
}

export default function AppTabsNavigator() {
  // ---------------------------------------------------------
  // 1) drawer state
  // ---------------------------------------------------------
  const [moreOpen, setMoreOpen] = useState(false);

  const openMore = useCallback(() => setMoreOpen(true), []);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#EAEAEA',
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
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
            title: '추억보기',
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
  );
}

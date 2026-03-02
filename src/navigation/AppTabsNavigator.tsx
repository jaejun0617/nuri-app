// 파일: src/navigation/AppTabsNavigator.tsx
// 목적:
// - Splash를 제외한 "앱 본 화면"에서 공통 하단 탭을 항상 노출
// - Home(Main), Timeline(추억보기), RecordCreate(기록하기), More(더보기) 진입점 제공
// - 탭 스크린은 "petId params 없이" 진입해도 동작하도록 각 Screen이 store fallback을 사용하도록 설계

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import MainScreen from '../screens/Main/MainScreen';
import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordCreateScreen from '../screens/Records/RecordCreateScreen';

export type AppTabParamList = {
  HomeTab: undefined;
  TimelineTab: undefined;
  RecordCreateTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function MorePlaceholder() {
  return (
    <Text style={{ flex: 1, textAlign: 'center', textAlignVertical: 'center' }}>
      More (추후 연결)
    </Text>
  );
}

export default function AppTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // 탭 내부 화면은 앱 내 UI 헤더만 사용
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EAEAEA',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
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
        component={MorePlaceholder}
        options={{
          title: '더보기',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 16 }}>≡</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

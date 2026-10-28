// 파일: src/navigation/TimelineStackNavigator.tsx
// 역할:
// - Timeline 탭 내부의 상세/수정 Stack을 관리하며 하위 화면에서는 루트 탭바를 숨긴다.
// - TimelineMain, RecordDetail, RecordEdit 사이의 타입 안전한 라우팅 경계를 제공
// - 타임라인 흐름을 루트 스택과 분리해 화면 전환 책임을 명확히 유지

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TimelineScreen from '../screens/Records/TimelineScreen';
import TimelineEntryGateScreen from '../screens/Records/TimelineEntryGateScreen';
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';
import MonthlyExpensesScreen from '../screens/Records/MonthlyExpensesScreen';
import type { MemoryOtherSubCategory } from '../services/memories/categoryMeta';
import type { HomeTotalSummaryEntryRequest } from '../screens/Records/timelineEntry';
import type { ScreenEntrySource } from './entry';
import type { ScheduleDetailReturnContext } from './scheduleReturn';
import { timelineTransitionOptions } from './navigationTransitionPolicy';
import { useNavigationMotion } from './useNavigationMotion';
import type { NotificationOpenReceipt } from '../services/notifications/openNotification';

export type TimelineStackParamList = {
  MonthlyExpenses: {
    monthKey?: string;
    entrySource?: 'home' | 'more';
    entryRequestId?: number;
  } | undefined;
  TimelineMain:
    | {
        notificationOpen?: NotificationOpenReceipt;
        petId?: string;
        mainCategory?: 'all' | 'walk' | 'meal' | 'health' | 'diary' | 'other';
        otherSubCategory?: MemoryOtherSubCategory;
        ymFilter?: string | null;
        notificationPeriod?: { startDate: string; endDate: string };
        notificationEntryId?: string;
        entrySource?: ScreenEntrySource;
        entryRequestId?: number;
        entryGeneration?: number;
      }
    | undefined;
  TimelineEntryGate: HomeTotalSummaryEntryRequest;
  RecordDetail: {
    notificationOpen?: NotificationOpenReceipt;
    petId: string;
    memoryId: string;
    entrySource?: ScreenEntrySource;
    scheduleReturn?: ScheduleDetailReturnContext;
  };
  RecordEdit: {
    walkDraftSessionId?: string;
    petId: string;
    memoryId: string;
    entrySource?: ScreenEntrySource;
    scheduleReturn?: ScheduleDetailReturnContext;
  };
};

const Stack = createNativeStackNavigator<TimelineStackParamList>();

export default function TimelineStackNavigator() {
  const reduceMotion = useNavigationMotion();
  return (
    <Stack.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      ...timelineTransitionOptions(route.name, reduceMotion),
    })}>
      <Stack.Screen name="TimelineMain" component={TimelineScreen} />
      <Stack.Screen
        name="TimelineEntryGate"
        component={TimelineEntryGateScreen}
        options={{ animation: 'none' }}
      />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="RecordEdit" component={RecordEditScreen} />
      <Stack.Screen name="MonthlyExpenses" component={MonthlyExpensesScreen} />
    </Stack.Navigator>
  );
}

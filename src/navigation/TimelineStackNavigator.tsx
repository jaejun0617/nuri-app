// 파일: src/navigation/TimelineStackNavigator.tsx
// 역할:
// - Timeline 탭 내부에서 상세/수정 화면까지 하단 탭을 유지하는 Stack 네비게이터
// - TimelineMain, RecordDetail, RecordEdit 사이의 타입 안전한 라우팅 경계를 제공
// - 타임라인 흐름을 루트 스택과 분리해 화면 전환 책임을 명확히 유지

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';
import type { MemoryOtherSubCategory } from '../services/memories/categoryMeta';
import type { ScreenEntrySource } from './entry';

export type TimelineStackParamList = {
  TimelineMain:
    | {
        petId?: string;
        mainCategory?: 'all' | 'walk' | 'meal' | 'health' | 'diary' | 'other';
        otherSubCategory?: MemoryOtherSubCategory;
        entrySource?: ScreenEntrySource;
      }
    | undefined;
  RecordDetail: {
    petId: string;
    memoryId: string;
    entrySource?: ScreenEntrySource;
  };
  RecordEdit: {
    petId: string;
    memoryId: string;
    entrySource?: ScreenEntrySource;
  };
};

const Stack = createNativeStackNavigator<TimelineStackParamList>();

export default function TimelineStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TimelineMain" component={TimelineScreen} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="RecordEdit" component={RecordEditScreen} />
    </Stack.Navigator>
  );
}

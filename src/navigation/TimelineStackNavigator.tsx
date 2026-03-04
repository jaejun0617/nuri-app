import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TimelineScreen from '../screens/Records/TimelineScreen';
import RecordDetailScreen from '../screens/Records/RecordDetailScreen';
import RecordEditScreen from '../screens/Records/RecordEditScreen';

export type TimelineStackParamList = {
  TimelineMain:
    | {
        petId?: string;
        mainCategory?: 'all' | 'walk' | 'meal' | 'health' | 'diary' | 'other';
        otherSubCategory?: 'grooming' | 'hospital' | 'etc';
      }
    | undefined;
  RecordDetail: { petId: string; memoryId: string };
  RecordEdit: { petId: string; memoryId: string };
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


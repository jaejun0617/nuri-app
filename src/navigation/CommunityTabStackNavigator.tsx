import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CommunityStackHeader from './CommunityStackHeader';
import CommunityListScreen from '../screens/Community/CommunityListScreen';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export type CommunityTabStackParamList = {
  CommunityTabList: undefined;
};

const Stack = createNativeStackNavigator<CommunityTabStackParamList>();
const renderCommunityTabHeader = (props: NativeStackHeaderProps) => (
  <CommunityStackHeader {...props} />
);

export default function CommunityTabStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityTabList"
        component={CommunityListScreen}
        options={{
          headerShown: true,
          headerTitle: '커뮤니티',
          header: renderCommunityTabHeader,
        }}
      />
    </Stack.Navigator>
  );
}

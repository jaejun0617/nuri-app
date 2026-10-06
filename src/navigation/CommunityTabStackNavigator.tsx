import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CommunityListScreen from '../screens/Community/CommunityListScreen';

export type CommunityTabStackParamList = {
  CommunityTabList: undefined;
};

const Stack = createNativeStackNavigator<CommunityTabStackParamList>();

export default function CommunityTabStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityTabList"
        component={CommunityListScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

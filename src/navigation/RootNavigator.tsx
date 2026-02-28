// 파일: src/navigation/RootNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';

import AuthLandingScreen from '../screens/Auth/AuthLandingScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import NicknameSetupScreen from '../screens/Auth/NicknameSetupScreen';

import PetCreateScreen from '../screens/Pets/PetCreateScreen';

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;

  AuthLanding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  NicknameSetup: { after?: 'signin' | 'signup' } | undefined;

  PetCreate: undefined;

  DevTest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerBackTitle: '뒤로',
      }}
    >
      <Stack.Screen
        name="Splash"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{ title: '홈' }}
      />

      {/* Auth */}
      <Stack.Screen
        name="AuthLanding"
        component={AuthLandingScreen}
        options={{ title: '로그인' }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: '로그인' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: '회원가입' }}
      />
      <Stack.Screen
        name="NicknameSetup"
        component={NicknameSetupScreen}
        options={{ title: '닉네임 설정' }}
      />

      {/* Pet */}
      <Stack.Screen
        name="PetCreate"
        component={PetCreateScreen}
        options={{ title: '반려동물 등록' }}
      />

      {/* Dev only */}
      {__DEV__ ? (
        <Stack.Screen
          name="DevTest"
          getComponent={() =>
            require('../screens/DevTest/DevTestScreen').default
          }
          options={{ title: 'Dev Test' }}
        />
      ) : null}
    </Stack.Navigator>
  );
}

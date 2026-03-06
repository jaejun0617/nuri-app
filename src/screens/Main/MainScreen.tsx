// 파일: src/screens/Main/MainScreen.tsx
// 목적:
// - 홈 진입점
// - Guest / Logged-in 레이아웃 완전 분리
// - 이 컴포넌트는 "분기만" 담당

import React, { useCallback } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';

import GuestHome from './components/GuestHome/GuestHome';
import LoggedInHome from './components/LoggedInHome/LoggedInHome';

export default function MainScreen() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          Alert.alert(
            '앱을 종료하시겠습니까?',
            '앱을 종료하면 현재 화면이 닫힙니다.',
            [
              { text: '계속 이용하기', style: 'cancel' },
              { text: '종료', onPress: () => BackHandler.exitApp() },
            ],
          );
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  if (!isLoggedIn) return <GuestHome />;
  return <LoggedInHome />;
}

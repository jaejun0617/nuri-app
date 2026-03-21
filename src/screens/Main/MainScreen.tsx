// 파일: src/screens/Main/MainScreen.tsx
// 파일 목적:
// - 홈 탭의 진입 분기 전용 화면으로, 게스트 홈과 로그인 홈을 나눈다.
// 어디서 쓰이는지:
// - AppTabsNavigator의 `HomeTab` 화면으로 사용된다.
// 핵심 역할:
// - 로그인 여부에 따라 GuestHome 또는 LoggedInHome을 렌더링한다.
// - 로그인 사용자는 포커스 시 닉네임/펫 등록 상태를 다시 확인해 온보딩 가드를 유지한다.
// 데이터·상태 흐름:
// - authStore와 petStore의 최소 정보만 읽어 화면 분기와 자동 이동을 결정하고, 실제 홈 데이터 렌더링은 하위 컴포넌트가 맡는다.
// 수정 시 주의:
// - 이 파일은 허브 분기만 담당해야 하므로, 홈 비즈니스 로직을 여기로 끌어올리면 결합도가 빠르게 커진다.
// - Android 뒤로가기 종료 처리와 온보딩 가드가 함께 있어 포커스 effect 변경 시 회귀를 주의해야 한다.

import React, { useCallback } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';

import GuestHome from './components/GuestHome/GuestHome';
import LoggedInHome from './components/LoggedInHome/LoggedInHome';

export default function MainScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const nickname = useAuthStore(s => s.profile.nickname);
  const profileSyncStatus = useAuthStore(s => s.profileSyncStatus);
  const petsCount = usePetStore(s => s.pets.length);
  const petLoading = usePetStore(s => s.loading);

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

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) {
        return undefined;
      }
      if (profileSyncStatus !== 'ready' || petLoading) {
        return undefined;
      }

      const trimmedNickname = nickname?.trim() ?? '';
      if (!trimmedNickname) {
        navigation.navigate('NicknameSetup');
        return undefined;
      }

      if (petsCount === 0) {
        navigation.navigate('PetCreate', { from: 'auto' });
      }

      return undefined;
    }, [isLoggedIn, navigation, nickname, petLoading, petsCount, profileSyncStatus]),
  );

  if (!isLoggedIn) return <GuestHome />;
  return <LoggedInHome />;
}

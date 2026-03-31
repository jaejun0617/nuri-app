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

import React, { useCallback, useMemo, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { buildPetThemePalette } from '../../services/pets/themePalette';
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
  const isPasswordRecoveryActive = useAuthStore(
    s => s.passwordRecoveryFlow.status === 'active',
  );
  const pets = usePetStore(s => s.pets);
  const selectedPetId = usePetStore(s => s.selectedPetId);
  const petsCount = usePetStore(s => s.pets.length);
  const petLoading = usePetStore(s => s.loading);
  const petErrorMessage = usePetStore(s => s.errorMessage);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const selectedPet = useMemo(
    () => pets.find(candidate => candidate.id === selectedPetId) ?? pets[0] ?? null,
    [pets, selectedPetId],
  );
  const petTheme = useMemo(
    () => buildPetThemePalette(selectedPet?.themeColor),
    [selectedPet?.themeColor],
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          setExitConfirmVisible(true);
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (isPasswordRecoveryActive) {
        navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
        return undefined;
      }

      if (!isLoggedIn) {
        return undefined;
      }
      if (profileSyncStatus !== 'ready' || petLoading || petErrorMessage) {
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
    }, [
      isLoggedIn,
      isPasswordRecoveryActive,
      navigation,
      nickname,
      petLoading,
      petErrorMessage,
      petsCount,
      profileSyncStatus,
    ]),
  );

  return (
    <>
      {isLoggedIn && !isPasswordRecoveryActive ? <LoggedInHome /> : <GuestHome />}
      <ConfirmDialog
        visible={exitConfirmVisible}
        title="앱을 종료할까요?"
        message={'앱을 닫아도 저장된 정보는 그대로 유지되며\n다음에 다시 이어서 사용할 수 있어요.'}
        cancelLabel="계속 둘러보기"
        confirmLabel="앱 종료"
        tone="warning"
        accentColor={petTheme.primary}
        onCancel={() => setExitConfirmVisible(false)}
        onConfirm={() => {
          setExitConfirmVisible(false);
          BackHandler.exitApp();
        }}
      />
    </>
  );
}

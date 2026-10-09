// 파일: src/screens/Home/HomeScreen.tsx
// 파일 목적:
// - 앱 부팅 직후 보이는 Splash 화면을 렌더링하며, 첫 진입 라우트 결정을 안전하게 지연한다.
// 어디서 쓰이는지:
// - RootNavigator의 `Splash` 화면으로 사용되며, 앱 시작 직후 가장 먼저 보이는 화면이다.
// 핵심 역할:
// - auth/pet boot 완료와 최소 노출 시간을 기다린 뒤 `resolveBootRoute` 결과로 다음 화면을 reset 이동한다.
// - 브랜딩 애니메이션과 배경 비주얼을 보여주되, 실제 business decision은 boot 서비스와 store 상태를 따른다.
// 데이터·상태 흐름:
// - authStore와 petStore의 boot 상태, 닉네임, 펫 수를 읽어 다음 진입 경로를 계산한다.
// - AppProviders가 채운 부트 상태가 안정화된 뒤에만 실제 화면 전환이 일어난다.
// 수정 시 주의:
// - 이 화면에서 직접 분기 정책을 늘리기보다 `services/app/boot.ts`를 기준으로 유지해야 가드 규칙이 한곳에 모인다.
// - reset 이동과 최소 노출 시간 규칙을 바꾸면 첫 실행 UX와 로그인 복귀 흐름이 흔들릴 수 있다.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import * as S from './HomeScreen.styles';
import { getBootSplashHoldMs, resolveBootRoute } from '../../services/app/boot';
import {
  loadCommunityRouteStateSnapshot,
  type CommunityRouteStateSnapshot,
} from '../../navigation/communityRouteState';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import {
  getSeasonalSplashVisual,
  getSplashArtworkSize,
} from '../../theme/seasonal/assets';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const authBooted = useAuthStore(s => s.booted);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const currentUserId = useAuthStore(s => s.session?.user.id ?? null);
  const nickname = useAuthStore(s => s.profile.nickname);
  const profileSyncStatus = useAuthStore(s => s.profileSyncStatus);
  const passwordRecoveryFlow = useAuthStore(s => s.passwordRecoveryFlow);
  const accountDeletionGate = useAuthStore(s => s.accountDeletionGate);
  const petBooted = usePetStore(s => s.booted);
  const pets = usePetStore(s => s.pets);
  const petErrorMessage = usePetStore(s => s.errorMessage);
  const restoreCommunityListSnapshot = useCommunityStore(
    s => s.restoreListSnapshot,
  );
  const [communityRouteSnapshot, setCommunityRouteSnapshot] =
    useState<CommunityRouteStateSnapshot | null>(null);
  const [communityRouteSnapshotChecked, setCommunityRouteSnapshotChecked] =
    useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState<
    boolean | null
  >(null);

  // Splash 시작 시각
  const startedAtRef = useRef<number>(Date.now());
  const movedRef = useRef(false);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const season = useEffectiveSeason();
  const seasonalVisual = useMemo(
    () => getSeasonalSplashVisual(season),
    [season],
  );

  const artworkSize = getSplashArtworkSize(
    width - insets.left - insets.right,
    height - insets.top - insets.bottom,
  );
  const imageOpacity = useRef(new Animated.Value(0.96)).current;
  const nextRoute = useMemo(() => {
    return resolveBootRoute({
      isLoggedIn,
      nickname,
      profileSyncStatus,
      petsCount: pets.length,
      petErrorMessage,
      passwordRecoveryFlow,
      accountDeletionGate,
    });
  }, [
    accountDeletionGate,
    isLoggedIn,
    nickname,
    passwordRecoveryFlow,
    profileSyncStatus,
    pets.length,
    petErrorMessage,
  ]);
  const splashHoldMs = useMemo(
    () => getBootSplashHoldMs(nextRoute.name),
    [nextRoute.name],
  );

  useEffect(() => {
    if (!authBooted || !petBooted) return;

    let isActive = true;
    setCommunityRouteSnapshotChecked(false);

    loadCommunityRouteStateSnapshot(currentUserId)
      .then(snapshot => {
        if (!isActive) return;
        if (snapshot) restoreCommunityListSnapshot(snapshot.list);
        setCommunityRouteSnapshot(snapshot);
        setCommunityRouteSnapshotChecked(true);
      })
      .catch(() => {
        if (!isActive) return;
        setCommunityRouteSnapshot(null);
        setCommunityRouteSnapshotChecked(true);
      });

    return () => {
      isActive = false;
    };
  }, [authBooted, currentUserId, petBooted, restoreCommunityListSnapshot]);
  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (active) setReduceMotionEnabled(enabled);
      })
      .catch(() => {
        if (active) setReduceMotionEnabled(false);
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  // ---------------------------------------------------------
  // ✅ 핵심: 부트 완료 + 최소 Splash 시간 만족 → AppTabs reset
  // ---------------------------------------------------------
  useEffect(() => {
    if (movedRef.current) return;
    if (!authBooted || !petBooted) return;
    if (!communityRouteSnapshotChecked) return;

    const elapsed = Date.now() - startedAtRef.current;
    const wait = Math.max(0, splashHoldMs - elapsed);

    const t = setTimeout(() => {
      if (movedRef.current) return;
      movedRef.current = true;

      if (nextRoute.name === 'AppTabs' && communityRouteSnapshot) {
        if (communityRouteSnapshot.route.name !== 'list') {
          navigation.reset({
            index: 1,
            routes: [
              { name: 'AppTabs', params: { screen: 'CommunityTab' } },
              {
                name:
                  communityRouteSnapshot.route.name === 'comments' ||
                  communityRouteSnapshot.route.commentId
                    ? 'CommunityComments'
                    : 'CommunityDetail',
                params: {
                  postId: communityRouteSnapshot.route.postId,
                  ...(communityRouteSnapshot.route.commentId
                    ? { commentId: communityRouteSnapshot.route.commentId }
                    : {}),
                  restoredFromRouteSnapshot: true,
                },
              },
            ],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AppTabs', params: { screen: 'CommunityTab' } }],
          });
        }
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute.name, params: nextRoute.params }],
      });
    }, wait);

    return () => clearTimeout(t);
  }, [
    authBooted,
    communityRouteSnapshot,
    communityRouteSnapshotChecked,
    navigation,
    nextRoute,
    petBooted,
    splashHoldMs,
  ]);

  // The supplied bitmap owns the complete branding. Fade only: scaling would
  // crop the right-aligned wordmark and the pets at the bottom.
  useEffect(() => {
    if (reduceMotionEnabled === null) return;
    if (reduceMotionEnabled) {
      imageOpacity.setValue(1);
      return;
    }
    const animation = Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [imageOpacity, reduceMotionEnabled]);

  return (
    <S.Background $backgroundColor={seasonalVisual.backgroundColor}>
      <StatusBar barStyle="dark-content" />
      <Animated.Image
        testID="seasonal-splash-artwork"
        source={seasonalVisual.source}
        resizeMode="contain"
        fadeDuration={0}
        accessible
        accessibilityRole="image"
        accessibilityLabel={seasonalVisual.accessibilityLabel}
        accessibilityIgnoresInvertColors
        style={[
          artworkSize,
          { opacity: imageOpacity, marginBottom: insets.bottom },
        ]}
      />
    </S.Background>
  );
}

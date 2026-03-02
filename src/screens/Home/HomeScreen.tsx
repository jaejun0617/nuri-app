import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import AppText from '../../app/ui/AppText';
import * as S from './HomeScreen.styles';
import { textStyles } from './HomeScreen.styles';

import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

// ✅ Splash 최소 노출 시간(0.8~1.0s)
const MIN_SPLASH_MS = 900;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const authBooted = useAuthStore(s => s.booted);
  const petBooted = usePetStore(s => s.booted);

  // Splash 시작 시각
  const startedAtRef = useRef<number>(Date.now());
  const movedRef = useRef(false);

  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cardTopPadding = useMemo(() => {
    const ratioBase = height * 0.16;
    const safeTop = insets.top + 8;
    const raw = ratioBase + safeTop;

    const min = 92 + safeTop;
    const max = 200 + safeTop;

    return Math.max(min, Math.min(max, raw));
  }, [height, insets.top]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const brandTranslateY = useRef(new Animated.Value(12)).current;
  const brandScale = useRef(new Animated.Value(0.96)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  const logoSource = useMemo(() => require('../../assets/logo/logo.png'), []);
  const bgSource = useMemo(() => require('../../assets/home/home__bg.png'), []);
  const blurSource = useMemo(
    () => require('../../assets/home/home__blur.png'),
    [],
  );

  // ---------------------------------------------------------
  // ✅ 핵심: 부트 완료 + 최소 Splash 시간 만족 → AppTabs reset
  // ---------------------------------------------------------
  useEffect(() => {
    if (movedRef.current) return;
    if (!authBooted || !petBooted) return;

    const elapsed = Date.now() - startedAtRef.current;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);

    const t = setTimeout(() => {
      if (movedRef.current) return;
      movedRef.current = true;

      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs' }],
      });
    }, wait);

    return () => clearTimeout(t);
  }, [authBooted, petBooted, navigation]);

  // ---------------------------------------------------------
  // 애니메이션(기존 유지)
  // ---------------------------------------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 400,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(brandTranslateY, {
        toValue: 0,
        duration: 520,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(brandScale, {
        toValue: 1,
        duration: 520,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, brandOpacity, brandTranslateY, brandScale]);

  // ---------------------------------------------------------
  // Dev 전용: 수동 진입 버튼(원하면 유지)
  // ---------------------------------------------------------
  const goToMainDev = () => {
    navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
  };

  return (
    <S.Background>
      <S.BgBlur source={blurSource}>
        <S.Overlay />
      </S.BgBlur>

      <S.BgContain source={bgSource} />

      <S.Container $pt={cardTopPadding}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <S.Card>
            <Animated.View
              style={{
                opacity: brandOpacity,
                transform: [
                  { translateY: brandTranslateY },
                  { scale: brandScale },
                ],
              }}
            >
              <S.BrandRow>
                <S.Logo source={logoSource} resizeMode="contain" />
                <AppText preset="title1" color="#ffffff">
                  NURI
                </AppText>
              </S.BrandRow>
            </Animated.View>

            <S.Spacer $h={18} />

            <AppText preset="body" color="#ffffff" style={textStyles.shadow}>
              지금 이 순간도, 함께 기록해요
            </AppText>

            <S.Spacer $h={8} />

            <AppText preset="body" color="#ffffff" style={textStyles.shadow}>
              우리의 시간을 기억으로 남기다
            </AppText>

            {__DEV__ && (
              <>
                <S.Spacer $h={20} />
                <S.Button onPress={goToMainDev}>
                  <AppText preset="body" color="#000000" weight="600">
                    (DEV) AppTabs로 이동
                  </AppText>
                </S.Button>

                <S.Spacer $h={10} />
                <AppText preset="caption" color="rgba(255,255,255,0.75)">
                  개발모드: Splash 자동 진입(booted gate) 동작 중
                </AppText>
              </>
            )}
          </S.Card>
        </Animated.View>
      </S.Container>
    </S.Background>
  );
}

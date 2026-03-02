// 파일: src/screens/Home/HomeScreen.tsx
// (기존 목적/구조 유지)
// 변경점:
// - Splash 버튼 이동: Main이 아니라 AppTabs로 진입 (공통 하단 탭 적용)

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import AppText from '../../app/ui/AppText';
import * as S from './HomeScreen.styles';
import { textStyles } from './HomeScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

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

  // ✅ 변경: AppTabs로 이동
  const goToMain = () => {
    navigation.navigate('AppTabs');
  };

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

            <S.Spacer $h={20} />

            <S.Button onPress={goToMain}>
              <AppText preset="body" color="#000000" weight="600">
                메인으로 이동
              </AppText>
            </S.Button>

            {__DEV__ && (
              <>
                <S.Spacer $h={10} />
                <AppText preset="caption" color="rgba(255,255,255,0.75)">
                  개발모드: 자동 이동 비활성화
                </AppText>
              </>
            )}
          </S.Card>
        </Animated.View>
      </S.Container>
    </S.Background>
  );
}

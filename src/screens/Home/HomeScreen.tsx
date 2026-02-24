// 파일: src/screens/Home/HomeScreen.tsx
// -------------------------------------------------------------
// 역할:
// - 앱 최초 진입 스플래시 화면
// - 뒤: blur 전용 이미지(home__blur.png)로 화면 확장
// - 앞: 원본 이미지(home__bg.png) contain으로 전체 노출
// - 카드/브랜드 애니메이션
// - 개발모드에서만 2초 자동 이동
// -------------------------------------------------------------

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import AppText from '../../app/ui/AppText';
import * as S from './HomeScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  // -------------------------------------------------------------
  // 1️⃣ 카드 전체 페이드 인
  // -------------------------------------------------------------
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 2️⃣ 브랜드 애니메이션 (opacity + translate + scale)
  // -------------------------------------------------------------
  const brandTranslateY = useRef(new Animated.Value(12)).current;
  const brandScale = useRef(new Animated.Value(0.96)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 정적 리소스 (require는 반드시 정적 경로)
  // -------------------------------------------------------------
  const logoSource = useMemo(() => require('../../assets/logo/logo.png'), []);
  const bgSource = useMemo(() => require('../../assets/home/home__bg.png'), []);
  const blurBgSource = useMemo(
    () => require('../../assets/home/home__blur.png'),
    [],
  );

  // -------------------------------------------------------------
  // 수동 네비게이션
  // -------------------------------------------------------------
  const goToMain = () => {
    navigation.navigate('Main');
  };

  useEffect(() => {
    // 1️⃣ 카드 페이드 인
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 2️⃣ 브랜드 애니메이션
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

    // 3️⃣ 개발모드에서만 자동 이동
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (__DEV__) {
      timer = setTimeout(() => {
        navigation.navigate('Main');
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [fadeAnim, brandOpacity, brandTranslateY, brandScale, navigation]);

  return (
    <S.Background>
      {/* ---------------------------------------------------------
          뒤 배경 (확장용 blur 이미지)
          - cover로 화면을 가득 채움
      --------------------------------------------------------- */}
      <S.BgBlur source={blurBgSource}>
        <S.Overlay />
      </S.BgBlur>

      {/* ---------------------------------------------------------
          앞 배경 (원본 전체 표시)
          - contain으로 절대 안 잘림
      --------------------------------------------------------- */}
      <S.BgContain source={bgSource} />

      {/* ---------------------------------------------------------
          UI 레이어
      --------------------------------------------------------- */}
      <S.Container>
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
                <AppText preset="title1">NURI</AppText>
              </S.BrandRow>
            </Animated.View>

            <S.Spacer $h={18} />

            <AppText preset="body">지금 이 순간도, 함께 기록해요</AppText>

            <S.Spacer $h={8} />

            <AppText preset="body">우리의 시간을 기억으로 남기다</AppText>

            <S.Spacer $h={20} />

            <S.Button onPress={goToMain}>
              <AppText preset="body" color="#ffffff" weight="600">
                메인으로 이동
              </AppText>
            </S.Button>

            {__DEV__ && (
              <>
                <S.Spacer $h={10} />
                <AppText preset="caption" color="rgba(255,255,255,0.75)">
                  개발모드: 2초 후 자동 이동
                </AppText>
              </>
            )}
          </S.Card>
        </Animated.View>
      </S.Container>
    </S.Background>
  );
}

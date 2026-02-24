// 파일: src/screens/Home/HomeScreen.tsx
// -------------------------------------------------------------
// 역할:
// - 앱 최초 진입 스플래시 화면
// - 배경 이미지 “안 잘리고 전체 보이기” + “화면 꽉 찬 느낌” 동시 해결
//
// 핵심 전략(배경):
// - 뒤(확장): assets/home/home__blur.png → cover로 화면을 꽉 채움
// - 앞(원본): assets/home/home__bg.png → contain으로 절대 안 잘리게 전체 노출
//
// UI/동작:
// - 카드 페이드 인 애니메이션
// - 로고/타이틀 강화 애니메이션 (opacity + translateY + scale)
// - 자동 2초 이동은 현재 주석 처리 (버튼 이동만 허용)
// - navigate 사용 → Main에서 뒤로가기 가능
//
// 카드 위치(중요):
// - SafeArea(top inset) + 기기 높이 기반 비율로 "상단 여백"을 동적 계산
// - clamp(최소/최대) 적용하여 기기별 튐 방지
// -------------------------------------------------------------

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

  // -------------------------------------------------------------
  // 0️⃣ 화면 / SafeArea 정보
  // -------------------------------------------------------------
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // -------------------------------------------------------------
  // 0️⃣ 카드 위치 동적 계산
  // - height 비율 + SafeArea(top) 반영
  // - clamp 적용
  // -------------------------------------------------------------
  const cardTopPadding = useMemo(() => {
    const ratioBase = height * 0.16;
    const safeTop = insets.top + 8;
    const raw = ratioBase + safeTop;

    const min = 92 + safeTop;
    const max = 200 + safeTop;

    return Math.max(min, Math.min(max, raw));
  }, [height, insets.top]);

  // -------------------------------------------------------------
  // 1️⃣ 카드 페이드 인 애니메이션
  // -------------------------------------------------------------
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 2️⃣ 브랜드 애니메이션 (로고 + 타이틀)
  // -------------------------------------------------------------
  const brandTranslateY = useRef(new Animated.Value(12)).current;
  const brandScale = useRef(new Animated.Value(0.96)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 정적 리소스 (require는 반드시 정적 경로)
  // -------------------------------------------------------------
  const logoSource = useMemo(() => require('../../assets/logo/logo.png'), []);
  const bgSource = useMemo(() => require('../../assets/home/home__bg.png'), []);
  const blurSource = useMemo(
    () => require('../../assets/home/home__blur.png'),
    [],
  );

  // -------------------------------------------------------------
  // 수동 이동 (버튼)
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

    // ---------------------------------------------------------
    // ❌ 자동 2초 이동 (현재 개발 편의를 위해 비활성화)
    // ---------------------------------------------------------
    //
    // let timer: ReturnType<typeof setTimeout> | null = null;
    //
    // if (__DEV__) {
    //   timer = setTimeout(() => {
    //     navigation.navigate('Main');
    //   }, 2000);
    // }
    //
    // return () => {
    //   if (timer) clearTimeout(timer);
    // };
    //
    // ---------------------------------------------------------
  }, [fadeAnim, brandOpacity, brandTranslateY, brandScale]);

  return (
    <S.Background>
      {/* ✅ 뒤 배경 (확장용 blur 이미지) */}
      <S.BgBlur source={blurSource}>
        <S.Overlay />
      </S.BgBlur>

      {/* ✅ 앞 배경 (원본 이미지 - 절대 안 잘림) */}
      <S.BgContain source={bgSource} />

      {/* ✅ UI 레이어 */}
      <S.Container $pt={cardTopPadding}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <S.Card>
            {/* 브랜드 영역 애니메이션 */}
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

            {/* 밝은 하늘 대비용 텍스트 shadow 적용 */}
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

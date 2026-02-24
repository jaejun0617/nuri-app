// 파일: src/screens/Home/HomeScreen.tsx
// 목적:
// - 앱 첫 인상(스플래시/인트로) 화면
// - 배경 이미지 적용 (src/assets/home/home__bg.png)
// - 페이드 인 + 로고 등장 애니메이션(강화)
// - 자동 2초 이동: 개발모드(__DEV__)에서만 동작
// - 수동 이동 버튼 제공 (개발 편의)
// - navigate 사용 → Main에서 뒤로가기 가능

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

  // ✅ 전체 카드 페이드 인
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ 로고/타이틀 등장 애니메이션(강화)
  const brandTranslateY = useRef(new Animated.Value(10)).current; // 아래에서 위로
  const brandScale = useRef(new Animated.Value(0.98)).current; // 살짝 확대
  const brandOpacity = useRef(new Animated.Value(0)).current; // 별도 opacity

  // require는 정적 경로여야 함 (동적 문자열 X)
  const logoSource = useMemo(() => require('../../assets/logo/logo.png'), []);
  const bgSource = useMemo(() => require('../../assets/home/home__bg.png'), []);

  const goToMain = () => {
    navigation.navigate('Main');
  };

  useEffect(() => {
    // 1) 전체 페이드인
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 2) 로고/타이틀 애니메이션(강화) - 살짝 딜레이 후 자연스럽게 등장
    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 420,
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

    // 3) ✅ 자동 2초 이동은 개발모드에서만
    // - 배포/프로덕션에서는 자동 이동 안 함(사용자 읽을 시간 확보)
    // - 뒤로가기를 살리려면 reset이 아니라 navigate 사용

    let t: NodeJS.Timeout | null = null;

    if (__DEV__) {
      t = setTimeout(() => {
        navigation.navigate('Main');
      }, 2000);
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [fadeAnim, brandOpacity, brandTranslateY, brandScale, navigation]);

  return (
    <S.Background source={bgSource} resizeMode="cover">
      {/* 배경 위 가독성 오버레이 */}
      <S.Overlay />

      <S.Container>
        <Animated.View style={{ opacity: fadeAnim }}>
          <S.Card>
            {/* ✅ 로고/타이틀만 애니메이션 강화 적용 */}
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

            {/* 문구(현재 진행형 톤) */}
            <AppText preset="body">지금 이 순간도, 함께 기록해요</AppText>

            <S.Spacer $h={8} />

            <AppText preset="body">우리의 시간을 기억으로 남기다</AppText>

            <S.Spacer $h={18} />

            {/* 개발 편의용 버튼 (프로덕션에서도 사용 가능) */}
            <S.Button onPress={goToMain}>
              <AppText preset="body" color="#ffffff" weight="600">
                메인으로 이동
              </AppText>
            </S.Button>

            {/* 개발모드 안내(원하면 제거 가능) */}
            {__DEV__ ? (
              <>
                <S.Spacer $h={10} />
                <AppText preset="caption" color="rgba(255,255,255,0.75)">
                  개발모드: 2초 후 자동 이동
                </AppText>
              </>
            ) : null}
          </S.Card>
        </Animated.View>
      </S.Container>
    </S.Background>
  );
}

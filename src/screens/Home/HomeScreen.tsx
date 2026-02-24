// 파일: src/screens/Home/HomeScreen.tsx
// 목적:
// - 앱 첫 인상(스플래시/인트로) 화면
// - 페이드 인 애니메이션
// - 진입 후 2초 뒤 Main으로 자동 이동
// - 타이틀 앞에 로고 표시 (src/assets/logo/logo.png)
// - 수동 이동 버튼 추가 (개발 편의용)
//
// 중요:
// - "Main에서 뒤로가기"를 원하면 reset 대신 navigate를 사용해야 한다.
//   reset을 쓰면 스택이 초기화되어 뒤로가기가 불가능해진다.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import AppText from '../../app/ui/AppText';
import * as S from './HomeScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  // Animated.Value는 리렌더마다 새로 생성되면 안됨 → useRef로 1회 생성 후 재사용
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // require는 정적 경로여야 함 (동적 문자열 X)
  const logoSource = useMemo(() => require('../../assets/logo/logo.png'), []);

  const goToMain = () => {
    navigation.navigate('Main');
  };

  useEffect(() => {
    // 1) 페이드 인 (초기 opacity 0 → 1)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    // 2) 2초 뒤 Main으로 이동
    // - 뒤로가기를 살리려면 reset이 아니라 navigate 사용
    const t = setTimeout(() => {
      navigation.navigate('Main');
    }, 2000);

    return () => clearTimeout(t);
  }, [fadeAnim, navigation]);

  return (
    <S.Container>
      <Animated.View style={{ opacity: fadeAnim }}>
        <S.Card>
          <S.BrandRow>
            <S.Logo source={logoSource} resizeMode="contain" />
            <AppText preset="title1">NURI</AppText>
          </S.BrandRow>

          <S.Spacer $h={18} />

          {/* 문구(현재 진행형 톤) */}
          <AppText preset="body">지금 이 순간도, 함께 기록해요</AppText>

          <S.Spacer $h={8} />

          <AppText preset="body">우리의 시간을 기억으로 남기다</AppText>
          <S.Spacer $h={18} />
          {/* 🔽 개발 편의용 버튼 */}
          <S.Button onPress={goToMain}>
            <AppText preset="body" color="#ffffff" weight="600">
              메인으로 이동
            </AppText>
          </S.Button>
        </S.Card>
      </Animated.View>
    </S.Container>
  );
}

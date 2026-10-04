// 파일: src/screens/Auth/WelcomeTransitionScreen.tsx
// 역할:
// - 반려동물 등록 완료 직후 브랜드 전환 애니메이션을 보여주는 화면
// - 등록 결과가 Home에 반영되는 동안 짧고 안정적인 체류 구간을 제공
// - 일정 시간이 지나면 AppTabs HomeTab으로 reset 이동해 온보딩 플로우를 마무리

import AppText from '../../app/ui/AppText';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ASSETS } from '../../assets';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { getSeasonalOnboardingVisual } from '../../theme/seasonal/onboarding';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { styles } from './WelcomeTransitionScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WelcomeTransition'>;

const TRANSITION_DURATION_MS = 8000;
const DOT_ANIMATION_DURATION_MS = 2400;
const DOT_PHASES = [0.12, 0.31, 0.5, 0.69, 0.88] as const;
const DOT_COLORS = ['#F7D6A5', '#EBC8B4', '#DDBFC2', '#9C8EAF', '#776D95'] as const;

type LoadingDotProps = {
  color: string;
  phase: number;
  progress: Animated.Value;
};

const LoadingDot = memo(function LoadingDotView({
  color,
  phase,
  progress,
}: LoadingDotProps) {
  const inputRange = [0, phase - 0.09, phase, phase + 0.09, 1];
  const activeOpacity = progress.interpolate({
    inputRange,
    outputRange: [0, 0, 1, 0, 0],
  });
  const haloScale = progress.interpolate({
    inputRange,
    outputRange: [0.72, 0.72, 1.38, 0.72, 0.72],
  });
  const coreScale = progress.interpolate({
    inputRange,
    outputRange: [1, 1, 1.34, 1, 1],
  });

  return (
    <View style={styles.dotSlot}>
      <View style={[styles.dotBase, { backgroundColor: color }]} />
      <Animated.View
        style={[
          styles.dotHalo,
          {
            opacity: activeOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dotActive,
          {
            opacity: activeOpacity,
            transform: [{ scale: coreScale }],
          },
        ]}
      />
    </View>
  );
});

export default function WelcomeTransitionScreen() {
  const season = useEffectiveSeason();
  const seasonalVisual = getSeasonalOnboardingVisual(season);
  const navigation = useNavigation<Nav>();
  const entranceProgress = useRef(new Animated.Value(0)).current;
  const dotProgress = useRef(new Animated.Value(0)).current;
  const symbolPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnimation = Animated.timing(entranceProgress, {
      toValue: 1,
      duration: 760,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const dotAnimation = Animated.loop(
      Animated.timing(dotProgress, {
        toValue: 1,
        duration: DOT_ANIMATION_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { iterations: -1, resetBeforeIteration: true },
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(symbolPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(symbolPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    entranceAnimation.start();
    dotAnimation.start();
    pulseAnimation.start();

    const timeoutId = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    }, TRANSITION_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
      entranceAnimation.stop();
      dotAnimation.stop();
      pulseAnimation.stop();
      entranceProgress.stopAnimation();
      dotProgress.stopAnimation();
      symbolPulse.stopAnimation();
    };
  }, [dotProgress, entranceProgress, navigation, symbolPulse]);

  const entranceOpacity = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const entranceTranslateY = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const symbolScale = symbolPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  });
  const symbolGlowOpacity = symbolPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.5],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Image
        accessibilityIgnoresInvertColors
        pointerEvents="none"
        resizeMode="cover"
        source={seasonalVisual.loadingBackground}
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.readabilityVeil} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: entranceOpacity,
              transform: [{ translateY: entranceTranslateY }],
            },
          ]}
        >
          <View
            accessibilityLabel="NURI"
            accessibilityRole="image"
            style={styles.brandBlock}
          >
            <Animated.Image
              accessibilityIgnoresInvertColors
              blurRadius={10}
              pointerEvents="none"
              resizeMode="contain"
              source={ASSETS.logo}
              style={[
                styles.symbolGlow,
                {
                  opacity: symbolGlowOpacity,
                  transform: [{ scale: symbolScale }],
                },
              ]}
            />
            <Animated.Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={ASSETS.logo}
              style={[styles.symbol, { transform: [{ scale: symbolScale }] }]}
            />
          </View>

          <AppText accessibilityRole="header" style={styles.wordmark}>
            N U R I
          </AppText>
          <View pointerEvents="none" style={styles.divider} />

          <View style={styles.copyBlock}>
            <AppText accessibilityRole="header" style={styles.headline}>
              누리의 공간을 준비하고 있어요
            </AppText>
            <AppText style={styles.description}>
              우리 아이를 위한 첫 화면을 만들고 있어요
            </AppText>
          </View>

          <View
            accessibilityLabel="누리의 공간을 준비하고 있습니다"
            accessibilityRole="progressbar"
            style={styles.dotRow}
          >
            {DOT_PHASES.map((phase, index) => (
              <LoadingDot
                color={DOT_COLORS[index]}
                key={phase}
                phase={phase}
                progress={dotProgress}
              />
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

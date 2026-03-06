// 파일: src/screens/Auth/WelcomeTransitionScreen.tsx
// 역할:
// - 닉네임 설정 완료 직후 짧은 환영 애니메이션을 보여주는 전환 화면
// - 사용자가 다음 홈 구조를 인지할 수 있도록 최소 체류 시간을 제공
// - 일정 시간이 지나면 AppTabs HomeTab으로 reset 이동해 온보딩 플로우를 마무리

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { styles } from './WelcomeTransitionScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WelcomeTransition'>;

const TRANSITION_DURATION_MS = 4000;

export default function WelcomeTransitionScreen() {
  const navigation = useNavigation<Nav>();
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = nicknameRaw?.trim() || '누리';

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: TRANSITION_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const timeoutId = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    }, TRANSITION_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
      progress.stopAnimation();
    };
  }, [navigation, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Image source={ASSETS.logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.name}>{nickname}</Text>
        <View style={styles.nameUnderline} />

        <Text style={styles.body}>{`${nickname}님을 위한 소중한 공간을`}</Text>
        <Text style={styles.body}>준비하고 있어요...</Text>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        <View style={styles.dotRow}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

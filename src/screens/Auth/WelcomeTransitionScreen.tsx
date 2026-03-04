import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ASSETS } from '../../assets';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { styles } from './WelcomeTransitionScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WelcomeTransition'>;

const TEST_DURATION_MS = 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WelcomeTransitionScreen() {
  const navigation = useNavigation<Nav>();
  const nicknameRaw = useAuthStore(s => s.profile.nickname);
  const nickname = useMemo(() => nicknameRaw?.trim() || '누리', [nicknameRaw]);

  const progress = useRef(new Animated.Value(0)).current;
  const [remainingMs, setRemainingMs] = useState(TEST_DURATION_MS);

  useEffect(() => {
    const startedAt = Date.now();

    Animated.timing(progress, {
      toValue: 1,
      duration: TEST_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextRemaining = Math.max(0, TEST_DURATION_MS - elapsed);
      setRemainingMs(nextRemaining);
    }, 1000);

    const timeoutId = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }],
      });
    }, TEST_DURATION_MS);

    return () => {
      clearInterval(intervalId);
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
          <Text style={styles.timer}>{formatRemaining(remainingMs)}</Text>
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

import React, { useEffect, useMemo, useRef } from 'react';
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
  const nickname = useMemo(() => nicknameRaw?.trim() || '누리', [nicknameRaw]);

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

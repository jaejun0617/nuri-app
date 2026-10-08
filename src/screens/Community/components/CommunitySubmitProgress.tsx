import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import AppText from '../../../app/ui/AppText';

const PHASES = [0.12, 0.31, 0.5, 0.69, 0.88] as const;

// WelcomeTransition's phased dots, tied to the real request instead of a timer.
export default function CommunitySubmitProgress({ color }: { color: string }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [progress, reduceMotion]);

  return (
    <View
      testID="community-submit-progress"
      style={[styles.overlay, { backgroundColor: theme.colors.background }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="게시글을 올리고 있어요"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.dots} importantForAccessibility="no-hide-descendants">
        {PHASES.map(phase => (
          <View key={phase} style={styles.slot}>
            <View
              style={[styles.dot, { backgroundColor: color, opacity: 0.3 }]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  backgroundColor: color,
                  opacity: reduceMotion
                    ? 0.6
                    : progress.interpolate({
                        inputRange: [0, phase - 0.09, phase, phase + 0.09, 1],
                        outputRange: [0.2, 0.2, 1, 0.2, 0.2],
                      }),
                  transform: [
                    {
                      scale: reduceMotion
                        ? 1
                        : progress.interpolate({
                            inputRange: [
                              0,
                              phase - 0.09,
                              phase,
                              phase + 0.09,
                              1,
                            ],
                            outputRange: [1, 1, 1.38, 1, 1],
                          }),
                    },
                  ],
                },
              ]}
            />
          </View>
        ))}
      </View>
      <AppText preset="body" style={{ color: theme.colors.textPrimary }}>
        게시글을 올리고 있어요
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  dots: { flexDirection: 'row', gap: 12 },
  slot: {
    width: 20,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
});

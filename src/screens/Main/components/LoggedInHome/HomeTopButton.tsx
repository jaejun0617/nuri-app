import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  bottom: number;
  accentColor: string;
  borderColor: string;
  rippleColor: string;
  onPress: () => void;
};

const HOME_TOP_BUTTON_SHOW_OFFSET = 96;
const HOME_TOP_BUTTON_FALLBACK_SHOW_OFFSET = 300;

export function resolveHomeTopButtonThreshold(
  scheduleSectionOffset: number | null,
): number {
  if (scheduleSectionOffset === null) {
    return HOME_TOP_BUTTON_FALLBACK_SHOW_OFFSET;
  }

  return Math.max(0, scheduleSectionOffset - HOME_TOP_BUTTON_SHOW_OFFSET);
}

function HomeTopButton({
  visible,
  bottom,
  accentColor,
  borderColor,
  rippleColor,
  onPress,
}: Props) {
  const [mounted, setMounted] = useState(visible);
  const visibility = useSharedValue(visible ? 1 : 0);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const finishHide = useCallback((finished: boolean | undefined) => {
    if (finished && !visibleRef.current) {
      setMounted(false);
    }
  }, []);

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
      return undefined;
    }
    if (!mounted) {
      visibility.value = 0;
      return undefined;
    }

    cancelAnimation(visibility);
    visibility.value = withTiming(
      visible ? 1 : 0,
      {
        duration: visible ? 220 : 180,
        easing: Easing.out(Easing.cubic),
      },
      finished => {
        if (!visible) {
          runOnJS(finishHide)(finished);
        }
      },
    );

    return () => cancelAnimation(visibility);
  }, [finishHide, mounted, visibility, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [
      { translateY: interpolate(visibility.value, [0, 1], [10, 0]) },
      { scale: interpolate(visibility.value, [0, 1], [0.96, 1]) },
    ],
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      testID="home-top-button-layer"
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrap, { bottom }, animatedStyle]}
    >
      <Pressable
        testID="home-top-button"
        android_ripple={{ color: rippleColor }}
        style={[
          styles.button,
          {
            backgroundColor: '#FFFFFF',
            borderColor,
          },
          visible ? styles.buttonVisible : styles.buttonHidden,
        ]}
        onPress={onPress}
        accessibilityLabel="맨 위로"
        accessibilityRole="button"
      >
        <Feather name="arrow-up" size={18} color={accentColor} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    zIndex: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonVisible: {
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#0B1220',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }
      : { elevation: 4 }),
  },
  buttonHidden: {
    ...(Platform.OS === 'ios' ? { shadowOpacity: 0 } : { elevation: 0 }),
  },
});

export default memo(HomeTopButton);

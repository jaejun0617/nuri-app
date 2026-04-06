import React, { memo, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  text: string;
  color: string;
  active?: boolean;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  amplitude?: number;
  staggerMs?: number;
};

type GlyphProps = {
  glyph: string;
  index: number;
  color: string;
  active: boolean;
  amplitude: number;
  staggerMs: number;
  textStyle: TextStyle;
};

const AnimatedNativeText = Animated.createAnimatedComponent(Text);

function WaveGlyph({
  glyph,
  index,
  color,
  active,
  amplitude,
  staggerMs,
  textStyle,
}: GlyphProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      progress.value = withTiming(0, { duration: 140 });
      return;
    }

    progress.value = withDelay(
      index * staggerMs,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 340,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: 420,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [active, amplitude, index, progress, staggerMs]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.94, 1]),
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [0, -amplitude]) },
        { scale: interpolate(progress.value, [0, 1], [1, 1.03]) },
      ],
    };
  }, [amplitude]);

  return (
    <AnimatedNativeText
      style={[
        styles.glyph,
        textStyle,
        { color },
        animatedStyle,
      ]}
    >
      {glyph}
    </AnimatedNativeText>
  );
}

function WaveText({
  text,
  color,
  active = true,
  textStyle,
  containerStyle,
  amplitude = 3,
  staggerMs = 70,
}: Props) {
  const resolvedTextStyle = useMemo(
    () => StyleSheet.flatten(textStyle) ?? {},
    [textStyle],
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, containerStyle]}
    >
      {[...text].map((glyph, index) => {
        if (glyph.trim().length === 0) {
          return (
            <Text
              key={`space-${index}`}
              style={[
                styles.glyph,
                resolvedTextStyle,
                { color },
              ]}
            >
              {glyph}
            </Text>
          );
        }

        return (
          <WaveGlyph
            key={`glyph-${glyph}-${index}`}
            glyph={glyph}
            index={index}
            color={color}
            active={active}
            amplitude={amplitude}
            staggerMs={staggerMs}
            textStyle={resolvedTextStyle}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  glyph: {
    includeFontPadding: false,
  },
});

export default memo(WaveText);

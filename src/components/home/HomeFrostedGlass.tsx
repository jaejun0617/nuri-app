import React, { memo, type PropsWithChildren } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from '@sbaiahmed1/react-native-blur';
import type { SeasonKey } from '../../theme/seasonal/season';
import { getHomeAmbientVisual } from '../../theme/home/seasonalAmbient';

export const HOME_FROST_BLUR_AMOUNT = 18;
export const HOME_FROST_BLUR_ROUNDS = 2;
const FROST_TINT: Record<SeasonKey, string> = {
  autumn: 'rgba(255, 245, 226, 0.10)',
  winter: 'rgba(244, 248, 255, 0.10)',
  spring: 'rgba(255, 245, 249, 0.10)',
  summer: 'rgba(243, 255, 252, 0.10)',
};
export function resolveHomeFrostedMaterial(season: SeasonKey) {
  return {
    backgroundColor: FROST_TINT[season],
    borderColor: 'rgba(255, 255, 255, 0.42)',
    reducedTransparencyFallbackColor: getHomeAmbientVisual(season).baseColor,
  };
}
type Props = PropsWithChildren<
  Omit<ViewProps, 'style'> & {
    season: SeasonKey;
    borderRadius?: number;
    blurAmount?: number;
    blurRounds?: number;
    style?: StyleProp<ViewStyle>;
  }
>;

/** Content stays inside the Android capture exclusion boundary, avoiding text halos. */
export const HomeFrostedGlass = memo(function HomeFrostedGlassView({
  children,
  season,
  style,
  borderRadius = 22,
  blurAmount = HOME_FROST_BLUR_AMOUNT,
  blurRounds = HOME_FROST_BLUR_ROUNDS,
  ...viewProps
}: Props) {
  const material = resolveHomeFrostedMaterial(season);
  const frame = StyleSheet.flatten(style);
  const corners = {
    borderRadius,
    borderTopLeftRadius: frame?.borderTopLeftRadius ?? borderRadius,
    borderTopRightRadius: frame?.borderTopRightRadius ?? borderRadius,
    borderBottomLeftRadius: frame?.borderBottomLeftRadius ?? borderRadius,
    borderBottomRightRadius: frame?.borderBottomRightRadius ?? borderRadius,
  };
  return (
    <BlurView
      {...viewProps}
      pointerEvents="box-none"
      accessible={false}
      blurType={
        Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : 'regular'
      }
      blurAmount={blurAmount}
      blurRounds={blurRounds}
      reducedTransparencyFallbackColor={
        material.reducedTransparencyFallbackColor
      }
      style={[styles.root, style, styles.frame, corners]}
    >
      <View
        testID="home-frosted-tint"
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          styles.rim,
          {
            ...corners,
            backgroundColor: material.backgroundColor,
            borderColor: material.borderColor,
          },
        ]}
      />
      {children}
    </BlurView>
  );
});
const styles = StyleSheet.create({
  root: { width: '100%', marginTop: 12, position: 'relative' },
  frame: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
    elevation: 0,
    shadowOpacity: 0,
  },
  rim: { borderWidth: 1 },
});

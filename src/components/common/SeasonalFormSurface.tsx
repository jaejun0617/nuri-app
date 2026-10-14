import React, { type PropsWithChildren } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import { HomeFrostedGlass } from '../home/HomeFrostedGlass';
import { HomeAmbientBubbleCanvas } from '../../screens/Main/components/LoggedInHome/HomeAmbientBubbleCanvas';

/** Shared product-page canvas, without changing the caller's inset ownership. */
export function SeasonalFormBackground({ uniform = true }: { uniform?: boolean }) {
  const season = useEffectiveSeason();
  const { height } = useWindowDimensions();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
    >
      <HomeAmbientBubbleCanvas
        heroHeight={height}
        season={season}
        decorationMode="reading"
        showDecorations={false}
        backgroundMode={uniform ? 'uniform' : 'seasonal'}
      />
    </View>
  );
}

export function SeasonalFormPanel({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  const season = useEffectiveSeason();
  return (
    <HomeFrostedGlass
      {...props}
      season={season}
      borderRadius={8}
      style={[styles.panel, style]}
    >
      {children}
    </HomeFrostedGlass>
  );
}
const styles = StyleSheet.create({
  // Stretch within the caller's margins; the Home material defaults to 100% width.
  panel: { width: 'auto', alignSelf: 'stretch', marginTop: 0, padding: 16 },
});

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useTheme } from 'styled-components/native';
import { getHomeAmbientVisual } from '../../theme/home/seasonalAmbient';
import type { SeasonKey } from '../../theme/seasonal/season';
import { PRODUCT_CANVAS_COLOR, PRODUCT_CANVAS_GRADIENT_COLORS } from '../../app/theme/tokens/colors';
type MaskProps = React.ComponentProps<typeof View> & {
  maskElement: React.ReactElement;
};
const NativeMask = MaskedView as unknown as React.ComponentType<MaskProps>;

/** Opaque seasonal color covers the canvas; only a short central light adds white. */
export function SeasonalAmbientLighting({
  season,
  dark = false,
  viewportHeight,
  colorCoverage = 'full',
}: {
  season: SeasonKey;
  dark?: boolean;
  viewportHeight?: number;
  colorCoverage?: 'full' | 'edges';
}) {
  const visual = getHomeAmbientVisual(season);
  const edgeOnly = dark || colorCoverage === 'edges';
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        testID="seasonal-ambient-season-wash"
        colors={[...(edgeOnly ? visual.lowerEdgeWash : visual.canvasGradient)]}
        locations={edgeOnly ? [0, 0.32, 0.5, 0.68, 1] : [0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { opacity: dark ? 0.2 : 1 }]}
      />
      {!dark ? (
        <NativeMask
          testID="seasonal-ambient-center-light"
          style={[
            styles.centerLight,
            viewportHeight === undefined
              ? null
              : {
                  top: viewportHeight * 0.38,
                  height: viewportHeight * 0.24,
                },
          ]}
          maskElement={
            <LinearGradient
              colors={['transparent', '#FFFFFF', '#FFFFFF', 'transparent']}
              locations={[0, 0.3, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              edgeOnly ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0)',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </NativeMask>
      ) : null}
    </View>
  );
}

/** A fixed, non-interactive canvas keeps decoration outside the data/scroll path. */
export default memo(function SeasonalAmbientBackground({
  appearance,
}: {
  season: SeasonKey;
  // Timeline retains its existing light image/text presentation in dark mode.
  appearance?: 'light' | 'dark';
}) {
  const theme = useTheme();
  const dark = (appearance ?? theme.mode) === 'dark';

  return (
    <View
      testID="seasonal-ambient-background"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        styles.canvas,
        {
          backgroundColor: dark ? theme.colors.background : PRODUCT_CANVAS_COLOR,
        },
      ]}
    >
      {!dark ? (
        <LinearGradient
          testID="product-canvas-gradient"
          colors={[...PRODUCT_CANVAS_GRADIENT_COLORS]}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
  centerLight: {
    position: 'absolute',
    left: '43%',
    right: '43%',
    top: '38%',
    height: '24%',
  },
});

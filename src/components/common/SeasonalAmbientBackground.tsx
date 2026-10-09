import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useTheme } from 'styled-components/native';
import { getHomeAmbientVisual } from '../../theme/home/seasonalAmbient';
import type { SeasonKey } from '../../theme/seasonal/season';

const GLINTS = [
  { top: '32%', left: '2%', size: 14, opacity: 0.78, rotation: '12deg' },
  { top: '46%', right: '2%', size: 10, opacity: 0.62, rotation: '-8deg' },
  { top: '68%', left: '1.5%', size: 9, opacity: 0.58, rotation: '8deg' },
  { top: '81%', right: '1.5%', size: 15, opacity: 0.76, rotation: '-12deg' },
] as const;
const RAY_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0.75)',
  '#FFFFFF',
  'rgba(255,255,255,0.75)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0)',
];
const RAY_STOPS = [0, 0.22, 0.42, 0.5, 0.58, 0.78, 1];
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
  season,
  appearance,
}: {
  season: SeasonKey;
  // Timeline retains its existing light image/text presentation in dark mode.
  appearance?: 'light' | 'dark';
}) {
  const theme = useTheme();
  const visual = getHomeAmbientVisual(season);
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
          backgroundColor: dark ? theme.colors.background : visual.canvasGradient[0],
        },
      ]}
    >
      <SeasonalAmbientLighting season={season} dark={dark} />
      {GLINTS.map(({ size, rotation, opacity, ...position }, index) => (
        <View
          key={index}
          testID={`seasonal-ambient-glint-${index}`}
          style={[
            styles.glint,
            position,
            {
              width: size,
              height: size,
              opacity: dark ? opacity * 0.45 : opacity,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <LinearGradient
            colors={RAY_COLORS}
            locations={RAY_STOPS}
            style={styles.verticalRay}
          />
          <LinearGradient
            colors={RAY_COLORS}
            locations={RAY_STOPS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.horizontalRay}
          />
        </View>
      ))}
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
  glint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalRay: { position: 'absolute', width: 1.4, height: '100%' },
  horizontalRay: { position: 'absolute', height: 1.1, width: '72%' },
});

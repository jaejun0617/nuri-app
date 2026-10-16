import React, { memo } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import type { SeasonKey } from '../../../../theme/seasonal/season';

type Role = 'cluster' | 'accent' | 'pearl';
type Region = { left: number; top: number; width: number; height: number };
type Atlas = {
  source: ImageSourcePropType;
  size: number;
  regions: Record<Role, Region>;
};

const AUTUMN: Record<Role, ImageSourcePropType> = {
  cluster: require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-hero-leaf-cluster-v1.png'),
  accent: require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
  pearl: require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-pearl-apricot-v1.png'),
};

// Read-only windows into the approved concept sheets, never raster edits or full-sheet display.
export const HOME_ORNAMENT_ATLASES: Record<
  Exclude<SeasonKey, 'autumn'>,
  Atlas
> = {
  spring: {
    source: require('../../../../assets/seasonal/home/spring/glass/spring-colored-glass-collection-v1.png'),
    size: 1254,
    regions: {
      cluster: { left: 30, top: 55, width: 760, height: 595 },
      accent: { left: 790, top: 150, width: 445, height: 440 },
      pearl: { left: 285, top: 975, width: 225, height: 220 },
    },
  },
  summer: {
    source: require('../../../../assets/seasonal/home/summer/glass/summer-colored-glass-collection-v1.png'),
    size: 1254,
    regions: {
      cluster: { left: 150, top: 40, width: 535, height: 495 },
      accent: { left: 700, top: 88, width: 470, height: 420 },
      pearl: { left: 250, top: 905, width: 290, height: 290 },
    },
  },
  winter: {
    source: require('../../../../assets/seasonal/home/winter/glass/winter-colored-glass-collection-v1.png'),
    size: 1254,
    regions: {
      cluster: { left: 60, top: 8, width: 650, height: 568 },
      accent: { left: 740, top: 18, width: 465, height: 520 },
      pearl: { left: 235, top: 935, width: 280, height: 285 },
    },
  },
};

const decorationProps = {
  pointerEvents: 'none',
  accessible: false,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export const HomeSeasonalOrnament = memo(function HomeSeasonalOrnamentView({
  season,
  role,
  testID,
  style,
}: {
  season: SeasonKey;
  role: Role;
  testID: string;
  style: StyleProp<ImageStyle>;
}) {
  if (season === 'autumn') {
    return (
      <Image
        {...decorationProps}
        testID={testID}
        source={AUTUMN[role]}
        resizeMode="contain"
        resizeMethod="resize"
        fadeDuration={0}
        style={[styles.position, style]}
      />
    );
  }

  const frame = StyleSheet.flatten(style);
  if (
    typeof frame?.width !== 'number' ||
    typeof frame.height !== 'number' ||
    !Number.isFinite(frame.width) ||
    !Number.isFinite(frame.height) ||
    frame.width <= 0 ||
    frame.height <= 0
  )
    throw new Error(
      'Seasonal ornaments require positive fixed frame dimensions.',
    );

  const atlas = HOME_ORNAMENT_ATLASES[season];
  const region = atlas.regions[role];
  const occupancy = role === 'pearl' ? 0.72 : 0.92;
  const scale = Math.min(
    (frame.width * occupancy) / region.width,
    (frame.height * occupancy) / region.height,
  );
  const width = region.width * scale;
  const height = region.height * scale;
  return (
    <View
      {...decorationProps}
      testID={testID}
      style={[styles.position, style, styles.clip]}
    >
      <View
        {...decorationProps}
        testID={`${testID}-viewport`}
        style={[
          styles.position,
          styles.clip,
          {
            left: (frame.width - width) / 2,
            top: (frame.height - height) / 2,
            width,
            height,
          },
        ]}
      >
        <Image
          {...decorationProps}
          testID={`${testID}-atlas`}
          source={atlas.source}
          resizeMode="stretch"
          resizeMethod="resize"
          fadeDuration={0}
          style={[
            styles.position,
            {
              left: -region.left * scale,
              top: -region.top * scale,
              width: atlas.size * scale,
              height: atlas.size * scale,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  position: { position: 'absolute' },
  clip: { overflow: 'hidden' },
});

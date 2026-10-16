import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { HomeAmbientBubbleZone } from '../../../../theme/home/ambientMesh';
import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HomeSeasonalOrnament } from './HomeSeasonalOrnament';

type SectionZone = Exclude<HomeAmbientBubbleZone, 'weather' | 'photo'>;
type Star = readonly [
  xPercent: number,
  centerY: number,
  size: number,
  opacity: number,
];
type Pearl = readonly [xPercent: number, centerY: number, size: number];

const STARLIGHT = require('../../../../assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png');

// Deterministic scatter avoids a repeated row while keeping the existing 52 dp gaps.
const STARS: Record<SectionZone, readonly Star[]> = {
  frequent: [
    [7, 18, 28, 0.7],
    [24, 33, 56, 1],
    [41, 14, 20, 0.58],
    [58, 29, 40, 0.86],
    [77, 21, 64, 0.96],
    [94, 38, 24, 0.72],
  ],
  summary: [
    [6, 36, 24, 0.65],
    [22, 19, 48, 0.95],
    [40, 33, 32, 0.74],
    [58, 18, 60, 1],
    [77, 37, 20, 0.6],
    [94, 24, 38, 0.83],
  ],
  recent: [
    [7, 22, 60, 1],
    [25, 38, 22, 0.6],
    [43, 18, 36, 0.8],
    [62, 32, 52, 0.95],
    [80, 16, 28, 0.7],
    [94, 35, 40, 0.88],
  ],
  community: [
    [6, 38, 20, 0.6],
    [23, 26, 40, 0.84],
    [42, 18, 64, 1],
    [61, 37, 28, 0.7],
    [79, 23, 48, 0.94],
    [94, 36, 24, 0.66],
  ],
  recommendation: [
    [7, 18, 44, 0.9],
    [26, 35, 32, 0.76],
    [45, 16, 24, 0.64],
    [63, 29, 60, 1],
    [81, 38, 20, 0.58],
    [94, 22, 36, 0.82],
  ],
  schedule: [
    [6, 36, 28, 0.7],
    [24, 20, 56, 1],
    [42, 35, 20, 0.6],
    [60, 17, 40, 0.86],
    [79, 29, 48, 0.95],
    [94, 40, 24, 0.66],
  ],
  health: [
    [7, 20, 52, 0.97],
    [25, 37, 24, 0.66],
    [44, 16, 32, 0.78],
    [62, 32, 64, 1],
    [81, 15, 20, 0.58],
    [94, 34, 40, 0.88],
  ],
  'today-tip': [
    [6, 36, 22, 0.62],
    [23, 23, 44, 0.9],
    [42, 15, 28, 0.72],
    [61, 31, 56, 1],
    [80, 17, 36, 0.8],
    [94, 38, 24, 0.66],
  ],
  diary: [
    [7, 21, 48, 0.94],
    [25, 38, 20, 0.6],
    [44, 28, 60, 1],
    [63, 15, 32, 0.76],
    [81, 35, 40, 0.86],
    [94, 20, 24, 0.66],
  ],
};
const DIARY_TAIL_STARS: readonly Star[] = [
  [20, 24, 44, 0.9],
  [58, 36, 24, 0.66],
  [90, 20, 56, 1],
];

// Sparse small companions; the approved star positions remain unchanged.
const PEARLS: Partial<Record<SectionZone, Pearl>> = {
  frequent: [32, 21, 22],
  recent: [70, 18, 24],
  recommendation: [13, 34, 20],
  health: [70, 16, 26],
  diary: [51, 14, 22],
};

const decorativeProps = {
  pointerEvents: 'none',
  accessible: false,
  importantForAccessibility: 'no-hide-descendants',
} as const;

function renderStars(stars: readonly Star[], prefix: string) {
  return stars.map(([x, y, size, opacity], index) => (
    <Image
      {...decorativeProps}
      key={`${prefix}-${x}`}
      testID={`${prefix}-${index}`}
      source={STARLIGHT}
      resizeMode="contain"
      resizeMethod="resize"
      fadeDuration={0}
      style={[
        styles.image,
        {
          left: `${x}%`,
          top: y - size / 2,
          width: size,
          height: size,
          opacity,
          transform: [{ translateX: -size / 2 }],
        },
      ]}
    />
  ));
}

/** Static, noninteractive accents; no card geometry or content changes. */
export const HomeSectionDecorations = memo(function HomeSectionDecorationsView({
  season,
  zone,
}: {
  season: SeasonKey;
  zone: SectionZone;
}) {
  const pearl = PEARLS[zone];
  return (
    <>
      <View
        {...decorativeProps}
        testID={`home-section-decorations-${zone}`}
        style={styles.layer}
      >
        {renderStars(STARS[zone], `home-section-star-${zone}`)}
        {pearl ? (
          <HomeSeasonalOrnament
            testID={`home-section-tiny-pearl-${zone}`}
            season={season}
            role="pearl"
            style={[
              styles.image,
              {
                left: `${pearl[0]}%`,
                top: pearl[1] - pearl[2] / 2,
                width: pearl[2],
                height: pearl[2],
                opacity: 0.8,
                transform: [{ translateX: -pearl[2] / 2 }],
              },
            ]}
          />
        ) : null}
      </View>
      {zone === 'diary' ? (
        <View
          {...decorativeProps}
          testID="home-section-tail-decorations"
          style={[styles.layer, styles.tail]}
        >
          {renderStars(DIARY_TAIL_STARS, 'home-section-tail-star')}
        </View>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  // The next glass card starts at y=12; the previous card ends at y=-40.
  layer: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 52,
    overflow: 'hidden',
  },
  tail: { top: '100%' },
  image: { position: 'absolute' },
});

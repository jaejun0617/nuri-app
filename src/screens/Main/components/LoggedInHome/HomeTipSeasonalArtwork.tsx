import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { SeasonKey } from '../../../../theme/seasonal/season';
import { styles as editorialStyles } from './HomeEditorialArtwork';
import {
  HOME_ORNAMENT_ATLASES,
  HomeSeasonalOrnament,
} from './HomeSeasonalOrnament';

const SINGLE_ART = {
  autumn: require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
  summer: require('../../../../assets/seasonal/home/summer/glass/summer-wave-droplets-glass-v1.png'),
};
const STARLIGHT = require('../../../../assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png');
const PETAL_REGION = { left: 660, top: 650, width: 230, height: 275 };
const DROPLET_REGION = { left: 200, top: 545, width: 390, height: 340 };
const AUTUMN_GINKGO = require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-ginkgo-amber-v1.png');

type Atlas = (typeof HOME_ORNAMENT_ATLASES)['spring'];

function GlassAtlasWindow({
  atlas,
  region,
  id,
  occupancy = 0.92,
}: {
  atlas: Atlas;
  region: Atlas['regions']['accent'];
  id: string;
  occupancy?: number;
}) {
  const ratio = region.width / region.height;
  const width = ratio >= 1 ? occupancy * 100 : occupancy * 100 * ratio;
  const height = ratio >= 1 ? (occupancy * 100) / ratio : occupancy * 100;

  // Percentage windows preserve square slots without layout state or raster edits.
  return (
    <View
      {...decorationProps}
      testID={id}
      style={[
        styles.clip,
        {
          left: `${(100 - width) / 2}%`,
          top: `${(100 - height) / 2}%`,
          width: `${width}%`,
          height: `${height}%`,
        },
      ]}
    >
      <Image
        {...decorationProps}
        testID={`${id}-atlas`}
        source={atlas.source}
        resizeMode="stretch"
        resizeMethod="resize"
        fadeDuration={0}
        style={[
          styles.position,
          {
            left: `${(-region.left / region.width) * 100}%`,
            top: `${(-region.top / region.height) * 100}%`,
            width: `${(atlas.size / region.width) * 100}%`,
            height: `${(atlas.size / region.height) * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const decorationProps = {
  pointerEvents: 'none',
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

function SmallSeasonalOrnament({
  season,
  index,
}: {
  season: SeasonKey;
  index: number;
}) {
  const id = `home-today-tip-small-ornament-${index}`;
  if (season === 'autumn') {
    return (
      <Image
        {...decorationProps}
        testID={id}
        source={index === 0 ? SINGLE_ART.autumn : AUTUMN_GINKGO}
        resizeMode="contain"
        resizeMethod="resize"
        fadeDuration={0}
        style={editorialStyles.image}
      />
    );
  }

  const atlas = HOME_ORNAMENT_ATLASES[season];
  const region =
    season === 'spring'
      ? PETAL_REGION
      : season === 'summer'
      ? DROPLET_REGION
      : atlas.regions.accent;
  return (
    <GlassAtlasWindow id={id} atlas={atlas} region={region} occupancy={1} />
  );
}

export const HomeTipSeasonalArtwork = memo(function HomeTipSeasonalArtworkView({
  season,
}: {
  season: SeasonKey;
}) {
  let artwork: React.ReactNode;
  if (season === 'spring' || season === 'winter') {
    const atlas = HOME_ORNAMENT_ATLASES[season];
    artwork = (
      <GlassAtlasWindow
        key={season}
        id="home-today-tip-seasonal-art"
        atlas={atlas}
        region={atlas.regions.accent}
      />
    );
  } else {
    artwork = (
      <Image
        {...decorationProps}
        key={season}
        testID="home-today-tip-seasonal-art"
        source={SINGLE_ART[season]}
        resizeMode="contain"
        resizeMethod="resize"
        fadeDuration={0}
        style={editorialStyles.image}
      />
    );
  }

  return (
    <View
      {...decorationProps}
      testID="home-today-tip-art-frame"
      style={[editorialStyles.frame, editorialStyles.memo]}
    >
      {artwork}
      <View
        {...decorationProps}
        testID="home-today-tip-detail-layer"
        style={styles.detailLayer}
      >
        {[styles.detailFirst, styles.detailSecond].map((style, index) => (
          <View {...decorationProps} key={index} style={style}>
            <SmallSeasonalOrnament season={season} index={index} />
          </View>
        ))}
        <HomeSeasonalOrnament
          testID="home-today-tip-pearl"
          season={season}
          role="pearl"
          style={styles.pearl}
        />
        {[styles.glintFirst, styles.glintSecond, styles.glintThird].map(
          (style, index) => (
            <Image
              {...decorationProps}
              key={index}
              testID={`home-today-tip-glint-${index}`}
              source={STARLIGHT}
              resizeMode="contain"
              resizeMethod="resize"
              fadeDuration={0}
              style={style}
            />
          ),
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  position: { position: 'absolute' },
  clip: { position: 'absolute', overflow: 'hidden' },
  // Clip all details to the art slot, never to the adjacent copy or full card.
  detailLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  detailFirst: {
    position: 'absolute',
    left: '13%',
    top: 0,
    width: 17,
    height: 17,
    opacity: 0.7,
    transform: [{ rotate: '-22deg' }],
  },
  detailSecond: {
    position: 'absolute',
    left: '9%',
    bottom: 0,
    width: 21,
    height: 21,
    opacity: 0.8,
    transform: [{ rotate: '32deg' }],
  },
  pearl: {
    position: 'absolute',
    right: 0,
    bottom: '14%',
    width: 16,
    height: 16,
    opacity: 0.82,
  },
  glintFirst: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    opacity: 0.95,
  },
  glintSecond: {
    position: 'absolute',
    top: '32%',
    left: 0,
    width: 18,
    height: 18,
    opacity: 0.72,
  },
  glintThird: {
    position: 'absolute',
    bottom: 0,
    right: '20%',
    width: 22,
    height: 22,
    opacity: 0.86,
  },
});

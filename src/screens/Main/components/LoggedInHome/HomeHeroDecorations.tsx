import React, { memo, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HomeSeasonalOrnament } from './HomeSeasonalOrnament';

const STARLIGHT = require('../../../../assets/seasonal/home/autumn/glass/autumn-starlight-four-point-v1.png');

const decorationProps = {
  pointerEvents: 'none',
  accessible: false,
  importantForAccessibility: 'no-hide-descendants',
} as const;

const imageProps = {
  ...decorationProps,
  resizeMode: 'contain',
  resizeMethod: 'resize',
  fadeDuration: 0,
} as const;

function Ornament({
  testID,
  source,
  style,
}: {
  testID: string;
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      {...imageProps}
      testID={testID}
      source={source}
      style={[styles.ornament, style]}
    />
  );
}

/** Both clusters follow the wave, without reserving space or covering its centre. */
export const HomeHeroWaveOrnaments = memo(function HomeHeroWaveOrnamentsView({
  season,
}: {
  season: SeasonKey;
}) {
  return (
    <View
      {...decorationProps}
      testID={`home-hero-${season}-ornaments`}
      style={styles.waveLayer}
    >
      <View
        {...decorationProps}
        testID="home-hero-wave-left-ornaments"
        style={styles.leftCluster}
      >
        <HomeSeasonalOrnament
          testID="home-hero-glass-leaves"
          season={season}
          role="cluster"
          style={styles.glassLeaves}
        />
        <HomeSeasonalOrnament
          testID="home-hero-glass-pearl"
          season={season}
          role="pearl"
          style={styles.glassPearl}
        />
        <Ornament
          testID="home-hero-starlight-upper"
          source={STARLIGHT}
          style={styles.starlightUpper}
        />
        <Ornament
          testID="home-hero-starlight-lower"
          source={STARLIGHT}
          style={styles.starlightLower}
        />
        <Ornament
          testID="home-hero-starlight-left-edge"
          source={STARLIGHT}
          style={styles.starlightLeftEdge}
        />
      </View>
      <View
        {...decorationProps}
        testID="home-hero-wave-right-ornaments"
        style={styles.rightCluster}
      >
        <HomeSeasonalOrnament
          testID="home-hero-glass-maple"
          season={season}
          role="accent"
          style={styles.glassMaple}
        />
        <Ornament
          testID="home-hero-starlight-right-upper"
          source={STARLIGHT}
          style={styles.starlightRightUpper}
        />
        <Ornament
          testID="home-hero-starlight-right-lower"
          source={STARLIGHT}
          style={styles.starlightRightLower}
        />
      </View>
    </View>
  );
});

/** The existing 52 dp weather gap owns this decoration; its layout height is zero. */
export const HomeHeroFooterOrnaments = memo(
  function HomeHeroFooterOrnamentsView({ season }: { season: SeasonKey }) {
    return (
      <View
        {...decorationProps}
        testID="home-hero-footer-ornaments"
        style={styles.footerLayer}
      >
        <HomeSeasonalOrnament
          testID="home-hero-footer-pearl"
          season={season}
          role="pearl"
          style={styles.footerPearl}
        />
        <HomeSeasonalOrnament
          testID="home-hero-footer-small-pearl"
          season={season}
          role="pearl"
          style={styles.footerSmallPearl}
        />
        <Ornament
          testID="home-hero-footer-star-right"
          source={STARLIGHT}
          style={styles.footerStarRight}
        />
        <Ornament
          testID="home-hero-footer-star-middle"
          source={STARLIGHT}
          style={styles.footerStarMiddle}
        />
        <Ornament
          testID="home-hero-footer-star-left"
          source={STARLIGHT}
          style={styles.footerStarLeft}
        />
      </View>
    );
  },
);

type PhotoStar = {
  x: `${number}%`;
  y: `${number}%`;
  size: number;
  opacity: number;
  phase?: number;
};

// Edge-weighted, deterministic placement leaves the central pet portrait calm.
const PHOTO_STARS: readonly PhotoStar[] = [
  { x: '5%', y: '6%', size: 30, opacity: 0.64 },
  { x: '21%', y: '12%', size: 20, opacity: 0.46 },
  { x: '38%', y: '4%', size: 22, opacity: 0.48 },
  { x: '64%', y: '9%', size: 26, opacity: 0.52 },
  { x: '84%', y: '5%', size: 40, opacity: 0.78, phase: 0.18 },
  { x: '95%', y: '21%', size: 24, opacity: 0.56 },
  { x: '9%', y: '29%', size: 40, opacity: 0.78, phase: 0.38 },
  { x: '19%', y: '39%', size: 20, opacity: 0.48 },
  { x: '88%', y: '41%', size: 34, opacity: 0.66 },
  { x: '4%', y: '53%', size: 24, opacity: 0.54 },
  { x: '96%', y: '58%', size: 38, opacity: 0.78, phase: 0.62 },
  { x: '16%', y: '64%', size: 28, opacity: 0.56 },
  { x: '83%', y: '69%', size: 22, opacity: 0.52 },
  { x: '7%', y: '81%', size: 42, opacity: 0.78, phase: 0.82 },
  { x: '23%', y: '88%', size: 20, opacity: 0.46 },
  { x: '77%', y: '89%', size: 26, opacity: 0.54 },
  { x: '93%', y: '87%', size: 34, opacity: 0.66 },
  { x: '45%', y: '96%', size: 18, opacity: 0.4 },
];

function usePhotoTwinkle(active: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );

  useEffect(() => {
    let mounted = true;
    let motionEventReceived = false;
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      value => {
        motionEventReceived = true;
        setReduceMotion(value);
      },
    );
    const appState = AppState.addEventListener('change', value => {
      setForeground(value === 'active');
    });
    // A failed or delayed preference lookup keeps the lights static.
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted && !motionEventReceived) setReduceMotion(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      motion.remove();
      appState.remove();
    };
  }, []);

  const canAnimate = active && foreground && !reduceMotion;
  useEffect(() => {
    if (!canAnimate) return;
    // One native opacity clock serves four lights; no JS frame loop or timers.
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 7600,
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
  }, [canAnimate, progress]);
  return { progress, canAnimate };
}

function PhotoStarlightField({
  aspectRatio,
  active,
}: {
  aspectRatio: number;
  active: boolean;
}) {
  const { progress, canAnimate } = usePhotoTwinkle(active);
  return (
    <View
      {...decorationProps}
      testID="home-hero-photo-starlights"
      style={[styles.photoBounds, { aspectRatio }]}
    >
      <View
        {...decorationProps}
        testID="home-hero-photo-star-field"
        style={styles.photoStarField}
      >
        {PHOTO_STARS.map((star, index) => (
          <Animated.Image
            {...imageProps}
            key={index}
            testID={`home-hero-photo-star-${index}`}
            source={STARLIGHT}
            style={[
              styles.ornament,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
                opacity:
                  canAnimate && star.phase !== undefined
                    ? progress.interpolate({
                        inputRange: [
                          0,
                          star.phase - 0.12,
                          star.phase,
                          star.phase + 0.12,
                          1,
                        ],
                        outputRange: [0.34, 0.34, star.opacity, 0.34, 0.34],
                        extrapolate: 'clamp',
                      })
                    : star.opacity,
                transform: [
                  { translateX: -star.size / 2 },
                  { translateY: -star.size / 2 },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export const HomeHeroPhotoStarlights = memo(
  function HomeHeroPhotoStarlightsView({
    aspectRatio,
    active,
  }: {
    season: SeasonKey;
    aspectRatio: number | null;
    active: boolean;
  }) {
    if (
      !aspectRatio ||
      !Number.isFinite(aspectRatio) ||
      aspectRatio <= 0 ||
      aspectRatio > 2
    )
      return null;
    return <PhotoStarlightField aspectRatio={aspectRatio} active={active} />;
  },
);

const styles = StyleSheet.create({
  ornament: { position: 'absolute' },
  waveLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 1,
  },
  leftCluster: {
    position: 'absolute',
    left: 0,
    top: -40,
    width: 140,
    height: 106,
  },
  glassLeaves: { left: -8, top: 0, width: 108, height: 102 },
  glassPearl: { left: 8, top: 68, width: 34, height: 34 },
  starlightUpper: { left: 80, top: 20, width: 42, height: 42 },
  starlightLower: { left: 38, top: 71, width: 30, height: 30 },
  starlightLeftEdge: { left: 4, top: 32, width: 26, height: 26, opacity: 0.72 },
  rightCluster: {
    position: 'absolute',
    right: -4,
    top: -14,
    width: 118,
    height: 80,
  },
  glassMaple: { right: 0, top: 0, width: 90, height: 75 },
  starlightRightUpper: {
    left: 0,
    top: 2,
    width: 32,
    height: 32,
    opacity: 0.86,
  },
  starlightRightLower: {
    left: 16,
    top: 44,
    width: 30,
    height: 30,
    opacity: 0.8,
  },
  footerLayer: {
    position: 'relative',
    height: 0,
    marginHorizontal: -16,
    overflow: 'visible',
  },
  footerPearl: { right: 10, top: 0, width: 46, height: 46 },
  footerSmallPearl: { left: 32, top: 8, width: 24, height: 24, opacity: 0.8 },
  footerStarRight: { right: 52, top: -2, width: 34, height: 34 },
  footerStarMiddle: {
    right: 86,
    top: 20,
    width: 24,
    height: 24,
    opacity: 0.78,
  },
  footerStarLeft: { left: 8, top: 8, width: 28, height: 28, opacity: 0.86 },
  photoBounds: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    overflow: 'hidden',
  },
  photoStarField: {
    position: 'absolute',
    top: 112,
    left: 0,
    right: 0,
    bottom: 48,
    overflow: 'hidden',
  },
});

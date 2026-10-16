import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { SeasonKey } from '../../../../theme/seasonal/season';
import { HomeSeasonalOrnament } from './HomeSeasonalOrnament';

const SINGLE_ART = {
  autumn: require('../../../../assets/seasonal/home/autumn/glass/autumn-glass-maple-coral-v1.png'),
  summer: require('../../../../assets/seasonal/home/summer/glass/summer-wave-droplets-glass-v1.png'),
};
const decorationProps = {
  pointerEvents: 'none',
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** This reserved header slot stays outside both the copy and the More action. */
export const HomeRecommendationTipArtwork = memo(
  function HomeRecommendationTipArtworkView({ season }: { season: SeasonKey }) {
    return (
      <View
        {...decorationProps}
        testID="home-recommendation-seasonal-art"
        style={styles.frame}
      >
        {season === 'autumn' || season === 'summer' ? (
          <Image
            {...decorationProps}
            testID="home-recommendation-main"
            source={SINGLE_ART[season]}
            resizeMode="contain"
            resizeMethod="resize"
            fadeDuration={0}
            style={styles.main}
          />
        ) : (
          <HomeSeasonalOrnament
            season={season}
            role="accent"
            testID="home-recommendation-main"
            style={styles.main}
          />
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  frame: {
    width: 128,
    height: 128,
    marginRight: 24,
    flexShrink: 0,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  main: { position: 'absolute', left: 6, bottom: 6, width: 116, height: 116 },
});

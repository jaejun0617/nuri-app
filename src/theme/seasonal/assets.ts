import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalSplashVisual = {
  source: ImageSourcePropType;
  backgroundColor: string;
  accessibilityLabel: string;
};

export const SPLASH_TAGLINE = '너와 함께, 모든 계절';
export const SPLASH_ARTWORK_ASPECT_RATIO = 941 / 1672;

// Contain the complete wordmark and artwork; taller screens extend the white sky.
export function getSplashArtworkSize(width: number, height: number) {
  const artworkWidth = Math.min(width, height * SPLASH_ARTWORK_ASPECT_RATIO);
  return {
    width: artworkWidth,
    height: artworkWidth / SPLASH_ARTWORK_ASPECT_RATIO,
  };
}

export const SEASONAL_SPLASH_VISUALS: Record<SeasonKey, SeasonalSplashVisual> =
  {
    spring: {
      source: require('../../assets/seasonal/splash/heart/spring.png'),
      backgroundColor: '#FFFFFF',
      accessibilityLabel: `누리 스플래시. ${SPLASH_TAGLINE}. 봄 풍경 속 반려동물들`,
    },
    summer: {
      source: require('../../assets/seasonal/splash/heart/summer.png'),
      backgroundColor: '#FFFFFF',
      accessibilityLabel: `누리 스플래시. ${SPLASH_TAGLINE}. 여름 풍경 속 반려동물들`,
    },
    autumn: {
      source: require('../../assets/seasonal/splash/heart/autumn.png'),
      backgroundColor: '#FFFFFF',
      accessibilityLabel: `누리 스플래시. ${SPLASH_TAGLINE}. 가을 풍경 속 반려동물들`,
    },
    winter: {
      source: require('../../assets/seasonal/splash/heart/winter.png'),
      backgroundColor: '#FFFFFF',
      accessibilityLabel: `누리 스플래시. ${SPLASH_TAGLINE}. 겨울 풍경 속 반려동물들`,
    },
  };

export function getSeasonalSplashVisual(
  season: SeasonKey,
): SeasonalSplashVisual {
  return SEASONAL_SPLASH_VISUALS[season];
}

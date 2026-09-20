import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalSplashVisual = {
  source: ImageSourcePropType;
  backgroundColor: string;
  overlayColors: readonly [string, string, string];
  accessibilityLabel: string;
};

export const SEASONAL_SPLASH_VISUALS: Record<SeasonKey, SeasonalSplashVisual> =
  {
    spring: {
      source: require('../../assets/seasonal/splash/spring.jpg'),
      backgroundColor: '#CDE8F6',
      overlayColors: [
        'rgba(23, 37, 46, 0.28)',
        'rgba(23, 37, 46, 0.06)',
        'rgba(23, 37, 46, 0)',
      ],
      accessibilityLabel: '봄 풍경 속 반려동물들이 함께 있는 누리 스플래시',
    },
    summer: {
      source: require('../../assets/seasonal/splash/summer.jpg'),
      backgroundColor: '#A7D6F7',
      overlayColors: [
        'rgba(18, 43, 62, 0.3)',
        'rgba(18, 43, 62, 0.06)',
        'rgba(18, 43, 62, 0)',
      ],
      accessibilityLabel: '여름 풍경 속 반려동물들이 함께 있는 누리 스플래시',
    },
    autumn: {
      source: require('../../assets/seasonal/splash/autumn.jpg'),
      backgroundColor: '#E7A055',
      overlayColors: [
        'rgba(52, 27, 18, 0.41)',
        'rgba(52, 27, 18, 0.1)',
        'rgba(52, 27, 18, 0)',
      ],
      accessibilityLabel: '가을 풍경 속 반려동물들이 함께 있는 누리 스플래시',
    },
    winter: {
      source: require('../../assets/seasonal/splash/winter.jpg'),
      backgroundColor: '#DDE8F3',
      overlayColors: [
        'rgba(24, 42, 61, 0.3)',
        'rgba(24, 42, 61, 0.07)',
        'rgba(24, 42, 61, 0)',
      ],
      accessibilityLabel: '겨울 풍경 속 반려동물들이 함께 있는 누리 스플래시',
    },
  };

export function getSeasonalSplashVisual(
  season: SeasonKey,
): SeasonalSplashVisual {
  return SEASONAL_SPLASH_VISUALS[season];
}

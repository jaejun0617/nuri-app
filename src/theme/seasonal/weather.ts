import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

type GradientColors = readonly [string, string, ...string[]];

export type SeasonalWeatherCardVisualTheme = {
  backgroundImage: ImageSourcePropType;
  borderColors: GradientColors;
  surfaceColors: GradientColors;
  highlightColors: GradientColors;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  copyBackground: string;
  copyBorder: string;
  metricText: string;
  accent: string;
  separator: string;
  locationBackground: string;
  locationBorder: string;
  guideBackground: string;
  guideBorder: string;
  metricBackground: string;
  shadowColor: string;
  shadowOpacity: number;
};

export type SeasonalWeatherVisualTheme = {
  season: SeasonKey;
  card: SeasonalWeatherCardVisualTheme;
};

const AUTUMN_WEATHER_THEME: SeasonalWeatherVisualTheme = {
  season: 'autumn',
  card: {
    backgroundImage: require('../../assets/seasonal/home/autumn/weather/card-background.png'),
    borderColors: ['#E5A05A', '#F4D6A7', '#D97943'],
    surfaceColors: ['#FFF9F0', '#F9E8CD'],
    highlightColors: ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0)'],
    primaryText: '#5A3023',
    secondaryText: '#77665E',
    mutedText: '#806D60',
    copyBackground: 'rgba(255, 252, 246, 0.30)',
    copyBorder: 'rgba(255, 255, 255, 0.18)',
    metricText: '#5A3023',
    accent: '#D95F32',
    separator: 'rgba(122, 80, 53, 0.18)',
    locationBackground: 'rgba(255, 252, 246, 0.36)',
    locationBorder: 'rgba(191, 119, 67, 0.26)',
    guideBackground: 'rgba(255, 252, 246, 0.34)',
    guideBorder: 'transparent',
    metricBackground: 'rgba(255, 250, 242, 0.34)',
    shadowColor: '#8B4A2B',
    shadowOpacity: 0.16,
  },
};

export function getSeasonalWeatherVisualTheme(
  season: SeasonKey | null,
): SeasonalWeatherVisualTheme | null {
  if (season !== 'autumn') return null;

  return AUTUMN_WEATHER_THEME;
}

import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

type GradientColors = readonly [string, string, ...string[]];
type GradientLocations = readonly [number, number, ...number[]];

export type SeasonalWeatherCardVisualTheme = {
  backgroundImage: ImageSourcePropType;
  backgroundResizeMode: 'contain' | 'cover';
  backgroundLeftInset: number;
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
  bottomFinishColors: GradientColors;
  bottomFinishLocations: GradientLocations;
};

const AUTUMN_WEATHER_THEME: SeasonalWeatherVisualTheme = {
  season: 'autumn',
  card: {
    backgroundImage: require('../../assets/seasonal/home/autumn/weather/card-background.png'),
    backgroundResizeMode: 'cover',
    backgroundLeftInset: -18,
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
  bottomFinishColors: [
    'rgba(255, 250, 240, 0)',
    'rgba(255, 251, 245, 0.82)',
    '#FFFFFF',
  ],
  bottomFinishLocations: [0, 0.58, 1],
};

const WINTER_WEATHER_THEME: SeasonalWeatherVisualTheme = {
  season: 'winter',
  card: {
    backgroundImage: require('../../assets/seasonal/home/winter/weather/card-background.png'),
    backgroundResizeMode: 'contain',
    backgroundLeftInset: 0,
    borderColors: ['#78A9D7', '#E7F3FF', '#91B9DE'],
    surfaceColors: ['#F7FBFF', '#EAF4FD'],
    highlightColors: ['rgba(255,255,255,0.44)', 'rgba(255,255,255,0)'],
    primaryText: '#183653',
    secondaryText: '#2D4C68',
    mutedText: '#405C76',
    copyBackground: 'rgba(238, 247, 255, 0.46)',
    copyBorder: 'rgba(255, 255, 255, 0.48)',
    metricText: '#183653',
    accent: '#245F92',
    separator: 'rgba(43, 76, 108, 0.24)',
    locationBackground: 'rgba(238, 247, 255, 0.54)',
    locationBorder: 'transparent',
    guideBackground: 'rgba(238, 247, 255, 0.52)',
    guideBorder: 'transparent',
    metricBackground: 'rgba(238, 247, 255, 0.48)',
    shadowColor: '#456D96',
    shadowOpacity: 0.15,
  },
  bottomFinishColors: [
    'rgba(239, 247, 255, 0)',
    'rgba(244, 249, 255, 0.84)',
    '#FFFFFF',
  ],
  bottomFinishLocations: [0, 0.58, 1],
};

export function getSeasonalWeatherVisualTheme(
  season: SeasonKey | null,
): SeasonalWeatherVisualTheme | null {
  if (season === 'autumn') return AUTUMN_WEATHER_THEME;
  if (season === 'winter') return WINTER_WEATHER_THEME;
  return null;
}

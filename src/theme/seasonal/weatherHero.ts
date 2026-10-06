import type { ImageSourcePropType } from 'react-native';

import type { WeatherScenario } from '../../services/weather/guide';
import { getHomeAmbientVisual } from '../home/seasonalAmbient';
import type { SeasonKey } from './season';
import { getSeasonalWeatherVisualTheme } from './weather';

export type WeatherScenePalette = {
  background: [string, string, string];
  cardBackground: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
};

type HeroKey = `${'normal' | 'rain' | 'snow'}-${'day' | 'night'}`;

export type SeasonalWeatherHeroVisual = {
  key: HeroKey;
  image: ImageSourcePropType;
  palette: WeatherScenePalette;
  text: { primary: string; secondary: string; shadowColor: string };
  blendColors: [string, string, string];
};

const ARTWORK: Record<
  SeasonKey,
  Partial<Record<HeroKey, ImageSourcePropType>>
> = {
  autumn: {
    'normal-day': require('../../assets/weather/autumn/normal-day-v1.webp'),
    'normal-night': require('../../assets/weather/autumn/normal-night-v1.webp'),
    'rain-day': require('../../assets/weather/autumn/rain-day-v1.webp'),
    'rain-night': require('../../assets/weather/autumn/rain-night-v1.webp'),
  },
  winter: {
    'normal-day': require('../../assets/weather/winter/normal-day-v1.webp'),
    'normal-night': require('../../assets/weather/winter/normal-night-v1.webp'),
    'rain-day': require('../../assets/weather/winter/rain-day-v1.webp'),
    'rain-night': require('../../assets/weather/winter/rain-night-v1.webp'),
    'snow-day': require('../../assets/weather/winter/snow-day-v1.webp'),
    'snow-night': require('../../assets/weather/winter/snow-night-v1.webp'),
  },
  spring: {
    'normal-day': require('../../assets/weather/spring/normal-day-v1.webp'),
    'normal-night': require('../../assets/weather/spring/normal-night-v1.webp'),
    'rain-day': require('../../assets/weather/spring/rain-day-v1.webp'),
    'rain-night': require('../../assets/weather/spring/rain-night-v1.webp'),
    'snow-day': require('../../assets/weather/spring/snow-day-v1.webp'),
    'snow-night': require('../../assets/weather/spring/snow-night-v1.webp'),
  },
  summer: {
    'normal-day': require('../../assets/weather/summer/normal-day-v1.webp'),
    'normal-night': require('../../assets/weather/summer/normal-night-v1.webp'),
    'rain-day': require('../../assets/weather/summer/rain-day-v1.webp'),
    'rain-night': require('../../assets/weather/summer/rain-night-v1.webp'),
    'snow-day': require('../../assets/weather/summer/snow-day-v1.webp'),
    'snow-night': require('../../assets/weather/summer/snow-night-v1.webp'),
  },
};
const SURFACE: Record<
  SeasonKey,
  Record<'normal' | 'rain' | 'snow', [string, string]>
> = {
  autumn: {
    normal: ['#E8EDF2', '#263A58'],
    rain: ['#D6DFE7', '#1C2E40'],
    snow: ['#E8EDF2', '#263A58'],
  },
  winter: {
    normal: ['#E8EEF8', '#25395D'],
    rain: ['#E0E5EF', '#293443'],
    snow: ['#EBEFF9', '#293C66'],
  },
  spring: {
    normal: ['#F0E8EE', '#3C354D'],
    rain: ['#E3E6EE', '#353744'],
    snow: ['#ECEAF5', '#353E60'],
  },
  summer: {
    normal: ['#E3F1F2', '#263D54'],
    rain: ['#E1E9ED', '#293B4B'],
    snow: ['#E9EFF7', '#304465'],
  },
};
function tint(hex: string, alpha: number) {
  const channels = [1, 3, 5].map(offset =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );
  return `rgba(${channels.join(',')},${alpha})`;
}

/** PO uses the actual Home background hue unchanged in both day and night. */
export function getWeatherHeroTextPalette(
  season: SeasonKey,
  isDaytime: boolean,
) {
  const foreground = getHomeAmbientVisual(season).primaryColor;
  const visual = getSeasonalWeatherVisualTheme(season);
  if (!visual) throw new Error('Unsupported weather hero season');
  return {
    primary: foreground,
    secondary: foreground,
    shadowColor: 'transparent',
    locationIcon: isDaytime
      ? visual.card.primaryText
      : visual.card.surfaceColors[0],
  };
}

/** Review changes artwork only; weather/AQ/day phase remain real data. */
export function getSeasonalWeatherHeroVisual(
  season: SeasonKey,
  scenario: WeatherScenario,
  isDaytime: boolean,
): SeasonalWeatherHeroVisual | null {
  const condition =
    scenario === 'rain' || scenario === 'snow' ? scenario : 'normal';
  const key: HeroKey = `${condition}-${isDaytime ? 'day' : 'night'}`;
  const image = ARTWORK[season][key];
  // Autumn snow retains the common snow path, never disguised as normal/rain.
  if (!image) return null;
  const surface = SURFACE[season][condition][isDaytime ? 0 : 1];
  const primary = isDaytime ? '#162C46' : '#FFFFFF';
  const secondary = isDaytime ? '#304760' : '#E1E9F3';

  return {
    key,
    image,
    palette: {
      // One continuation color avoids a visible seam below the bottom fade.
      background: [surface, surface, surface],
      cardBackground: isDaytime
        ? 'rgba(255,255,255,0.60)'
        : 'rgba(255,255,255,0.10)',
      cardBorder: isDaytime
        ? 'rgba(255,255,255,0.72)'
        : 'rgba(255,255,255,0.24)',
      textPrimary: primary,
      textSecondary: secondary,
      accent: '#FFE06B',
      accentSoft: 'rgba(255,224,107,0.18)',
    },
    text: {
      primary,
      secondary,
      shadowColor: isDaytime ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.60)',
    },
    blendColors: [tint(surface, 0), tint(surface, 0.35), surface],
  };
}

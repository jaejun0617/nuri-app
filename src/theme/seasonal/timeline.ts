import type { ImageSourcePropType } from 'react-native';
import type { SeasonKey } from './season';

export const TIMELINE_HERO_ASPECT_RATIO = 2;
export const TIMELINE_HERO_IMAGES: Readonly<
  Record<SeasonKey, ImageSourcePropType>
> = {
  autumn: require('../../assets/seasonal/timeline/autumn.png'),
  winter: require('../../assets/seasonal/timeline/winter.png'),
  spring: require('../../assets/seasonal/timeline/spring.png'),
  summer: require('../../assets/seasonal/timeline/summer.png'),
};

// Normalized ground anchors keep the glass panel below paws without cropping the assets.
export const TIMELINE_STATS_ANCHOR: Readonly<Record<SeasonKey, number>> = {
  autumn: 0.86,
  winter: 0.9,
  spring: 0.89,
  summer: 0.9,
};

// Timeline selection and statistics are not action CTA or pet-personalization colors.
export const TIMELINE_SEASON_COLORS = {
  autumn: {
    statsGradientStart: '#DA4A0E',
    statsGradientEnd: '#FE9E28',
    statsValue: '#DF3500',
    statsIcon: '#FD8900',
    selectedCategory: '#D44912',
    heroText: '#382514',
    heroNote: '#9E3C12',
    surface: '#FFF3DC',
  },
  winter: {
    statsGradientStart: '#2663E2',
    statsGradientEnd: '#479DFB',
    statsValue: '#4480E4',
    statsIcon: '#2E72F0',
    selectedCategory: '#3573ED',
    heroText: '#193B65',
    heroNote: '#27588C',
    surface: '#EEF5FC',
  },
  spring: {
    statsGradientStart: '#DE3E6B',
    statsGradientEnd: '#F291AC',
    statsValue: '#D0275D',
    statsIcon: '#ED5B86',
    selectedCategory: '#DD3E6B',
    heroText: '#682C46',
    heroNote: '#973452',
    surface: '#FFF1F6',
  },
  summer: {
    statsGradientStart: '#047572',
    statsGradientEnd: '#38BBB7',
    statsValue: '#007771',
    statsIcon: '#02847E',
    selectedCategory: '#1A817B',
    heroText: '#154A45',
    heroNote: '#14675D',
    surface: '#E8F7F4',
  },
} as const satisfies Readonly<
  Record<
    SeasonKey,
    {
      statsGradientStart: string;
      statsGradientEnd: string;
      statsValue: string;
      statsIcon: string;
      selectedCategory: string;
      heroText: string;
      heroNote: string;
      surface: string;
    }
  >
>;

export type TimelineSeasonColors = (typeof TIMELINE_SEASON_COLORS)[SeasonKey];

import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalHomeVisual = {
  season: SeasonKey;
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  ornamentSheet: ImageSourcePropType | null;
  profileSheetBackground: ImageSourcePropType | null;
  greetingCopy: string;
  headerPalette: {
    brand: string;
    greeting: string;
    copy: string;
  };
};

const SPRING_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'spring',
  atmosphere: require('../../assets/seasonal/home/spring/atmosphere.png'),
  atmosphereAspectRatio: 1024 / 1536,
  ornamentSheet: null,
  profileSheetBackground: require('../../assets/seasonal/home/spring/profile-sheet-background.png'),
  greetingCopy: '따뜻한 봄날, 함께 좋은 추억을 남겨보세요',
  headerPalette: {
    brand: '#D94F7A',
    greeting: '#D94F7A',
    copy: '#654C59',
  },
};

const SUMMER_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'summer',
  atmosphere: require('../../assets/seasonal/home/summer/atmosphere.png'),
  atmosphereAspectRatio: 1024 / 1536,
  ornamentSheet: null,
  profileSheetBackground: require('../../assets/seasonal/home/summer/profile-sheet-background.png'),
  greetingCopy: '반짝이는 여름날도 함께 기록해요',
  headerPalette: {
    brand: '#25705F',
    greeting: '#25705F',
    copy: '#405C56',
  },
};

const AUTUMN_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'autumn',
  atmosphere: require('../../assets/seasonal/home/autumn/atmosphere.png'),
  atmosphereAspectRatio: 1024 / 1536,
  ornamentSheet: require('../../assets/seasonal/home/autumn/ornament-sheet.png'),
  profileSheetBackground: null,
  greetingCopy: '선선한 오늘, 함께한 순간을 남겨보세요',
  headerPalette: {
    brand: '#C94732',
    greeting: '#C94732',
    copy: '#60483F',
  },
};

const WINTER_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'winter',
  atmosphere: require('../../assets/seasonal/home/winter/atmosphere.png'),
  atmosphereAspectRatio: 1024 / 1536,
  ornamentSheet: require('../../assets/seasonal/home/winter/ornament-sheet.png'),
  profileSheetBackground: require('../../assets/seasonal/home/winter/profile-sheet-background.png'),
  greetingCopy: '포근한 오늘도 따뜻한 기억을 남겨보세요',
  headerPalette: {
    brand: '#4167A6',
    greeting: '#4167A6',
    copy: '#45536B',
  },
};

export const SEASONAL_HOME_COPY: Record<SeasonKey, string> = {
  spring: SPRING_HOME_VISUAL.greetingCopy,
  summer: SUMMER_HOME_VISUAL.greetingCopy,
  autumn: AUTUMN_HOME_VISUAL.greetingCopy,
  winter: WINTER_HOME_VISUAL.greetingCopy,
};

export function getSeasonalHomeVisual(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): SeasonalHomeVisual | null {
  const resolvedSeason = override === 'auto' ? season : override;
  if (resolvedSeason === 'spring') return SPRING_HOME_VISUAL;
  if (resolvedSeason === 'summer') return SUMMER_HOME_VISUAL;
  if (resolvedSeason === 'autumn') return AUTUMN_HOME_VISUAL;
  if (resolvedSeason === 'winter') return WINTER_HOME_VISUAL;
  return null;
}

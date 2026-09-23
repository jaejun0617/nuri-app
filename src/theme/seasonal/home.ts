import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalHomeVisual = {
  season: 'autumn' | 'winter';
  atmosphere: ImageSourcePropType;
  atmosphereAspectRatio: number;
  ornamentSheet: ImageSourcePropType;
  profileSheetBackground: ImageSourcePropType | null;
  greetingCopy: string;
};

const AUTUMN_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'autumn',
  atmosphere: require('../../assets/seasonal/home/autumn/atmosphere.png'),
  atmosphereAspectRatio: 941 / 1672,
  ornamentSheet: require('../../assets/seasonal/home/autumn/ornament-sheet.png'),
  profileSheetBackground: null,
  greetingCopy: '선선한 오늘, 함께한 순간을 남겨보세요',
};

const WINTER_HOME_VISUAL: SeasonalHomeVisual = {
  season: 'winter',
  atmosphere: require('../../assets/seasonal/home/winter/atmosphere.png'),
  atmosphereAspectRatio: 941 / 1672,
  ornamentSheet: require('../../assets/seasonal/home/winter/ornament-sheet.png'),
  profileSheetBackground: require('../../assets/seasonal/home/winter/profile-sheet-background.png'),
  greetingCopy: '포근한 오늘도 따뜻한 기억을 남겨보세요',
};

export const SEASONAL_HOME_COPY: Record<SeasonKey, string> = {
  spring: '따뜻한 봄날, 함께 좋은 추억을 남겨보세요',
  summer: '반짝이는 여름날도 함께 기록해요',
  autumn: AUTUMN_HOME_VISUAL.greetingCopy,
  winter: WINTER_HOME_VISUAL.greetingCopy,
};

export function getSeasonalHomeVisual(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): SeasonalHomeVisual | null {
  const resolvedSeason = override === 'auto' ? season : override;
  if (resolvedSeason === 'autumn') return AUTUMN_HOME_VISUAL;
  if (resolvedSeason === 'winter') return WINTER_HOME_VISUAL;
  return null;
}

import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalLoginVisual = {
  source: ImageSourcePropType;
  backgroundColor: string;
  accentColor: string;
  accessibilityLabel: string;
};

const AUTUMN_LOGIN_VISUAL: SeasonalLoginVisual = {
  source: require('../../assets/seasonal/login/autumn.jpg'),
  backgroundColor: '#E99B54',
  accentColor: '#D95C2B',
  accessibilityLabel: '가을 숲에서 여러 반려동물이 함께 있는 누리 로그인 배경',
};

/**
 * Returns a seasonal login visual only after that season has been approved.
 * Unapproved seasons deliberately fall back to the existing login experience.
 */
export function getSeasonalLoginVisual(
  season: SeasonKey,
): SeasonalLoginVisual | null {
  return season === 'autumn' ? AUTUMN_LOGIN_VISUAL : null;
}

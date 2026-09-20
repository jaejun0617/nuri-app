import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalSignupVisual = {
  season: Extract<SeasonKey, 'autumn'>;
  source: ImageSourcePropType;
  accessibilityLabel: string;
  backgroundColor: string;
  backgroundWashColor: string;
  accentColor: string;
  accentPressedColor: string;
  accentShadowColor: string;
  textColor: string;
  mutedTextColor: string;
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  fieldIconColor: string;
  fieldPlaceholderColor: string;
  fieldTextColor: string;
  surfaceColor: string;
  surfaceStrongColor: string;
  borderColor: string;
  requiredBadgeBackgroundColor: string;
  optionalBadgeBackgroundColor: string;
  policyTextColor: string;
  policyLinkColor: string;
  errorColor: string;
};

const AUTUMN_SIGNUP_VISUAL: SeasonalSignupVisual = {
  season: 'autumn',
  source: require('../../assets/seasonal/signup/autumn.jpg'),
  accessibilityLabel:
    '단풍 숲에서 여러 반려동물이 함께 있는 누리 가을 회원가입 배경',
  backgroundColor: '#E99B54',
  backgroundWashColor: 'rgba(255, 248, 240, 0.03)',
  accentColor: '#E9693A',
  accentPressedColor: '#D45A2D',
  accentShadowColor: '#9E3D1B',
  textColor: '#47362C',
  mutedTextColor: '#67594F',
  fieldBackgroundColor: 'rgba(255, 252, 248, 0.93)',
  fieldBorderColor: 'rgba(255, 255, 255, 0.84)',
  fieldIconColor: '#6A5547',
  fieldPlaceholderColor: '#786E66',
  fieldTextColor: '#3E342F',
  surfaceColor: 'rgba(255, 252, 248, 0.90)',
  surfaceStrongColor: 'rgba(255, 255, 255, 0.94)',
  borderColor: 'rgba(159, 94, 52, 0.18)',
  requiredBadgeBackgroundColor: 'rgba(233, 105, 58, 0.13)',
  optionalBadgeBackgroundColor: 'rgba(153, 113, 77, 0.12)',
  policyTextColor: '#65584E',
  policyLinkColor: '#8C351C',
  errorColor: '#B93838',
};

/**
 * Returns an approved seasonal signup presentation. Autumn is intentionally
 * the only active signup season until the remaining PO designs are approved.
 */
export function getSeasonalSignupVisual(
  season: SeasonKey,
  override: 'auto' | 'autumn' = 'auto',
): SeasonalSignupVisual | null {
  const resolvedSeason = override === 'auto' ? season : override;
  return resolvedSeason === 'autumn' ? AUTUMN_SIGNUP_VISUAL : null;
}

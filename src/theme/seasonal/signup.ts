import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalSignupVisual = {
  season: Extract<SeasonKey, 'autumn' | 'winter'>;
  source: ImageSourcePropType;
  backgroundAspectRatio: number;
  accessibilityLabel: string;
  backgroundColor: string;
  backgroundFadeTransparentColor: string;
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
  signInTextColor: string;
  errorColor: string;
};

const AUTUMN_SIGNUP_VISUAL: SeasonalSignupVisual = {
  season: 'autumn',
  source: require('../../assets/seasonal/signup/autumn.jpg'),
  backgroundAspectRatio: 1672 / 941,
  accessibilityLabel:
    '단풍 숲에서 여러 반려동물이 함께 있는 누리 가을 회원가입 배경',
  backgroundColor: '#E99B54',
  backgroundFadeTransparentColor: 'rgba(233, 155, 84, 0)',
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
  signInTextColor: '#FFFFFF',
  errorColor: '#B93838',
};

const WINTER_SIGNUP_VISUAL: SeasonalSignupVisual = {
  season: 'winter',
  source: require('../../assets/seasonal/signup/winter.png'),
  backgroundAspectRatio: 1672 / 941,
  accessibilityLabel:
    '눈 덮인 숲에서 여러 반려동물이 함께 있는 누리 겨울 회원가입 배경',
  backgroundColor: '#EAF0FB',
  backgroundFadeTransparentColor: 'rgba(234, 240, 251, 0)',
  backgroundWashColor: 'rgba(245, 248, 255, 0.02)',
  accentColor: '#9297F2',
  accentPressedColor: '#7F85DE',
  accentShadowColor: '#565BAA',
  textColor: '#2F4266',
  mutedTextColor: '#52617B',
  fieldBackgroundColor: 'rgba(255, 255, 255, 0.93)',
  fieldBorderColor: 'rgba(156, 174, 207, 0.45)',
  fieldIconColor: '#52617B',
  fieldPlaceholderColor: '#64738C',
  fieldTextColor: '#253650',
  surfaceColor: 'rgba(250, 252, 255, 0.91)',
  surfaceStrongColor: 'rgba(255, 255, 255, 0.94)',
  borderColor: 'rgba(130, 151, 190, 0.34)',
  requiredBadgeBackgroundColor: 'rgba(146, 151, 242, 0.18)',
  optionalBadgeBackgroundColor: 'rgba(130, 151, 190, 0.17)',
  policyTextColor: '#52617B',
  policyLinkColor: '#5961C8',
  signInTextColor: '#2F4266',
  errorColor: '#A6424E',
};

/**
 * Returns only the approved signup presentations. Spring and summer keep the
 * existing non-seasonal signup UI until their designs are approved.
 */
export function getSeasonalSignupVisual(
  season: SeasonKey,
  override: 'auto' | 'autumn' | 'winter' = 'auto',
): SeasonalSignupVisual | null {
  const resolvedSeason = override === 'auto' ? season : override;
  if (resolvedSeason === 'autumn') return AUTUMN_SIGNUP_VISUAL;
  if (resolvedSeason === 'winter') return WINTER_SIGNUP_VISUAL;
  return null;
}

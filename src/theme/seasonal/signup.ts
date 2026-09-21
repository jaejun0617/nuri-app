import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalSignupVisual = {
  season: SeasonKey;
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

const SPRING_SIGNUP_VISUAL: SeasonalSignupVisual = {
  season: 'spring',
  source: require('../../assets/seasonal/signup/spring.png'),
  backgroundAspectRatio: 1672 / 941,
  accessibilityLabel:
    '봄꽃 들판에서 여러 반려동물이 함께 있는 누리 봄 회원가입 배경',
  backgroundColor: '#FBEDEB',
  backgroundFadeTransparentColor: 'rgba(251, 237, 235, 0)',
  backgroundWashColor: 'rgba(255, 250, 246, 0.02)',
  accentColor: '#E77F9A',
  accentPressedColor: '#CF6885',
  accentShadowColor: '#B85B76',
  textColor: '#51423F',
  mutedTextColor: '#66565B',
  fieldBackgroundColor: 'rgba(255, 252, 249, 0.93)',
  fieldBorderColor: 'rgba(226, 183, 189, 0.48)',
  fieldIconColor: '#6D687B',
  fieldPlaceholderColor: '#777184',
  fieldTextColor: '#433C48',
  surfaceColor: 'rgba(255, 252, 249, 0.91)',
  surfaceStrongColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: 'rgba(177, 110, 129, 0.26)',
  requiredBadgeBackgroundColor: 'rgba(231, 127, 154, 0.16)',
  optionalBadgeBackgroundColor: 'rgba(152, 122, 134, 0.13)',
  policyTextColor: '#66565B',
  policyLinkColor: '#A83F68',
  signInTextColor: '#51423F',
  errorColor: '#A83F68',
};

const SUMMER_SIGNUP_VISUAL: SeasonalSignupVisual = {
  season: 'summer',
  source: require('../../assets/seasonal/signup/summer.png'),
  backgroundAspectRatio: 1672 / 941,
  accessibilityLabel:
    '수국 들판에서 여러 반려동물이 함께 있는 누리 여름 회원가입 배경',
  backgroundColor: '#EAF6D8',
  backgroundFadeTransparentColor: 'rgba(234, 246, 216, 0)',
  backgroundWashColor: 'rgba(244, 252, 238, 0.02)',
  accentColor: '#4F91D8',
  accentPressedColor: '#3C7FC7',
  accentShadowColor: '#2F6EA8',
  textColor: '#304258',
  mutedTextColor: '#52687A',
  fieldBackgroundColor: 'rgba(255, 255, 250, 0.93)',
  fieldBorderColor: 'rgba(87, 148, 211, 0.38)',
  fieldIconColor: '#536684',
  fieldPlaceholderColor: '#6C7B8F',
  fieldTextColor: '#304258',
  surfaceColor: 'rgba(250, 254, 252, 0.91)',
  surfaceStrongColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: 'rgba(79, 145, 216, 0.26)',
  requiredBadgeBackgroundColor: 'rgba(79, 145, 216, 0.15)',
  optionalBadgeBackgroundColor: 'rgba(93, 143, 155, 0.13)',
  policyTextColor: '#52687A',
  policyLinkColor: '#2F6EB8',
  signInTextColor: '#304258',
  errorColor: '#A63D47',
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

export function getSeasonalSignupVisual(
  season: SeasonKey,
  override: 'auto' | SeasonKey = 'auto',
): SeasonalSignupVisual {
  const resolvedSeason = override === 'auto' ? season : override;
  if (resolvedSeason === 'spring') return SPRING_SIGNUP_VISUAL;
  if (resolvedSeason === 'summer') return SUMMER_SIGNUP_VISUAL;
  if (resolvedSeason === 'autumn') return AUTUMN_SIGNUP_VISUAL;
  return WINTER_SIGNUP_VISUAL;
}

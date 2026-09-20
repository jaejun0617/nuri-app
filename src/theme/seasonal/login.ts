import type { ImageSourcePropType } from 'react-native';

import type { SeasonKey } from './season';

export type SeasonalLoginVisual = {
  season: Extract<SeasonKey, 'autumn' | 'winter'>;
  source: ImageSourcePropType;
  backgroundColor: string;
  backgroundWashColor: string;
  accentColor: string;
  headlineAccentColor: string;
  heroHeightOffset: number;
  accessibilityLabel: string;
  headlineColor: string;
  headlineFirstLine: string;
  headlineSecondLinePrefix: string;
  headlineAccent: string;
  headlineSecondLineSuffix: string;
  headlineShadowColor: string;
  ornamentIcon: 'leaf-maple' | 'snowflake';
  subtitle: string;
  subtitleColor: string;
  englishCopy: string;
  englishCopyColor: string;
  fieldBackgroundColor: string;
  fieldBorderColor: string;
  fieldShadowColor: string;
  fieldIconColor: string;
  fieldPlaceholderColor: string;
  fieldTextColor: string;
  ctaColor: string;
  ctaShadowColor: string;
  inlineTextColor: string;
  inlineDividerColor: string;
  socialDividerColor: string;
  socialLabel: string;
  socialTextColor: string;
  googleBackgroundColor: string;
  googleBorderColor: string;
  policyTextColor: string;
  policyLinkColor: string;
  policyShadowColor: string;
  recentLoginBackgroundColor: string;
  recentLoginBorderColor: string;
  recentLoginTextColor: string;
};

const AUTUMN_LOGIN_VISUAL: SeasonalLoginVisual = {
  season: 'autumn',
  source: require('../../assets/seasonal/login/autumn.jpg'),
  backgroundColor: '#E99B54',
  backgroundWashColor: 'rgba(255, 248, 240, 0.08)',
  accentColor: '#D95C2B',
  headlineAccentColor: '#D95C2B',
  heroHeightOffset: 0,
  accessibilityLabel: '가을 숲에서 여러 반려동물이 함께 있는 누리 로그인 배경',
  headlineColor: '#4B3527',
  headlineFirstLine: '함께하는 오늘이',
  headlineSecondLinePrefix: '오래도록 ',
  headlineAccent: '따뜻한 기억',
  headlineSecondLineSuffix: '이 되기를',
  headlineShadowColor: 'rgba(255, 249, 241, 0.72)',
  ornamentIcon: 'leaf-maple',
  subtitle: '사랑하는 아이와, 언제나 누리와 함께',
  subtitleColor: '#5A4031',
  englishCopy: 'Warm Moments\nTogether ♥',
  englishCopyColor: '#C94F27',
  fieldBackgroundColor: 'rgba(255, 250, 245, 0.92)',
  fieldBorderColor: 'rgba(255, 255, 255, 0.8)',
  fieldShadowColor: '#7B3E1C',
  fieldIconColor: '#5C554F',
  fieldPlaceholderColor: '#746C65',
  fieldTextColor: '#3E342F',
  ctaColor: '#E9693A',
  ctaShadowColor: '#9E3D1B',
  inlineTextColor: '#51473F',
  inlineDividerColor: '#856F61',
  socialDividerColor: 'rgba(91, 72, 60, 0.46)',
  socialLabel: '소셜 계정으로 시작하기',
  socialTextColor: '#4E4741',
  googleBackgroundColor: 'rgba(255, 255, 255, 0.94)',
  googleBorderColor: '#E5D8CC',
  policyTextColor: '#596574',
  policyLinkColor: '#5B2A18',
  policyShadowColor: 'rgba(255, 249, 240, 0.96)',
  recentLoginBackgroundColor: 'rgba(255, 250, 245, 0.94)',
  recentLoginBorderColor: 'rgba(218, 91, 43, 0.22)',
  recentLoginTextColor: '#D4572C',
};

const WINTER_LOGIN_VISUAL: SeasonalLoginVisual = {
  season: 'winter',
  source: require('../../assets/seasonal/login/winter.jpg'),
  backgroundColor: '#EAF0FB',
  backgroundWashColor: 'rgba(235, 241, 255, 0.04)',
  accentColor: '#7182C6',
  headlineAccentColor: '#A84F3B',
  heroHeightOffset: 40,
  accessibilityLabel:
    '눈 내린 겨울 숲에서 여러 반려동물이 함께 있는 누리 로그인 배경',
  headlineColor: '#35415F',
  headlineFirstLine: '차가운 계절에도,',
  headlineSecondLinePrefix: '함께한 순간은 ',
  headlineAccent: '늘 따뜻해요',
  headlineSecondLineSuffix: '',
  headlineShadowColor: 'rgba(255, 255, 255, 0.92)',
  ornamentIcon: 'snowflake',
  subtitle: '사랑하는 아이와, 언제나 누리와 함께',
  subtitleColor: '#2F4266',
  englishCopy: 'A Warmer\nTomorrow\nTogether ♥',
  englishCopyColor: '#FFFFFF',
  fieldBackgroundColor: 'rgba(250, 252, 255, 0.9)',
  fieldBorderColor: 'rgba(126, 143, 190, 0.34)',
  fieldShadowColor: '#66749D',
  fieldIconColor: '#60719A',
  fieldPlaceholderColor: '#7180A0',
  fieldTextColor: '#2D3C59',
  ctaColor: '#9297F2',
  ctaShadowColor: '#6670C8',
  inlineTextColor: '#465778',
  inlineDividerColor: '#7F8CAA',
  socialDividerColor: 'rgba(91, 112, 153, 0.56)',
  socialLabel: 'SNS 계정으로 시작하기',
  socialTextColor: '#4B5D7E',
  googleBackgroundColor: 'rgba(255, 255, 255, 0.94)',
  googleBorderColor: '#CBD3E5',
  policyTextColor: '#5D6E8D',
  policyLinkColor: '#5961C8',
  policyShadowColor: 'rgba(255, 255, 255, 0.96)',
  recentLoginBackgroundColor: 'rgba(250, 251, 255, 0.96)',
  recentLoginBorderColor: 'rgba(112, 119, 220, 0.28)',
  recentLoginTextColor: '#6268D7',
};

const APPROVED_LOGIN_VISUALS: Partial<Record<SeasonKey, SeasonalLoginVisual>> =
  {
    autumn: AUTUMN_LOGIN_VISUAL,
    winter: WINTER_LOGIN_VISUAL,
  };

/**
 * Returns a seasonal login visual only after that season has been approved.
 * Unapproved seasons deliberately fall back to the existing login experience.
 */
export function getSeasonalLoginVisual(
  season: SeasonKey,
  override: 'auto' | Extract<SeasonKey, 'autumn' | 'winter'> = 'auto',
): SeasonalLoginVisual | null {
  const resolvedSeason = override === 'auto' ? season : override;
  return APPROVED_LOGIN_VISUALS[resolvedSeason] ?? null;
}

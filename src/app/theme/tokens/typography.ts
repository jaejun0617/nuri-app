// 파일: src/app/theme/tokens/typography.ts
import { Platform } from 'react-native';

const pretendardFamily = Platform.select({
  ios: 'PretendardVariable',
  android: 'PretendardVariable',
  default: 'System',
});

const semanticPreset = {
  display: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    fontFamily: pretendardFamily,
  },
  titleLg: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
    fontFamily: pretendardFamily,
  },
  titleMd: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.05,
    fontFamily: pretendardFamily,
  },
  titleSm: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    fontFamily: pretendardFamily,
  },
  tab: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    fontFamily: pretendardFamily,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
} as const;

export const typography = {
  family: {
    sans: pretendardFamily,
  },
  size: {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 18,
    helper: 18,
    normal: 22,
    body: 24,
    relaxed: 28,
    loose: 32,
    display: 36,
  },
  role: semanticPreset,
  preset: {
    ...semanticPreset,
    title1: semanticPreset.display,
    title2: semanticPreset.titleLg,
    headline: semanticPreset.titleSm,
    body: semanticPreset.body,
    caption: semanticPreset.helper,
  },
} as const;

export type TypographyRoleName = keyof typeof semanticPreset;
export type TypographyPresetName = keyof typeof typography.preset;

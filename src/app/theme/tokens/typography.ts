// 파일: src/app/theme/tokens/typography.ts
import { Platform } from 'react-native';

const pretendardFamily = Platform.select({
  ios: 'PretendardVariable',
  android: 'PretendardVariable',
  default: 'System',
});

const semanticPreset = {
  screenTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
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
  bodyStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  secondary: {
    fontSize: 13,
    lineHeight: 18,
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

// Recent-records 기준을 커뮤니티·네비게이션·날씨와 분리해 적용하기 위한
// 비제외 영역 전용 preset이다. 기존 preset은 외부 화면과 공유되므로 유지한다.
const unifiedPreset = {
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  body: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  micro: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
    fontFamily: pretendardFamily,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
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
    unifiedTitle: unifiedPreset.title,
    unifiedLabel: unifiedPreset.label,
    unifiedBody: unifiedPreset.body,
    unifiedMicro: unifiedPreset.micro,
    unifiedDate: unifiedPreset.date,
    unifiedMeta: unifiedPreset.body,
    title1: semanticPreset.display,
    title2: semanticPreset.titleLg,
    headline: semanticPreset.titleSm,
    body: semanticPreset.body,
    caption: semanticPreset.helper,
  },
  unified: unifiedPreset,
} as const;

export type TypographyRoleName = keyof typeof semanticPreset;
export type TypographyPresetName = keyof typeof typography.preset;

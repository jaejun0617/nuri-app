// 파일: src/app/theme/tokens/typography.ts
import { Platform } from 'react-native';

const pretendardFamily = Platform.select({
  ios: 'PretendardVariable',
  android: 'PretendardVariable',
  default: 'System',
});

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 16,
    xl: 24,
    xxl: 32,
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
    normal: 22,
    relaxed: 26,
    loose: 30,
  },
  // 텍스트 프리셋(공통 타이포 스케일)
  preset: {
    title1: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '800' as const,
      fontFamily: pretendardFamily,
    },
    title2: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      fontFamily: pretendardFamily,
    },
    headline: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700' as const,
      fontFamily: pretendardFamily,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500' as const,
      fontFamily: pretendardFamily,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as const,
      fontFamily: pretendardFamily,
    },
  },
} as const;

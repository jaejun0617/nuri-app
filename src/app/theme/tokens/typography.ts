// 파일: src/app/theme/tokens/typography.ts
export const typography = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
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
    title1: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const },
    title2: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
    headline: { fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
    body: { fontSize: 14, lineHeight: 22, fontWeight: '500' as const },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' as const },
  },
} as const;

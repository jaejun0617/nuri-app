// 파일: src/app/theme/tokens/colors.ts
// 목적: 라이트/다크 컬러 팔레트 분리 + 공통 semantic key 유지

const common = {
  brand: '#6D7CFF',
  danger: '#FF4D4F',
  success: '#2ECC71',
  warning: '#FFB020',
} as const;

export const lightColors = {
  ...common,
  background: '#FFFFFF',
  surface: '#F6F7FB',
  surfaceElevated: '#FFFFFF',
  border: '#E6E8F0',

  textPrimary: '#0B1220',
  textSecondary: '#556070',
  textMuted: '#8A94A6',

  overlay: 'rgba(0,0,0,0.35)',
} as const;

export const darkColors = {
  ...common,
  background: '#0B1F3A', // NURI 컨셉 다크 베이스
  surface: '#102B4D',
  surfaceElevated: '#16365D',
  border: '#254B7A',

  textPrimary: '#FFFFFF',
  textSecondary: '#C7D2E3',
  textMuted: '#AAB4C4',

  overlay: 'rgba(0,0,0,0.55)',
} as const;

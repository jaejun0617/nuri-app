// 파일: src/app/theme/theme.ts
import { darkColors, lightColors } from './tokens/colors';
import { radius } from './tokens/radius';
import { shadows } from './tokens/shadows';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

export type ThemeMode = 'light' | 'dark';

export const createTheme = (mode: ThemeMode) => {
  const colors = mode === 'dark' ? darkColors : lightColors;

  return {
    mode,
    colors,
    spacing,
    radius,
    typography,
    shadows,
  } as const;
};

export type AppTheme = ReturnType<typeof createTheme>;

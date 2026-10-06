import type { SeasonKey } from '../../theme/seasonal/season';
import type { AppTheme, ThemeMode } from './theme';

export type CtaRole =
  | 'primary'
  | 'primarySubtle'
  | 'secondary'
  | 'neutral'
  | 'cleanup'
  | 'destructiveEntry'
  | 'destructiveConfirm'
  | 'disabled';
export type CtaState = 'default' | 'pressed' | 'loading' | 'disabled';
export type CtaPalette = { background: string; text: string; border: string };

export const SEASON_CTA = {
  autumn: {
    primary: '#B95000',
    pressed: '#963F00',
    subtle: 'rgba(185,80,0,0.12)',
    border: 'rgba(185,80,0,0.32)',
  },
  winter: {
    primary: '#3B6398',
    pressed: '#315381',
    subtle: 'rgba(59,99,152,0.12)',
    border: 'rgba(59,99,152,0.30)',
  },
  spring: {
    primary: '#B84066',
    pressed: '#9E3456',
    subtle: 'rgba(184,64,102,0.12)',
    border: 'rgba(184,64,102,0.30)',
  },
  summer: {
    primary: '#247264',
    pressed: '#1D6054',
    subtle: 'rgba(36,114,100,0.12)',
    border: 'rgba(36,114,100,0.30)',
  },
} as const satisfies Record<
  SeasonKey,
  { primary: string; pressed: string; subtle: string; border: string }
>;

/** Action meaning owns the palette; pet colors and dates never enter this boundary. */
export function resolveCtaPalette({
  role,
  season,
  colorScheme,
  state = 'default',
  colors,
}: {
  role: CtaRole;
  season: SeasonKey;
  colorScheme: ThemeMode;
  state?: CtaState;
  colors: Pick<
    AppTheme['colors'],
    'surface' | 'surfaceElevated' | 'textPrimary' | 'textSecondary' | 'border'
  >;
}): CtaPalette {
  const pressed = state === 'pressed';
  const dark = colorScheme === 'dark';
  const seasonal = SEASON_CTA[season];
  if (role === 'disabled' || state === 'disabled') {
    return dark
      ? {
          background: colors.surface,
          text: colors.textSecondary,
          border: colors.border,
        }
      : {
          background: '#E8EBEF',
          text: '#566271',
          border: 'rgba(86,98,113,0.16)',
        };
  }
  switch (role) {
    case 'primary':
      return {
        background: pressed ? seasonal.pressed : seasonal.primary,
        text: '#FFFFFF',
        border: pressed ? seasonal.pressed : seasonal.primary,
      };
    case 'primarySubtle':
      return dark
        ? {
            background: colors.surfaceElevated,
            text: '#FFFFFF',
            border: seasonal.primary,
          }
        : {
            background: seasonal.subtle,
            text: seasonal.primary,
            border: seasonal.border,
          };
    case 'destructiveConfirm':
      return {
        background: pressed ? '#982936' : '#B93645',
        text: '#FFFFFF',
        border: pressed ? '#982936' : '#B93645',
      };
    case 'destructiveEntry':
    case 'cleanup':
      return dark
        ? {
            background: pressed ? colors.surfaceElevated : colors.surface,
            text: '#FFAEB8',
            border: 'rgba(255,174,184,0.38)',
          }
        : {
            background:
              role === 'cleanup'
                ? 'rgba(255,241,243,0.62)'
                : 'rgba(255,241,243,0.85)',
            text: '#B93645',
            border:
              role === 'cleanup'
                ? 'rgba(185,54,69,0.22)'
                : 'rgba(185,54,69,0.34)',
          };
    case 'secondary':
      return dark
        ? {
            background: pressed ? colors.surfaceElevated : colors.surface,
            text: colors.textPrimary,
            border: colors.border,
          }
        : {
            background: pressed
              ? 'rgba(255,255,255,0.72)'
              : 'rgba(255,255,255,0.62)',
            text: '#243042',
            border: 'rgba(36,48,66,0.30)',
          };
    case 'neutral':
      return dark
        ? {
            background: pressed ? colors.surfaceElevated : colors.surface,
            text: colors.textPrimary,
            border: colors.border,
          }
        : {
            background: '#F1F3F6',
            text: '#243042',
            border: 'rgba(36,48,66,0.18)',
          };
  }
}

export function shouldStackCtaPair(width: number, fontScale: number): boolean {
  return width < 380 || fontScale >= 1.3;
}

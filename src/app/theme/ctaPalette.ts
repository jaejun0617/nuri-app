import type { SeasonKey } from '../../theme/seasonal/season';
import type { AppTheme, ThemeMode } from './theme';
import { LAVENDER_CTA, PRODUCT_CTA } from './tokens/productAccent';

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
export type CtaVariant = 'default' | 'solidLavender' | 'opaqueGlass';
export type CtaPalette = { background: string; text: string; border: string };

export const DESTRUCTIVE_CTA = {
  background: '#B93645',
  pressed: '#982936',
  text: '#FFFFFF',
} as const;

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
  season: _season,
  colorScheme,
  state = 'default',
  colors,
  variant = 'default',
}: {
  role: CtaRole;
  season: SeasonKey;
  colorScheme: ThemeMode;
  state?: CtaState;
  variant?: CtaVariant;
  colors: Pick<
    AppTheme['colors'],
    'surface' | 'surfaceElevated' | 'textPrimary' | 'textSecondary' | 'border'
  >;
}): CtaPalette {
  const pressed = state === 'pressed';
  const dark = colorScheme === 'dark';
  const seasonal = LAVENDER_CTA;
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
  if (variant === 'solidLavender' && (role === 'primary' || role === 'primarySubtle')) {
    const background = pressed ? PRODUCT_CTA.pressed : PRODUCT_CTA.primary;
    return { background, border: background, text: '#FFFFFF' };
  }
  if (variant === 'opaqueGlass' && role === 'neutral') {
    return {
      background: dark
        ? (pressed ? colors.surfaceElevated : colors.surface)
        : (pressed ? '#CADCE5' : '#DCE8EE'),
      border: 'transparent',
      text: dark ? colors.textPrimary : '#243042',
    };
  }
  switch (role) {
    case 'primary':
      return {
        background: pressed ? seasonal.pressed : seasonal.background,
        text: seasonal.text,
        border: seasonal.border,
      };
    case 'primarySubtle':
      return {
        background: pressed ? seasonal.pressed : seasonal.background,
        text: seasonal.text,
        border: seasonal.border,
      };
    case 'destructiveEntry':
    case 'destructiveConfirm': {
      const background = pressed ? DESTRUCTIVE_CTA.pressed : DESTRUCTIVE_CTA.background;
      return {
        background,
        text: DESTRUCTIVE_CTA.text,
        border: background,
      };
    }
    case 'cleanup':
      return dark
        ? {
            background: pressed ? colors.surfaceElevated : colors.surface,
            text: '#FFAEB8',
            border: 'rgba(255,174,184,0.38)',
          }
        : {
            background: 'rgba(255,241,243,0.62)',
            text: DESTRUCTIVE_CTA.background,
            border: 'rgba(185,54,69,0.22)',
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

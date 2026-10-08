import { resolveCtaPalette, SEASON_CTA } from '../../app/theme/ctaPalette';
import type { AppTheme } from '../../app/theme/theme';
import type { SeasonKey } from '../../theme/seasonal/season';

// More owns geometry only; shared theme and season tokens keep their own roles.
export const MORE_MENU = {
  headerHeight: 56,
  contentPadding: 20,
  sectionGap: 24,
  titleGap: 8,
  rowHeight: 56,
  rowPaddingVertical: 10,
  rowPaddingHorizontal: 4,
  toolTarget: 48,
  iconSize: 20,
  quickIconBox: 28,
  avatarSize: 48,
  columnGap: 12,
  valueMaxWidth: 108,
  radius: 8,
} as const;

export function isMoreMenuStacked(width: number, fontScale: number) {
  return width < 360 || fontScale >= 1.3;
}

export function getMoreMenuColors(theme: AppTheme, season: SeasonKey) {
  return {
    ...theme.colors,
    accent: SEASON_CTA[season].primary,
    accentSurface: SEASON_CTA[season].subtle,
    destructive: resolveCtaPalette({
      role: 'destructiveEntry',
      season,
      colorScheme: theme.mode,
      colors: theme.colors,
    }).text,
  };
}

import type { SeasonKey } from '../../../theme/seasonal/season';
import { getSeasonalWeatherVisualTheme } from '../../../theme/seasonal/weather';
import { buildPetThemePalette } from '../../../services/pets/themePalette';
import { lightColors } from '../../../app/theme/tokens/colors';

// Reuse the approved weather/pre-walk accent, not the seasonal CTA palette.
export function walkCopyAccent(season: SeasonKey, dark = false): string {
  const accent = getSeasonalWeatherVisualTheme(season)?.card.accent;
  if (!accent)
    return dark ? lightColors.surfaceElevated : lightColors.textPrimary;
  const palette = buildPetThemePalette(accent);
  return dark ? palette.glow : palette.deep;
}

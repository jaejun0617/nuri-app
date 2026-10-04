import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSeasonalThemeKey, type SeasonKey } from '../../theme/seasonal/season';

export const SEASON_OVERRIDE_STORAGE_KEY = 'nuri.qa.season-override.v1';

export function parseSeasonOverride(value: unknown): SeasonKey | null {
  return value === 'autumn' || value === 'winter' || value === 'spring' || value === 'summer'
    ? value
    : null;
}

export function resolveEffectiveSeason(override: SeasonKey | null, date = new Date()): SeasonKey {
  return override ?? getSeasonalThemeKey(date);
}

export async function loadSeasonOverride(): Promise<SeasonKey | null> {
  return parseSeasonOverride(await AsyncStorage.getItem(SEASON_OVERRIDE_STORAGE_KEY));
}

export async function saveSeasonOverride(season: SeasonKey | null): Promise<void> {
  if (season === null) {
    await AsyncStorage.removeItem(SEASON_OVERRIDE_STORAGE_KEY);
  } else {
    await AsyncStorage.setItem(SEASON_OVERRIDE_STORAGE_KEY, season);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isAppFontMode,
  LEGACY_APP_FONT_MODE,
  type AppFontMode,
} from '../../app/typography/appFontMode';

export const APP_FONT_PREFERENCE_STORAGE_KEY = 'nuri.appFontMode.v1';

export type LoadedAppFontPreference = {
  mode: AppFontMode;
  hasStoredPreference: boolean;
};

export function parseAppFontPreference(
  value: unknown,
): LoadedAppFontPreference {
  if (isAppFontMode(value)) {
    return { mode: value, hasStoredPreference: true };
  }

  return {
    mode: LEGACY_APP_FONT_MODE,
    hasStoredPreference: false,
  };
}

export async function loadAppFontPreference(): Promise<LoadedAppFontPreference> {
  const storedValue = await AsyncStorage.getItem(
    APP_FONT_PREFERENCE_STORAGE_KEY,
  );
  return parseAppFontPreference(storedValue);
}

export async function saveAppFontPreference(mode: AppFontMode): Promise<void> {
  await AsyncStorage.setItem(APP_FONT_PREFERENCE_STORAGE_KEY, mode);
}

export function shouldShowFirstPetFontSelector(input: {
  hydrated: boolean;
  hasStoredPreference: boolean;
  isFirstPetOnboardingEntry: boolean;
}): boolean {
  return (
    input.hydrated &&
    !input.hasStoredPreference &&
    input.isFirstPetOnboardingEntry
  );
}

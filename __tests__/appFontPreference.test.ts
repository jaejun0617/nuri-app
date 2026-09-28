import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  APP_FONT_PREFERENCE_STORAGE_KEY,
  loadAppFontPreference,
  parseAppFontPreference,
  saveAppFontPreference,
  shouldShowFirstPetFontSelector,
} from '../src/services/local/appFontPreference';
import { resolveAppFontMode } from '../src/app/typography/appFontMode';

describe('app font preference persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['jisu', 'pretendard'] as const)(
    'persists and reloads %s mode',
    async mode => {
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(mode);

      await saveAppFontPreference(mode);
      await expect(loadAppFontPreference()).resolves.toEqual({
        mode,
        hasStoredPreference: true,
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        APP_FONT_PREFERENCE_STORAGE_KEY,
        mode,
      );
    },
  );

  it.each([null, '', 'broken', '{"mode":"jisu"}'])(
    'uses the legacy Pretendard fallback for %p',
    value => {
      expect(parseAppFontPreference(value)).toEqual({
        mode: 'pretendard',
        hasStoredPreference: false,
      });
    },
  );
});

describe('first-pet font selector eligibility', () => {
  it('shows only after hydration for an eligible first onboarding entry', () => {
    expect(
      shouldShowFirstPetFontSelector({
        hydrated: true,
        hasStoredPreference: false,
        isFirstPetOnboardingEntry: true,
      }),
    ).toBe(true);
  });

  it.each([
    {
      hydrated: false,
      hasStoredPreference: false,
      isFirstPetOnboardingEntry: true,
    },
    {
      hydrated: true,
      hasStoredPreference: true,
      isFirstPetOnboardingEntry: true,
    },
    {
      hydrated: true,
      hasStoredPreference: false,
      isFirstPetOnboardingEntry: false,
    },
  ])('does not show for non-eligible state %#', input => {
    expect(shouldShowFirstPetFontSelector(input)).toBe(false);
  });
});

describe('font preference exclusion resolver', () => {
  it('uses the selected mode in ordinary NURI UI', () => {
    expect(resolveAppFontMode({ mode: 'jisu', scope: 'app-preference' })).toBe(
      'jisu',
    );
  });

  it('returns no override inside Weather and Community fixed boundaries', () => {
    expect(resolveAppFontMode({ mode: 'jisu', scope: 'fixed' })).toBeNull();
    expect(
      resolveAppFontMode({ mode: 'pretendard', scope: 'fixed' }),
    ).toBeNull();
  });

  it('allows option previews to explicitly render either family', () => {
    expect(
      resolveAppFontMode({
        mode: 'pretendard',
        scope: 'fixed',
        override: 'jisu',
      }),
    ).toBe('jisu');
  });
});

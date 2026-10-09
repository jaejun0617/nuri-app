import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SeasonPreferenceProvider, useSeasonPreference } from '../src/app/providers/SeasonPreferenceProvider';
import { loadSeasonOverride, parseSeasonOverride, resolveEffectiveSeason, saveSeasonOverride, SEASON_OVERRIDE_STORAGE_KEY } from '../src/services/local/seasonOverride';
import type { SeasonKey } from '../src/theme/seasonal/season';
import { getSeasonalOnboardingVisual } from '../src/theme/seasonal/onboarding';
import { getSeasonalProfileEditVisual } from '../src/theme/seasonal/profileEdit';
import { ASSETS } from '../src/assets';

jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>();
  return { __esModule: true, default: {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    clear: jest.fn(async () => { values.clear(); }),
  } };
});

const seasons: SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];

describe('device-local global seasonal preference', () => {
  beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });
  afterEach(() => jest.restoreAllMocks());

  it('validates storage and keeps KST automatic resolution when absent', async () => {
    expect(parseSeasonOverride('invalid')).toBeNull();
    expect(parseSeasonOverride({ season: 'winter' })).toBeNull();
    expect(resolveEffectiveSeason(null, new Date('2026-02-28T15:00:00Z'))).toBe('spring');
    expect(resolveEffectiveSeason('winter', new Date('2026-07-01T00:00:00Z'))).toBe('winter');
    for (const season of seasons) {
      await saveSeasonOverride(season);
      expect(await loadSeasonOverride()).toBe(season);
    }
    await saveSeasonOverride(null);
    expect(await AsyncStorage.getItem(SEASON_OVERRIDE_STORAGE_KEY)).toBeNull();
  });

  it('does not mount a seasonal screen before hydration completes', async () => {
    let resolve!: (season: string) => void;
    jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise(value => { resolve = value; }));
    function Probe() { return <View testID={useSeasonPreference().season} />; }
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<SeasonPreferenceProvider><Probe /></SeasonPreferenceProvider>); });
    expect(renderer.toJSON()).toBeNull();
    await act(async () => { resolve('winter'); });
    expect(renderer.root.findByProps({ testID: 'winter' })).toBeDefined();
    await act(async () => renderer.unmount());
  });

  it.each(seasons)('shares %s through navigation, logout-like remounts and cold restart', async season => {
    let selection!: ReturnType<typeof useSeasonPreference>;
    function Probe({ route }: { route: string }) {
      selection = useSeasonPreference();
      return <View testID={`${route}:${selection.season}`} />;
    }
    const tree = (route: string) => <SeasonPreferenceProvider><Probe key={route} route={route} /></SeasonPreferenceProvider>;
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(tree('Home')); });
    await act(async () => { await selection.setOverride(season); });
    for (const route of ['PetMore', 'PetProfileEdit', 'PetCreate', 'SignIn', 'Home']) {
      await act(async () => renderer.update(tree(route)));
      expect(renderer.root.findByProps({ testID: `${route}:${season}` })).toBeDefined();
    }
    await act(async () => renderer.unmount());
    await act(async () => { renderer = TestRenderer.create(tree('Splash')); });
    expect(renderer.root.findByProps({ testID: `Splash:${season}` })).toBeDefined();
    await act(async () => renderer.unmount());
  });

  it('serializes rapid switches without stale persistent selection', async () => {
    let selection!: ReturnType<typeof useSeasonPreference>;
    function Probe() { selection = useSeasonPreference(); return <View testID={selection.season} />; }
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<SeasonPreferenceProvider><Probe /></SeasonPreferenceProvider>); });
    await act(async () => { await Promise.all(seasons.map(season => selection.setOverride(season))); });
    expect(selection.season).toBe('summer');
    expect(await loadSeasonOverride()).toBe('summer');
    await act(async () => renderer.unmount());
  });

  it('keeps approved autumn onboarding and supplies distinct other seasons', () => {
    expect(getSeasonalOnboardingVisual('autumn').nicknameBackground).toBe(ASSETS.nicknameSetupBackground);
    expect(getSeasonalOnboardingVisual('autumn').loadingBackground).toBe(ASSETS.postRegistrationLoadingBackground);
    expect(new Set(seasons.map(season => getSeasonalOnboardingVisual(season).nicknameBackground)).size).toBe(4);
    for (const season of seasons) {
      expect(getSeasonalOnboardingVisual(season).palette).toEqual(getSeasonalProfileEditVisual(season).palette);
    }
  });
});

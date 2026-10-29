import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import LinearGradient from 'react-native-linear-gradient';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { PRODUCT_CANVAS_COLOR } from '../src/app/theme/tokens/colors';
import { SeasonalFormBackground } from '../src/components/common/SeasonalFormSurface';
import { LavenderScreenBackground } from '../src/components/common/LavenderScreenBackground';
import { LAVENDER_CANVAS } from '../src/theme/lavenderCanvas';
import { HOME_SEASONAL_BACKGROUND_GRADIENTS } from '../src/theme/home/seasonalAmbient';
import { getHomeHeroColors, HOME_HERO_COLORS } from '../src/theme/home/heroLayout';
import type { SeasonKey } from '../src/theme/seasonal/season';

let mockSeason: SeasonKey = 'autumn';
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({ useEffectiveSeason: () => mockSeason }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
const seasons: SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const approved: Record<SeasonKey, string[]> = {
  autumn: ['#FEF2E9', '#FEF6EF', '#FEF2E8'], winter: ['#EBF5FD', '#F1F8FE', '#EAF4FD'],
  spring: ['#FDEFF3', '#FDF3F6', '#FDEFF3'], summer: ['#EAFBFD', '#F0FBFD', '#E9FAFC'],
};
const read = (file: string) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');

describe('PO Home-only sky canvas boundary', () => {
  it.each(seasons)('%s retains its seasonal contract without recoloring Home sky or the application theme', season => {
    expect(HOME_SEASONAL_BACKGROUND_GRADIENTS[season]).toEqual(approved[season]);
    expect(getHomeHeroColors(season).surface).toBe('#EEF5FC');
    expect(getHomeHeroColors(season).statusBar).toBe('#EEF5FC');
    expect(getHomeHeroColors(season)).toBe(getHomeHeroColors(season));
    expect(getHomeHeroColors()).toBe(HOME_HERO_COLORS);
    expect(HOME_HERO_COLORS).toMatchObject({ surface: '#F8F7FD', statusBar: '#FFFFFF' });
    expect(PRODUCT_CANVAS_COLOR).toBe('#F1F5F8');
    expect(createTheme('light').colors).toMatchObject({ background: '#F1F5F8', surface: '#F6F7FB', surfaceElevated: '#FFFFFF' });
    expect(createTheme('dark').colors.background).toBe('#0B1F3A');
  });

  it.each(seasons)('%s keeps shared form and redesigned page palettes unchanged', async season => {
    mockSeason = season;
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><SeasonalFormBackground uniform /></ThemeProvider>); });
    expect(tree.root.findAllByType(LinearGradient).map(node => node.props.colors)).toEqual([['#F1F5F8', '#F1F5F8']]);
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    await act(async () => tree.unmount());
    await act(async () => { tree = Renderer.create(<LavenderScreenBackground statusBarInset={24} />); });
    expect(tree.root.findAllByType(LinearGradient)[0].props.colors).toEqual(['#F8F7FD', '#ECE7F5', '#F4EEF7']);
    expect(LAVENDER_CANVAS.statusBar).toBe('#FFFFFF');
    await act(async () => tree.unmount());
  });

  it('does not subscribe global providers, layout or theme to the Home palette', () => {
    for (const file of ['app/providers/AppProviders.tsx', 'app/theme/theme.ts', 'app/theme/tokens/colors.ts', 'components/layout/Screen.tsx', 'navigation/RootNavigator.tsx']) {
      expect(read(file)).not.toMatch(/HOME_SEASONAL_BACKGROUND_GRADIENTS|SeasonalScreenBackground|pageCanvas/);
    }
    const home = read('screens/Main/components/LoggedInHome/LoggedInHome.tsx');
    expect(home).toContain('getHomeHeroColors(ambientSeason)');
    expect(home).not.toContain('LavenderScreenBackground');
    expect(home).toContain('backgroundMode="homePalette"');
  });
});

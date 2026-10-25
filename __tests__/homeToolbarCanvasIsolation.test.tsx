import React from 'react';
import { StyleSheet, View } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import AppNavigationToolbar, { type ActiveTabKey } from '../src/components/navigation/AppNavigationToolbar';
import type { SeasonKey } from '../src/theme/seasonal/season';

let mockSeason: SeasonKey = 'autumn';
let mockLoggedIn = true;
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({ useEffectiveSeason: () => mockSeason }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) => selector({ isLoggedIn: mockLoggedIn }) }));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: jest.fn() }));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriIcon', () => 'NuriIcon');
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const seasons: SeasonKey[] = ['autumn', 'winter', 'spring', 'summer'];
const tabs: ActiveTabKey[] = ['home', 'timeline', 'community', 'guestbook', 'more'];
describe('White toolbar paint independently of season', () => {
  it.each(seasons.flatMap(season => tabs.map(tab => ({ season, tab }))))('$season keeps the $tab toolbar white', async ({ season, tab }) => {
    mockSeason = season;
    mockLoggedIn = true;
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><AppNavigationToolbar activeKey={tab} homeHero={tab === 'home'} /></ThemeProvider>); });
    const views = tree.root.findAllByType(View);
    const background = '#FFFFFF';
    expect(StyleSheet.flatten(views[0].props.style).backgroundColor).toBe(background);
    expect(StyleSheet.flatten(views[1].props.style).backgroundColor).toBe(background);
    for(const view of views.slice(0,2))expect(StyleSheet.flatten(view.props.style)).toMatchObject({borderTopLeftRadius:24,borderTopRightRadius:24});
    await act(async () => tree.unmount());
  });
  it('also keeps guest navigation white', async () => {
    mockLoggedIn = false;
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><AppNavigationToolbar activeKey="home" homeHero /></ThemeProvider>); });
    expect(StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style).backgroundColor).toBe('#FFFFFF');
    await act(async () => tree.unmount());
  });
});

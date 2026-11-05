import React from 'react';
import { Image, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import WelcomeTransitionScreen from '../src/screens/Auth/WelcomeTransitionScreen';
import PostRegistrationLoadingReview from '../src/screens/Auth/PostRegistrationLoadingReview';
import { getSeasonalOnboardingVisual } from '../src/theme/seasonal/onboarding';
import type { SeasonKey } from '../src/theme/seasonal/season';

let mockSeason: SeasonKey = 'autumn';
const mockReset = jest.fn();
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({ useEffectiveSeason: () => mockSeason }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
  useRoute: () => ({ params: { petName: 'QA' } }),
}));

beforeEach(() => { jest.useFakeTimers(); mockReset.mockClear(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it.each([['보리', '보리를'], ['별', '별을'], ['사랑', '사랑을'], ['사랑스러운우리집작은친구', '사랑스러운우리집작은친구를']])('shows only the personalized title for %s at the original body size', async (petName, subject) => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><WelcomeTransitionScreen holdForDesignReview petName={petName} /></ThemeProvider>); });
  const title = tree.root.findAll(node => node.type === Text && node.props.testID === 'post-registration-loading-title')[0];
  expect(title.props.children).toBe(`${subject} 위한 첫 화면을 만들고 있어요`);
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({ fontSize: 15, lineHeight: 22, color: '#F9E4D3' });
  expect(title.props.numberOfLines).toBe(1);
  expect(title.props.adjustsFontSizeToFit).toBe(true);
  expect(StyleSheet.flatten(title.props.style).width).toBe('100%');
  expect(tree.root.findAll(node => node.type === Text && node.props.children === '누리')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).not.toContain('누리의 공간을 준비하고 있어요');
  expect(JSON.stringify(tree.toJSON())).not.toContain('N U R I');
  await act(async () => tree.unmount());
});

it('centers the symbol, full-width copy and loading group without horizontal padding', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><WelcomeTransitionScreen holdForDesignReview /></ThemeProvider>); });
  const content = tree.root.findAllByType(View).find(node => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.flex === 1 && style?.justifyContent === 'center' && style?.alignItems === 'center';
  });
  expect(content).toBeDefined();
  const style = StyleSheet.flatten(content?.props.style);
  expect(style?.paddingHorizontal ?? 0).toBe(0);
  expect(style?.paddingTop ?? 0).toBe(0);
  await act(async () => tree.unmount());
});

it.each<SeasonKey>(['spring', 'summer', 'autumn', 'winter'])('restores the approved %s loading image over the dark fallback without changing transition timing', async season => {
  mockSeason = season;
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><WelcomeTransitionScreen /></ThemeProvider>); });
  const root = tree.root.findAllByType(View)[0];
  expect(StyleSheet.flatten(root.props.style).backgroundColor).toBe('#090A21');
  const background = tree.root.findAllByType(Image).find(node => node.props.source === getSeasonalOnboardingVisual(season).loadingBackground);
  expect(background).toBeDefined();
  expect(background?.props.pointerEvents).toBe('none');
  expect(tree.root.findByType(StatusBar).props.barStyle).toBe('light-content');
  await act(async () => { jest.advanceTimersByTime(7999); });
  expect(mockReset).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'AppTabs', params: { screen: 'HomeTab' } }] });
  await act(async () => tree.unmount());
});

it('holds only the explicitly requested development preview without navigating', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><PostRegistrationLoadingReview petName="QA" /></ThemeProvider>); });
  expect(tree.root.findAllByType(Modal)).toHaveLength(0);
  const button = tree.root.findAllByProps({ testID: 'post-registration-loading-review' }).find(node => typeof node.props.onPress === 'function');
  if (!button) throw new Error('Missing design review action');
  await act(async () => button.props.onPress());
  expect(tree.root.findAllByType(Modal)).toHaveLength(1);
  await act(async () => { jest.advanceTimersByTime(9000); });
  expect(mockReset).not.toHaveBeenCalled();
  await act(async () => tree.root.findByType(Modal).props.onRequestClose());
  expect(tree.root.findAllByType(Modal)).toHaveLength(0);
  await act(async () => tree.unmount());
});

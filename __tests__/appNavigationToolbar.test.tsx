import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import AppText from '../src/app/ui/AppText';
import AppNavigationToolbar from '../src/components/navigation/AppNavigationToolbar';

const mockNavigate = jest.fn();
const mockOpenMore = jest.fn();
beforeEach(() => jest.clearAllMocks());
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: true }),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: { pets: never[]; selectedPetId: null }) => unknown) =>
    selector({ pets: [], selectedPetId: null }),
}));
jest.mock('../src/store/uiStore', () => ({ openMoreDrawer: () => mockOpenMore() }));

it('bounds long tab labels to one fitted line without changing the routes', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <AppNavigationToolbar activeKey="home" />
      </ThemeProvider>,
    );
  });
  const labels = renderer.root.findAllByType(AppText);
  expect(labels.map(node => node.props.children)).toEqual([
    '홈', '타임라인', '커뮤니티', '편지함', '전체메뉴',
  ]);
  for (const label of labels) {
    expect(label.props).toMatchObject({
      numberOfLines: 1, adjustsFontSizeToFit: true,
      minimumFontScale: 0.75, maxFontSizeMultiplier: 1.6,
    });
  }
  const tabs = renderer.root.findAll(node =>
    node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function',
  ).filter((node, index, nodes) =>
    nodes.findIndex(other => other.props.onPress === node.props.onPress) === index,
  );
  tabs[1].props.onPress();
  expect(mockNavigate).toHaveBeenCalledWith('AppTabs', {
    screen: 'TimelineTab', params: {
      screen: 'TimelineMain', params: { mainCategory: 'all', entrySource: 'home' },
    },
  });
  tabs[4].props.onPress();
  expect(mockOpenMore).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

it('reselects only focused Home; detail/drawer Home navigation remains intact', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  const reselect = jest.fn();
  const before = jest.fn();
  const mount = (active: 'home' | 'more', callback?: () => void) => (
    <ThemeProvider theme={createTheme('light')}>
      <AppNavigationToolbar activeKey={active} onPressActiveHome={callback} onBeforeNavigate={before} />
    </ThemeProvider>
  );
  await act(async () => { renderer = TestRenderer.create(mount('home', reselect)); });
  const pressHome = () => renderer.root.findAll(node => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function')[0].props.onPress();
  await act(async () => pressHome());
  expect(reselect).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(before).not.toHaveBeenCalled();
  await act(async () => renderer.update(mount('more', reselect)));
  await act(async () => pressHome());
  expect(mockNavigate).toHaveBeenCalledWith('AppTabs', { screen: 'HomeTab' });
  expect(reselect).toHaveBeenCalledTimes(1);
  expect(before).toHaveBeenCalledTimes(1);
  await act(async () => renderer.update(mount('home')));
  await act(async () => pressHome());
  expect(mockNavigate).toHaveBeenCalledTimes(2);
  await act(async () => renderer.unmount());
});

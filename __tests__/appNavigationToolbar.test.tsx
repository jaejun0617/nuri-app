import React from 'react';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import AppText from '../src/app/ui/AppText';
import AppNavigationToolbar from '../src/components/navigation/AppNavigationToolbar';
import { HOME_HERO_COLORS, HOME_HERO_ACCENT, HOME_HERO_TOOLBAR_RADIUS } from '../src/theme/home/heroLayout';

const mockNavigate = jest.fn();
const mockOpenMore = jest.fn();
const mockCloseMore = jest.fn();
let mockLoggedIn = true;
beforeEach(() => { jest.resetAllMocks(); mockLoggedIn = true; });
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 18, left: 0 }),
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: mockLoggedIn }),
}));
jest.mock('../src/store/petStore', () => ({
  usePetStore: (selector: (state: { pets: never[]; selectedPetId: null }) => unknown) =>
    selector({ pets: [], selectedPetId: null }),
}));
jest.mock('../src/store/uiStore', () => ({
  openMoreDrawer: () => mockOpenMore(),
  closeMoreDrawer: () => mockCloseMore(),
}));

function toolbarTab(renderer: TestRenderer.ReactTestRenderer, label: string) {
  const tab = renderer.root.findAll(node =>
    node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function',
  ).find(node => node.findAllByType(AppText).some(text => text.props.children === label));
  if (!tab) throw new Error(`Expected toolbar tab: ${label}`);
  return tab;
}

it.each([
  ['홈', 'HomeTab'],
  ['타임라인', 'TimelineTab'],
  ['커뮤니티', 'CommunityTab'],
  ['편지함', 'GuestbookTab'],
])('dismisses a retained return menu when a detail toolbar explicitly selects %s', async (label, screen) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  const order: string[] = [];
  const before = jest.fn(() => order.push('before'));
  mockCloseMore.mockImplementationOnce(() => order.push('close-menu'));
  mockNavigate.mockImplementationOnce(() => order.push('navigate'));
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <AppNavigationToolbar activeKey="more" onBeforeNavigate={before} />
      </ThemeProvider>,
    );
  });
  expect(mockCloseMore).not.toHaveBeenCalled();
  const tab = toolbarTab(renderer, label);
  await act(async () => tab.props.onPress());
  expect(order).toEqual(['before', 'close-menu', 'navigate']);
  expect(mockCloseMore).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('AppTabs', screen === 'TimelineTab'
    ? { screen, params: { screen: 'TimelineMain', params: { mainCategory: 'all', entrySource: 'more' } } }
    : { screen });
  await act(async () => renderer.unmount());
});

it('leaves drawer fade ordering to a supplied tab navigator and does not close More on re-entry', async () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  const override = jest.fn();
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <AppNavigationToolbar activeKey="more" onNavigateTab={override} />
      </ThemeProvider>,
    );
  });
  await act(async () => toolbarTab(renderer, '홈').props.onPress());
  expect(override).toHaveBeenCalledWith('home');
  expect(mockCloseMore).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
  await act(async () => toolbarTab(renderer, '전체메뉴').props.onPress());
  expect(mockOpenMore).toHaveBeenCalledTimes(1);
  expect(mockCloseMore).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

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

it.each([1, 1.3, 1.6])('preserves toolbar and content-inset height across Home/Timeline at font scale %s', async fontScale => {
  let renderer!: TestRenderer.ReactTestRenderer;
  const mount = (home: boolean) => <ThemeProvider theme={createTheme('light')}><AppNavigationToolbar activeKey={home ? 'home' : 'timeline'} homeHero={home} /></ThemeProvider>;
  const geometry = () => {
    const wrap = renderer.root.findAllByType(View)[0];
    const bar = wrap.findAllByType(View)[1];
    const wrapStyle = StyleSheet.flatten(wrap.props.style);
    const barStyle = StyleSheet.flatten(bar.props.style);
    const tab = renderer.root.findAll(node => node.props.accessibilityRole === 'tab' && node.props.style)[0];
    const item = StyleSheet.flatten(tab.props.style);
    const text = renderer.root.findAllByType(AppText)[0];
    // RN applies the same font multiplier to this shared 13/18 preset. The
    // native bar is auto-height: compare its actual layout inputs and budget.
    const itemHeight = Math.max(item.minHeight, 18 + item.gap + 18 * fontScale + item.paddingVertical * 2);
    return {
      minHeight: barStyle.minHeight, paddingTop: barStyle.paddingTop,
      paddingBottom: barStyle.paddingBottom, border: barStyle.borderTopWidth,
      item, maxFont: text.props.maxFontSizeMultiplier,
      total: wrapStyle.paddingBottom + barStyle.borderTopWidth + barStyle.paddingTop + barStyle.paddingBottom + Math.max(barStyle.minHeight, itemHeight),
    };
  };
  await act(async () => { renderer = TestRenderer.create(mount(true)); });
  expect(StyleSheet.flatten(renderer.root.findAllByType(View)[0].props.style)).toMatchObject({
    borderTopLeftRadius: HOME_HERO_TOOLBAR_RADIUS, borderTopRightRadius: HOME_HERO_TOOLBAR_RADIUS,
  });
  const home = geometry();
  await act(async () => renderer.update(mount(false)));
  expect(geometry()).toEqual(home);
  await act(async () => renderer.update(mount(true)));
  expect(geometry()).toEqual(home);
  await act(async () => renderer.unmount());
});

it('does not apply the signed-in Hero surface to guest Home', async () => {
  mockLoggedIn = false;
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><AppNavigationToolbar activeKey="home" homeHero /></ThemeProvider>); });
  const wrap = renderer.root.findAllByType(View)[0];
  expect(StyleSheet.flatten(wrap.props.style).borderTopLeftRadius).toBe(24);
  await act(async () => renderer.unmount());
});

it.each(['home', 'timeline', 'community', 'guestbook', 'more'] as const)('uses the same purple navigation hierarchy on %s', async activeKey => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<ThemeProvider theme={createTheme('light')}><AppNavigationToolbar activeKey={activeKey} homeHero={activeKey === 'home'} /></ThemeProvider>); });
  const icons = renderer.root.findAll(node => node.props.size === 18 && node.props.colorMode === 'theme');
  const activeIndex = ['home', 'timeline', 'community', 'guestbook', 'more'].indexOf(activeKey);
  expect(icons).toHaveLength(5);
  expect(icons.map(icon => icon.props.color)).toEqual([0,1,2,3,4].map(index => index === activeIndex ? HOME_HERO_ACCENT.primary : HOME_HERO_COLORS.muted));
  await act(async () => renderer.unmount());
});

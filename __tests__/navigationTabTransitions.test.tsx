import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {
  BottomTabView,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import AppTabsNavigator, {
  type AppTabParamList,
} from '../src/navigation/AppTabsNavigator';

const mockMounts = { home: 0, timeline: 0 };
const mockOpenMore = jest.fn();
const mockCloseMore = jest.fn();
const mockHomeReselect = jest.fn();
const mockTimelineRead = jest.fn();
jest.unmock('@react-navigation/native');
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-screens', () => {
  const runtime: typeof React = jest.requireActual('react');
  const { View }: typeof import('react-native') =
    jest.requireActual('react-native');
  return {
    Screen: View,
    ScreenContainer: View,
    screensEnabled: () => false,
    enableScreens: jest.fn(),
    ScreenStack: runtime.Fragment,
  };
});
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriIcon', () => 'NuriIcon');
jest.mock('../src/components/MoreDrawer/MoreDrawer', () => 'MoreDrawer');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({
  FixedTypographyBoundary: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (s: { isLoggedIn: boolean }) => unknown) =>
    selector({ isLoggedIn: true }),
}));
jest.mock('../src/store/uiStore', () => ({
  useUiStore: Object.assign((
    selector: (s: {
      moreDrawerOpen: boolean;
      openMoreDrawer: () => void;
      closeMoreDrawer: () => void;
    }) => unknown,
  ) =>
    selector({
      moreDrawerOpen: false,
      openMoreDrawer: mockOpenMore,
      closeMoreDrawer: mockCloseMore,
    }), { getState: () => ({ moreDrawerOpen: false, closeMoreDrawer: mockCloseMore }) }),
  openMoreDrawer: () => mockOpenMore(),
}));
jest.mock('../src/screens/Main/MainScreen', () => {
  const runtime: typeof React = jest.requireActual('react');
  const native: typeof import('react-native') =
    jest.requireActual('react-native');
  return function Home() {
    const { useNavigation }: typeof import('@react-navigation/native') =
      jest.requireActual('@react-navigation/native');
    const navigation = useNavigation<{
      addListener: (event: 'tabPress', callback: () => void) => () => void;
    }>();
    const [offset, setOffset] = runtime.useState(0);
    runtime.useEffect(() => {
      mockMounts.home++;
    }, []);
    runtime.useEffect(
      () => navigation.addListener('tabPress', mockHomeReselect),
      [navigation],
    );
    return runtime.createElement(
      native.Pressable,
      { testID: 'stateful-home', onPress: () => setOffset(52) },
      runtime.createElement(native.Text, null, String(offset)),
    );
  };
});
jest.mock('../src/navigation/TimelineStackNavigator', () => {
  const runtime: typeof React = jest.requireActual('react');
  const native: typeof import('react-native') =
    jest.requireActual('react-native');
  return function Timeline() {
    const [filter, setFilter] = runtime.useState('all');
    runtime.useEffect(() => {
      mockMounts.timeline++;
      mockTimelineRead();
    }, []);
    return runtime.createElement(
      native.Pressable,
      { testID: 'stateful-timeline', onPress: () => setFilter('walk') },
      runtime.createElement(native.Text, null, filter),
    );
  };
});
jest.mock(
  '../src/navigation/CommunityTabStackNavigator',
  () => 'CommunityStack',
);
jest.mock('../src/screens/Guestbook/GuestbookScreen', () => 'Guestbook');

describe('actual root tab navigator and fixed toolbar', () => {
  let tree: Renderer.ReactTestRenderer;
  const ref = createNavigationContainerRef<AppTabParamList>();
  beforeEach(() => {
    jest.clearAllMocks();
    mockMounts.home = mockMounts.timeline = 0;
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });
  const mount = async () =>
    act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <NavigationContainer ref={ref}>
            <AppTabsNavigator />
          </NavigationContainer>
        </ThemeProvider>,
      );
    });
  const descriptors = () =>
    tree.root.findByType(BottomTabView).props
      .descriptors as BottomTabBarProps['descriptors'];
  const pressTab = async (label: string) =>
    act(async () => {
      const tab = tree.root
        .findAll(
          n =>
            n.props.accessibilityRole === 'tab' &&
            typeof n.props.onPress === 'function',
        )
        .find(
          n =>
            n.findAll(
              child =>
                (child.type as unknown) === 'AppText' &&
                child.props.children === label,
            ).length > 0,
        );
      if (!tab) throw Error('Expected root tab was not rendered');
      tab.props.onPress();
    });
  test('all actual scenes use a 400ms opacity-only fade while the toolbar stays outside them', async () => {
    await mount();
    const view = tree.root.findByType(BottomTabView);
    for (const descriptor of Object.values(descriptors())) {
      expect(descriptor.options).toMatchObject({
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: 400 } },
      });
      expect(descriptor.options.freezeOnBlur).toBeUndefined();
      expect(descriptor.options.lazy).toBeUndefined();
    }
    const selected = () =>
      tree.root
        .findAll(
          n =>
            n.props.accessibilityRole === 'tab' &&
            n.props.accessibilityState.selected,
        )
        .filter(n => n.type === Pressable || typeof n.type === 'string');
    expect(selected().length).toBeGreaterThan(0);
    expect(view.props.detachInactiveScreens).toBeUndefined();
  });
  test('root tab changes preserve mounted local state and existing Timeline params', async () => {
    await mount();
    await act(async () =>
      tree.root.findAllByProps({ testID: 'stateful-home' })[0].props.onPress(),
    );
    await pressTab('타임라인');
    await act(async () => {
      tree.root
        .findAllByProps({ testID: 'stateful-timeline' })[0]
        .props.onPress();
      ref.setParams({
        screen: 'TimelineMain',
        params: { mainCategory: 'walk', ymFilter: '2026-10' },
      });
    });
    const before = ref
      .getRootState()
      .routes.find(r => r.name === 'TimelineTab')!;
    await pressTab('홈');
    await pressTab('타임라인');
    const after = ref
      .getRootState()
      .routes.find(r => r.name === 'TimelineTab')!;
    expect(after.key).toBe(before.key);
    expect(after.params).toEqual(before.params);
    expect(mockMounts).toEqual({ home: 1, timeline: 1 });
    expect(mockTimelineRead).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({ testID: 'stateful-home' })[0].findByType(Text)
        .props.children,
    ).toBe('52');
    expect(
      tree.root
        .findAllByProps({ testID: 'stateful-timeline' })[0]
        .findByType(Text).props.children,
    ).toBe('walk');
  });
  test('Home re-tap emits the existing tabPress without remounting the screen', async () => {
    await mount();
    await pressTab('홈');
    expect(mockHomeReselect).toHaveBeenCalledTimes(1);
    expect(mockMounts.home).toBe(1);
  });
  test('navigation starts while destination data remains unresolved', async () => {
    mockTimelineRead.mockReturnValue(new Promise<void>(() => {}));
    await mount();
    await pressTab('타임라인');
    expect(ref.getRootState().routes[ref.getRootState().index].name).toBe(
      'TimelineTab',
    );
    expect(mockTimelineRead).toHaveBeenCalledTimes(1);
  });
  test('More remains an overlay, not a blank tab, and rapid changes end on the requested tab', async () => {
    await mount();
    await pressTab('전체메뉴');
    expect(mockOpenMore).toHaveBeenCalledTimes(1);
    expect(ref.getRootState().routes[ref.getRootState().index].name).toBe(
      'HomeTab',
    );
    for (const label of ['타임라인', '커뮤니티', '편지함', '홈'])
      await pressTab(label);
    expect(ref.getRootState().routes[ref.getRootState().index].name).toBe(
      'HomeTab',
    );
    expect(ref.getRootState().routes).toHaveLength(5);
  });
  test('root toolbar is hidden above a nested detail and restored at the Timeline root', async () => {
    await mount();
    await act(async () =>
      ref.navigate('TimelineTab', {
        screen: 'RecordDetail',
        params: { petId: 'public-pet', memoryId: 'public-memory' },
      }),
    );
    expect(
      tree.root.findAll(n => n.props.accessibilityRole === 'tab'),
    ).toHaveLength(0);
    await act(async () =>
      ref.navigate('TimelineTab', { screen: 'TimelineMain' }),
    );
    expect(
      tree.root.findAll(n => n.props.accessibilityRole === 'tab').length,
    ).toBeGreaterThan(0);
  });
  test('reduce motion turns root scene animation off without changing lazy/state settings', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await mount();
    for (const descriptor of Object.values(descriptors())) {
      expect(descriptor.options.animation).toBe('none');
      expect(descriptor.options.lazy).toBeUndefined();
    }
  });
});

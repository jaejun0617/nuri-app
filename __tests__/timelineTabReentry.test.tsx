import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import {
  NavigationContainer, StackRouter, createNavigationContainerRef,
  createNavigatorFactory, useNavigationBuilder, type NavigatorScreenParams,
} from '@react-navigation/native';
import { ThemeProvider } from 'styled-components/native';
import AppTabsNavigator, { type AppTabParamList } from '../src/navigation/AppTabsNavigator';
import { createTheme } from '../src/app/theme/theme';

const mockMainMounts = jest.fn();
const mockCloseMore = jest.fn();
const mockUiState = {
  moreDrawerOpen: false,
  openMoreDrawer: () => { mockUiState.moreDrawerOpen = true; },
  closeMoreDrawer: () => { mockUiState.moreDrawerOpen = false; mockCloseMore(); },
};

function RootNavigator({ children }: React.PropsWithChildren) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, { children, initialRouteName: 'AppTabs' });
  return <NavigationContent>{state.routes.map(route =>
    <React.Fragment key={route.key}>{descriptors[route.key].render()}</React.Fragment>)}</NavigationContent>;
}
const Root = createNavigatorFactory(RootNavigator)();
jest.unmock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-screens', () => {
  const react = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return { Screen: View, ScreenContainer: View, ScreenStack: react.Fragment, screensEnabled: () => false, enableScreens: jest.fn() };
});
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('../src/components/icons/NuriIcon', () => 'NuriIcon');
jest.mock('../src/components/MoreDrawer/MoreDrawer', () => 'MoreDrawer');
jest.mock('../src/screens/Main/MainScreen', () => 'Home');
jest.mock('../src/navigation/CommunityTabStackNavigator', () => 'Community');
jest.mock('../src/screens/Guestbook/GuestbookScreen', () => 'Guestbook');
jest.mock('../src/app/providers/AppFontPreferenceProvider', () => ({ FixedTypographyBoundary: ({ children }: React.PropsWithChildren) => children }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: (selector: (state: { isLoggedIn: boolean }) => unknown) => selector({ isLoggedIn: true }) }));
jest.mock('../src/store/uiStore', () => ({
  useUiStore: Object.assign((selector: (state: typeof mockUiState) => unknown) => selector(mockUiState), {
    getState: () => mockUiState,
  }),
  openMoreDrawer: () => mockUiState.openMoreDrawer(),
}));
jest.mock('../src/navigation/TimelineStackNavigator', () => {
  const react = jest.requireActual('react') as typeof React;
  const native = jest.requireActual('react-native') as typeof import('react-native');
  const navigationRuntime = jest.requireActual('@react-navigation/native') as typeof import('@react-navigation/native');
  function Main() {
    const [local, setLocal] = react.useState('all:0');
    react.useEffect(() => { mockMainMounts(); }, []);
    return react.createElement(native.Pressable, { testID: 'timeline-local-state', onPress: () => setLocal('walk:620') },
      react.createElement(native.Text, null, local));
  }
  function Detail() { return react.createElement(native.Text, null, 'detail'); }
  function Monthly() { return react.createElement(native.Text, null, 'monthly'); }
  function Navigator({ children }: React.PropsWithChildren) {
    const { state, descriptors, NavigationContent } = navigationRuntime.useNavigationBuilder(navigationRuntime.StackRouter, { children, initialRouteName: 'TimelineMain' });
    return react.createElement(NavigationContent, null, state.routes.map(route =>
      react.createElement(native.View, { key: route.key }, descriptors[route.key].render())));
  }
  const Stack = navigationRuntime.createNavigatorFactory(Navigator)();
  return function Timeline() {
    return react.createElement(Stack.Navigator, null,
      react.createElement(Stack.Screen, { name: 'TimelineMain', component: Main }),
      react.createElement(Stack.Screen, { name: 'RecordDetail', component: Detail }),
      react.createElement(Stack.Screen, { name: 'MonthlyExpenses', component: Monthly }));
  };
});

describe('Home to Timeline tab re-entry uses the existing main route', () => {
  let tree: Renderer.ReactTestRenderer;
  const ref = createNavigationContainerRef<AppTabParamList>();
  beforeEach(() => {
    jest.clearAllMocks();
    mockUiState.moreDrawerOpen = false;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });
  async function mount() {
    await act(async () => { tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><NavigationContainer ref={ref}><AppTabsNavigator /></NavigationContainer></ThemeProvider>); });
  }
  async function tab(label: string) {
    await act(async () => {
      const hit = tree.root.findAll(node => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function')
        .find(node => node.findAll(child => (child.type as unknown) === 'AppText' && child.props.children === label).length > 0);
      if (!hit) throw Error('TAB_REQUIRED');
      hit.props.onPress();
    });
  }
  function timelineState() {
    return ref.getRootState().routes.find(route => route.name === 'TimelineTab')?.state;
  }

  it.each(['홈', '타임라인', '커뮤니티', '편지함'])(
    'closes a not-yet-mounted More when %s is tapped on the old root toolbar', async label => {
      await mount();
      await tab('전체메뉴');
      expect(mockUiState.moreDrawerOpen).toBe(true);
      await tab(label);
      expect(mockUiState.moreDrawerOpen).toBe(false);
      expect(mockCloseMore).toHaveBeenCalledTimes(1);
      expect(ref.getCurrentRoute()?.name).toBe(
        label === '홈' ? 'HomeTab' : label === '타임라인' ? 'TimelineMain' : label === '커뮤니티' ? 'CommunityTab' : 'GuestbookTab',
      );
    },
  );

  it('keeps only the latest rapid toolbar destination without remounting or clearing Timeline state', async () => {
    await mount();
    await tab('타임라인');
    await act(async () => tree.root.findAllByProps({ testID: 'timeline-local-state' })[0].props.onPress());
    const mainKey = timelineState()?.routes[0].key;
    for (const label of ['커뮤니티', '편지함', '홈', '타임라인', '편지함', '커뮤니티', '홈', '타임라인']) {
      await tab(label);
    }
    expect(ref.getCurrentRoute()?.name).toBe('TimelineMain');
    expect(ref.getCurrentRoute()?.key).toBe(mainKey);
    expect(mockMainMounts).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByProps({ testID: 'timeline-local-state' })[0].findByType(Text).props.children).toBe('walk:620');
  });

  it('preserves the existing Back-to-Home tab policy and retained Timeline state', async () => {
    await mount();
    await tab('타임라인');
    const mainKey = timelineState()?.routes[0].key;
    await tab('커뮤니티');
    await tab('편지함');
    await act(async () => ref.goBack());
    expect(ref.getCurrentRoute()?.name).toBe('HomeTab');
    await tab('타임라인');
    expect(ref.getCurrentRoute()?.key).toBe(mainKey);
    expect(mockMainMounts).toHaveBeenCalledTimes(1);
  });

  it('suppresses the underlay fade while More is visible, then restores 400ms without changing the active tab', async () => {
    await mount();
    await act(async () => ref.navigate('GuestbookTab'));
    const drawer = () => tree.root.find(node => (node.type as unknown) === 'MoreDrawer');
    const tabOptions = () => tree.root.find(node =>
      node.props.screenOptions?.tabBarHideOnKeyboard === true && typeof node.props.tabBar === 'function',
    ).props.screenOptions;
    expect(tabOptions()).toMatchObject({ animation: 'fade', transitionSpec: { config: { duration: 400 } } });
    await act(async () => drawer().props.onVisibilityChange(true));
    expect(tabOptions()).toMatchObject({ animation: 'fade', transitionSpec: { config: { duration: 0 } } });
    await act(async () => ref.navigate('HomeTab'));
    expect(ref.getCurrentRoute()?.name).toBe('HomeTab');
    expect(tabOptions()).toMatchObject({ animation: 'fade', transitionSpec: { config: { duration: 0 } } });
    await act(async () => drawer().props.onVisibilityChange(false));
    expect(tabOptions()).toMatchObject({ animation: 'fade', transitionSpec: { config: { duration: 400 } } });
    expect(ref.getCurrentRoute()?.name).toBe('HomeTab');
  });

  it('opens TimelineMain after Monthly was the first nested route, rather than restoring Monthly', async () => {
    await mount();
    await act(async () => ref.navigate('TimelineTab', { screen: 'MonthlyExpenses', params: { entrySource: 'more', monthKey: '2026-10' } }));
    expect(ref.getCurrentRoute()?.name).toBe('MonthlyExpenses');
    await act(async () => ref.navigate('HomeTab'));
    expect(timelineState()).toMatchObject({ key: expect.any(String) });
    await tab('타임라인');
    expect(ref.getCurrentRoute()?.name).toBe('TimelineMain');
    expect(timelineState()?.routes.map(route => route.name)).toEqual(['TimelineMain']);
    expect(mockMainMounts).toHaveBeenCalledTimes(1);
  });

  it('pops to the original TimelineMain key and preserves local filter, scroll and month params', async () => {
    await mount();
    await tab('타임라인');
    await act(async () => {
      tree.root.findAllByProps({ testID: 'timeline-local-state' })[0].props.onPress();
      ref.navigate('TimelineTab', { screen: 'TimelineMain', params: { mainCategory: 'walk', ymFilter: '2026-09' }, merge: true });
    });
    const mainBefore = timelineState()?.routes.find(route => route.name === 'TimelineMain');
    await act(async () => ref.navigate('TimelineTab', { screen: 'RecordDetail', params: { petId: 'synthetic-pet', memoryId: 'synthetic-memory' } }));
    await act(async () => ref.navigate('TimelineTab', { screen: 'MonthlyExpenses', params: { entrySource: 'more' } }));
    await act(async () => ref.navigate('HomeTab'));
    await tab('타임라인');
    const mainAfter = ref.getCurrentRoute();
    expect(mainAfter?.name).toBe('TimelineMain');
    expect(timelineState()?.routes.map(route => route.name)).toEqual(['TimelineMain']);
    expect(mainAfter?.key).toBe(mainBefore?.key);
    expect(mainAfter?.params).toMatchObject({ mainCategory: 'walk', ymFilter: '2026-09' });
    expect(tree.root.findAllByProps({ testID: 'timeline-local-state' })[0].findByType(Text).props.children).toBe('walk:620');
    expect(mockMainMounts).toHaveBeenCalledTimes(1);
  });

  it('keeps the initial main route when More opens Monthly under the production AppTabs parent', async () => {
    const root = createNavigationContainerRef<{ AppTabs: NavigatorScreenParams<AppTabParamList> }>();
    await act(async () => {
      tree = Renderer.create(<ThemeProvider theme={createTheme('light')}><NavigationContainer ref={root}>
        <Root.Navigator><Root.Screen name="AppTabs" component={AppTabsNavigator} /></Root.Navigator>
      </NavigationContainer></ThemeProvider>);
    });
    const nestedState = () => root.getRootState().routes[0].state?.routes.find(route => route.name === 'TimelineTab')?.state;
    await act(async () => root.navigate('AppTabs', { screen: 'TimelineTab', params: {
      screen: 'MonthlyExpenses', initial: false, params: { entrySource: 'more', monthKey: '2026-10' },
    } }));
    expect(root.getCurrentRoute()?.name).toBe('MonthlyExpenses');
    expect(nestedState()?.routes.map(route => route.name)).toEqual(['TimelineMain', 'MonthlyExpenses']);
    const main = nestedState()?.routes[0];
    await act(async () => root.navigate('AppTabs', { screen: 'HomeTab' }));
    await tab('타임라인');
    expect(root.getCurrentRoute()?.name).toBe('TimelineMain');
    expect(root.getCurrentRoute()?.key).toBe(main?.key);
    expect(nestedState()?.routes.map(route => route.name)).toEqual(['TimelineMain']);
    expect(mockMainMounts).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { CommonActions, StackRouter } from '@react-navigation/routers';
import { TAB_FADE_TIMING, tabTransitionOptions } from '../src/navigation/navigationTransitionPolicy';

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: 'NativeNavigator',
    Screen: 'NativeScreen',
    Group: 'NativeGroup',
  }),
}));
jest.mock('../src/navigation/AppTabsNavigator', () => 'AppTabs');
jest.mock('../src/navigation/CommunityStackHeader', () => 'CommunityHeader');
jest.mock('../src/services/securityQa/config', () => ({
  isSecurityQaEnabled: true,
}));

// Replace screen implementations, not navigator options, so config tests cannot fetch data.
const imports = parse(
  fs.readFileSync(
    path.join(process.cwd(), 'src/navigation/RootNavigator.tsx'),
    'utf8',
  ),
  { sourceType: 'module', plugins: ['typescript', 'jsx'] },
).program.body;
for (const node of imports) {
  if (
    node.type === 'ImportDeclaration' &&
    node.source.value.startsWith('../screens/')
  ) {
    jest.doMock(
      path.resolve(process.cwd(), 'src/navigation', node.source.value),
      () => ({ __esModule: true, default: () => null }),
    );
  }
}
for (const screen of [
  'TimelineScreen',
  'TimelineEntryGateScreen',
  'RecordDetailScreen',
  'RecordEditScreen',
  'MonthlyExpensesScreen',
]) {
  jest.doMock(
    path.resolve(process.cwd(), 'src/screens/Records', screen),
    () => ({ __esModule: true, default: () => null }),
  );
}
const RootNavigator: typeof import('../src/navigation/RootNavigator').default =
  require('../src/navigation/RootNavigator').default;
const TimelineNavigator: typeof import('../src/navigation/TimelineStackNavigator').default =
  require('../src/navigation/TimelineStackNavigator').default;

describe('actual native navigator transition configuration', () => {
  let tree: Renderer.ReactTestRenderer;
  beforeEach(() =>
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false),
  );
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
  });
  const mount = async (component: React.ReactElement) => {
    await act(async () => {
      tree = Renderer.create(component);
    });
  };
  const options = (name: string) => {
    const navigator = tree.root.find(
      n => (n.type as unknown) === 'NativeNavigator',
    );
    const screen = tree.root.find(
      n => (n.type as unknown) === 'NativeScreen' && n.props.name === name,
    );
    const defaults =
      typeof navigator.props.screenOptions === 'function'
        ? navigator.props.screenOptions({
            route: { name, key: `test-${name}` },
          })
        : navigator.props.screenOptions;
    return { ...defaults, ...screen.props.options };
  };
  test('root toolbar tabs share the 400ms fade configuration with More', () => {
    const result = tabTransitionOptions(false);
    expect(result.animation).toBe('fade');
    expect(result.transitionSpec).toEqual({ animation: 'timing', config: TAB_FADE_TIMING });
    expect(TAB_FADE_TIMING.duration).toBe(400);
  });
  test('root toolbar still respects reduced motion', () => {
    expect(tabTransitionOptions(true)).toEqual({ animation: 'none' });
  });
  test.each(['Splash', 'AppTabs', 'UserNotifications', 'RecordCreate'])(
    '%s retains dark system icons on the approved light surfaces',
    async name => {
      await mount(<RootNavigator />);
      expect(options(name).statusBarStyle).toBe('dark');
    },
  );
  test('More-covered tabs switch at zero duration without changing native scene mode', () => {
    expect(tabTransitionOptions(false, true)).toMatchObject({
      animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: 0 } },
    });
    expect(tabTransitionOptions(true, true)).toEqual({ animation: 'none' });
  });
  test.each([
    'PetManagement',
    'PetProfileEdit',
    'HealthTimeline',
    'ScheduleDetail',
    'GuideDetail',
    'RecordCreate',
    'CommunityDetail',
  ])(
    '%s uses native right-to-center push and its native reverse pop',
    async name => {
      await mount(<RootNavigator />);
      expect(options(name).animation).toBe('slide_from_right');
      expect(options(name).animationDuration).toBeUndefined();
    },
  );
  test.each([
    'Splash',
    'AppTabs',
    'SignIn',
    'OAuthCallback',
    'NicknameSetup',
    'WelcomeTransition',
    'PasswordResetRequest',
    'PasswordResetRecovery',
    'PasswordResetForm',
    'PetCreate',
    'SecurityValidation',
  ])(
    '%s preserves boot/auth/shared-onboarding/Walk-host options',
    async name => {
      await mount(<RootNavigator />);
      expect(options(name).animation).toBeUndefined();
      expect(options(name).presentation).toBeUndefined();
    },
  );
  test.each(['RecordDetail', 'RecordEdit', 'MonthlyExpenses'])(
    'nested Timeline %s uses the same native detail policy',
    async name => {
      await mount(<TimelineNavigator />);
      expect(options(name)).toMatchObject({
        animation: 'slide_from_right',
        headerShown: false,
      });
    },
  );
  test('Timeline entry gate remains animation-free and custom headers remain single-owned', async () => {
    await mount(<TimelineNavigator />);
    expect(options('TimelineEntryGate')).toMatchObject({
      animation: 'none',
      headerShown: false,
    });
    await act(async () => tree.update(<RootNavigator />));
    expect(options('PetManagement').headerShown).toBe(false);
    expect(options('CommunityDetail')).toMatchObject({
      headerShown: true,
      headerTitle: '커뮤니티',
    });
    expect(typeof options('CommunityDetail').header).toBe('function');
  });
  test('reduced motion changes only eligible transitions, never route hierarchy or auth', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await mount(<RootNavigator />);
    expect(options('PetManagement').animation).toBe('fade');
    expect(options('SignIn').animation).toBeUndefined();
  });
});

describe('installed StackRouter action serialization', () => {
  const router = StackRouter({ initialRouteName: 'AppTabs' });
  const config = {
    routeNames: ['AppTabs', 'PetManagement', 'PetProfileEdit'],
    routeParamList: {},
    routeGetIdList: {},
  };
  test('rapid same-detail navigation keeps one route and preserves params/order', () => {
    const root = router.getInitialState(config);
    const one = router.getRehydratedState(
      router.getStateForAction(
        root,
        CommonActions.navigate('PetManagement', { entrySource: 'more' }),
        config,
      )!,
      config,
    );
    const two = router.getRehydratedState(
      router.getStateForAction(
        one,
        CommonActions.navigate('PetProfileEdit', {
          petId: 'public-pet',
          entrySource: 'stack',
        }),
        config,
      )!,
      config,
    );
    const repeat = router.getRehydratedState(
      router.getStateForAction(
        two,
        CommonActions.navigate('PetProfileEdit', {
          petId: 'public-pet',
          entrySource: 'stack',
        }),
        config,
      )!,
      config,
    );
    expect(repeat.routes.map(route => route.name)).toEqual([
      'AppTabs',
      'PetManagement',
      'PetProfileEdit',
    ]);
    expect(repeat.routes[2].key).toBe(two.routes[2].key);
    expect(repeat.routes[2].params).toEqual(two.routes[2].params);
    const pop = {
      ...CommonActions.goBack(),
      source: repeat.routes[2].key,
      target: repeat.key,
    };
    const back = router.getRehydratedState(
      router.getStateForAction(repeat, pop, config)!,
      config,
    );
    expect(back.routes.map(route => route.name)).toEqual([
      'AppTabs',
      'PetManagement',
    ]);
    expect(router.getStateForAction(back, pop, config)).toBeNull();
    expect(back.routes[0].key).toBe(root.routes[0].key);
  });
});

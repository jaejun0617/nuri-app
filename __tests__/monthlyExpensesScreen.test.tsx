import React from 'react';
import { BackHandler, FlatList } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import MonthlyExpensesScreen from '../src/screens/Records/MonthlyExpensesScreen';
import { useUiStore } from '../src/store/uiStore';
import type { TimelineStackParamList } from '../src/navigation/TimelineStackNavigator';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
let mockParams: TimelineStackParamList['MonthlyExpenses'];
const mockQuery = jest.fn();
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
}));
jest.mock('../src/hooks/useMonthlyExpenses', () => ({
  useMonthlyExpenses: (month: string) => {
    mockQuery(month);
    return {
      data: { items: [], total: 0, shopping: 0, medical: 0, legacyDateCount: 0 },
      isError: false, isFetching: false, refetch: jest.fn(),
    };
  },
}));
jest.mock('../src/components/common/SeasonalFormSurface', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    SeasonalFormBackground: () => null,
    SeasonalFormPanel: ({ children }: React.PropsWithChildren) => ReactRuntime.createElement(View, null, children),
  };
});

function screen() {
  return <ThemeProvider theme={createTheme('light')}><MonthlyExpensesScreen /></ThemeProvider>;
}
async function render() {
  let tree!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => { tree = TestRenderer.create(screen()); });
  return tree;
}
function button(tree: TestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
}

describe('monthly expense entry navigation', () => {
  const originalFrame = global.requestAnimationFrame;
  let hardwareBack: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { monthKey: '2026-10', entrySource: 'more', entryRequestId: 1 };
    useUiStore.setState({ moreDrawerOpen: false });
    global.requestAnimationFrame = callback => { callback(0); return 1; };
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      hardwareBack = handler;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    global.requestAnimationFrame = originalFrame;
    useUiStore.setState({ moreDrawerOpen: false });
    jest.restoreAllMocks();
  });

  it.each(['header', 'hardware'])('returns the %s back action to the More drawer', async action => {
    const tree = await render();
    expect(mockQuery).toHaveBeenLastCalledWith('2026-10');
    await TestRenderer.act(async () => {
      if (action === 'header') button(tree, '뒤로').props.onPress();
      else expect(hardwareBack?.({} as never)).toBe(true);
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().moreDrawerOpen).toBe(true);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    await TestRenderer.act(async () => tree.unmount());
  });

  it('resets to the requested current month on fresh entry but preserves a detail return', async () => {
    const tree = await render();
    await TestRenderer.act(async () => button(tree, '이전 달').props.onPress());
    expect(mockQuery).toHaveBeenLastCalledWith('2026-09');
    await TestRenderer.act(async () => tree.update(screen()));
    expect(mockQuery).toHaveBeenLastCalledWith('2026-09');
    mockParams = { monthKey: '2026-10', entrySource: 'more', entryRequestId: 2 };
    await TestRenderer.act(async () => tree.update(screen()));
    expect(mockQuery).toHaveBeenLastCalledWith('2026-10');
    expect(tree.root.findByType(FlatList).props.data).toEqual([]);
    await TestRenderer.act(async () => tree.unmount());
  });

  it.each(['home', undefined] as const)('preserves existing %s entry back behavior', async entrySource => {
    mockParams = { monthKey: '2026-10', entrySource };
    const tree = await render();
    await TestRenderer.act(async () => button(tree, '뒤로').props.onPress());
    if (entrySource === 'home') {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AppTabs', { screen: 'HomeTab' });
    } else expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().moreDrawerOpen).toBe(false);
    await TestRenderer.act(async () => tree.unmount());
  });
});

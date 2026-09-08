import React from 'react';
import { BackHandler, ScrollView, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import PolicyCenterScreen from '../src/screens/Policy/PolicyCenterScreen';
import PolicyDetailScreen from '../src/screens/Policy/PolicyDetailScreen';
import { POLICY_DOCUMENT_ORDER } from '../src/services/legal/presentation';

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};
type HardwareBackHandler = Parameters<typeof BackHandler.addEventListener>[1];
let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactRuntime = jest.requireActual('react') as typeof React;
    ReactRuntime.useEffect(callback, [callback]);
  },
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    SafeAreaView: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      ReactRuntime.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
  };
});

function renderScreen(element: React.ReactElement) {
  return TestRenderer.create(
    <ThemeProvider theme={createTheme('light')}>{element}</ThemeProvider>,
  );
}

describe('policy presentation screens', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  let hardwareBackHandler: HardwareBackHandler | undefined;
  let backHandlerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    hardwareBackHandler = undefined;
    backHandlerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        hardwareBackHandler = handler;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    if (renderer) {
      TestRenderer.act(() => renderer?.unmount());
    }
    renderer = undefined;
    backHandlerSpy.mockRestore();
  });

  it('renders every policy entry in a safe scroll container', () => {
    TestRenderer.act(() => {
      renderer = renderScreen(<PolicyCenterScreen />);
    });
    if (!renderer) throw new Error('PolicyCenterScreen did not mount');

    const scroll = renderer.root.findByProps({ testID: 'policy-center-scroll' });
    expect(scroll.type).toBe(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 42 }),
    );

    for (const documentId of POLICY_DOCUMENT_ORDER) {
      expect(
        renderer.root.findByProps({ testID: `policy-entry-${documentId}` }),
      ).toBeDefined();
    }

    TestRenderer.act(() => {
      renderer?.root.findByProps({ testID: 'policy-entry-privacy' }).props.onPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PolicyDetail', {
      documentId: 'privacy',
    });
  });

  it('renders draft detail content through the last section and handles back', () => {
    mockRouteParams = { documentId: 'accountDeletion' };

    TestRenderer.act(() => {
      renderer = renderScreen(<PolicyDetailScreen />);
    });
    if (!renderer) throw new Error('PolicyDetailScreen did not mount');

    const scroll = renderer.root.findByProps({ testID: 'policy-detail-scroll' });
    expect(scroll.type).toBe(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 50 }),
    );
    expect(
      renderer.root.findByProps({ testID: 'policy-content-review-notice' }),
    ).toBeDefined();
    expect(
      renderer.root.findByProps({ testID: 'policy-section-operational-records' }),
    ).toBeDefined();

    TestRenderer.act(() => {
      renderer?.root.findByProps({ testID: 'policy-detail-back' }).props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);

    expect(hardwareBackHandler).toBeDefined();
    TestRenderer.act(() => {
      expect(
        hardwareBackHandler?.({} as Parameters<HardwareBackHandler>[0]),
      ).toBe(true);
    });
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
  });

  it('renders a safe fallback for an unknown runtime policy id', () => {
    mockRouteParams = { documentId: 'unknown-policy' };

    TestRenderer.act(() => {
      renderer = renderScreen(<PolicyDetailScreen />);
    });
    if (!renderer) throw new Error('PolicyDetailScreen did not mount');

    expect(renderer.root.findByProps({ children: '정책을 찾을 수 없어요' })).toBeDefined();
    expect(
      renderer.root.findAll(
        node =>
          typeof node.props.testID === 'string' &&
          node.props.testID.startsWith('policy-section-'),
      ),
    ).toHaveLength(0);
  });
});

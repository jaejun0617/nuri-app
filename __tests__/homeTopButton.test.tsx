import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';

import HomeTopButton, {
  resolveHomeTopButtonThreshold,
} from '../src/screens/Main/components/LoggedInHome/HomeTopButton';

const mockCancelAnimation = jest.fn();
const mockTimingCallbacks: Array<((finished?: boolean) => void) | undefined> = [];

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...args),
  Easing: {
    out: jest.fn((value: unknown) => value),
    cubic: jest.fn(),
  },
  interpolate: jest.fn(() => 0),
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
  useSharedValue: (initial: number) => ({ value: initial }),
  withTiming: jest.fn(
    (
      value: number,
      _config: unknown,
      callback?: (finished?: boolean) => void,
    ) => {
      mockTimingCallbacks.push(callback);
      return value;
    },
  ),
}));

const commonProps = {
  bottom: 104,
  accentColor: '#376DB5',
  borderColor: '#D7DFEA',
  rippleColor: '#FFFFFF18',
  onPress: jest.fn(),
};

describe('HomeTopButton animation lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimingCallbacks.length = 0;
  });

  it('uses the schedule boundary when known and a stable fallback before layout', () => {
    expect(resolveHomeTopButtonThreshold(null)).toBe(300);
    expect(resolveHomeTopButtonThreshold(420)).toBe(324);
    expect(resolveHomeTopButtonThreshold(64)).toBe(0);
  });

  it('mounts only for visibility and removes pointer/shadow state while hiding', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <HomeTopButton {...commonProps} visible={false} />,
      );
    });
    expect(
      renderer.root.findAllByProps({ testID: 'home-top-button-layer' }),
    ).toHaveLength(0);

    TestRenderer.act(() => {
      renderer.update(<HomeTopButton {...commonProps} visible />);
    });
    expect(
      renderer.root.findByProps({ testID: 'home-top-button-layer' }).props
        .pointerEvents,
    ).toBe('auto');

    TestRenderer.act(() => {
      renderer.root.findByProps({ testID: 'home-top-button' }).props.onPress();
    });
    expect(commonProps.onPress).toHaveBeenCalledTimes(1);

    TestRenderer.act(() => {
      renderer.update(<HomeTopButton {...commonProps} visible={false} />);
    });
    const hidingLayer = renderer.root.findByProps({
      testID: 'home-top-button-layer',
    });
    expect(hidingLayer.props.pointerEvents).toBe('none');

    const hidingButtonStyle = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'home-top-button' }).props.style,
    );
    if (Platform.OS === 'ios') {
      expect(hidingButtonStyle.shadowOpacity).toBe(0);
    } else {
      expect(hidingButtonStyle.elevation).toBe(0);
    }
  });

  it('ignores a stale hide completion and unmounts after the current hide finishes', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    TestRenderer.act(() => {
      renderer = TestRenderer.create(<HomeTopButton {...commonProps} visible />);
    });
    TestRenderer.act(() => {
      renderer.update(<HomeTopButton {...commonProps} visible={false} />);
    });
    const staleHideCompletion = mockTimingCallbacks.at(-1);

    TestRenderer.act(() => {
      renderer.update(<HomeTopButton {...commonProps} visible />);
      staleHideCompletion?.(true);
    });
    expect(
      renderer.root.findByProps({ testID: 'home-top-button-layer' }),
    ).toBeDefined();

    TestRenderer.act(() => {
      renderer.update(<HomeTopButton {...commonProps} visible={false} />);
    });
    const currentHideCompletion = mockTimingCallbacks.at(-1);
    TestRenderer.act(() => currentHideCompletion?.(true));

    expect(
      renderer.root.findAllByProps({ testID: 'home-top-button-layer' }),
    ).toHaveLength(0);
    expect(mockCancelAnimation).toHaveBeenCalled();
  });
});

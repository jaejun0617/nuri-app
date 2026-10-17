import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import { SEASON_CTA } from '../src/app/theme/ctaPalette';
import WalkRestSheet from '../src/screens/DevTest/walkPresentation/WalkRestSheet';

jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
let mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockDimensions,
}));

describe('Walk rest sheet presentation and motion', () => {
  let tree: Renderer.ReactTestRenderer;
  let callbacks: Array<(result: { finished: boolean }) => void>;
  const onDismiss = jest.fn();
  const onResume = jest.fn();
  let props: React.ComponentProps<typeof WalkRestSheet>;
  const node = (id: string) => tree.root.findAllByProps({ testID: id })[0];
  const render = async (change: Partial<typeof props> = {}) => {
    props = { ...props, ...change };
    await act(async () => {
      const content = (
        <ThemeProvider theme={createTheme('light')}>
          <WalkRestSheet {...props} />
        </ThemeProvider>
      );
      if (tree) tree.update(content);
      else tree = Renderer.create(content);
    });
  };
  const layout = async () =>
    act(async () =>
      node('walk-rest-sheet').props.onLayout({
        nativeEvent: { layout: { height: 320 } },
      }),
    );
  const click = async (id: string) => act(async () => node(id).props.onPress());
  beforeEach(() => {
    jest.clearAllMocks();
    callbacks = [];
    mockDimensions = { width: 384, height: 832, scale: 3, fontScale: 1 };
    props = {
      visible: true,
      season: 'autumn',
      insetTop: 24,
      insetBottom: 24,
      busy: false,
      error: false,
      onDismiss,
      onResume,
    };
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: callback => {
        if (callback) callbacks.push(callback);
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));
  });
  afterEach(async () => {
    if (tree) {
      await act(async () => tree.unmount());
      tree = undefined as unknown as Renderer.ReactTestRenderer;
    }
    jest.restoreAllMocks();
  });
  test('three compact copy rows fit without a truncation or fixed-height contract', async () => {
    await render();
    const copy = [
      'walk-rest-title',
      'walk-rest-invitation',
      'walk-rest-note',
    ].map(node);
    expect(copy.map(n => n.props.children)).toEqual([
      '잠깐 쉬어가도 괜찮아요.',
      '언제든 다시 함께 걸어요.',
      '시간과 거리는 잠시 멈춰둘게요.',
    ]);
    expect(copy.map(n => StyleSheet.flatten(n.props.style).fontSize)).toEqual([
      16, 13, 12,
    ]);
    for (const text of copy) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
      expect(StyleSheet.flatten(text.props.style).height).toBeUndefined();
    }
    expect(node('walk-rest-sheet').props.accessibilityViewIsModal).toBe(true);
  });
  test('entry waits for layout then runs a native ease-out slide, not a second system animation', async () => {
    await render();
    expect(Animated.timing).not.toHaveBeenCalled();
    await layout();
    expect(Animated.timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
        isInteraction: false,
        easing: expect.any(Function),
      }),
    );
    expect(node('walk-rest-modal').props.animationType).toBe('none');
  });
  test.each(['walk-rest-later', 'walk-rest-backdrop', 'walk-rest-handle'])(
    '%s waits for a smooth exit and never resumes',
    async id => {
      await render();
      await layout();
      await click(id);
      expect(onDismiss).not.toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      );
      await act(async () => callbacks.at(-1)!({ finished: true }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onResume).not.toHaveBeenCalled();
    },
  );
  test('hardware back and accessibility escape only dismiss', async () => {
    await render();
    await layout();
    await act(async () => node('walk-rest-modal').props.onRequestClose());
    await act(async () => callbacks.at(-1)!({ finished: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });
  test('swipe down dismisses; a small drag returns to rest position', async () => {
    const pan = jest.spyOn(PanResponder, 'create');
    const spring = jest
      .spyOn(Animated, 'spring')
      .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
    await render();
    await layout();
    const config = pan.mock.calls.at(-1)![0];
    await act(async () => {
      config.onPanResponderRelease?.(null as never, { dy: 10, vy: 0 } as never);
    });
    expect(spring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, useNativeDriver: true }),
    );
    await act(async () => {
      config.onPanResponderRelease?.(
        null as never,
        { dy: 90, vy: 0.1 } as never,
      );
    });
    await act(async () => callbacks.at(-1)!({ finished: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });
  test('backgrounding during exit settles the dismissal instead of trapping the next foreground', async () => {
    await render();
    await layout();
    await click('walk-rest-later');
    const listeners = jest
      .mocked(AppState.addEventListener)
      .mock.calls.map(call => call[1]);
    await act(async () =>
      listeners.forEach(listener => listener('background')),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });
  test('reduced motion removes movement without removing content or actions', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    await render();
    await layout();
    await click('walk-rest-later');
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  test('motion-policy failure fails accessible rather than leaving a hidden sheet', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockRejectedValue(new Error('unavailable'));
    await render();
    await layout();
    await click('walk-rest-later');
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  test('busy state blocks dismiss, swipe, and repeated resume', async () => {
    const pan = jest.spyOn(PanResponder, 'create');
    await render({ busy: true });
    await layout();
    await click('walk-rest-resume');
    await click('walk-rest-later');
    await act(async () => node('walk-rest-modal').props.onRequestClose());
    expect(
      pan.mock.calls
        .at(-1)![0]
        .onMoveShouldSetPanResponder?.(
          null as never,
          { dy: 90, dx: 0 } as never,
        ),
    ).toBe(false);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(onResume).not.toHaveBeenCalled();
    expect(node('walk-rest-resume').props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
  });
  test.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    '%s uses the existing season primary and 48dp targets',
    async season => {
      await render({ season });
      const primary = StyleSheet.flatten(
        node('walk-rest-resume').props.style({ pressed: false }),
      );
      expect(primary.backgroundColor).toBe(SEASON_CTA[season].primary);
      expect(primary.minHeight).toBeGreaterThanOrEqual(48);
      expect(
        StyleSheet.flatten(node('walk-rest-later').props.style).minHeight,
      ).toBeGreaterThanOrEqual(48);
    },
  );
  test('fontScale 1.3 preserves all copy and safe-area room without shrinking text', async () => {
    mockDimensions = { width: 320, height: 640, scale: 3, fontScale: 1.3 };
    await render();
    expect(
      StyleSheet.flatten(node('walk-rest-sheet').props.style).maxHeight,
    ).toBe(592);
    expect(node('walk-rest-note').props.children).toBe(
      '시간과 거리는 잠시 멈춰둘게요.',
    );
    expect(node('walk-rest-note').props.adjustsFontSizeToFit).toBeUndefined();
  });
});

import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Animated, BackHandler, StyleSheet } from 'react-native';
import MoreDrawer from '../src/components/MoreDrawer/MoreDrawer';
import { TAB_FADE_TIMING } from '../src/navigation/navigationTransitionPolicy';

const mockNavigate = jest.fn();
const mockTabNavigate = jest.fn();
const mockVisibility = jest.fn();
const mockOrder: string[] = [];
let mockReduceMotion = false;
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockFocused,
}));
jest.mock('../src/navigation/useNavigationMotion', () => ({
  useNavigationMotion: () => mockReduceMotion,
}));
jest.mock('../src/screens/More/MoreDrawerContent', () => {
  const react = jest.requireActual('react') as typeof React;
  const { Pressable } = jest.requireActual('react-native') as typeof import('react-native');
  return function Content({ onRequestNavigate, onRequestTabNavigate }: {
    onRequestNavigate: (navigate: () => boolean) => void;
    onRequestTabNavigate: (navigate: () => boolean) => void;
  }) {
    react.useEffect(() => () => { mockOrder.push('unmount'); }, []);
    return react.createElement(react.Fragment, null,
      react.createElement(Pressable, { testID: 'request-child', onPress: () => onRequestNavigate(() => {
      mockOrder.push('navigate');
      mockNavigate();
      return true;
    }) }),
      react.createElement(Pressable, { testID: 'request-tab', onPress: () => onRequestTabNavigate(() => {
        mockOrder.push('tab');
        mockTabNavigate();
        return true;
      }) }),
    );
  };
});

describe('More shares the root tab fade without sliding', () => {
  let tree: Renderer.ReactTestRenderer | undefined;
  let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const finishes: Array<(finished: boolean) => void> = [];
  function animation(): Animated.CompositeAnimation {
    let complete: Parameters<Animated.CompositeAnimation['start']>[0];
    return {
      start: callback => {
        complete = callback;
        finishes.push(finished => callback?.({ finished }));
      },
      stop: () => complete?.({ finished: false }),
      reset: () => {},
    };
  }
  function Harness({ initiallyOpen = true }: { initiallyOpen?: boolean; revision?: number }) {
    const [open, update] = React.useState(initiallyOpen);
    setOpen = update;
    return <MoreDrawer open={open} onClose={() => update(false)} onVisibilityChange={mockVisibility} />;
  }
  const mount = async (initiallyOpen = true) => act(async () => {
    tree = Renderer.create(<Harness initiallyOpen={initiallyOpen} />);
  });
  const complete = async () => act(async () => finishes[finishes.length - 1](true));
  const request = async (count = 1) => act(async () => {
    const press = tree!.root.findByProps({ testID: 'request-child' }).props.onPress;
    for (let index = 0; index < count; index++) press();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.length = 0;
    finishes.length = 0;
    mockReduceMotion = false;
    mockFocused = true;
    jest.spyOn(Animated, 'spring').mockImplementation(() => animation());
    jest.spyOn(Animated, 'timing').mockImplementation(() => animation());
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      back = listener;
      return { remove: jest.fn() };
    });
  });
  afterEach(async () => {
    if (tree) await act(async () => tree?.unmount());
    tree = undefined;
    back = undefined;
    jest.restoreAllMocks();
  });

  it('does not mount or animate content before the first opening', async () => {
    await mount(false);
    expect(Animated.spring).not.toHaveBeenCalled();
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(tree?.toJSON()).toBeNull();
  });

  it('uses a 400ms opacity fade with the tab easing, without slide or texture caching', async () => {
    await mount();
    expect(Animated.spring).not.toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), {
      ...TAB_FADE_TIMING, duration: 400, toValue: 1, useNativeDriver: true, isInteraction: false,
    });
    const panel = tree!.root.findByProps({ testID: 'more-drawer-panel' });
    expect(StyleSheet.flatten(panel.props.style).transform).toBeUndefined();
    expect(tree!.root.findAll(node => node.props.renderToHardwareTextureAndroid === true)).toHaveLength(0);
    await complete();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens a previously closed menu with one fade', async () => {
    await mount(false);
    await act(async () => setOpen(true));
    expect(Animated.timing).toHaveBeenCalledTimes(1);
    expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 400 }));
    await complete();
    expect(tree!.root.findAllByProps({ testID: 'request-child' })).not.toHaveLength(0);
  });

  it('dispatches one destination above the still-opaque return menu', async () => {
    await mount();
    await complete();
    await request(2);
    expect(Animated.timing).toHaveBeenCalledTimes(1);
    expect(mockOrder).toEqual(['navigate']);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockVisibility).toHaveBeenLastCalledWith(true);
    expect(tree!.root.findByProps({ testID: 'more-drawer-panel' })).toBeDefined();
  });

  it('replaces the underlying tab before fading out and reports visibility until cleanup', async () => {
    await mount();
    await complete();
    expect(mockVisibility).toHaveBeenLastCalledWith(true);
    await act(async () => {
      const press = tree!.root.findByProps({ testID: 'request-tab' }).props.onPress;
      press();
      press();
    });
    expect(mockTabNavigate).toHaveBeenCalledTimes(1);
    expect(mockOrder).toEqual(['tab']);
    expect(mockVisibility).toHaveBeenLastCalledWith(true);
    await complete();
    expect(mockOrder).toEqual(['tab', 'unmount']);
    expect(mockVisibility).toHaveBeenLastCalledWith(false);
    expect(mockTabNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not steal a destination Back after its synchronous dispatch', async () => {
    await mount();
    await complete();
    await request();
    await act(async () => { expect(back?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(false); });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockOrder).toEqual(['navigate']);
  });

  it('accepts a tab tap during opening and ignores the interrupted opening completion', async () => {
    await mount();
    const oldOpen = finishes[finishes.length - 1];
    await act(async () => tree!.root.findByProps({ testID: 'request-tab' }).props.onPress());
    expect(mockTabNavigate).toHaveBeenCalledTimes(1);
    await act(async () => oldOpen(true));
    expect(mockVisibility).toHaveBeenLastCalledWith(true);
    await complete();
    expect(mockOrder).toEqual(['tab', 'unmount']);
    expect(mockVisibility).toHaveBeenLastCalledWith(false);
  });

  it('ignores stale fade completion when reopened', async () => {
    await mount();
    await complete();
    await act(async () => setOpen(false));
    const oldClose = finishes[finishes.length - 1];
    await act(async () => setOpen(true));
    await act(async () => oldClose(true));
    await complete();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(tree!.root.findAllByProps({ testID: 'request-child' })).not.toHaveLength(0);
  });

  it('never repeats a dispatched destination after the host unmounts', async () => {
    await mount();
    await complete();
    await request();
    const oldOpen = finishes[finishes.length - 1];
    await act(async () => tree?.unmount());
    tree = undefined;
    await act(async () => oldOpen(true));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('closes through the backdrop without navigating', async () => {
    await mount();
    await complete();
    await act(async () => {
      tree!.root.findByProps({ testID: 'more-drawer-backdrop' }).props.onPress();
    });
    await complete();
    expect(mockOrder).toEqual(['unmount']);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(tree?.toJSON()).toBeNull();
  });

  it('respects reduced motion without any fade or closing delay', async () => {
    mockReduceMotion = true;
    await mount();
    expect(Animated.timing).not.toHaveBeenCalled();
    await request();
    expect(mockOrder).toEqual(['navigate']);
    expect(tree!.root.findByProps({ testID: 'more-drawer-panel' })).toBeDefined();
  });

  it('finishes closing safely if reduced motion is enabled mid-fade', async () => {
    await mount();
    await complete();
    await act(async () => setOpen(false));
    const oldClose = finishes[finishes.length - 1];
    mockReduceMotion = true;
    await act(async () => tree?.update(<Harness revision={1} />));
    expect(mockOrder).toEqual(['unmount']);
    await act(async () => oldClose(true));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(tree?.toJSON()).toBeNull();
  });

  it('keeps return context but disables hidden menu input and releases its gesture latch', async () => {
    await mount();
    await complete();
    await request(2);
    mockFocused = false;
    await act(async () => tree?.update(<Harness revision={1} />));
    const overlay = tree!.root.findByProps({ testID: 'more-drawer-overlay' });
    expect(overlay.props.pointerEvents).toBe('none');
    expect(overlay.props.importantForAccessibility).toBe('no-hide-descendants');
    await request();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    mockFocused = true;
    await act(async () => tree?.update(<Harness revision={2} />));
    expect(overlay.props.pointerEvents).toBe('auto');
    expect(Animated.timing).toHaveBeenCalledTimes(1);
    await request();
    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockOrder).toEqual(['navigate', 'navigate']);
  });
});

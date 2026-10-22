import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Animated, BackHandler } from 'react-native';
import MoreDrawer from '../src/components/MoreDrawer/MoreDrawer';

const mockNavigate = jest.fn();
const mockOrder: string[] = [];
jest.mock('../src/screens/More/MoreDrawerContent', () => {
  const react = jest.requireActual('react') as typeof React;
  const { Pressable } = jest.requireActual('react-native') as typeof import('react-native');
  return function Content({ onRequestNavigate }: { onRequestNavigate: (navigate: () => void) => void }) {
    react.useEffect(() => () => { mockOrder.push('unmount'); }, []);
    return react.createElement(Pressable, { testID: 'request-child', onPress: () => onRequestNavigate(() => {
      mockOrder.push('navigate'); mockNavigate();
    }) });
  };
});

describe('More transition owns close completion and releases its temporary layer', () => {
  let tree: Renderer.ReactTestRenderer | undefined;
  let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const finishes: Array<(finished: boolean) => void> = [];
  function animation(): Animated.CompositeAnimation {
    let complete: Parameters<Animated.CompositeAnimation['start']>[0];
    return {
      start: callback => { complete = callback; finishes.push(finished => callback?.({ finished })); },
      stop: () => complete?.({ finished: false }),
      reset: () => {},
    };
  }
  function Harness({ initiallyOpen = true }: { initiallyOpen?: boolean }) {
    const [open, update] = React.useState(initiallyOpen);
    setOpen = update;
    return <MoreDrawer open={open} onClose={() => update(false)} />;
  }
  const mount = async (initiallyOpen = true) => act(async () => {
    tree = Renderer.create(<Harness initiallyOpen={initiallyOpen} />);
  });
  const layer = () => tree!.root.findByProps({ testID: 'more-drawer-motion' }).props.renderToHardwareTextureAndroid;
  const complete = async () => act(async () => finishes[finishes.length - 1](true));
  const request = async (count = 1) => act(async () => {
    const press = tree!.root.findByProps({ testID: 'request-child' }).props.onPress;
    for (let index = 0; index < count; index++) press();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.length = 0;
    finishes.length = 0;
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

  it('does not schedule a close animation for a drawer that was never opened', async () => {
    await mount(false);
    expect(Animated.spring).not.toHaveBeenCalled();
    expect(Animated.timing).not.toHaveBeenCalled();
    expect(tree?.toJSON()).toBeNull();
  });

  it('uses a native-driver texture only during motion and releases it when open settles', async () => {
    await mount();
    expect(layer()).toBe(true);
    expect(Animated.spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useNativeDriver: true, speed: 18 }));
    await complete();
    expect(layer()).toBe(false);
  });

  it('mounts and animates once when a previously closed drawer opens', async () => {
    await mount(false);
    await act(async () => setOpen(true));
    expect(Animated.spring).toHaveBeenCalledTimes(1);
    expect(layer()).toBe(true);
    await complete();
    expect(layer()).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('defers one destination until close completion AND content unmount', async () => {
    await mount();
    await complete();
    await request(2);
    expect(layer()).toBe(true);
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 180, useNativeDriver: true }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockOrder).toEqual([]);
    await complete();
    expect(mockOrder).toEqual(['unmount', 'navigate']);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(tree?.toJSON()).toBeNull();
  });

  it('consumes Back during close and cancels the queued destination', async () => {
    await mount();
    await complete();
    await request();
    await act(async () => { expect(back?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true); });
    await complete();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(tree?.toJSON()).toBeNull();
  });

  it('ignores stale close completion after reopening', async () => {
    await mount();
    await complete();
    await request();
    const oldClose = finishes[finishes.length - 1];
    await act(async () => setOpen(true));
    await act(async () => oldClose(true));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(tree?.root.findAllByProps({ testID: 'request-child' }).length).toBeGreaterThan(0);
    await complete();
    expect(layer()).toBe(false);
  });

  it('discards queued navigation if the host unmounts', async () => {
    await mount();
    await complete();
    await request();
    const close = finishes[finishes.length - 1];
    await act(async () => tree?.unmount());
    tree = undefined;
    await act(async () => close(true));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import Animated, { cancelAnimation, withTiming } from 'react-native-reanimated';
import {
  HOME_PET_SWITCH_DURATION_MS,
  useHomePetSwitchTransition,
} from '../src/screens/Main/components/LoggedInHome/useHomePetSwitchTransition';

let mockReduceMotion = false;
const mockWrites: number[] = [];
const mockSharedValues: { value: number }[] = [];

jest.mock('../src/navigation/useNavigationMotion', () => ({
  useNavigationMotion: () => mockReduceMotion,
}));
jest.mock('react-native-reanimated', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  return {
    __esModule: true,
    default: { View: 'AnimatedView' },
    Easing: { out: (easing: unknown) => easing, cubic: () => 0 },
    cancelAnimation: jest.fn(),
    withTiming: jest.fn((value: number) => value),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (initial: number) => {
      const ref = ReactRuntime.useRef<{ value: number } | null>(null);
      if (ref.current === null) {
        let value = initial;
        ref.current = {
          get value() { return value; },
          set value(next: number) { mockWrites.push(next); value = next; },
        };
        mockSharedValues.push(ref.current);
      }
      return ref.current;
    },
  };
});

describe('Home pet switch presentation', () => {
  let tree: Renderer.ReactTestRenderer | undefined;
  const mounted = jest.fn();
  const removed = jest.fn();
  let latestTransition: ReturnType<typeof useHomePetSwitchTransition>;
  function Identity({ petId }: { petId: string | null }) {
    useEffect(() => { mounted(); return () => { removed(); }; }, []);
    return <Text>{petId ?? 'none'}</Text>;
  }
  function Harness({ petId, focused = true, photoUri = null }: { petId: string | null; focused?: boolean; photoUri?: string | null }) {
    const styles = useHomePetSwitchTransition(petId, focused, photoUri);
    latestTransition = styles;
    return <>
      <Animated.View testID="photo" style={styles.photoStyle} />
      <Animated.View testID="content" style={styles.contentStyle}><Identity petId={petId} /></Animated.View>
    </>;
  }
  const render = async (petId: string | null, focused = true, photoUri: string | null = null) => {
    await act(async () => {
      if (tree) tree.update(<Harness petId={petId} focused={focused} photoUri={photoUri} />);
      else tree = Renderer.create(<Harness petId={petId} focused={focused} photoUri={photoUri} />);
    });
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockWrites.length = 0;
    mockSharedValues.length = 0;
    mockReduceMotion = false;
  });
  afterEach(async () => {
    if (tree) await act(async () => tree?.unmount());
    tree = undefined;
  });

  it('does not animate initial display or repeat a transition for same-pet renders', async () => {
    await render('pet-a');
    await render('pet-a');
    expect(withTiming).not.toHaveBeenCalled();
    expect(mockSharedValues).toHaveLength(1);
    expect(tree?.root.findByProps({ testID: 'photo' }).props.style).toEqual({ opacity: 1 });
  });

  it('animates committed identity once without retaining or remounting the previous pet', async () => {
    await render('pet-a');
    await render('pet-b');
    expect(tree?.root.findByType(Text).props.children).toBe('pet-b');
    expect(withTiming).toHaveBeenCalledTimes(1);
    expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: HOME_PET_SWITCH_DURATION_MS }));
    expect(mockWrites).toContain(0);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
  });

  it('starts the photo fade only after the current photo settles, not during its hidden loading frame', async () => {
    await render('pet-a', true, 'photo-a');
    await act(async () => latestTransition.onPhotoSettled('photo-a'));
    await render('pet-b', true, 'photo-b');
    expect(tree?.root.findByType(Text).props.children).toBe('pet-b');
    expect(withTiming).not.toHaveBeenCalled();
    expect(mockSharedValues[0].value).toBe(0);
    await act(async () => latestTransition.onPhotoSettled('photo-a'));
    expect(withTiming).not.toHaveBeenCalled();
    await act(async () => latestTransition.onPhotoSettled('photo-b'));
    expect(withTiming).toHaveBeenCalledTimes(1);
    await act(async () => latestTransition.onPhotoSettled('photo-b'));
    expect(withTiming).toHaveBeenCalledTimes(1);
  });

  it('does not start a delayed photo fade after blur or for an interrupted selection', async () => {
    await render('pet-a', true, 'photo-a');
    await render('pet-b', true, 'photo-b');
    await render('pet-c', true, 'photo-c');
    await act(async () => latestTransition.onPhotoSettled('photo-b'));
    expect(withTiming).not.toHaveBeenCalled();
    await render('pet-c', false, 'photo-c');
    await act(async () => latestTransition.onPhotoSettled('photo-c'));
    expect(withTiming).not.toHaveBeenCalled();
    expect(mockSharedValues[0].value).toBe(1);
  });

  it('keeps the photo stationary while the information lifts only four dp', async () => {
    await render('pet-a');
    // Inspect the animated style at the beginning, middle and end, not native frame pacing.
    for (const [progress, opacity, lift] of [[0, 0.4, 4], [0.5, 0.7, 2], [1, 1, 0]]) {
      mockSharedValues[0].value = progress;
      await render('pet-a');
      expect(tree?.root.findByProps({ testID: 'photo' }).props.style).toEqual({ opacity: progress });
      expect(tree?.root.findByProps({ testID: 'content' }).props.style).toEqual({ opacity, transform: [{ translateY: lift }] });
    }
    expect(withTiming).not.toHaveBeenCalled();
  });

  it('cancels interrupted transitions and always displays the newest selection', async () => {
    await render('pet-a');
    await render('pet-b');
    await render('pet-c');
    await render('pet-a');
    expect(withTiming).toHaveBeenCalledTimes(3);
    expect(cancelAnimation).toHaveBeenCalledWith(mockSharedValues[0]);
    expect(tree?.root.findByType(Text).props.children).toBe('pet-a');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(mockSharedValues[0].value).toBe(1);
  });

  it('does not replay hidden pet changes when Home is focused again', async () => {
    await render('pet-a');
    await render('pet-b', false);
    await render('pet-b', true);
    expect(withTiming).not.toHaveBeenCalled();
    expect(tree?.root.findByType(Text).props.children).toBe('pet-b');
  });

  it('suppresses motion under the existing OS preference and resets an interrupted fade', async () => {
    await render('pet-a');
    await render('pet-b');
    const calls = jest.mocked(cancelAnimation).mock.calls.length;
    mockReduceMotion = true;
    await render('pet-c');
    expect(withTiming).toHaveBeenCalledTimes(1);
    expect(jest.mocked(cancelAnimation).mock.calls.length).toBeGreaterThan(calls);
    expect(mockSharedValues[0].value).toBe(1);
    mockReduceMotion = false;
    await render('pet-c');
    expect(withTiming).toHaveBeenCalledTimes(1);
  });

  it('does not animate missing-pet fallback or first hydration', async () => {
    await render(null);
    await render('pet-a');
    await render(null);
    expect(withTiming).not.toHaveBeenCalled();
    expect(tree?.root.findByType(Text).props.children).toBe('none');
  });

  it('cancels animation on unmount without a delayed selection callback', async () => {
    await render('pet-a');
    await render('pet-b');
    jest.mocked(cancelAnimation).mockClear();
    await act(async () => tree?.unmount());
    tree = undefined;
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(jest.mocked(withTiming).mock.calls[0]).toHaveLength(2);
  });
});

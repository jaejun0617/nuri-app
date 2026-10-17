import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import { useNavigationMotion } from '../src/navigation/useNavigationMotion';

function Harness() {
  return <Text>{String(useNavigationMotion())}</Text>;
}

describe('navigation accessibility motion lifecycle', () => {
  let tree: Renderer.ReactTestRenderer;
  let change: (enabled: boolean) => void;
  const remove = jest.fn();
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event, listener) => {
        change = listener;
        return { remove };
      });
  });
  afterEach(async () => {
    if (tree) await act(async () => tree.unmount());
    jest.restoreAllMocks();
    remove.mockClear();
  });
  const mount = async () =>
    act(async () => {
      tree = Renderer.create(<Harness />);
    });
  const reduced = () => tree.root.findByType(Text).props.children;
  test('OS changes update the policy without replacing navigator or screen state', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    await mount();
    expect(reduced()).toBe('false');
    await act(async () => change(true));
    expect(reduced()).toBe('true');
    await act(async () => change(false));
    expect(reduced()).toBe('false');
  });
  test('a late initial read cannot override a more recent OS event', async () => {
    let resolve!: (enabled: boolean) => void;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
      new Promise<boolean>(done => {
        resolve = done;
      }),
    );
    await mount();
    await act(async () => change(true));
    await act(async () => resolve(false));
    expect(reduced()).toBe('true');
  });
  test('an unavailable OS setting retains reduced motion without blocking rendering', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockRejectedValue(new Error('SETTING_UNAVAILABLE'));
    await mount();
    expect(reduced()).toBe('true');
  });
  test('unmount removes the listener and ignores a pending initial read', async () => {
    let resolve!: (enabled: boolean) => void;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
      new Promise<boolean>(done => {
        resolve = done;
      }),
    );
    await mount();
    await act(async () => tree.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => resolve(false));
  });
});

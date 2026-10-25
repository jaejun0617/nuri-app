import React from 'react';
import { Animated } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { NotificationToggle } from '../src/components/common/NotificationToggle';

let mockReducedMotion = false;
jest.mock('../src/navigation/useNavigationMotion', () => ({ useNavigationMotion: () => mockReducedMotion }));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
afterEach(() => { jest.restoreAllMocks(); mockReducedMotion = false; });

it('moves immediately without waiting for the network and ignores repeated presses', async () => {
  const save = deferred();
  const change = jest.fn(() => save.promise);
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<NotificationToggle value={false} label="누리 소식" onChange={change} />); });
  const control = () => renderer.root.findByProps({ accessibilityRole: 'switch' });
  let pending!: Promise<void>;
  await act(async () => {
    pending = control().props.onPress();
    control().props.onPress();
  });
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith(true);
  expect(control().props.accessibilityState).toMatchObject({ checked: true, busy: true, disabled: true });
  await act(async () => {
    renderer.update(<NotificationToggle value label="누리 소식" onChange={change} />);
    save.resolve();
    await pending;
  });
  expect(control().props.accessibilityState).toMatchObject({ checked: true, busy: false, disabled: false });
  await act(async () => renderer.unmount());
});

it('returns to confirmed state after a failed save without hiding the control', async () => {
  const save = deferred();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<NotificationToggle value={false} label="누리 소식" onChange={() => save.promise} />); });
  const control = () => renderer.root.findByProps({ accessibilityRole: 'switch' });
  let pending!: Promise<void>;
  await act(async () => { pending = control().props.onPress(); });
  expect(control().props.accessibilityState.checked).toBe(true);
  await act(async () => { save.reject(new Error('offline')); await pending; });
  expect(control().props.accessibilityState).toMatchObject({ checked: false, busy: false });
  await act(async () => renderer.unmount());
});

it.each([false, true])('uses native animation and respects reduced motion: %s', async reduced => {
  mockReducedMotion = reduced;
  const timing = jest.spyOn(Animated, 'timing');
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<NotificationToggle value={false} label="누리 소식" onChange={() => {}} />); });
  await act(async () => { renderer.update(<NotificationToggle value label="누리 소식" onChange={() => {}} />); });
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: reduced ? 0 : 200, useNativeDriver: true }));
  await act(async () => renderer.unmount());
});

it('allows the owner to finish saving after the sheet has closed', async () => {
  const save = deferred();
  const confirmed = jest.fn();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<NotificationToggle value={false} label="누리 소식" onChange={async () => { await save.promise; confirmed(); }} />); });
  let pending!: Promise<void>;
  await act(async () => { pending = renderer.root.findByProps({ accessibilityRole: 'switch' }).props.onPress(); });
  await act(async () => renderer.unmount());
  await act(async () => { save.resolve(); await pending; });
  expect(confirmed).toHaveBeenCalledTimes(1);
});

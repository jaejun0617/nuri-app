import React from 'react';
import { Keyboard, ScrollView, TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { useBoundedKeyboardScroll } from '../src/hooks/useBoundedKeyboardScroll';

describe('keyboard-avoided forms without a second spacer', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  let hook: ReturnType<typeof useBoundedKeyboardScroll>;
  let pending: Parameters<typeof requestAnimationFrame>[0] | undefined;
  const scrollTo = jest.fn();
  const isFocused = jest.fn(() => true);
  const remove = jest.fn();
  const measureViewport = jest.fn(
    (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(0, 200, 384, 300),
  );
  const measureInput = jest.fn(
    (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(0, 680, 320, 44),
  );
  const input = {
    current: {
      isFocused,
      measureInWindow: measureInput,
    } as unknown as React.ComponentRef<typeof TextInput>,
  };
  function Probe({ enabled = true }: { enabled?: boolean }) {
    hook = useBoundedKeyboardScroll(enabled);
    return null;
  }
  beforeEach(() => {
    jest.clearAllMocks();
    pending = undefined;
    isFocused.mockReturnValue(true);
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback: Parameters<typeof requestAnimationFrame>[0]) => {
      pending = callback;
      return 42;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {
      pending = undefined;
    });
    jest.spyOn(Keyboard, 'addListener').mockReturnValue({ remove });
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });
    hook.scrollProps.ref.current = {
      getNativeScrollRef: () => ({ measureInWindow: measureViewport }),
      scrollTo,
    } as unknown as React.ComponentRef<typeof ScrollView>;
    hook.scrollProps.onContentSizeChange?.(384, 600);
  });
  afterEach(() => {
    act(() => renderer.unmount());
    jest.restoreAllMocks();
  });
  function flush() {
    const frame = pending;
    pending = undefined;
    act(() => frame?.(0));
  }
  it('reveals the focused field using measured viewport and bounded real content', () => {
    hook.revealInput(input);
    flush();
    expect(scrollTo).toHaveBeenCalledWith({ y: 236, animated: true });
    expect(hook.scrollProps).not.toHaveProperty('bottomPadding');
  });
  it('rechecks after keyboard movement without accumulating keyboard-height padding', () => {
    hook.revealInput(input);
    flush();
    hook.scrollProps.onContentSizeChange?.(384, 200);
    flush();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(Keyboard.addListener).toHaveBeenCalledWith(
      'keyboardDidShow',
      expect.any(Function),
    );
  });
  it('does not reveal blurred inputs or touch an inactive modal', () => {
    isFocused.mockReturnValue(false);
    hook.revealInput(input);
    flush();
    expect(measureViewport).not.toHaveBeenCalled();
    act(() => renderer.update(<Probe enabled={false} />));
    isFocused.mockReturnValue(true);
    hook.revealInput(input);
    flush();
    expect(scrollTo).not.toHaveBeenCalled();
  });
  it('cancels a queued measurement when the form unmounts', () => {
    hook.revealInput(input);
    act(() => renderer.unmount());
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(remove).toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

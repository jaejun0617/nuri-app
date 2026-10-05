import {
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
  type RefObject,
} from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  type LayoutRectangle,
  type ScrollViewProps,
} from 'react-native';

type InputRef = RefObject<ComponentRef<typeof TextInput> | null>;

export function resolveBoundedInputOffset(
  input: Pick<LayoutRectangle, 'y' | 'height'>,
  offset: number,
  viewportHeight: number,
  contentHeight: number,
) {
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  const current = Math.min(maxOffset, Math.max(0, offset));
  if (viewportHeight <= 0) return current;
  const bottom = input.y + input.height + 12;
  const target =
    bottom > current + viewportHeight
      ? bottom - viewportHeight
      : input.y < current
      ? input.y - 12
      : current;
  return Math.min(maxOffset, Math.max(0, target));
}

/** Pair with one KeyboardAvoidingView; never add a second keyboard-height content spacer. */
export function useBoundedKeyboardScroll(enabled = true) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const focusedRef = useRef<InputRef | null>(null);
  const contentHeight = useRef(0);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const active = useRef(enabled);
  active.current = enabled;

  const reveal = useCallback(() => {
    if (!active.current || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focusedRef.current?.current;
      const viewport = scrollRef.current?.getNativeScrollRef();
      if (!input?.isFocused() || !viewport || !active.current) return;
      viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          if (
            !active.current ||
            focusedRef.current?.current !== input ||
            !input.isFocused()
          )
            return;
          const next = resolveBoundedInputOffset(
            { y: inputY - viewportY + offset.current, height: inputHeight },
            offset.current,
            viewportHeight,
            contentHeight.current,
          );
          if (Math.abs(next - offset.current) > 1) {
            scrollRef.current?.scrollTo({ y: next, animated: true });
          }
        });
      });
    });
  }, []);
  const revealInput = useCallback(
    (input: InputRef) => {
      focusedRef.current = input;
      reveal();
    },
    [reveal],
  );
  useEffect(() => {
    active.current = enabled;
    const shown = Keyboard.addListener('keyboardDidShow', reveal);
    return () => {
      active.current = false;
      shown.remove();
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [enabled, reveal]);

  const scrollProps: Pick<
    ScrollViewProps,
    'onLayout' | 'onContentSizeChange' | 'onScroll' | 'scrollEventThrottle'
  > & { ref: typeof scrollRef } = {
    ref: scrollRef,
    scrollEventThrottle: 16,
    onLayout: reveal,
    onContentSizeChange: (_width, height) => {
      contentHeight.current = height;
      reveal();
    },
    onScroll: event => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
  };
  return { revealInput, scrollProps };
}

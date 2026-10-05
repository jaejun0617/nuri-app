import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useAnimatedStyle } from 'react-native-reanimated';

export function resolveKeyboardBottomPadding(
  closedPadding: number,
  openPadding: number,
  progress: number,
): number {
  'worklet';
  const boundedProgress = Math.min(1, Math.max(0, progress));
  return closedPadding + (openPadding - closedPadding) * boundedProgress;
}

/** The keyboard owns its inset; an attached surface retains only its design gap. */
export function useKeyboardBottomPadding(
  closedPadding: number,
  openPadding = 12,
) {
  const { progress } = useReanimatedKeyboardAnimation();
  return useAnimatedStyle(() => {
    return {
      paddingBottom: resolveKeyboardBottomPadding(
        closedPadding,
        openPadding,
        progress.value,
      ),
    };
  }, [closedPadding, openPadding]);
}

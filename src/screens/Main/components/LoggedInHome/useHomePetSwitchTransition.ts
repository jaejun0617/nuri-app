import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigationMotion } from '../../../../navigation/useNavigationMotion';

export const HOME_PET_SWITCH_DURATION_MS = 220;

/** Presentation follows the committed selection; animation never owns pet identity. */
export function useHomePetSwitchTransition(petId: string | null, focused: boolean, photoUri: string | null = null) {
  const reduceMotion = useNavigationMotion();
  const previousPetId = useRef(petId);
  const progress = useSharedValue(1);
  const settledPhotoUri = useRef<string | null | undefined>(undefined);
  const waitingForPhoto = useRef(false);

  const onPhotoSettled = useCallback((uri: string | null) => {
    if (uri !== photoUri) return;
    settledPhotoUri.current = uri;
    if (!waitingForPhoto.current || !focused || reduceMotion) return;
    waitingForPhoto.current = false;
    progress.value = withTiming(1, {
      duration: HOME_PET_SWITCH_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, photoUri, progress, reduceMotion]);

  useLayoutEffect(() => {
    const previous = previousPetId.current;
    previousPetId.current = petId;
    cancelAnimation(progress);
    progress.value = 1;
    waitingForPhoto.current = false;

    if (previous && petId && previous !== petId && focused && !reduceMotion) {
      progress.value = 0;
      // A fade spent on an invisible loading Image cannot soften its eventual appearance.
      if (photoUri && settledPhotoUri.current !== photoUri) {
        waitingForPhoto.current = true;
      } else {
        progress.value = withTiming(1, {
          duration: HOME_PET_SWITCH_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
    }

    return () => {
      waitingForPhoto.current = false;
      cancelAnimation(progress);
    };
  }, [focused, petId, photoUri, progress, reduceMotion]);

  // Keep the full-bleed photo and its ellipse stationary; only copy has a small lift.
  const photoStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * progress.value,
    transform: [{ translateY: 4 * (1 - progress.value) }],
  }));

  return { photoStyle, contentStyle, onPhotoSettled };
}

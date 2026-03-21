import { BackHandler } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { ScreenEntrySource } from '../navigation/entry';

type Params = {
  entrySource?: ScreenEntrySource;
  onHome: () => void;
  onMore: () => void;
  onFallback: () => void;
};

export function useEntryAwareBackAction({
  entrySource,
  onHome,
  onMore,
  onFallback,
}: Params) {
  const onBack = useCallback(() => {
    if (entrySource === 'more') {
      onMore();
      return;
    }

    if (entrySource === 'home') {
      onHome();
      return;
    }

    onFallback();
  }, [entrySource, onFallback, onHome, onMore]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [onBack]),
  );

  return onBack;
}

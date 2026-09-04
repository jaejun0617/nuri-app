import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getScheduleNotificationSettings,
  type ScheduleNotificationSettings,
} from '../services/schedules/notifications';

/** Refresh capability evidence after returning from Android settings or permission UI. */
export function useScheduleNotificationSettings() {
  const [settings, setSettings] = useState<ScheduleNotificationSettings | null>(
    null,
  );
  const generation = useRef(0);
  const focused = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const next = await getScheduleNotificationSettings();
      if (focused.current && request === generation.current) setSettings(next);
    } catch {
      if (focused.current && request === generation.current) setSettings(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      refresh();
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      return () => {
        focused.current = false;
        generation.current++;
        subscription.remove();
      };
    }, [refresh]),
  );

  return { settings, refresh };
}

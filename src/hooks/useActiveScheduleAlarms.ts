import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  readActiveScheduleAlarms,
  stopActiveScheduleAlarm,
  subscribeToActiveScheduleAlarms,
  type ActiveScheduleAlarm,
} from '../services/schedules/activeAlarm';
import { captureScheduleNotificationLifecycle } from '../services/schedules/notifications';

type Snapshot = {
  scope: string;
  alarms: ActiveScheduleAlarm[];
  error: string | null;
};
const EMPTY_ALARMS: ActiveScheduleAlarm[] = [];

export function useActiveScheduleAlarms(
  userId: string | null,
  pets: ReadonlyArray<{ id: string }>,
  focused: boolean,
) {
  const scope = useMemo(
    () => JSON.stringify([userId, pets.map(pet => pet.id).sort()]),
    [userId, pets],
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequence = useRef(0);
  const mounted = useRef(false);
  const stopping = useRef(new Set<string>());
  const [stoppingKeys, setStoppingKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [snapshot, setSnapshot] = useState<Snapshot>({
    scope,
    alarms: [],
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!userId || !focused || AppState.currentState === 'background') return;
    const request = ++sequence.current;
    const generation = captureScheduleNotificationLifecycle().generation;
    const isCurrent = () =>
      mounted.current &&
      scopeRef.current === scope &&
      sequence.current === request &&
      captureScheduleNotificationLifecycle().generation === generation;
    try {
      const alarms = await readActiveScheduleAlarms();
      if (isCurrent())
        setSnapshot({
          scope,
          alarms: alarms.filter(alarm =>
            pets.some(pet => pet.id === alarm.petId),
          ),
          error: null,
        });
    } catch {
      if (isCurrent())
        setSnapshot({
          scope,
          alarms: [],
          error: '알람 상태를 확인하지 못했어요. 다시 확인해 주세요.',
        });
    }
  }, [focused, pets, scope, userId]);

  useEffect(() => {
    mounted.current = true;
    if (!userId || !focused)
      return () => {
        mounted.current = false;
        sequence.current += 1;
      };
    const unsubscribe = subscribeToActiveScheduleAlarms(() => {
      refresh();
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
      else sequence.current += 1;
    });
    refresh();
    return () => {
      mounted.current = false;
      sequence.current += 1;
      unsubscribe();
      appState.remove();
    };
  }, [focused, refresh, userId]);

  const stop = useCallback(
    async (alarm: ActiveScheduleAlarm) => {
      if (
        !userId ||
        !focused ||
        snapshot.scope !== scope ||
        !snapshot.alarms.some(
          current =>
            current.alarmId === alarm.alarmId && current.token === alarm.token,
        )
      )
        return;
      const key = alarm.token;
      if (stopping.current.has(key)) return;
      stopping.current.add(key);
      setStoppingKeys(new Set(stopping.current));
      const generation = captureScheduleNotificationLifecycle().generation;
      try {
        const stopped = await stopActiveScheduleAlarm(alarm);
        if (
          mounted.current &&
          scopeRef.current === scope &&
          captureScheduleNotificationLifecycle().generation === generation
        ) {
          await refresh();
          if (!stopped)
            setSnapshot(current =>
              current.scope === scope
                ? {
                    ...current,
                    error:
                      '알람 중지 결과를 확인하지 못했어요. 알림창에서도 중지할 수 있어요.',
                  }
                : current,
            );
        }
      } catch {
        if (mounted.current && scopeRef.current === scope)
          setSnapshot(current =>
            current.scope === scope
              ? {
                  ...current,
                  error:
                    '알람을 중지하지 못했어요. 다시 시도하거나 알림창에서 중지해 주세요.',
                }
              : current,
          );
      } finally {
        stopping.current.delete(key);
        if (mounted.current) setStoppingKeys(new Set(stopping.current));
      }
    },
    [focused, refresh, scope, snapshot, userId],
  );

  const visible = Boolean(userId && focused && snapshot.scope === scope);
  const alarms = visible ? snapshot.alarms : EMPTY_ALARMS;
  const activeScheduleIds = useMemo(
    () => new Set(alarms.map(alarm => alarm.scheduleId)),
    [alarms],
  );
  return {
    alarms,
    activeScheduleIds,
    error: visible ? snapshot.error : null,
    stoppingKeys,
    stop,
    refresh,
  };
}

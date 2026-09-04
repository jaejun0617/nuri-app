import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export type ActiveScheduleAlarm = {
  alarmId: string;
  scheduleId: string;
  petId: string;
  token: string;
  title: string;
  body: string;
  occurrenceAtMillis: number;
};

type AlarmModule = {
  getActiveAlarms?: () => Promise<unknown>;
  stopActiveAlarm?: (alarmId: string, token: string) => Promise<unknown>;
};

function nativeModule(): AlarmModule | null {
  const value: unknown = NativeModules.NuriScheduleNotifications;
  return Platform.OS === 'android' &&
    typeof value === 'object' &&
    value !== null
    ? (value as AlarmModule)
    : null;
}

export function normalizeActiveScheduleAlarms(
  value: unknown,
): ActiveScheduleAlarm[] {
  if (!Array.isArray(value)) throw new Error('invalid-alarm-state');
  return value.filter((item: unknown): item is ActiveScheduleAlarm => {
    if (typeof item !== 'object' || item === null) return false;
    const alarm = item as Record<string, unknown>;
    return (
      ['alarmId', 'scheduleId', 'petId', 'token', 'title', 'body'].every(
        key => typeof alarm[key] === 'string' && alarm[key].trim().length > 0,
      ) &&
      typeof alarm.occurrenceAtMillis === 'number' &&
      Number.isFinite(alarm.occurrenceAtMillis) &&
      alarm.occurrenceAtMillis > 0
    );
  });
}

export async function readActiveScheduleAlarms(): Promise<
  ActiveScheduleAlarm[]
> {
  if (Platform.OS !== 'android') return [];
  const module = nativeModule();
  if (typeof module?.getActiveAlarms !== 'function')
    throw new Error('alarm-state-unavailable');
  return normalizeActiveScheduleAlarms(await module.getActiveAlarms());
}

export async function stopActiveScheduleAlarm(
  alarm: ActiveScheduleAlarm,
): Promise<boolean> {
  const module = nativeModule();
  if (typeof module?.stopActiveAlarm !== 'function')
    throw new Error('alarm-stop-unavailable');
  // Stop the delivered token only, never cancel the schedule's next recurrence.
  return (await module.stopActiveAlarm(alarm.alarmId, alarm.token)) === true;
}

export function subscribeToActiveScheduleAlarms(listener: () => void) {
  const subscription = DeviceEventEmitter.addListener(
    'NuriScheduleAlarmStateChanged',
    listener,
  );
  return () => subscription.remove();
}

import { Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../supabase/client';
import { fetchNotificationSchedules, fetchScheduleById } from '../supabase/schedules';
import { readActiveScheduleAlarms } from './activeAlarm';
import {
  captureScheduleNotificationLifecycle,
  getScheduleNotificationSettings,
  setScheduleNotificationEnabled,
  upsertScheduleNotification,
} from './notifications';

let sequence = 0;
let pending: { owner: string; enabled: boolean; task: Promise<void> } | null = null;

/** Reuse the sole native alarm engine; server schedule events remain inbox-only. */
export function reconcileScheduleNotificationPreference(owner: string, enabled: boolean): Promise<void> {
  if (pending?.owner === owner && pending.enabled === enabled) return pending.task;
  const request = ++sequence;
  const generation = captureScheduleNotificationLifecycle().generation;
  const current = () => {
    if (useAuthStore.getState().session?.user.id !== owner || request !== sequence)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  };
  const task = (async () => {
    current();
    if (Platform.OS !== 'android') throw new Error('NURI_NOTIFICATION_SCHEDULE_UNSUPPORTED');
    if (!enabled) {
      await setScheduleNotificationEnabled(false);
      current();
      return;
    }
    const schedules = await fetchNotificationSchedules(owner);
    current();
    if (captureScheduleNotificationLifecycle().generation !== generation)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    const active = await readActiveScheduleAlarms();
    current();
    if (captureScheduleNotificationLifecycle().generation !== generation)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    await setScheduleNotificationEnabled(true);
    current();
    const lifecycle = captureScheduleNotificationLifecycle();
    const activeIds = new Set(active.map(alarm => alarm.scheduleId));
    let failed = false;
    for (const schedule of schedules) {
      current();
      if (schedule.userId !== owner || schedule.completedAt || schedule.syncStatus === 'deleted' || !schedule.reminderMinutes.length || activeIds.has(schedule.id)) continue;
      let latest;
      try { latest = await fetchScheduleById(schedule.id); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') continue;
        throw error;
      }
      current();
      if (latest.userId !== owner || latest.completedAt || latest.syncStatus === 'deleted' || !latest.reminderMinutes.length) continue;
      const result = await upsertScheduleNotification(latest, lifecycle, true);
      current();
      if (!['scheduled', 'cleared', 'skipped-past'].includes(result.status)) failed = true;
    }
    if (failed) throw new Error('NURI_NOTIFICATION_SCHEDULE_REARM_INCOMPLETE');
  })().finally(() => { if (pending?.task === task) pending = null; });
  pending = { owner, enabled, task };
  return task;
}

/** No setting key means legacy device preference; never silently opt existing users in. */
export async function syncAccountScheduleNotificationPreference(owner: string) {
  if (Platform.OS !== 'android' || useAuthStore.getState().session?.user.id !== owner) return;
  const generation = captureScheduleNotificationLifecycle().generation;
  const result = await supabase.rpc('manage_user_notification_preferences_v3');
  if (result.error) throw result.error;
  if (useAuthStore.getState().session?.user.id !== owner || generation !== captureScheduleNotificationLifecycle().generation) return;
  const value: unknown = result.data;
  if (!value || typeof value !== 'object' || !('categories' in value) || !value.categories || typeof value.categories !== 'object')
    throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  if (!('schedule' in value.categories)) return;
  if (typeof value.categories.schedule !== 'boolean') throw new Error('NURI_NOTIFICATION_SETTINGS_INVALID');
  const settings = await getScheduleNotificationSettings();
  if (useAuthStore.getState().session?.user.id !== owner || generation !== captureScheduleNotificationLifecycle().generation) return;
  if (!value.categories.schedule && !settings.enabled) return;
  await reconcileScheduleNotificationPreference(owner, value.categories.schedule);
}

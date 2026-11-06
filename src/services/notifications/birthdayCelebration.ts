import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import { fetchNotificationDetail, type UserNotificationItem } from './userNotifications';
import { notificationDateKey, resolvedNotificationTimeZone } from './notificationPresentation';

export function birthdayPetId(item: UserNotificationItem): string | null {
  return item.eventType === 'pet.birthday' && item.actionTarget?.kind === 'pet_anniversary'
    ? item.actionTarget.petId : null;
}

export function isBirthdayToday(item: UserNotificationItem, now = new Date()): boolean {
  if (!birthdayPetId(item)) return false;
  const zone = resolvedNotificationTimeZone(item.timeZone);
  return notificationDateKey(item.availableAt ?? item.createdAt, zone) === notificationDateKey(now.toISOString(), zone);
}

/** IDs are discovered under owner RLS; the existing detail RPC still validates
 * availability and target access. No client-created birthday or read mutation. */
export async function fetchHomeBirthday(owner: string, petId: string): Promise<UserNotificationItem | null> {
  const { data, error } = await supabase.from('user_notifications').select('id')
    .eq('user_id', owner).eq('pet_id', petId).eq('event_type', 'pet.birthday')
    .is('dismissed_at', null).order('available_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const item = await fetchNotificationDetail(data.id, 'user');
  return birthdayPetId(item) === petId && isBirthdayToday(item) ? item : null;
}

// Presentation only. Closing the greeting never changes canonical unread state.
export async function claimHomeBirthday(owner: string, petId: string, item: UserNotificationItem): Promise<boolean> {
  if (birthdayPetId(item) !== petId || !isBirthdayToday(item)) return false;
  const date = notificationDateKey(item.availableAt ?? item.createdAt, resolvedNotificationTimeZone(item.timeZone));
  const key = `nuri.birthday.presented.v1:${owner}:${petId}`;
  if (await AsyncStorage.getItem(key) === date) return false;
  await AsyncStorage.setItem(key, date);
  return true;
}

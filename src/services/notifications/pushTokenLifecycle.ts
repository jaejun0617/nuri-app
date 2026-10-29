// 파일: src/services/notifications/pushTokenLifecycle.ts
// 목적:
// - 실제 push provider를 아직 활성화하지 않은 상태에서도 사용자 수신 동의와 기기 lifecycle을 서버 계약에 맞춰 저장한다.
// - FCM/Expo/APNS token을 가짜로 만들지 않고, provider token이 없으면 provider_unavailable 상태로만 기록한다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../supabase/client';
import { useAuthStore } from '../../store/authStore';
import {
  bindNativePushOwner,
  clearNativePushOwner,
  getNativePushToken,
} from './nativePush';

const DEVICE_INSTALL_ID_KEY = 'nuri:notification-device-install-id:v1';

export type PushTokenLifecycleState = {
  pushOptIn: boolean;
  providerStatus: 'registered' | 'provider_unavailable' | 'revoked' | 'unknown';
};

function getPlatformLabel(): 'android' | 'ios' | 'unknown' {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'unknown';
}

function createInstallId(): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `nuri-${Date.now().toString(36)}-${randomPart}`;
}

let installIdRead: Promise<string> | null = null;
export function getNotificationDeviceInstallId(): Promise<string> {
  if (installIdRead) return installIdRead;
  installIdRead = readInstallId().finally(() => {
    installIdRead = null;
  });
  return installIdRead;
}
async function readInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  if (existing && existing.trim().length >= 12) return existing;

  const next = createInstallId();
  await AsyncStorage.setItem(DEVICE_INSTALL_ID_KEY, next);
  return next;
}

export async function setPushNotificationOptIn(
  enabled: boolean,
): Promise<PushTokenLifecycleState> {
  const owner = useAuthStore.getState().session?.user.id;
  if (!owner) throw new Error('NURI_NOTIFICATION_AUTH_REQUIRED');
  const current = () => useAuthStore.getState().session?.user.id === owner;
  const { error } = await supabase.rpc('set_user_notification_opt_in_v1', {
    p_push_opt_in: enabled,
    p_categories: {},
  });
  if (error) throw error;
  if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');

  if (!enabled) {
    await revokeCurrentDevicePushToken('user_opt_out').catch(() => {});
    if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
    return { pushOptIn: false, providerStatus: 'revoked' };
  }

  const registered = await syncPushNotificationDevice();
  if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  if (registered) return { pushOptIn: true, providerStatus: 'registered' };
  const deviceId = await getNotificationDeviceInstallId();
  if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  const registerResult = await supabase.rpc('upsert_user_push_token_v1', {
    p_device_id: deviceId,
    p_platform: getPlatformLabel(),
    p_provider: 'disabled',
    p_token_fingerprint: null,
    p_token_ciphertext: null,
    p_opt_in: true,
  });
  if (registerResult.error) throw registerResult.error;
  if (!current()) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');

  return { pushOptIn: true, providerStatus: 'provider_unavailable' };
}

export async function fetchPushNotificationLifecycleState(): Promise<PushTokenLifecycleState> {
  const owner = useAuthStore.getState().session?.user.id;
  if (!owner) return { pushOptIn: false, providerStatus: 'revoked' };
  const current = () => {
    if (useAuthStore.getState().session?.user.id !== owner)
      throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  };
  const preferenceResult = await supabase
    .from('user_notification_preferences')
    .select('push_opt_in')
    .maybeSingle();
  if (preferenceResult.error) throw preferenceResult.error;
  current();

  const pushOptIn = preferenceResult.data?.push_opt_in === true;
  if (!pushOptIn) return { pushOptIn: false, providerStatus: 'revoked' };

  const deviceId = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  current();
  if (!deviceId) return { pushOptIn, providerStatus: 'provider_unavailable' };

  const tokenResult = await supabase
    .from('user_push_tokens')
    .select('token_status')
    .eq('device_id', deviceId)
    .eq('provider', 'fcm')
    .maybeSingle();
  if (tokenResult.error) throw tokenResult.error;
  current();

  const status = tokenResult.data?.token_status;
  if (!tokenResult.data)
    return { pushOptIn, providerStatus: 'provider_unavailable' };
  if (status === 'active') return { pushOptIn, providerStatus: 'registered' };
  if (status === 'provider_unavailable') {
    return { pushOptIn, providerStatus: 'provider_unavailable' };
  }
  if (status === 'revoked') return { pushOptIn, providerStatus: 'revoked' };
  return { pushOptIn, providerStatus: 'unknown' };
}

export async function revokeCurrentDevicePushToken(
  reason: 'user_logout' | 'user_opt_out' | 'account_deleted' = 'user_logout',
): Promise<number> {
  const owner = useAuthStore.getState().session?.user.id;
  await clearNativePushOwner(owner);
  const deviceId = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  if (!deviceId || useAuthStore.getState().session?.user.id !== owner) return 0;

  const { data, error } = await supabase.rpc('revoke_user_push_token_v1', {
    p_device_id: deviceId,
    p_provider: null,
    p_reason: reason,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

const deviceSync = new Map<string, {
  promise: Promise<boolean>;
  isCurrent: () => boolean;
}>();
let deviceSyncTail: Promise<void> = Promise.resolve();
/** No permission prompt or token acquisition before explicit opt-in and server readiness. */
export function syncPushNotificationDevice(): Promise<boolean> {
  const session = useAuthStore.getState().session;
  const owner = session?.user.id;
  if (!session || !owner || !session.access_token || Platform.OS !== 'android')
    return Promise.resolve(false);
  const pending = deviceSync.get(owner);
  if (pending?.isCurrent()) return pending.promise;
  let active = true;
  const unsubscribe = useAuthStore.subscribe((next, previous) => {
    if (next.session?.user.id !== previous.session?.user.id) active = false;
  });
  const isCurrent = () => active && useAuthStore.getState().session?.user.id === owner;
  // One installation shares one server device lock across owners. Do not let B
  // overtake A's unresolved request; this is not server-side fencing after a
  // transport failure or process death, where A's commit can remain unknown.
  const task = deviceSyncTail.then(() => syncDevice(session, isCurrent)).finally(() => {
    unsubscribe();
    if (deviceSync.get(owner)?.promise === task) deviceSync.delete(owner);
  });
  deviceSyncTail = task.then(() => undefined, () => undefined);
  deviceSync.set(owner, { promise: task, isCurrent });
  return task;
}
async function syncDevice(session: Session, isCurrent: () => boolean): Promise<boolean> {
  const owner = session.user.id;
  if (!isCurrent() || !session.access_token || Platform.OS !== 'android')
    return false;
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const preference = await supabase
    .from('user_notification_preferences')
    .select('push_opt_in')
    .maybeSingle();
  if (preference.error) throw preference.error;
  if (!isCurrent()) return false;
  if (!preference.data?.push_opt_in) {
    await clearNativePushOwner(owner);
    return false;
  }
  const status = await supabase.functions.invoke('notification-device-v3', {
    body: { action: 'status' },
    headers,
  });
  if (status.error || status.data?.configured !== true) return false;
  if (!isCurrent()) return false;
  const token = await getNativePushToken();
  if (!token) return false;
  const deviceId = await getNotificationDeviceInstallId();
  if (!isCurrent()) return false;
  const registration = await supabase.functions.invoke(
    'notification-device-v3',
    { body: { action: 'register', deviceId, token }, headers },
  );
  if (registration.error) throw registration.error;
  if (
    registration.data?.registered !== true ||
    !isCurrent()
  )
    return false;
  await bindNativePushOwner(owner);
  if (!isCurrent()) {
    await clearNativePushOwner(owner);
    return false;
  }
  return true;
}

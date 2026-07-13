// 파일: src/services/notifications/pushTokenLifecycle.ts
// 목적:
// - 실제 push provider를 아직 활성화하지 않은 상태에서도 사용자 수신 동의와 기기 lifecycle을 서버 계약에 맞춰 저장한다.
// - FCM/Expo/APNS token을 가짜로 만들지 않고, provider token이 없으면 provider_unavailable 상태로만 기록한다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '../supabase/client';

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

export async function getNotificationDeviceInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  if (existing && existing.trim().length >= 12) return existing;

  const next = createInstallId();
  await AsyncStorage.setItem(DEVICE_INSTALL_ID_KEY, next);
  return next;
}

export async function setPushNotificationOptIn(enabled: boolean): Promise<PushTokenLifecycleState> {
  const { error } = await supabase.rpc('set_user_notification_opt_in_v1', {
    p_push_opt_in: enabled,
    p_categories: {
      service: enabled,
      community: enabled,
      schedule: enabled,
    },
  });
  if (error) throw error;

  if (!enabled) {
    await revokeCurrentDevicePushToken('user_opt_out').catch(() => {});
    return { pushOptIn: false, providerStatus: 'revoked' };
  }

  const deviceId = await getNotificationDeviceInstallId();
  const registerResult = await supabase.rpc('upsert_user_push_token_v1', {
    p_device_id: deviceId,
    p_platform: getPlatformLabel(),
    p_provider: 'disabled',
    p_token_fingerprint: null,
    p_token_ciphertext: null,
    p_opt_in: true,
  });
  if (registerResult.error) throw registerResult.error;

  return { pushOptIn: true, providerStatus: 'provider_unavailable' };
}

export async function fetchPushNotificationLifecycleState(): Promise<PushTokenLifecycleState> {
  const preferenceResult = await supabase
    .from('user_notification_preferences')
    .select('push_opt_in')
    .maybeSingle();
  if (preferenceResult.error) throw preferenceResult.error;

  const pushOptIn = preferenceResult.data?.push_opt_in === true;
  if (!pushOptIn) return { pushOptIn: false, providerStatus: 'revoked' };

  const deviceId = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  if (!deviceId) return { pushOptIn, providerStatus: 'provider_unavailable' };

  const tokenResult = await supabase
    .from('user_push_tokens')
    .select('token_status')
    .eq('device_id', deviceId)
    .eq('provider', 'disabled')
    .maybeSingle();
  if (tokenResult.error) throw tokenResult.error;

  const status = tokenResult.data?.token_status;
  if (status === 'active') return { pushOptIn, providerStatus: 'registered' };
  if (status === 'provider_unavailable') {
    return { pushOptIn, providerStatus: 'provider_unavailable' };
  }
  if (status === 'revoked') return { pushOptIn: false, providerStatus: 'revoked' };
  return { pushOptIn, providerStatus: 'unknown' };
}

export async function revokeCurrentDevicePushToken(
  reason: 'user_logout' | 'user_opt_out' | 'account_deleted' = 'user_logout',
): Promise<number> {
  const deviceId = await AsyncStorage.getItem(DEVICE_INSTALL_ID_KEY);
  if (!deviceId) return 0;

  const { data, error } = await supabase.rpc('revoke_user_push_token_v1', {
    p_device_id: deviceId,
    p_provider: 'disabled',
    p_reason: reason,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

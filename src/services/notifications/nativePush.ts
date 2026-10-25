import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

type NativePush = {
  getToken: () => Promise<string | null>;
  bindOwner: (owner: string) => Promise<boolean>;
  clearOwner: (expectedOwner: string | null) => Promise<boolean>;
  consumeInitialTap: () => Promise<unknown>;
  getChannelStates: () => Promise<unknown>;
  getChannelStatusDetails?: () => Promise<unknown>;
};
function bridge(): NativePush | null {
  const raw: unknown = NativeModules.NuriPushNotifications;
  if (Platform.OS !== 'android' || !raw || typeof raw !== 'object') return null;
  if (
    !('getToken' in raw) ||
    typeof raw.getToken !== 'function' ||
    !('bindOwner' in raw) ||
    typeof raw.bindOwner !== 'function' ||
    !('clearOwner' in raw) ||
    typeof raw.clearOwner !== 'function' ||
    !('consumeInitialTap' in raw) ||
    typeof raw.consumeInitialTap !== 'function' ||
    !('getChannelStates' in raw) ||
    typeof raw.getChannelStates !== 'function'
  )
    return null;
  return raw as NativePush;
}
export type NotificationTap = {
  id: string;
  source: 'user' | 'announcement';
  recipientUserId: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseNotificationTap(raw: unknown): NotificationTap | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('id' in raw) ||
    !('source' in raw) ||
    !('recipientUserId' in raw)
  )
    return null;
  if (
    typeof raw.id !== 'string' ||
    !uuid.test(raw.id) ||
    typeof raw.recipientUserId !== 'string' ||
    !uuid.test(raw.recipientUserId) ||
    (raw.source !== 'user' && raw.source !== 'announcement')
  )
    return null;
  return {
    id: raw.id,
    source: raw.source,
    recipientUserId: raw.recipientUserId,
  };
}
export async function getNativePushToken() {
  return bridge()?.getToken() ?? null;
}
export async function bindNativePushOwner(owner: string) {
  return bridge()?.bindOwner(owner) ?? false;
}
export async function clearNativePushOwner(expectedOwner?: string | null) {
  await bridge()?.clearOwner(expectedOwner ?? null);
}
export async function consumeInitialNotificationTap() {
  return parseNotificationTap(await bridge()?.consumeInitialTap());
}

export async function readNativePushChannelStates(): Promise<Record<
  'news' | 'community' | 'activity' | 'record',
  boolean
> | null> {
  const value = await bridge()?.getChannelStates();
  if (
    !value ||
    typeof value !== 'object' ||
    !('news' in value) ||
    !('community' in value) ||
    !('activity' in value) ||
    !('record' in value)
  )
    return null;
  if (
    typeof value.news !== 'boolean' ||
    typeof value.community !== 'boolean' ||
    typeof value.activity !== 'boolean' ||
    typeof value.record !== 'boolean'
  )
    return null;
  return {
    news: value.news,
    community: value.community,
    activity: value.activity,
    record: value.record,
  };
}
export type PushChannelStatus = 'missing' | 'blocked' | 'ready' | 'not-required';
export type PushChannelDetails = { appEnabled: boolean; channels: Record<'news' | 'community' | 'activity' | 'record', PushChannelStatus> };
export async function readNativePushChannelDetails(): Promise<PushChannelDetails | null> {
  const value: unknown = await bridge()?.getChannelStatusDetails?.();
  if (!value || typeof value !== 'object' || !('appEnabled' in value) || typeof value.appEnabled !== 'boolean') return null;
  const valid = (raw: unknown): raw is PushChannelStatus => raw === 'missing' || raw === 'blocked' || raw === 'ready' || raw === 'not-required';
  if (!('news' in value) || !valid(value.news) || !('community' in value) || !valid(value.community) || !('activity' in value) || !valid(value.activity) || !('record' in value) || !valid(value.record)) return null;
  return { appEnabled: value.appEnabled, channels: { news: value.news, community: value.community, activity: value.activity, record: value.record } };
}
export function observeNativePush(
  onTap: (tap: NotificationTap) => void,
  onChange: () => void,
) {
  const tap = DeviceEventEmitter.addListener('NuriPushTap', (raw: unknown) => {
    const value = parseNotificationTap(raw);
    if (value) onTap(value);
  });
  const token = DeviceEventEmitter.addListener(
    'NuriPushTokenChanged',
    onChange,
  );
  const received = DeviceEventEmitter.addListener('NuriPushReceived', onChange);
  return () => {
    tap.remove();
    token.remove();
    received.remove();
  };
}

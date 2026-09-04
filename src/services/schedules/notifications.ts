import {
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  PushNotificationIOS,
} from 'react-native';

import type { PetSchedule, ScheduleRepeatRule } from '../supabase/schedules';

const ANDROID_POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';
const IOS_NOTIFICATION_USER_INFO_TYPE = 'schedule';

export type ScheduleNotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported';

export type ScheduleNotificationExactAlarmStatus =
  | 'granted'
  | 'not-granted'
  | 'not-required'
  | 'unknown'
  | 'unsupported';

export type ScheduleNotificationChannelStatus =
  | 'ready'
  | 'missing'
  | 'blocked'
  | 'unknown'
  | 'not-required'
  | 'unsupported';

export type ScheduleNotificationDelivery =
  | 'exact'
  | 'inexact'
  | 'unknown'
  | 'not-applicable';

export type ScheduleNotificationSyncStatus =
  | 'scheduled'
  | 'cleared'
  | 'disabled'
  | 'missing-permission'
  | 'missing-exact-alarm'
  | 'channel-blocked'
  | 'unsupported'
  | 'skipped-past'
  | 'partial-failure'
  | 'failed'
  | 'cancelled';

export type ScheduleNotificationDeviceAlarmStatus =
  | 'scheduled'
  | 'cleared'
  | 'not-scheduled'
  | 'partial'
  | 'unsupported';

export type ScheduleNotificationSyncResult = {
  status: ScheduleNotificationSyncStatus;
  persistedRecord: 'unchanged';
  deviceAlarm: ScheduleNotificationDeviceAlarmStatus;
  delivery: ScheduleNotificationDelivery;
  permission: ScheduleNotificationPermissionStatus;
  exactAlarm: ScheduleNotificationExactAlarmStatus;
  channel: ScheduleNotificationChannelStatus;
  errorCode?: string;
};

export type ScheduleNotificationSettings = {
  enabled: boolean;
  platform: typeof Platform.OS;
  nativeSupported: boolean;
  permission: ScheduleNotificationPermissionStatus;
  exactAlarm: ScheduleNotificationExactAlarmStatus;
  channel: ScheduleNotificationChannelStatus;
  delivery: ScheduleNotificationDelivery;
  canOpenExactAlarmSettings: boolean;
};

export type ScheduleNotificationFeedback = {
  tone: 'info' | 'warning' | 'error';
  title: string;
  message: string;
};

export type ScheduleNotificationLifecycleContext = {
  generation: number;
};

type AndroidScheduleNotificationPayload = {
  alarmId: string;
  scheduleId: string;
  petId: string;
  title: string;
  body: string;
  note: string;
  fireAtMillis: number;
  occurrenceAtMillis: number;
  repeatRule: ScheduleRepeatRule;
};

type AndroidScheduleNotificationsModule = {
  schedule: (payload: AndroidScheduleNotificationPayload) => Promise<unknown>;
  cancel?: (scheduleId: string) => void;
  cancelAll?: () => Promise<unknown> | void;
  getSettings?: () => Promise<{ enabled: boolean }>;
  getRuntimeCapabilities?: () => Promise<unknown>;
  setEnabled?: (enabled: boolean) => Promise<{ enabled: boolean }>;
  openAppNotificationSettings?: () => void;
  openExactAlarmSettings?: () => void | Promise<boolean | void>;
};

export type SchedulableSchedule = Pick<
  PetSchedule,
  | 'id'
  | 'petId'
  | 'title'
  | 'note'
  | 'startsAt'
  | 'repeatRule'
  | 'reminderMinutes'
  | 'completedAt'
>;

type NativeScheduleResult = {
  status: ScheduleNotificationSyncStatus;
  delivery?: ScheduleNotificationDelivery;
  errorCode?: string;
};

let notificationGeneration = 0;
let operationSequence = 0;
const scheduleOperationTokens = new Map<string, number>();

export function captureScheduleNotificationLifecycle(): ScheduleNotificationLifecycleContext {
  return { generation: notificationGeneration };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getAndroidScheduleNotifications():
  | AndroidScheduleNotificationsModule
  | undefined {
  const nativeModule = NativeModules.NuriScheduleNotifications as unknown;
  if (!isRecord(nativeModule)) return undefined;
  return nativeModule as AndroidScheduleNotificationsModule;
}

function hasAndroidScheduleNotificationModule() {
  const nativeModule = getAndroidScheduleNotifications();
  return (
    Platform.OS === 'android' &&
    typeof nativeModule?.schedule === 'function' &&
    typeof nativeModule.cancel === 'function'
  );
}

function isSyncStatus(value: unknown): value is ScheduleNotificationSyncStatus {
  return (
    value === 'scheduled' ||
    value === 'cleared' ||
    value === 'disabled' ||
    value === 'missing-permission' ||
    value === 'missing-exact-alarm' ||
    value === 'channel-blocked' ||
    value === 'unsupported' ||
    value === 'skipped-past' ||
    value === 'partial-failure' ||
    value === 'failed' ||
    value === 'cancelled'
  );
}

function isDelivery(value: unknown): value is ScheduleNotificationDelivery {
  return (
    value === 'exact' ||
    value === 'inexact' ||
    value === 'unknown' ||
    value === 'not-applicable'
  );
}

function isExactAlarmStatus(
  value: unknown,
): value is ScheduleNotificationExactAlarmStatus {
  return (
    value === 'granted' ||
    value === 'not-granted' ||
    value === 'not-required' ||
    value === 'unknown' ||
    value === 'unsupported'
  );
}

function isChannelStatus(
  value: unknown,
): value is ScheduleNotificationChannelStatus {
  return (
    value === 'ready' ||
    value === 'missing' ||
    value === 'blocked' ||
    value === 'unknown' ||
    value === 'not-required' ||
    value === 'unsupported'
  );
}

function isAndroidNotificationRuntimePermissionRequired() {
  if (Platform.OS !== 'android') return false;
  return Number(Platform.Version) >= 33;
}

function hasReminder(reminderMinutes: number[] | null | undefined) {
  return Array.isArray(reminderMinutes) && reminderMinutes.length > 0;
}

function mapRepeatRuleToIosRepeatInterval(
  repeatRule: ScheduleRepeatRule,
): 'day' | 'week' | 'month' | 'year' | undefined {
  switch (repeatRule) {
    case 'daily':
      return 'day';
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
    case 'yearly':
      return 'year';
    case 'none':
    default:
      return undefined;
  }
}

function buildScheduleNotificationBody(
  _schedule: SchedulableSchedule,
  reminderMinutes: number,
) {
  return reminderMinutes > 0
    ? `저장한 일정 시간이 ${reminderMinutes}분 뒤에 다가와요.`
    : '저장한 일정 시간이 다가오고 있어요.';
}

function buildNotificationFireDate(
  schedule: SchedulableSchedule,
  reminderMinutes: number,
) {
  const startsAtTime = new Date(schedule.startsAt).getTime();
  if (Number.isNaN(startsAtTime)) return null;

  const fireDate = startsAtTime - reminderMinutes * 60 * 1000;
  if (fireDate <= Date.now()) return null;

  return fireDate;
}

function buildAlarmId(
  scheduleId: string,
  reminderMinutes: number,
  index: number,
) {
  return `${scheduleId}::${reminderMinutes}::${index}`;
}

function buildNotificationFireEntries(schedule: SchedulableSchedule) {
  return [...new Set(schedule.reminderMinutes ?? [])]
    .filter(value => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right)
    .map((reminderMinutes, index) => ({
      alarmId: buildAlarmId(schedule.id, reminderMinutes, index),
      reminderMinutes,
      fireDate: buildNotificationFireDate(schedule, reminderMinutes),
    }))
    .filter(
      (
        entry,
      ): entry is {
        alarmId: string;
        reminderMinutes: number;
        fireDate: number;
      } => entry.fireDate !== null,
    );
}

function beginScheduleOperation(scheduleId: string) {
  const token = ++operationSequence;
  scheduleOperationTokens.set(scheduleId, token);
  return { generation: notificationGeneration, token };
}

function isCurrentScheduleOperation(
  scheduleId: string,
  operation: { generation: number; token: number },
) {
  return (
    notificationGeneration === operation.generation &&
    scheduleOperationTokens.get(scheduleId) === operation.token
  );
}

function invalidateScheduleOperation(scheduleId: string) {
  scheduleOperationTokens.set(scheduleId, ++operationSequence);
}

function invalidateAllScheduleOperations() {
  notificationGeneration += 1;
}

function cancelNativeScheduleNotification(scheduleId: string) {
  if (Platform.OS === 'android') {
    getAndroidScheduleNotifications()?.cancel?.(scheduleId);
    return hasAndroidScheduleNotificationModule();
  }

  if (Platform.OS !== 'ios') return false;

  PushNotificationIOS.cancelLocalNotifications({
    type: IOS_NOTIFICATION_USER_INFO_TYPE,
    scheduleId,
  });
  return true;
}

function cancelStaleOperationIfStillOwner(
  scheduleId: string,
  operation: { generation: number; token: number },
) {
  // JS tokens prevent stale decisions. NURI-12 must additionally serialize
  // native schedule/cancel calls on one queue; this final cancel handles an
  // in-flight native Promise that resolves after clear-all.
  if (scheduleOperationTokens.get(scheduleId) !== operation.token) return;
  cancelNativeScheduleNotification(scheduleId);
}

function createSyncResult(
  status: ScheduleNotificationSyncStatus,
  values: Partial<
    Omit<ScheduleNotificationSyncResult, 'status' | 'persistedRecord'>
  > = {},
): ScheduleNotificationSyncResult {
  return {
    status,
    persistedRecord: 'unchanged',
    deviceAlarm: values.deviceAlarm ?? 'not-scheduled',
    delivery: values.delivery ?? 'unknown',
    permission: values.permission ?? 'unsupported',
    exactAlarm: values.exactAlarm ?? 'unknown',
    channel: values.channel ?? 'unknown',
    ...(values.errorCode ? { errorCode: values.errorCode } : {}),
  };
}

function normalizeNativeScheduleResult(
  value: unknown,
  fallbackDelivery: ScheduleNotificationDelivery,
): NativeScheduleResult {
  if (typeof value === 'string' && isSyncStatus(value)) {
    return { status: value, delivery: fallbackDelivery };
  }

  if (isRecord(value)) {
    const status = isSyncStatus(value.status) ? value.status : 'failed';
    return {
      status,
      delivery: isDelivery(value.delivery) ? value.delivery : fallbackDelivery,
      ...(typeof value.errorCode === 'string'
        ? { errorCode: value.errorCode }
        : {}),
    };
  }

  return { status: 'failed', delivery: fallbackDelivery };
}

function normalizeRuntimeCapabilities(
  value: unknown,
  fallback: { enabled: boolean },
) {
  if (!isRecord(value)) {
    return {
      enabled: fallback.enabled,
      exactAlarm: 'unknown' as const,
      channel: 'unknown' as const,
      delivery: 'unknown' as const,
      canOpenExactAlarmSettings: false,
    };
  }

  const exactAlarm = isExactAlarmStatus(value.exactAlarm)
    ? value.exactAlarm
    : 'unknown';
  const channel = isChannelStatus(value.channel) ? value.channel : 'unknown';

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled,
    exactAlarm,
    channel,
    delivery: isDelivery(value.delivery)
      ? value.delivery
      : exactAlarm === 'granted'
      ? 'exact'
      : exactAlarm === 'not-granted'
      ? 'inexact'
      : 'unknown',
    canOpenExactAlarmSettings: value.canOpenExactAlarmSettings === true,
  };
}

async function readScheduleNotificationSettings(
  permission: ScheduleNotificationPermissionStatus,
): Promise<ScheduleNotificationSettings> {
  if (Platform.OS === 'ios') {
    return {
      enabled: true,
      platform: Platform.OS,
      nativeSupported: true,
      permission,
      exactAlarm: 'not-required',
      channel: 'not-required',
      delivery: permission === 'granted' ? 'exact' : 'unknown',
      canOpenExactAlarmSettings: false,
    };
  }

  if (Platform.OS !== 'android') {
    return {
      enabled: false,
      platform: Platform.OS,
      nativeSupported: false,
      permission,
      exactAlarm: 'unsupported',
      channel: 'unsupported',
      delivery: 'not-applicable',
      canOpenExactAlarmSettings: false,
    };
  }

  const nativeModule = getAndroidScheduleNotifications();
  if (!hasAndroidScheduleNotificationModule() || !nativeModule) {
    return {
      enabled: false,
      platform: Platform.OS,
      nativeSupported: false,
      permission,
      exactAlarm: 'unsupported',
      channel: 'unsupported',
      delivery: 'not-applicable',
      canOpenExactAlarmSettings: false,
    };
  }

  let enabled = true;
  if (typeof nativeModule.getSettings === 'function') {
    try {
      const nativeSettings = await nativeModule.getSettings();
      enabled = nativeSettings.enabled;
    } catch {
      enabled = true;
    }
  }

  if (typeof nativeModule.getRuntimeCapabilities !== 'function') {
    return {
      enabled,
      platform: Platform.OS,
      nativeSupported: true,
      permission,
      exactAlarm: 'unknown',
      channel: 'unknown',
      delivery: 'unknown',
      canOpenExactAlarmSettings:
        typeof nativeModule.openExactAlarmSettings === 'function',
    };
  }

  try {
    const capabilities = normalizeRuntimeCapabilities(
      await nativeModule.getRuntimeCapabilities(),
      { enabled },
    );
    return {
      enabled: capabilities.enabled,
      platform: Platform.OS,
      nativeSupported: true,
      permission,
      exactAlarm: capabilities.exactAlarm,
      channel: capabilities.channel,
      delivery: capabilities.delivery,
      canOpenExactAlarmSettings:
        capabilities.canOpenExactAlarmSettings ||
        typeof nativeModule.openExactAlarmSettings === 'function',
    };
  } catch {
    return {
      enabled,
      platform: Platform.OS,
      nativeSupported: true,
      permission,
      exactAlarm: 'unknown',
      channel: 'unknown',
      delivery: 'unknown',
      canOpenExactAlarmSettings:
        typeof nativeModule.openExactAlarmSettings === 'function',
    };
  }
}

export function getScheduleNotificationAudit(schedule: SchedulableSchedule) {
  return {
    hasReminder: hasReminder(schedule.reminderMinutes),
    persistsToScheduleRecord: true,
    canRequestPermission:
      Platform.OS === 'ios' || isAndroidNotificationRuntimePermissionRequired(),
    deliversOsNotification:
      Platform.OS === 'ios' || hasAndroidScheduleNotificationModule(),
    permissionFlowImplemented: true,
    expandableToHomeListDetail: true,
  };
}

export function getScheduleNotificationHelperText(
  reminderMinutes: number[],
  permissionStatus: ScheduleNotificationPermissionStatus,
  settings?: ScheduleNotificationSettings | null,
) {
  if (!hasReminder(reminderMinutes)) {
    return '알림을 끄면 일정 데이터만 저장되고 기기 알림은 예약하지 않아요.';
  }

  if (permissionStatus !== 'granted') {
    return '권한이 꺼져 있어도 일정값은 저장되지만 실제 기기 알림은 오지 않아요.';
  }

  if (Platform.OS === 'ios') {
    return '저장 후 iOS 로컬 알림 예약을 시도해요. 완료 처리하거나 알림을 끄면 예약도 정리됩니다.';
  }

  if (Platform.OS === 'android') {
    if (settings?.enabled === false) {
      return '전체메뉴에서 일정 알림이 꺼져 있어요. 일정값은 저장되지만 기기 알림은 예약하지 않아요.';
    }
    if (settings?.exactAlarm === 'not-granted') {
      return '정확한 시간 알림 권한이 없어 Android가 허용하는 범위에서 예약을 시도해요. 정확한 알림은 시스템 설정에서 별도로 허용할 수 있어요.';
    }
    if (settings?.channel === 'blocked') {
      return 'Android 알림 채널이 꺼져 있어요. 일정값은 저장되지만 실제 기기 알림은 보이지 않아요.';
    }
    if (settings?.nativeSupported) {
      return '저장 후 기기 알림 예약을 시도해요. 예약 결과와 기기 권한은 전체메뉴의 알림 설정에서 확인할 수 있어요.';
    }
    return '현재 Android 기기 알림 모듈 상태를 확인하지 못했어요. 일정값은 저장됩니다.';
  }

  return '현재 기기에서는 알림 지원 상태를 확인할 수 없어요.';
}

export async function checkScheduleNotificationPermission(): Promise<ScheduleNotificationPermissionStatus> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      PushNotificationIOS.checkPermissions(permissions => {
        resolve(
          permissions.alert || permissions.badge || permissions.sound
            ? 'granted'
            : 'denied',
        );
      });
    });
  }

  if (Platform.OS === 'android') {
    if (!isAndroidNotificationRuntimePermissionRequired()) {
      return 'granted';
    }

    try {
      const granted = await PermissionsAndroid.check(
        ANDROID_POST_NOTIFICATIONS as never,
      );
      return granted ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}

export async function requestScheduleNotificationPermission(): Promise<ScheduleNotificationPermissionStatus> {
  if (Platform.OS === 'ios') {
    const permissions = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });
    return permissions.alert || permissions.badge || permissions.sound
      ? 'granted'
      : 'denied';
  }

  if (Platform.OS === 'android') {
    if (!isAndroidNotificationRuntimePermissionRequired()) {
      return 'granted';
    }

    const result = await PermissionsAndroid.request(
      ANDROID_POST_NOTIFICATIONS as never,
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }
    return 'denied';
  }

  return 'unsupported';
}

export async function upsertScheduleNotification(
  schedule: SchedulableSchedule,
  lifecycleContext?: ScheduleNotificationLifecycleContext,
): Promise<ScheduleNotificationSyncResult> {
  // A DB write can outlive logout/session replacement. Reject the late
  // side-effect before it can cancel or schedule a native alarm from the old
  // lifecycle generation; the saved record remains the caller's contract.
  if (
    lifecycleContext &&
    lifecycleContext.generation !== notificationGeneration
  ) {
    return createSyncResult('cancelled');
  }

  const operation = beginScheduleOperation(schedule.id);

  // Replace semantics: old device alarms are removed before any permission or
  // capability decision so a failed edit cannot leave a stale alarm behind.
  cancelNativeScheduleNotification(schedule.id);

  if (!hasReminder(schedule.reminderMinutes) || schedule.completedAt) {
    return createSyncResult('cleared', {
      deviceAlarm: 'cleared',
      delivery: 'not-applicable',
    });
  }

  const permissionStatus = await checkScheduleNotificationPermission();
  if (!isCurrentScheduleOperation(schedule.id, operation)) {
    cancelStaleOperationIfStillOwner(schedule.id, operation);
    return createSyncResult('cancelled', { permission: permissionStatus });
  }

  if (permissionStatus !== 'granted') {
    return createSyncResult('missing-permission', {
      permission: permissionStatus,
      deviceAlarm:
        Platform.OS === 'ios' || hasAndroidScheduleNotificationModule()
          ? 'cleared'
          : 'unsupported',
    });
  }

  const settings = await readScheduleNotificationSettings(permissionStatus);
  if (!isCurrentScheduleOperation(schedule.id, operation)) {
    cancelStaleOperationIfStillOwner(schedule.id, operation);
    return createSyncResult('cancelled', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
    });
  }

  if (!settings.enabled) {
    return createSyncResult('disabled', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery: settings.delivery,
      deviceAlarm: 'cleared',
    });
  }

  if (settings.channel === 'blocked') {
    return createSyncResult('channel-blocked', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery: settings.delivery,
    });
  }

  const fireEntries = buildNotificationFireEntries(schedule);
  if (fireEntries.length === 0) {
    return createSyncResult('skipped-past', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery: settings.delivery,
    });
  }

  if (Platform.OS === 'android') {
    const nativeModule = getAndroidScheduleNotifications();
    if (!hasAndroidScheduleNotificationModule() || !nativeModule) {
      return createSyncResult('unsupported', {
        permission: permissionStatus,
        exactAlarm: settings.exactAlarm,
        channel: settings.channel,
        delivery: 'not-applicable',
      });
    }

    let scheduledCount = 0;
    let delivery: ScheduleNotificationDelivery = settings.delivery;
    for (const entry of fireEntries) {
      if (!isCurrentScheduleOperation(schedule.id, operation)) {
        cancelStaleOperationIfStillOwner(schedule.id, operation);
        return createSyncResult('cancelled', {
          permission: permissionStatus,
          exactAlarm: settings.exactAlarm,
          channel: settings.channel,
          delivery,
          deviceAlarm: scheduledCount > 0 ? 'partial' : 'not-scheduled',
        });
      }

      try {
        const nativeResult = normalizeNativeScheduleResult(
          await nativeModule.schedule({
            alarmId: entry.alarmId,
            scheduleId: schedule.id,
            petId: schedule.petId,
            title: schedule.title.trim() || 'NURI 일정 알림',
            body: buildScheduleNotificationBody(
              schedule,
              entry.reminderMinutes,
            ),
            note: schedule.note?.trim() ?? '',
            fireAtMillis: entry.fireDate,
            occurrenceAtMillis: new Date(schedule.startsAt).getTime(),
            repeatRule: schedule.repeatRule,
          }),
          settings.delivery,
        );
        if (!isCurrentScheduleOperation(schedule.id, operation)) {
          cancelStaleOperationIfStillOwner(schedule.id, operation);
          return createSyncResult('cancelled', {
            permission: permissionStatus,
            exactAlarm: settings.exactAlarm,
            channel: settings.channel,
            delivery: nativeResult.delivery,
            deviceAlarm: scheduledCount > 0 ? 'partial' : 'not-scheduled',
          });
        }

        if (nativeResult.status !== 'scheduled') {
          cancelNativeScheduleNotification(schedule.id);
          return createSyncResult(
            scheduledCount > 0 ? 'partial-failure' : nativeResult.status,
            {
              permission: permissionStatus,
              exactAlarm: settings.exactAlarm,
              channel: settings.channel,
              delivery: nativeResult.delivery,
              deviceAlarm: scheduledCount > 0 ? 'partial' : 'not-scheduled',
              ...(nativeResult.errorCode
                ? { errorCode: nativeResult.errorCode }
                : {}),
            },
          );
        }

        scheduledCount += 1;
        if (nativeResult.delivery) delivery = nativeResult.delivery;
      } catch (error) {
        cancelNativeScheduleNotification(schedule.id);
        return createSyncResult(
          scheduledCount > 0 ? 'partial-failure' : 'failed',
          {
            permission: permissionStatus,
            exactAlarm: settings.exactAlarm,
            channel: settings.channel,
            delivery,
            deviceAlarm: scheduledCount > 0 ? 'partial' : 'not-scheduled',
            errorCode:
              error instanceof Error ? error.name : 'native-schedule-failed',
          },
        );
      }
    }

    return createSyncResult('scheduled', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery,
      deviceAlarm: 'scheduled',
    });
  }

  if (Platform.OS !== 'ios') {
    return createSyncResult('unsupported', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery: 'not-applicable',
    });
  }

  try {
    for (const entry of fireEntries) {
      if (!isCurrentScheduleOperation(schedule.id, operation)) {
        cancelStaleOperationIfStillOwner(schedule.id, operation);
        return createSyncResult('cancelled', {
          permission: permissionStatus,
          exactAlarm: settings.exactAlarm,
          channel: settings.channel,
          delivery: 'exact',
        });
      }

      PushNotificationIOS.scheduleLocalNotification({
        fireDate: entry.fireDate,
        repeatInterval: mapRepeatRuleToIosRepeatInterval(schedule.repeatRule),
        alertTitle: '일정 알림',
        alertBody: buildScheduleNotificationBody(
          schedule,
          entry.reminderMinutes,
        ),
        alertAction: '보기',
        soundName: 'default',
        userInfo: {
          type: IOS_NOTIFICATION_USER_INFO_TYPE,
          scheduleId: schedule.id,
          petId: schedule.petId,
          alarmId: entry.alarmId,
        },
      });
    }
  } catch (error) {
    cancelNativeScheduleNotification(schedule.id);
    return createSyncResult('failed', {
      permission: permissionStatus,
      exactAlarm: settings.exactAlarm,
      channel: settings.channel,
      delivery: 'exact',
      errorCode: error instanceof Error ? error.name : 'local-schedule-failed',
    });
  }

  return createSyncResult('scheduled', {
    permission: permissionStatus,
    exactAlarm: settings.exactAlarm,
    channel: settings.channel,
    delivery: 'exact',
    deviceAlarm: 'scheduled',
  });
}

export function clearScheduleNotification(
  scheduleId: string,
): ScheduleNotificationSyncResult {
  invalidateScheduleOperation(scheduleId);
  try {
    const supported = cancelNativeScheduleNotification(scheduleId);
    return createSyncResult(supported ? 'cleared' : 'unsupported', {
      deviceAlarm: supported ? 'cleared' : 'unsupported',
      delivery: 'not-applicable',
      exactAlarm: Platform.OS === 'ios' ? 'not-required' : 'unknown',
      channel: Platform.OS === 'ios' ? 'not-required' : 'unknown',
    });
  } catch (error) {
    return createSyncResult('failed', {
      deviceAlarm: 'not-scheduled',
      delivery: 'not-applicable',
      errorCode: error instanceof Error ? error.name : 'native-cancel-failed',
    });
  }
}

export async function clearAllScheduleNotifications(): Promise<ScheduleNotificationSyncResult> {
  invalidateAllScheduleOperations();

  try {
    if (Platform.OS === 'android') {
      const nativeModule = getAndroidScheduleNotifications();
      if (!nativeModule || typeof nativeModule.cancelAll !== 'function') {
        return createSyncResult('unsupported', { deviceAlarm: 'unsupported' });
      }
      const nativeResult = normalizeNativeScheduleResult(
        await nativeModule.cancelAll(),
        'not-applicable',
      );
      return createSyncResult(nativeResult.status, {
        deviceAlarm: nativeResult.status === 'cleared' ? 'cleared' : 'not-scheduled',
        delivery: nativeResult.delivery,
        ...(nativeResult.errorCode
          ? { errorCode: nativeResult.errorCode }
          : {}),
      });
    }

    if (Platform.OS === 'ios') {
      PushNotificationIOS.cancelAllLocalNotifications();
      return createSyncResult('cleared', {
        deviceAlarm: 'cleared',
        delivery: 'not-applicable',
      });
    }

    return createSyncResult('unsupported', { deviceAlarm: 'unsupported' });
  } catch (error) {
    return createSyncResult('failed', {
      errorCode:
        error instanceof Error ? error.name : 'native-cancel-all-failed',
    });
  }
}

export async function getScheduleNotificationSettings(): Promise<ScheduleNotificationSettings> {
  const permission = await checkScheduleNotificationPermission();
  return readScheduleNotificationSettings(permission);
}

export async function setScheduleNotificationEnabled(
  enabled: boolean,
): Promise<ScheduleNotificationSettings> {
  // A toggle changes the lifecycle contract. Invalidate pending JS work before
  // the native preference update so an old request cannot re-register an alarm.
  invalidateAllScheduleOperations();

  if (Platform.OS === 'android') {
    const nativeModule = getAndroidScheduleNotifications();
    if (nativeModule && typeof nativeModule.setEnabled === 'function') {
      await nativeModule.setEnabled(enabled);
    }
  }

  return getScheduleNotificationSettings();
}

export async function openScheduleNotificationExactAlarmSettings() {
  if (Platform.OS !== 'android') return false;
  const nativeModule = getAndroidScheduleNotifications();
  if (
    !nativeModule ||
    typeof nativeModule.openExactAlarmSettings !== 'function'
  ) {
    return false;
  }

  const result = await nativeModule.openExactAlarmSettings();
  return result !== false;
}

export function openScheduleNotificationSystemSettings() {
  if (Platform.OS === 'android') {
    const nativeModule = getAndroidScheduleNotifications();
    if (typeof nativeModule?.openAppNotificationSettings === 'function') {
      nativeModule.openAppNotificationSettings();
      return;
    }
  }

  Linking.openSettings().catch(() => {});
}

export function getScheduleNotificationSyncFeedback(
  result: ScheduleNotificationSyncResult,
): ScheduleNotificationFeedback | null {
  switch (result.status) {
    case 'missing-permission':
      return {
        tone: 'warning',
        title: '알림 권한이 필요해요',
        message:
          '일정은 저장됐지만 기기 알림은 예약되지 않았어요. 전체메뉴에서 권한을 확인해 주세요.',
      };
    case 'missing-exact-alarm':
      return {
        tone: 'warning',
        title: '정확한 알림 권한이 필요해요',
        message:
          '일정은 저장됐지만 정확한 시간 알림은 예약되지 않았어요. Android 시스템 설정에서 권한을 확인해 주세요.',
      };
    case 'channel-blocked':
      return {
        tone: 'warning',
        title: '기기 알림이 꺼져 있어요',
        message:
          '일정은 저장됐지만 Android 알림 채널이 꺼져 있어 기기 알림은 보이지 않아요.',
      };
    case 'disabled':
      return {
        tone: 'info',
        title: '일정은 저장됐어요',
        message:
          '전체메뉴에서 일정 알림이 꺼져 있어 기기 알림은 예약되지 않았어요.',
      };
    case 'unsupported':
      return {
        tone: 'warning',
        title: '기기 알림 상태를 확인할 수 없어요',
        message:
          '일정은 저장됐지만 현재 기기에서 알림 예약 결과를 확인하지 못했어요.',
      };
    case 'skipped-past':
      return {
        tone: 'info',
        title: '일정은 저장됐어요',
        message: '선택한 알림 시점이 지나 기기 알림은 예약하지 않았어요.',
      };
    case 'partial-failure':
      return {
        tone: 'error',
        title: '알림 예약을 끝내지 못했어요',
        message:
          '일정은 저장됐지만 일부 알림 예약에 실패해 남은 예약을 정리했어요. 잠시 후 다시 시도해 주세요.',
      };
    case 'failed':
      return {
        tone: 'error',
        title: '알림 예약을 끝내지 못했어요',
        message:
          '일정은 저장됐지만 기기 알림 예약에 실패했어요. 잠시 후 다시 시도해 주세요.',
      };
    case 'cancelled':
    case 'cleared':
      return null;
    case 'scheduled':
      if (result.delivery === 'inexact') {
        return {
          tone: 'info',
          title: '일정은 저장됐어요',
          message:
            '기기 알림 예약을 시도했지만 정확한 시간 권한이 없어 Android 허용 범위로 예약했어요.',
        };
      }
      return null;
  }
}

// NURI-12 native bridge contract (Android implementation is intentionally
// deferred to that room):
// - schedule(payload) -> Promise<{status, delivery, errorCode?}>; legacy string
//   statuses remain accepted for backward compatibility.
// - getRuntimeCapabilities() -> Promise<{enabled, exactAlarm, channel,
//   delivery, canOpenExactAlarmSettings}>.
// - openExactAlarmSettings() -> Promise<boolean | void> and must use the normal
//   Android ACTION_REQUEST_SCHEDULE_EXACT_ALARM settings flow.
// - getInitialScheduleNotificationTap() and the
//   NuriScheduleNotificationTap DeviceEventEmitter event are defined in
//   notificationTap.ts for cold/warm navigation handoff.

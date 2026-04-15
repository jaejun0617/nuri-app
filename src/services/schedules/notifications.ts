import {
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  PushNotificationIOS,
} from 'react-native';

import type {
  PetSchedule,
  ScheduleRepeatRule,
} from '../supabase/schedules';

const ANDROID_POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';
const IOS_NOTIFICATION_USER_INFO_TYPE = 'schedule';

type AndroidScheduleNotificationsModule = {
  schedule: (payload: {
    alarmId: string;
    scheduleId: string;
    petId: string;
    title: string;
    body: string;
    fireAtMillis: number;
    repeatRule: ScheduleRepeatRule;
  }) => Promise<ScheduleNotificationSyncStatus>;
  cancel: (scheduleId: string) => void;
  cancelAll: () => void;
  getSettings: () => Promise<{ enabled: boolean }>;
  setEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>;
  openAppNotificationSettings: () => void;
};

const AndroidScheduleNotifications =
  NativeModules.NuriScheduleNotifications as
    | AndroidScheduleNotificationsModule
    | undefined;

function hasAndroidScheduleNotificationModule() {
  return (
    Platform.OS === 'android' &&
    typeof AndroidScheduleNotifications?.schedule === 'function'
  );
}

export type ScheduleNotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported';

export type ScheduleNotificationSyncStatus =
  | 'scheduled'
  | 'cleared'
  | 'disabled'
  | 'missing-permission'
  | 'unsupported'
  | 'skipped-past';

export type ScheduleNotificationSettings = {
  enabled: boolean;
  platform: typeof Platform.OS;
  nativeSupported: boolean;
};

type SchedulableSchedule = Pick<
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
  schedule: SchedulableSchedule,
  reminderMinutes: number,
) {
  const baseBody =
    schedule.note?.trim() || `${schedule.title} 일정 시간이 다가오고 있어요.`;
  return reminderMinutes > 0
    ? `${baseBody} (${reminderMinutes}분 전)`
    : baseBody;
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
  return [...new Set(schedule.reminderMinutes)]
    .filter(value => Number.isFinite(value) && value > 0)
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
) {
  if (!hasReminder(reminderMinutes)) {
    return '알림을 끄면 일정 데이터만 저장되고 기기 알림은 예약되지 않아요.';
  }

  if (Platform.OS === 'ios') {
    if (permissionStatus === 'granted') {
      return 'iOS 권한이 허용돼 있으면 저장 시 시스템 알림으로 예약됩니다.';
    }
    if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
      return '권한이 꺼져 있으면 일정에는 저장되지만 실제 기기 알림은 오지 않아요.';
    }
  }

  if (Platform.OS === 'android') {
    if (permissionStatus === 'blocked' || permissionStatus === 'denied') {
      return '알림 권한이 꺼져 있어도 일정값은 저장되지만 실제 기기 알림은 오지 않아요.';
    }
    if (hasAndroidScheduleNotificationModule()) {
      return '저장 시 기기 알림으로 예약됩니다. 전체메뉴의 알림 설정에서 언제든 끌 수 있어요.';
    }
    return '현재 Android 기기 알림 모듈을 확인하지 못했어요. 일정값은 저장됩니다.';
  }

  return '현재 기기에서는 알림 지원 상태를 확인할 수 없어요.';
}

export async function checkScheduleNotificationPermission(): Promise<ScheduleNotificationPermissionStatus> {
  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      PushNotificationIOS.checkPermissions(permissions => {
        if (permissions.alert || permissions.badge || permissions.sound) {
          resolve('granted');
          return;
        }
        resolve('denied');
      });
    });
  }

  if (Platform.OS === 'android') {
    if (!isAndroidNotificationRuntimePermissionRequired()) {
      return 'granted';
    }

    const granted = await PermissionsAndroid.check(
      ANDROID_POST_NOTIFICATIONS as never,
    );
    return granted ? 'granted' : 'denied';
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
): Promise<ScheduleNotificationSyncStatus> {
  if (!hasReminder(schedule.reminderMinutes) || schedule.completedAt) {
    return clearScheduleNotification(schedule.id);
  }

  const permissionStatus = await checkScheduleNotificationPermission();
  if (permissionStatus !== 'granted') {
    return 'missing-permission';
  }

  clearScheduleNotification(schedule.id);
  const fireEntries = buildNotificationFireEntries(schedule);

  if (fireEntries.length === 0) {
    return 'skipped-past';
  }

  if (Platform.OS === 'android') {
    if (!hasAndroidScheduleNotificationModule() || !AndroidScheduleNotifications) {
      return 'unsupported';
    }

    let latestStatus: ScheduleNotificationSyncStatus = 'scheduled';
    for (const entry of fireEntries) {
      latestStatus = await AndroidScheduleNotifications.schedule({
        alarmId: entry.alarmId,
        scheduleId: schedule.id,
        petId: schedule.petId,
        title: schedule.title,
        body: buildScheduleNotificationBody(schedule, entry.reminderMinutes),
        fireAtMillis: entry.fireDate,
        repeatRule: schedule.repeatRule,
      });
    }
    return latestStatus;
  }

  if (Platform.OS !== 'ios') {
    return 'unsupported';
  }

  fireEntries.forEach(entry => {
    PushNotificationIOS.scheduleLocalNotification({
      fireDate: entry.fireDate,
      repeatInterval: mapRepeatRuleToIosRepeatInterval(schedule.repeatRule),
      alertTitle: '일정 알림',
      alertBody: buildScheduleNotificationBody(schedule, entry.reminderMinutes),
      alertAction: '보기',
      soundName: 'default',
      userInfo: {
        type: IOS_NOTIFICATION_USER_INFO_TYPE,
        scheduleId: schedule.id,
        petId: schedule.petId,
        alarmId: entry.alarmId,
      },
    });
  });

  return 'scheduled';
}

export function clearScheduleNotification(
  scheduleId: string,
): ScheduleNotificationSyncStatus {
  if (Platform.OS === 'android') {
    AndroidScheduleNotifications?.cancel(scheduleId);
    return hasAndroidScheduleNotificationModule() ? 'cleared' : 'unsupported';
  }

  if (Platform.OS !== 'ios') {
    return 'unsupported';
  }

  PushNotificationIOS.cancelLocalNotifications({
    type: IOS_NOTIFICATION_USER_INFO_TYPE,
    scheduleId,
  });
  return 'cleared';
}

export async function getScheduleNotificationSettings(): Promise<ScheduleNotificationSettings> {
  if (
    Platform.OS === 'android' &&
    hasAndroidScheduleNotificationModule() &&
    AndroidScheduleNotifications
  ) {
    const settings = await AndroidScheduleNotifications.getSettings();
    return {
      enabled: settings.enabled,
      platform: Platform.OS,
      nativeSupported: true,
    };
  }

  return {
    enabled: true,
    platform: Platform.OS,
    nativeSupported: Platform.OS === 'ios',
  };
}

export async function setScheduleNotificationEnabled(
  enabled: boolean,
): Promise<ScheduleNotificationSettings> {
  if (
    Platform.OS === 'android' &&
    hasAndroidScheduleNotificationModule() &&
    AndroidScheduleNotifications
  ) {
    const settings = await AndroidScheduleNotifications.setEnabled(enabled);
    return {
      enabled: settings.enabled,
      platform: Platform.OS,
      nativeSupported: true,
    };
  }

  return getScheduleNotificationSettings();
}

export function openScheduleNotificationSystemSettings() {
  if (Platform.OS === 'android' && hasAndroidScheduleNotificationModule()) {
    AndroidScheduleNotifications?.openAppNotificationSettings();
    return;
  }

  Linking.openSettings().catch(() => {});
}

import {
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

export type ScheduleNotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unsupported';

export type ScheduleNotificationSyncStatus =
  | 'scheduled'
  | 'cleared'
  | 'missing-permission'
  | 'unsupported'
  | 'skipped-past';

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

function getPrimaryReminderMinutes(reminderMinutes: number[]) {
  return [...reminderMinutes].sort((left, right) => left - right)[0] ?? null;
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

function buildScheduleNotificationBody(schedule: SchedulableSchedule) {
  return schedule.note?.trim() || `${schedule.title} 일정 시간이 다가오고 있어요.`;
}

function buildNotificationFireDate(schedule: SchedulableSchedule) {
  const primaryReminderMinutes = getPrimaryReminderMinutes(
    schedule.reminderMinutes,
  );
  if (primaryReminderMinutes === null) return null;

  const startsAtTime = new Date(schedule.startsAt).getTime();
  if (Number.isNaN(startsAtTime)) return null;

  const fireDate = startsAtTime - primaryReminderMinutes * 60 * 1000;
  if (fireDate <= Date.now()) return null;

  return fireDate;
}

export function getScheduleNotificationAudit(schedule: SchedulableSchedule) {
  return {
    hasReminder: hasReminder(schedule.reminderMinutes),
    persistsToScheduleRecord: true,
    canRequestPermission:
      Platform.OS === 'ios' || isAndroidNotificationRuntimePermissionRequired(),
    deliversOsNotification: Platform.OS === 'ios',
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
    return '현재 Android는 권한 확인만 연결돼 있고, 실제 OS 알림 예약은 아직 연결되지 않았어요.';
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

  if (Platform.OS !== 'ios') {
    return 'unsupported';
  }

  const permissionStatus = await checkScheduleNotificationPermission();
  if (permissionStatus !== 'granted') {
    return 'missing-permission';
  }

  const fireDate = buildNotificationFireDate(schedule);
  clearScheduleNotification(schedule.id);

  if (!fireDate) {
    return 'skipped-past';
  }

  PushNotificationIOS.scheduleLocalNotification({
    fireDate,
    repeatInterval: mapRepeatRuleToIosRepeatInterval(schedule.repeatRule),
    alertTitle: '일정 알림',
    alertBody: buildScheduleNotificationBody(schedule),
    alertAction: '보기',
    soundName: 'default',
    userInfo: {
      type: IOS_NOTIFICATION_USER_INFO_TYPE,
      scheduleId: schedule.id,
      petId: schedule.petId,
    },
  });

  return 'scheduled';
}

export function clearScheduleNotification(
  scheduleId: string,
): ScheduleNotificationSyncStatus {
  if (Platform.OS !== 'ios') {
    return 'unsupported';
  }

  PushNotificationIOS.cancelLocalNotifications({
    type: IOS_NOTIFICATION_USER_INFO_TYPE,
    scheduleId,
  });
  return 'cleared';
}

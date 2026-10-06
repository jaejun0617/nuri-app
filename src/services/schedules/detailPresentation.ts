import type { PetSchedule } from '../supabase/schedules';
import type { ScheduleNotificationSettings } from './notifications';
import { getKstDateParts } from '../../utils/date';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 86400000;

export function buildScheduleDetailTime(
  schedule: PetSchedule,
  now = new Date(),
) {
  const start = getKstDateParts(schedule.startsAt);
  const current = getKstDateParts(now);
  if (!start || !current) return null;
  const days = Math.round(
    (Date.UTC(start.year, start.month - 1, start.day) -
      Date.UTC(current.year, current.month - 1, current.day)) /
      DAY_MS,
  );
  const context = schedule.completedAt
    ? '일정 시간'
    : days === 0
    ? '오늘'
    : days === 1
    ? '내일'
    : days > 1
    ? `${days}일 뒤`
    : '지난 일정';
  const hour = start.hour % 12 || 12;
  return {
    context,
    date: `${start.month}월 ${start.day}일 ${WEEKDAYS[start.weekday]}요일`,
    year: `${start.year}년`,
    time: schedule.allDay
      ? '하루 종일'
      : `${start.hour < 12 ? '오전' : '오후'} ${hour}:${String(
          start.minute,
        ).padStart(2, '0')}`,
  };
}

export function formatScheduleDetailRepeat(schedule: PetSchedule): string {
  const interval = schedule.repeatInterval;
  let label: string;
  switch (schedule.repeatRule) {
    case 'daily':
      label = interval === 1 ? '매일' : `${interval}일마다`;
      break;
    case 'weekly':
      label = interval === 1 ? '매주' : `${interval}주마다`;
      break;
    case 'monthly':
      label = interval === 1 ? '매월' : `${interval}개월마다`;
      break;
    case 'yearly':
      label = interval === 1 ? '매년' : `${interval}년마다`;
      break;
    default:
      return '반복 없음';
  }
  const until = getKstDateParts(schedule.repeatUntil);
  return until
    ? `${label} · ${until.year}.${until.month}.${until.day}까지`
    : label;
}

export type ScheduleAlarmNotice = {
  message: string;
  action: 'app' | 'system' | 'exact' | 'retry' | null;
};

// Permission capability is not evidence that this particular alarm was reserved.
export function getScheduleAlarmNotice(
  schedule: PetSchedule,
  settings: ScheduleNotificationSettings | null,
): ScheduleAlarmNotice | null {
  if (schedule.completedAt || schedule.reminderMinutes.length === 0)
    return null;
  if (!settings)
    return { message: '기기 알림 상태를 확인하지 못했어요', action: 'retry' };
  if (!settings.enabled)
    return { message: '일정 알림이 꺼져 있어요', action: 'app' };
  if (!settings.nativeSupported || settings.permission === 'unsupported')
    return {
      message: '이 기기의 알림 예약 상태를 확인할 수 없어요',
      action: null,
    };
  if (settings.permission !== 'granted' || settings.channel === 'blocked')
    return { message: '기기 알림이 꺼져 있어요', action: 'system' };
  if (settings.exactAlarm === 'not-granted')
    return {
      message: '정확한 시간 알림 권한을 확인해 주세요',
      action: settings.canOpenExactAlarmSettings ? 'exact' : 'system',
    };
  if (
    settings.channel === 'missing' ||
    settings.channel === 'unknown' ||
    settings.delivery === 'unknown'
  )
    return { message: '기기 알림 설정을 확인해 주세요', action: 'system' };
  return null;
}

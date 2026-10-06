import {
  buildScheduleDetailTime,
  formatScheduleDetailRepeat,
  getScheduleAlarmNotice,
} from '../src/services/schedules/detailPresentation';
import { formatScheduleCategoryLabel } from '../src/services/schedules/presentation';
import type { PetSchedule } from '../src/services/supabase/schedules';
import type { ScheduleNotificationSettings } from '../src/services/schedules/notifications';

export const schedule: PetSchedule = {
  id: 's',
  userId: 'u',
  petId: 'p',
  title: '산책',
  note: '천천히 걸어요',
  startsAt: '2026-10-05T01:00:00Z',
  endsAt: null,
  allDay: false,
  category: 'walk',
  subCategory: null,
  iconKey: 'walk',
  colorKey: 'brand',
  reminderMinutes: [10],
  repeatRule: 'none',
  repeatInterval: 1,
  repeatUntil: null,
  linkedMemoryId: null,
  completedAt: null,
  source: 'manual',
  externalCalendarId: null,
  externalEventId: null,
  syncStatus: 'local',
  createdAt: '',
  updatedAt: '',
};
const settings: ScheduleNotificationSettings = {
  enabled: true,
  platform: 'android',
  nativeSupported: true,
  permission: 'granted',
  exactAlarm: 'granted',
  channel: 'ready',
  delivery: 'exact',
  canOpenExactAlarmSettings: true,
};

describe('schedule detail presentation', () => {
  it.each([
    ['2026-10-04T14:59:00Z', '내일'],
    ['2026-10-04T15:00:00Z', '오늘'],
    ['2026-10-05T15:00:00Z', '지난 일정'],
    ['2026-10-02T15:00:00Z', '2일 뒤'],
  ])('uses KST calendar boundaries for %s', (now, context) => {
    expect(buildScheduleDetailTime(schedule, new Date(now))).toEqual({
      context,
      date: '10월 5일 월요일',
      year: '2026년',
      time: '오전 10:00',
    });
  });
  it('handles year rollover, all-day, noon and completed context', () => {
    expect(
      buildScheduleDetailTime(
        { ...schedule, startsAt: '2026-12-31T15:00:00Z', allDay: true },
        new Date('2026-12-31T01:00:00Z'),
      ),
    ).toEqual({
      context: '내일',
      date: '1월 1일 금요일',
      year: '2027년',
      time: '하루 종일',
    });
    expect(
      buildScheduleDetailTime({
        ...schedule,
        startsAt: '2026-10-05T03:00:00Z',
        completedAt: '2026-10-05T04:00:00Z',
      })?.time,
    ).toBe('오후 12:00');
    expect(
      buildScheduleDetailTime({
        ...schedule,
        completedAt: '2026-10-05T04:00:00Z',
      })?.context,
    ).toBe('일정 시간');
    expect(
      buildScheduleDetailTime({ ...schedule, startsAt: 'invalid' }),
    ).toBeNull();
  });
  it.each([
    ['daily', '2일마다'],
    ['weekly', '2주마다'],
    ['monthly', '2개월마다'],
    ['yearly', '2년마다'],
  ] as const)('shows repeat interval %s', (repeatRule, expected) => {
    expect(
      formatScheduleDetailRepeat({
        ...schedule,
        repeatRule,
        repeatInterval: 2,
      }),
    ).toBe(expected);
  });
  it('preserves repeat end and avoids duplicate category without changing other surfaces', () => {
    expect(formatScheduleDetailRepeat(schedule)).toBe('반복 없음');
    expect(
      formatScheduleDetailRepeat({
        ...schedule,
        repeatRule: 'weekly',
        repeatUntil: '2026-12-31T15:00:00Z',
      }),
    ).toBe('매주 · 2027.1.1까지');
    expect(
      formatScheduleCategoryLabel(
        { category: 'other', subCategory: 'etc' },
        { omitDuplicate: true },
      ),
    ).toBe('기타');
    expect(
      formatScheduleCategoryLabel({ category: 'other', subCategory: 'etc' }),
    ).toBe('기타 · 기타');
    expect(
      formatScheduleCategoryLabel(
        { category: 'health', subCategory: 'hospital' },
        { omitDuplicate: true },
      ),
    ).toBe('건강 · 병원');
  });
  it('does not claim successful delivery and hides notices for completed/no-alarm schedules', () => {
    expect(getScheduleAlarmNotice(schedule, settings)).toBeNull();
    expect(
      getScheduleAlarmNotice({ ...schedule, reminderMinutes: [] }, null),
    ).toBeNull();
    expect(
      getScheduleAlarmNotice({ ...schedule, completedAt: 'done' }, null),
    ).toBeNull();
  });
  it.each([
    [{ enabled: false }, 'app'],
    [{ permission: 'denied' }, 'system'],
    [{ channel: 'blocked' }, 'system'],
    [{ channel: 'missing' }, 'system'],
    [{ exactAlarm: 'not-granted' }, 'exact'],
    [{ nativeSupported: false }, null],
  ] as const)('maps actual device settings %p', (overrides, action) => {
    expect(
      getScheduleAlarmNotice(schedule, { ...settings, ...overrides })?.action,
    ).toBe(action);
  });
  it('offers retry when native state is unavailable', () => {
    expect(getScheduleAlarmNotice(schedule, null)?.action).toBe('retry');
  });
});

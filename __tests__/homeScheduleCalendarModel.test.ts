import type { PetSchedule } from '../src/services/supabase/schedules';
import {
  buildHomeScheduleCalendar,
  homeCalendarMonth,
  homeCalendarRegistrationInstant,
  homeCalendarTimeLabel,
  shiftHomeCalendarMonth,
} from '../src/components/home/homeScheduleCalendarModel';

export function calendarSchedule(
  overrides: Partial<PetSchedule> = {},
): PetSchedule {
  return {
    id: 's1',
    userId: 'u1',
    petId: 'p1',
    title: 'QA 일정',
    note: null,
    startsAt: '2026-10-05T01:00:00Z',
    endsAt: null,
    allDay: false,
    category: 'walk',
    subCategory: null,
    iconKey: 'walk',
    colorKey: 'blue',
    reminderMinutes: [],
    repeatRule: 'none',
    repeatInterval: 1,
    repeatUntil: null,
    linkedMemoryId: null,
    completedAt: null,
    source: 'manual',
    externalCalendarId: null,
    externalEventId: null,
    syncStatus: 'local',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}
const entries = (items: PetSchedule[], day: string, month = '2026-10-01') =>
  buildHomeScheduleCalendar(month, items).find(d => d.ymd === day)
    ?.occurrences ?? [];

describe('Home calendar KST data contract', () => {
  it('keeps a Sunday-first 42-cell grid with adjacent months and a stable month key', () => {
    const days = buildHomeScheduleCalendar('2026-10-05', []);
    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      ymd: '2026-09-27',
      weekday: 0,
      inMonth: false,
    });
    expect(days[41].ymd).toBe('2026-11-07');
    expect(days.filter(d => d.inMonth)).toHaveLength(31);
    expect(homeCalendarMonth('2026-10-31')).toBe('2026-10-01');
    expect(shiftHomeCalendarMonth('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('prefills 10:00 KST without device-timezone-dependent parsing', () => {
    expect(homeCalendarRegistrationInstant('2026-10-05')).toBe(
      '2026-10-05T10:00:00+09:00',
    );
    expect(() => homeCalendarRegistrationInstant('2026-02-30')).toThrow(
      'INVALID_CALENDAR_DATE',
    );
  });
  it('counts all loaded rows, not seven previews, and ignores duplicate/deleted/invalid rows', () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      calendarSchedule({ id: `s${index}` }),
    );
    expect(
      entries(
        [
          ...items,
          items[0],
          calendarSchedule({ id: 'deleted', syncStatus: 'deleted' }),
          calendarSchedule({ id: 'invalid', startsAt: 'bad' }),
        ],
        '2026-10-05',
      ),
    ).toHaveLength(12);
  });
  it('maps KST midnight from the previous UTC day and sorts all-day first', () => {
    const allDay = calendarSchedule({
      id: 'all-day',
      startsAt: '2026-10-04T15:00:00Z',
      allDay: true,
    });
    const dayEntries = entries([calendarSchedule(), allDay], '2026-10-05');
    expect(dayEntries.map(d => d.schedule.id)).toEqual(['all-day', 's1']);
    expect(homeCalendarTimeLabel(dayEntries[0], '2026-10-05')).toBe(
      '하루 종일',
    );
    expect(homeCalendarTimeLabel(dayEntries[1], '2026-10-05')).toBe(
      '오전 10:00',
    );
    expect(entries([allDay], '2026-10-04')).toHaveLength(0);
  });
  it('uses an exclusive end instant for multi-day entries', () => {
    const item = calendarSchedule({
      startsAt: '2026-10-04T15:00:00Z',
      endsAt: '2026-10-06T15:00:00Z',
      allDay: true,
    });
    expect(entries([item], '2026-10-05')).toHaveLength(1);
    expect(entries([item], '2026-10-06')).toHaveLength(1);
    expect(entries([item], '2026-10-07')).toHaveLength(0);
  });
  it('includes an overlapping entry seeded before the visible grid', () => {
    const item = calendarSchedule({
      startsAt: '2026-09-01T15:00:00Z',
      endsAt: '2026-10-06T15:00:00Z',
    });
    expect(entries([item], '2026-10-05')).toHaveLength(1);
  });
  it('expands distant daily seeds only within the visible calendar', () => {
    const item = calendarSchedule({
      startsAt: '2016-10-05T01:00:00Z',
      repeatRule: 'daily',
    });
    const days = buildHomeScheduleCalendar('2026-10-01', [item]);
    expect(days.every(d => d.occurrences.length === 1)).toBe(true);
    expect(days[0].occurrences[0].startDay).toBe(days[0].ymd);
  });
  it('preserves weekly interval, start boundary, inclusive until and original time', () => {
    const item = calendarSchedule({
      repeatRule: 'weekly',
      repeatInterval: 2,
      repeatUntil: '2026-10-19',
    });
    expect(entries([item], '2026-09-28')).toHaveLength(0);
    expect(entries([item], '2026-10-05')).toHaveLength(1);
    expect(entries([item], '2026-10-12')).toHaveLength(0);
    expect(entries([item], '2026-10-19')).toHaveLength(1);
    expect(entries([item], '2026-11-02')).toHaveLength(0);
  });
  it('clamps monthly dates iteratively like the current native alarm policy', () => {
    const item = calendarSchedule({
      startsAt: '2026-01-31T01:00:00Z',
      repeatRule: 'monthly',
    });
    expect(entries([item], '2026-02-28', '2026-02-01')).toHaveLength(1);
    expect(entries([item], '2026-03-28', '2026-03-01')).toHaveLength(1);
    expect(entries([item], '2026-03-31', '2026-03-01')).toHaveLength(0);
  });
  it('handles leap-day yearly clamping and timestamp repeat end', () => {
    const item = calendarSchedule({
      startsAt: '2024-02-29T01:00:00Z',
      repeatRule: 'yearly',
    });
    expect(entries([item], '2025-02-28', '2025-02-01')).toHaveLength(1);
    expect(
      entries(
        [
          calendarSchedule({
            repeatRule: 'daily',
            repeatUntil: '2026-10-06T00:59:59Z',
          }),
        ],
        '2026-10-06',
      ),
    ).toHaveLength(0);
  });
  it('does not mutate cached rows or count completed entries as extra rows', () => {
    const item = calendarSchedule({ completedAt: '2026-10-05T02:00:00Z' });
    const before = JSON.stringify(item);
    expect(entries([item], '2026-10-05')).toHaveLength(1);
    expect(JSON.stringify(item)).toBe(before);
  });
});

import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { PetSchedule } from '../supabase/schedules';
import { getDateYmdInKst, getKstDateParts } from '../../utils/date';

dayjs.extend(utc);
const DAY_MS = 86400000;

export type HomeScheduleOccurrence = {
  key: string;
  schedule: PetSchedule;
  startsAt: string;
  startDay: string;
};
export type HomeCalendarDay = {
  ymd: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  occurrences: HomeScheduleOccurrence[];
};

/** Floating calendar dates use UTC math; actual schedule instants are converted to KST first. */
function calendarDate(value: string): Dayjs {
  const date = dayjs.utc(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !date.isValid() ||
    date.format('YYYY-MM-DD') !== value
  ) {
    throw new Error('INVALID_CALENDAR_DATE');
  }
  return date;
}

export function homeCalendarMonth(ymd: string): string {
  return calendarDate(ymd).startOf('month').format('YYYY-MM-DD');
}
export function shiftHomeCalendarMonth(month: string, amount: number): string {
  return calendarDate(month)
    .startOf('month')
    .add(amount, 'month')
    .format('YYYY-MM-DD');
}
export function homeCalendarRegistrationInstant(ymd: string): string {
  calendarDate(ymd);
  return `${ymd}T10:00:00+09:00`;
}
export function homeCalendarDayLabel(ymd: string): string {
  const date = calendarDate(ymd);
  return `${date.month() + 1}월 ${date.date()}일 (${
    ['일', '월', '화', '수', '목', '금', '토'][date.day()]
  })`;
}
export function homeCalendarTimeLabel(
  occurrence: HomeScheduleOccurrence,
  day: string,
): string {
  if (occurrence.schedule.allDay) return '하루 종일';
  if (occurrence.startDay !== day) return '이어지는 일정';
  const parts = getKstDateParts(occurrence.startsAt);
  if (!parts) return '';
  return `${parts.hour < 12 ? '오전' : '오후'} ${
    parts.hour % 12 || 12
  }:${String(parts.minute).padStart(2, '0')}`;
}

/** No seven-row slicing: counts and agenda are derived from the pet's loaded schedule cache. */
export function buildHomeScheduleCalendar(
  month: string,
  items: readonly PetSchedule[],
): HomeCalendarDay[] {
  const first = calendarDate(homeCalendarMonth(month));
  const gridStart = first.subtract(first.day(), 'day');
  const gridEnd = gridStart.add(41, 'day');
  const days: HomeCalendarDay[] = Array.from({ length: 42 }, (_, index) => {
    const date = gridStart.add(index, 'day');
    return {
      ymd: date.format('YYYY-MM-DD'),
      day: date.date(),
      weekday: date.day(),
      inMonth: date.month() === first.month(),
      occurrences: [],
    };
  });
  const byDay = new Map(days.map(day => [day.ymd, day]));
  const seenIds = new Set<string>();

  for (const schedule of items) {
    const startDay = getDateYmdInKst(schedule.startsAt);
    if (
      schedule.syncStatus === 'deleted' ||
      seenIds.has(schedule.id) ||
      !startDay
    )
      continue;
    seenIds.add(schedule.id);
    const originalStart = dayjs.utc(schedule.startsAt).utcOffset(540);
    const end = schedule.endsAt ? dayjs.utc(schedule.endsAt) : null;
    const duration = end?.isValid()
      ? Math.max(0, end.valueOf() - originalStart.valueOf())
      : 0;
    const lookback = Math.ceil(duration / DAY_MS);
    const earliestStart = gridStart.subtract(lookback, 'day');
    let occurrence = originalStart;
    if (
      schedule.repeatRule !== 'none' &&
      (!Number.isSafeInteger(schedule.repeatInterval) ||
        schedule.repeatInterval <= 0)
    )
      continue;
    const interval = schedule.repeatInterval;
    const rule = schedule.repeatRule;
    const step = rule === 'weekly' ? interval * 7 : interval;
    // Skip distant daily/weekly history without scanning every historical day.
    if (rule === 'daily' || rule === 'weekly') {
      const elapsed = earliestStart.diff(calendarDate(startDay), 'day');
      if (elapsed > 0)
        occurrence = occurrence.add(Math.floor(elapsed / step) * step, 'day');
    }
    const until = schedule.repeatUntil ? dayjs.utc(schedule.repeatUntil) : null;
    if (until && !until.isValid()) continue;
    const untilDayOnly =
      !!schedule.repeatUntil &&
      /^\d{4}-\d{2}-\d{2}$/.test(schedule.repeatUntil);

    while (occurrence.isValid()) {
      const occurrenceDay = occurrence.format('YYYY-MM-DD');
      if (occurrenceDay > gridEnd.format('YYYY-MM-DD')) break;
      if (
        until &&
        (untilDayOnly
          ? occurrenceDay > until.format('YYYY-MM-DD')
          : occurrence.valueOf() > until.valueOf())
      )
        break;
      const lastDay =
        duration > 0
          ? occurrence.add(duration - 1, 'millisecond').format('YYYY-MM-DD')
          : occurrenceDay;
      if (lastDay >= gridStart.format('YYYY-MM-DD')) {
        const startsAt = occurrence.toISOString();
        for (const day of days) {
          if (day.ymd < occurrenceDay || day.ymd > lastDay) continue;
          byDay.get(day.ymd)?.occurrences.push({
            key: `${schedule.id}:${startsAt}`,
            schedule,
            startsAt,
            startDay: occurrenceDay,
          });
        }
      }
      if (rule === 'none') break;
      // Iterative month/year clamping matches Android Calendar.add, including Jan 31 -> Feb 28 -> Mar 28.
      const next = occurrence.add(
        rule === 'weekly' || rule === 'daily' ? step : interval,
        rule === 'monthly' ? 'month' : rule === 'yearly' ? 'year' : 'day',
      );
      if (next.valueOf() <= occurrence.valueOf()) break;
      occurrence = next;
    }
  }
  for (const day of days)
    day.occurrences.sort(
      (a, b) =>
        Number(b.schedule.allDay) - Number(a.schedule.allDay) ||
        a.startsAt.localeCompare(b.startsAt) ||
        a.schedule.id.localeCompare(b.schedule.id),
    );
  return days;
}

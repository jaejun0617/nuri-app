import type { PetSchedule } from '../supabase/schedules';
import { getDateYmdInKst, getKstDateParts } from '../../utils/date';
import { buildHomeScheduleCalendar, homeCalendarTimeLabel, type HomeScheduleOccurrence } from './calendarOccurrences';

export type ScheduleListFilter = 'all' | 'today' | 'upcoming' | 'past';
export type ScheduleListSection = {
  key: string;
  month: string;
  day: string;
  data: HomeScheduleOccurrence[];
};

/** Saved definitions stay unchanged; only Today projects actual KST occurrences. */
export function buildScheduleListSections(
  items: readonly PetSchedule[],
  filter: ScheduleListFilter,
  query: string,
  today: string,
): ScheduleListSection[] {
  const search = query.trim().toLocaleLowerCase();
  const groups = new Map<string, HomeScheduleOccurrence[]>();
  if (filter === 'today') {
    const data = buildHomeScheduleCalendar(today, items)
      .find(day => day.ymd === today)?.occurrences.filter(({ schedule }) =>
        !search || `${schedule.title} ${schedule.note ?? ''}`.toLocaleLowerCase().includes(search),
      ) ?? [];
    return data.length ? [{ key: today, day: today, month: today.slice(0, 7), data }] : [];
  }
  const seen = new Set<string>();
  for (const item of items) {
    const day = getDateYmdInKst(item.startsAt);
    if (!day || item.syncStatus === 'deleted' || seen.has(item.id)) continue;
    seen.add(item.id);
    if (
      (filter === 'upcoming' && day < today) ||
      (filter === 'past' && day >= today)
    )
      continue;
    if (
      search &&
      !`${item.title} ${item.note ?? ''}`.toLocaleLowerCase().includes(search)
    )
      continue;
    const group = groups.get(day) ?? [];
    group.push({ key: item.id, schedule: item, startsAt: item.startsAt, startDay: day });
    groups.set(day, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) =>
      filter === 'past' || filter === 'all' ? b.localeCompare(a) : a.localeCompare(b),
    )
    .map(([day, data]) => ({
      key: day,
      day,
      month: day.slice(0, 7),
      data: data.sort(
        (a, b) =>
          (filter === 'all' ? Date.parse(b.startsAt) - Date.parse(a.startsAt) :
            Number(b.schedule.allDay) - Number(a.schedule.allDay) || Date.parse(a.startsAt) - Date.parse(b.startsAt)) ||
          a.schedule.id.localeCompare(b.schedule.id),
      ),
    }));
}

export function scheduleListMonthLabel(month: string): string {
  return `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;
}
export function scheduleListDayLabel(day: string): string {
  const parts = getKstDateParts(`${day}T00:00:00+09:00`);
  return parts
    ? `${parts.month}월 ${parts.day}일 ${
        ['일', '월', '화', '수', '목', '금', '토'][parts.weekday]
      }요일`
    : '';
}
export function scheduleListTimeLabel(item: PetSchedule | HomeScheduleOccurrence, day?: string): string {
  if ('schedule' in item) return homeCalendarTimeLabel(item, day ?? item.startDay);
  if (item.allDay) return '하루 종일';
  const parts = getKstDateParts(item.startsAt);
  return parts
    ? `${parts.hour < 12 ? '오전' : '오후'} ${parts.hour % 12 || 12}:${String(
        parts.minute,
      ).padStart(2, '0')}`
    : '';
}

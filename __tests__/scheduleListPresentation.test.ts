import {
  buildScheduleListSections,
  scheduleListDayLabel,
  scheduleListTimeLabel,
} from '../src/services/schedules/listPresentation';
import type { PetSchedule } from '../src/services/supabase/schedules';

const item: PetSchedule = {
  id: 'qa',
  userId: 'u',
  petId: 'p',
  title: 'QA 일정',
  note: '병원 메모',
  startsAt: '2026-10-04T15:00:00Z',
  endsAt: null,
  allDay: true,
  category: 'other',
  subCategory: 'etc',
  iconKey: 'star',
  colorKey: 'brand',
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
  createdAt: '',
  updatedAt: '',
};
export { item as scheduleListFixture };
describe('saved schedule hub presentation', () => {
  it('groups KST all-day midnight under October 5, not the UTC previous day', () => {
    expect(
      buildScheduleListSections([item], 'all', '', '2026-10-05')[0].day,
    ).toBe('2026-10-05');
    expect(scheduleListDayLabel('2026-10-05')).toBe('10월 5일 월요일');
    expect(scheduleListTimeLabel(item)).toBe('하루 종일');
  });
  it('includes all of today in upcoming and strictly earlier dates in past', () => {
    const before = { ...item, id: 'past', startsAt: '2026-10-04T14:59:00Z' };
    expect(
      buildScheduleListSections([before, item], 'upcoming', '', '2026-10-05')
        .flatMap(section => section.data)
        .map(row => row.schedule.id),
    ).toEqual(['qa']);
    expect(
      buildScheduleListSections([before, item], 'past', '', '2026-10-05')
        .flatMap(section => section.data)
        .map(row => row.schedule.id),
    ).toEqual(['past']);
  });
  it('searches title and note without mutating source rows', () => {
    const original = Object.freeze({ ...item });
    expect(
      buildScheduleListSections([original], 'all', '  qa  ', '2026-10-05'),
    ).toHaveLength(1);
    expect(
      buildScheduleListSections([original], 'all', '병원', '2026-10-05'),
    ).toHaveLength(1);
    expect(
      buildScheduleListSections([original], 'all', '미용', '2026-10-05'),
    ).toHaveLength(0);
    expect(original.startsAt).toBe(item.startsAt);
  });
  it('sorts all schedules latest first while preserving upcoming chronology', () => {
    const timed = {
      ...item,
      id: 'timed',
      allDay: false,
      startsAt: '2026-10-05T01:00:00Z',
    };
    const older = { ...item, id: 'old', startsAt: '2026-10-01T00:00:00Z' };
    const all = buildScheduleListSections(
      [timed, item, older],
      'all',
      '',
      '2026-10-06',
    );
    expect(all.map(section => section.day)).toEqual([
      '2026-10-05',
      '2026-10-01',
    ]);
    expect(all[0].data.map(row => row.schedule.id)).toEqual(['timed', 'qa']);
    const upcoming = buildScheduleListSections([timed, item, older], 'upcoming', '', '2026-10-01');
    expect(upcoming.map(section => section.day)).toEqual(['2026-10-01', '2026-10-05']);
    expect(upcoming[1].data.map(row => row.schedule.id)).toEqual(['qa', 'timed']);
    expect(
      buildScheduleListSections([item, older], 'past', '', '2026-10-06')[0].day,
    ).toBe('2026-10-05');
    expect(scheduleListTimeLabel(timed)).toBe('오전 10:00');
  });
  it('does not duplicate saved recurring schedules or expose deleted/invalid rows', () => {
    const recurring = { ...item, repeatRule: 'daily' as const };
    const sections = buildScheduleListSections(
      [
        recurring,
        recurring,
        { ...item, id: 'deleted', syncStatus: 'deleted' },
        { ...item, id: 'invalid', startsAt: 'invalid' },
      ],
      'all',
      '',
      '2026-10-05',
    );
    expect(sections.flatMap(section => section.data).map(row => row.schedule)).toEqual([recurring]);
  });
  it('Today includes distant repeats and spanning schedules without mutating definitions', () => {
    const recurring = Object.freeze({ ...item, id: 'repeat', allDay: false, startsAt: '2025-10-05T01:00:00Z', repeatRule: 'daily' as const });
    const spanning = Object.freeze({ ...item, id: 'span', allDay: false, startsAt: '2026-10-03T01:00:00Z', endsAt: '2026-10-06T00:00:00Z' });
    const tomorrow = { ...item, id: 'tomorrow', startsAt: '2026-10-05T15:00:00Z' };
    const rows = buildScheduleListSections([recurring, spanning, item, tomorrow], 'today', '', '2026-10-05')[0].data;
    expect(rows.map(row => row.schedule.id)).toEqual(['qa', 'span', 'repeat']);
    expect(scheduleListTimeLabel(rows[1], '2026-10-05')).toBe('이어지는 일정');
    expect(scheduleListTimeLabel(rows[2], '2026-10-05')).toBe('오전 10:00');
    expect(recurring.startsAt).toBe('2025-10-05T01:00:00Z');
    expect(buildScheduleListSections([recurring], 'today', '없는검색', '2026-10-05')).toEqual([]);
    expect(buildScheduleListSections([item], 'today', '', '2026-10-06')).toEqual([]);
  });
  it('Today respects repeat-until and KST day rollover, with distinct occurrence keys', () => {
    const expired = { ...item, repeatRule: 'daily' as const, repeatUntil: '2026-10-04' };
    expect(buildScheduleListSections([expired], 'today', '', '2026-10-05')).toEqual([]);
    const repeat = { ...item, repeatRule: 'daily' as const };
    const today = buildScheduleListSections([repeat], 'today', '', '2026-10-05')[0];
    const next = buildScheduleListSections([repeat], 'today', '', '2026-10-06')[0];
    expect(today.data[0].key).not.toBe(next.data[0].key);
    expect(next.data[0].schedule).toBe(repeat);
  });
});

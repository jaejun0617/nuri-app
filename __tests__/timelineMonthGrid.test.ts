import { buildTimelineMonthGrid } from '../src/screens/Records/timelinePresentation';
import type { MemoryRecord } from '../src/services/supabase/memories';

const record = (id: string, occurredAt: string | null, createdAt = '2026-10-20T08:00:00Z'): MemoryRecord => ({
  id, occurredAt, createdAt, title: id, petId: 'pet', tags: [], imagePaths: [],
});

const records = {
  first: record('first', '2026-10-20'),
  second: record('second', null, '2026-10-19T16:00:00Z'),
  third: record('third', '2026-10-17'),
};

it('inserts one full-row heading key per day without changing the order of photos', () => {
  const grid = buildTimelineMonthGrid(['first', 'third', 'second'], records);
  expect(grid.ids).toEqual([
    'month-grid-day:2026-10-20', 'first', 'second',
    'month-grid-day:2026-10-17', 'third',
  ]);
  expect([...grid.dayTitles.values()]).toEqual(['10월 20일 (화)', '10월 17일 (토)']);
  expect(grid.listIndexById.get('third')).toBe(4);
  expect(grid.recordIndexById.get('third')).toBe(1);
  expect(grid.recordIndexById.has('month-grid-day:2026-10-17')).toBe(false);
});

it('retains oldest-first order when selected and emits no headings for an empty month', () => {
  expect(buildTimelineMonthGrid(['third', 'first', 'second'], records, 'oldest').ids).toEqual([
    'month-grid-day:2026-10-17', 'third',
    'month-grid-day:2026-10-20', 'second', 'first',
  ]);
  expect(buildTimelineMonthGrid([], records).ids).toEqual([]);
});

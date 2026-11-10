import type { MemoryRecord } from '../src/services/supabase/memories';
import { buildRecordGalleryRows } from '../src/screens/Records/recordGalleryPresentation';

function record(id: string, occurredAt: string | null, createdAt = '2026-11-10T08:00:00Z'): MemoryRecord {
  return { id, petId: 'pet', title: id, tags: [], imagePaths: [], occurredAt, createdAt };
}

it('orders months across years and fills four columns with newest records first', () => {
  const entries = [
    record('october', '2026-10-31'),
    record('same-day-early', '2026-11-02', '2026-11-02T03:00:00Z'),
    record('november-5', '2026-11-05'),
    record('november-4', '2026-11-04'),
    record('november-3', '2026-11-03'),
    record('last-year', '2025-11-30'),
    record('same-day-late', '2026-11-02', '2026-11-02T07:00:00Z'),
  ];
  expect(buildRecordGalleryRows(entries).map(row =>
    row.type === 'month' ? row.title : row.records.map(item => item.id),
  )).toEqual([
    '2026년 11월',
    ['november-5', 'november-4', 'november-3', 'same-day-late'],
    ['same-day-early'],
    '2026년 10월',
    ['october'],
    '2025년 11월',
    ['last-year'],
  ]);
  expect(entries[0].id).toBe('october');
});

it('uses the Korean record date fallback and keeps records without photos once', () => {
  const item = record('no-photo', null, '2026-10-31T15:00:00Z');
  expect(buildRecordGalleryRows([item, item])).toEqual([
    { type: 'month', key: 'month:2026-11', title: '2026년 11월' },
    { type: 'records', key: 'row:no-photo', records: [item] },
  ]);
});

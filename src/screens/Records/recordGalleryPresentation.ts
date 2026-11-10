import type { MemoryRecord } from '../../services/supabase/memories';
import { getRecordMonthKey } from '../../services/records/date';
import {
  compareTimelineRecords,
  dedupeTimelineRecords,
} from '../../services/timeline/query';

export const RECORD_GALLERY_COLUMNS = 4;

export type RecordGalleryRow =
  | { type: 'month'; key: string; title: string }
  | { type: 'records'; key: string; records: MemoryRecord[] };

export function buildRecordGalleryRows(
  records: readonly MemoryRecord[],
): RecordGalleryRow[] {
  const months = new Map<string | null, MemoryRecord[]>();
  for (const record of dedupeTimelineRecords(records).sort(compareTimelineRecords)) {
    const month = getRecordMonthKey(record);
    const group = months.get(month);
    if (group) group.push(record);
    else months.set(month, [record]);
  }

  const rows: RecordGalleryRow[] = [];
  for (const [month, group] of months) {
    rows.push({
      type: 'month',
      key: `month:${month ?? 'unknown'}`,
      title: month
        ? `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`
        : '날짜 미확인',
    });
    for (let start = 0; start < group.length; start += RECORD_GALLERY_COLUMNS) {
      rows.push({
        type: 'records',
        key: `row:${group[start].id}`,
        records: group.slice(start, start + RECORD_GALLERY_COLUMNS),
      });
    }
  }
  return rows;
}

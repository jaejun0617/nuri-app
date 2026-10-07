import type { MemoryRecord } from '../supabase/memories';
import {
  getMemoryCategoryChipTone,
  getRecordCategoryMeta,
} from '../memories/categoryMeta';

// Scoped to Timeline rows: other screens retain their existing category colors.
export function getTimelineCategoryTone(record: MemoryRecord) {
  const base = getMemoryCategoryChipTone(record);
  const category = getRecordCategoryMeta(record).mainCategory;
  const tones = {
    walk: { backgroundColor: '#E5DFFA', textColor: '#4936A4' },
    meal: { backgroundColor: '#FFE7CF', textColor: '#8D450B' },
    health: { backgroundColor: '#D9F1E1', textColor: '#17653A' },
    diary: { backgroundColor: '#DDEEFF', textColor: '#195A98' },
    other: { backgroundColor: '#E4E8EF', textColor: '#414E62' },
  };
  return { ...base, ...tones[category] };
}

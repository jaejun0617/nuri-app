import {
  fetchMemoriesByPetPage,
  type MemoryRecord,
} from '../supabase/memories';
import { isHealthMemoryRecord } from '../health-report/viewModel';

export const DETAIL_HISTORY_PAGE_SIZE = 5;
export type DetailHistoryPage = {
  records: MemoryRecord[];
  buffered: MemoryRecord[];
  cursor: string | null;
  hasMore: boolean;
};

export function emptyDetailHistory(): DetailHistoryPage {
  return { records: [], buffered: [], cursor: null, hasMore: true };
}

// Reuse the canonical compound cursor; buffer surplus rows instead of skipping them.
export async function fetchNextDetailHistory(input: {
  petId: string;
  currentRecordId: string;
  page: DetailHistoryPage;
  isActive: () => boolean;
  readPage?: typeof fetchMemoriesByPetPage;
}): Promise<DetailHistoryPage> {
  const read = input.readPage ?? fetchMemoriesByPetPage;
  const records = [...input.page.records];
  let buffered = [...input.page.buffered];
  let cursor = input.page.cursor;
  let hasMore = input.page.hasMore;
  const seen = new Set([
    input.currentRecordId,
    ...records.map(item => item.id),
  ]);
  const target = records.length + DETAIL_HISTORY_PAGE_SIZE;
  while (records.length < target && input.isActive()) {
    if (buffered.length > 0) {
      const next = buffered.shift();
      if (next && !seen.has(next.id)) {
        seen.add(next.id);
        records.push(next);
      }
      continue;
    }
    if (!hasMore) break;
    const result = await read({
      petId: input.petId,
      limit: DETAIL_HISTORY_PAGE_SIZE + 1,
      cursor,
      prefetchTop: DETAIL_HISTORY_PAGE_SIZE,
    });
    if (!input.isActive()) return input.page;
    if (
      result.hasMore &&
      (!result.nextCursor || result.nextCursor === cursor)
    ) {
      throw new Error('Detail history cursor did not advance');
    }
    cursor = result.nextCursor;
    hasMore = result.hasMore;
    buffered = result.items.filter(
      item =>
        item.petId === input.petId &&
        !seen.has(item.id) &&
        !isHealthMemoryRecord(item),
    );
  }
  return { records, buffered, cursor, hasMore };
}

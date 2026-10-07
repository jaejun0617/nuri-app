import {
  emptyDetailHistory,
  fetchNextDetailHistory,
} from '../src/services/records/detailHistory';
import type { MemoryRecord } from '../src/services/supabase/memories';

jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoriesByPetPage: jest.fn(),
}));
const record = (id: string, petId = 'pet'): MemoryRecord => ({
  id,
  petId,
  title: id,
  tags: [],
  imagePaths: [],
  category: 'diary',
  createdAt: '2026-10-07T01:00:00Z',
});
describe('detail history compound cursor pages', () => {
  it('adds five across dates, excludes the current record, buffers surplus, and never skips IDs', async () => {
    const rows = Array.from({ length: 17 }, (_, i) => record(`${i}`));
    const readPage = jest.fn(
      async (input: { cursor?: string | null; limit?: number }) => {
        const start = Number(input.cursor ?? 0);
        const items = rows.slice(start, start + (input.limit ?? 6));
        return {
          items,
          hasMore: start + items.length < rows.length,
          nextCursor: `${start + items.length}`,
        };
      },
    );
    let page = emptyDetailHistory();
    for (const length of [5, 10, 15, 16]) {
      page = await fetchNextDetailHistory({
        petId: 'pet',
        currentRecordId: '0',
        page,
        isActive: () => true,
        readPage,
      });
      expect(page.records).toHaveLength(length);
    }
    expect(page.records.map(item => item.id)).toEqual(
      rows.slice(1).map(item => item.id),
    );
    expect(page.hasMore).toBe(false);
    expect(page.buffered).toHaveLength(0);
    expect(readPage.mock.calls[0][0]).toMatchObject({ limit: 6, cursor: null });
  });
  it('isolates pets, health records and duplicate rows without returning fewer than five when more exist', async () => {
    const readPage = jest
      .fn()
      .mockResolvedValueOnce({
        items: [
          record('current'),
          record('foreign', 'other'),
          { ...record('health'), category: 'health' },
          record('1'),
          record('1'),
          record('2'),
        ],
        hasMore: true,
        nextCursor: 'first',
      })
      .mockResolvedValueOnce({
        items: [record('3'), record('4'), record('5'), record('6')],
        hasMore: false,
        nextCursor: 'last',
      });
    const page = await fetchNextDetailHistory({
      petId: 'pet',
      currentRecordId: 'current',
      page: emptyDetailHistory(),
      isActive: () => true,
      readPage,
    });
    expect(page.records.map(item => item.id)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(page.buffered.map(item => item.id)).toEqual(['6']);
  });
  it('aborts inactive requests, propagates errors, and rejects a non-advancing cursor', async () => {
    const readPage = jest
      .fn()
      .mockResolvedValue({ items: [], hasMore: true, nextCursor: null });
    const input = {
      petId: 'pet',
      currentRecordId: 'current',
      page: emptyDetailHistory(),
      isActive: () => true,
      readPage,
    };
    await expect(fetchNextDetailHistory(input)).rejects.toThrow(
      'cursor did not advance',
    );
    readPage.mockRejectedValueOnce(new Error('network'));
    await expect(fetchNextDetailHistory(input)).rejects.toThrow('network');
    readPage.mockClear();
    expect(
      await fetchNextDetailHistory({ ...input, isActive: () => false }),
    ).toEqual(emptyDetailHistory());
    expect(readPage).not.toHaveBeenCalled();
  });
});

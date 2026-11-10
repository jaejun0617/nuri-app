import { fetchMemorySummaryRecordsByPet } from '../src/services/supabase/memories';

const mockFrom = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

it('reads lightweight summary rows past the first page for the same pet', async () => {
  const row = (id: string) => ({ id, pet_id: 'pet', created_at: '2026-10-01T00:00:00Z' });
  const range = jest.fn()
    .mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, index) => row(String(index))) })
    .mockResolvedValueOnce({ data: [row('last')] });
  const order = jest.fn().mockReturnValue({ range });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });

  const records = await fetchMemorySummaryRecordsByPet('pet');
  expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
  expect(eq.mock.calls).toEqual([['pet_id', 'pet'], ['pet_id', 'pet']]);
  expect(order.mock.calls).toEqual([
    ['id', { ascending: true }], ['id', { ascending: true }],
  ]);
  expect(records).toHaveLength(501);
  expect(records[500]).toMatchObject({ id: 'last', petId: 'pet', imagePaths: [] });
});

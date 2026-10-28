import {
  createMemory,
  MemoryAlreadySavedError,
} from '../src/services/supabase/memories';
import { invalidateMonthlyExpenses } from '../src/services/records/expenses';

const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
jest.mock('../src/services/records/expenses', () => ({
  invalidateMonthlyExpenses: jest.fn(),
}));
jest.mock('../src/services/supabase/storageMemories', () => ({
  deleteMemoryImage: jest.fn(),
  prefetchMemorySignedUrls: jest.fn(),
}));

const id = '8bb826c0-5c0b-4aa4-9fba-55e3840ae64d';
const input = {
  submission: { id, ownerId: 'owner' },
  petId: 'pet',
  title: 'first title',
  category: 'diary',
};
beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
  const query = { eq: mockEq, maybeSingle: mockMaybeSingle };
  mockEq.mockReturnValue(query);
  mockFrom.mockReturnValue({ insert: mockInsert, select: () => query });
  mockSingle.mockResolvedValue({ data: { id }, error: null });
});

it('sends an explicit stable primary key and owner, keeping the legacy API without submission intact', async () => {
  await expect(createMemory(input)).resolves.toBe(id);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ id, user_id: 'owner', pet_id: 'pet' }),
  );
  await createMemory({ petId: 'pet', title: 'legacy' });
  expect(mockInsert.mock.calls[1][0]).not.toHaveProperty('id');
});
it('retains one ID after a committed response is lost; a retry never overwrites edited text', async () => {
  mockSingle
    .mockResolvedValueOnce({ data: null, error: { code: 'NETWORK_LOST' } })
    .mockResolvedValueOnce({ data: null, error: { code: '23505' } });
  mockMaybeSingle.mockResolvedValue({
    data: { id, pet_id: 'pet', category: 'diary' },
    error: null,
  });
  await expect(createMemory(input)).rejects.toMatchObject({
    code: 'NETWORK_LOST',
  });
  await expect(
    createMemory({ ...input, title: 'edited after timeout' }),
  ).rejects.toBeInstanceOf(MemoryAlreadySavedError);
  expect(mockInsert.mock.calls.map(call => call[0].id)).toEqual([id, id]);
  expect(mockEq.mock.calls).toEqual([
    ['id', id],
    ['user_id', 'owner'],
    ['pet_id', 'pet'],
  ]);
  expect(invalidateMonthlyExpenses).toHaveBeenCalledTimes(1);
  expect(
    mockFrom.mock.results.every(result => !('update' in result.value)),
  ).toBe(true);
});
it.each([null, { id, pet_id: 'different-pet', category: 'diary' }])(
  'does not expose a collision outside the verified owner/pet row',
  async data => {
    const original = { code: '23505' };
    mockSingle.mockResolvedValue({ data: null, error: original });
    mockMaybeSingle.mockResolvedValue({ data, error: null });
    await expect(createMemory(input)).rejects.toBe(original);
    expect(invalidateMonthlyExpenses).not.toHaveBeenCalled();
  },
);
it('rejects invalid submission identity before any network request', async () => {
  await expect(
    createMemory({ ...input, submission: { id: 'bad', ownerId: 'owner' } }),
  ).rejects.toThrow('MEMORY_SUBMISSION_INVALID');
  expect(mockFrom).not.toHaveBeenCalled();
});
it('propagates a failed ownership lookup and an inconsistent successful response', async () => {
  mockSingle.mockResolvedValueOnce({ data: null, error: { code: '23505' } });
  mockMaybeSingle.mockResolvedValueOnce({
    data: null,
    error: { code: 'OFFLINE' },
  });
  await expect(createMemory(input)).rejects.toMatchObject({ code: 'OFFLINE' });
  mockSingle.mockResolvedValueOnce({ data: { id: 'wrong' }, error: null });
  await expect(createMemory(input)).rejects.toThrow(
    'MEMORY_SUBMISSION_RESPONSE_INVALID',
  );
});

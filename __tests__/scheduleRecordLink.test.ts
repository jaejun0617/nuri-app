import { supabase } from '../src/services/supabase/client';
import { linkScheduleRecord } from '../src/services/schedules/recordLink';
import { setScheduleCompletedAt } from '../src/services/supabase/schedules';

const mockQuery = {
  select: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  is: jest.fn(),
  not: jest.fn(),
  maybeSingle: jest.fn(),
  single: jest.fn(),
};
jest.mock('../src/services/supabase/client', () => ({
  supabase: { auth: { getUser: jest.fn() }, from: jest.fn() },
}));
const input = { petId: 'p', scheduleId: 's', memoryId: 'm' };
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(supabase.auth.getUser)
    .mockResolvedValue({ data: { user: { id: 'u' } }, error: null } as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >);
  jest
    .mocked(supabase.from)
    .mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);
  for (const method of ['select', 'update', 'eq', 'is', 'not'] as const)
    mockQuery[method].mockReturnValue(mockQuery);
  mockQuery.maybeSingle.mockReset();
  mockQuery.single.mockReset();
});
it('links only matching user/pet records with a conditional partial update', async () => {
  mockQuery.maybeSingle
    .mockResolvedValueOnce({ data: { id: 'm' }, error: null })
    .mockResolvedValueOnce({ data: { id: 's' }, error: null });
  await linkScheduleRecord(input);
  expect(mockQuery.update).toHaveBeenCalledWith({ linked_memory_id: 'm' });
  expect(mockQuery.eq.mock.calls).toEqual([
    ['id', 'm'],
    ['pet_id', 'p'],
    ['user_id', 'u'],
    ['id', 's'],
    ['pet_id', 'p'],
    ['user_id', 'u'],
  ]);
  expect(mockQuery.is).toHaveBeenCalledWith('linked_memory_id', null);
  expect(mockQuery.not).toHaveBeenCalledWith('completed_at', 'is', null);
});
it('rejects an unavailable or different-pet record without updating the schedule', async () => {
  mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await expect(linkScheduleRecord(input)).rejects.toMatchObject({
    code: 'MEMORY_MISMATCH',
  });
  expect(mockQuery.update).not.toHaveBeenCalled();
});
it.each([
  [{ linked_memory_id: 'different', completed_at: 'done' }, 'ALREADY_LINKED'],
  [{ linked_memory_id: null, completed_at: null }, 'NOT_COMPLETED'],
  [null, 'SCHEDULE_UNAVAILABLE'],
])(
  'never overwrites a concurrently changed/deleted schedule %p',
  async (data, code) => {
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'm' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data, error: null });
    await expect(linkScheduleRecord(input)).rejects.toMatchObject({ code });
    expect(mockQuery.update).toHaveBeenCalledTimes(1);
  },
);
it('accepts retry of the same link idempotently', async () => {
  mockQuery.maybeSingle
    .mockResolvedValueOnce({ data: { id: 'm' }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({
      data: { linked_memory_id: 'm', completed_at: 'done' },
      error: null,
    });
  await expect(linkScheduleRecord(input)).resolves.toBeUndefined();
});
it('propagates server failure without clearing or fabricating a link', async () => {
  mockQuery.maybeSingle
    .mockResolvedValueOnce({ data: { id: 'm' }, error: null })
    .mockResolvedValueOnce({ data: null, error: new Error('offline') });
  await expect(linkScheduleRecord(input)).rejects.toThrow('offline');
});
it('completion writes only completion status with explicit ownership filters', async () => {
  mockQuery.single.mockResolvedValueOnce({
    data: null,
    error: new Error('offline'),
  });
  await expect(
    setScheduleCompletedAt({ petId: 'p', scheduleId: 's', completedAt: null }),
  ).rejects.toThrow('offline');
  expect(mockQuery.update).toHaveBeenCalledWith({ completed_at: null });
  expect(mockQuery.eq.mock.calls).toEqual([
    ['id', 's'],
    ['pet_id', 'p'],
    ['user_id', 'u'],
  ]);
});
it('requires authentication before any write', async () => {
  jest
    .mocked(supabase.auth.getUser)
    .mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  await expect(linkScheduleRecord(input)).rejects.toMatchObject({
    code: 'UNAUTHENTICATED',
  });
  expect(supabase.from).not.toHaveBeenCalled();
});

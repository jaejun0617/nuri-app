import { createSchedule } from '../src/services/supabase/schedules';

const mockInsert = jest.fn(),
  mockSingle = jest.fn(),
  mockMaybeSingle = jest.fn();
const mockEq = jest.fn(),
  mockFrom = jest.fn(),
  mockGetUser = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  },
}));
const id = '8bb826c0-5c0b-4aa4-9fba-55e3840ae64d';
const input = {
  submission: { id, ownerId: 'owner' },
  petId: 'pet',
  title: 'first title',
  startsAt: '2026-10-29T01:00:00Z',
  category: 'walk' as const,
  iconKey: 'walk' as const,
};
const canonical = {
  id,
  user_id: 'owner',
  pet_id: 'pet',
  title: 'original schedule',
  starts_at: '2026-10-29T01:00:00Z',
  category: 'walk',
  icon_key: 'walk',
  reminder_minutes: [60],
  created_at: '2026-10-28T01:00:00Z',
  updated_at: '2026-10-28T01:00:00Z',
};
beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'owner' } },
    error: null,
  });
  mockSingle.mockResolvedValue({ data: { id }, error: null });
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
  const query = { eq: mockEq, maybeSingle: mockMaybeSingle };
  mockEq.mockReturnValue(query);
  mockFrom.mockReturnValue({ insert: mockInsert, select: () => query });
});
it('uses a stable submission primary key and keeps the legacy input contract', async () => {
  await expect(createSchedule(input)).resolves.toBe(id);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ id, user_id: 'owner', pet_id: 'pet' }),
  );
  await createSchedule({
    petId: 'pet',
    title: 'legacy',
    startsAt: input.startsAt,
    category: 'walk',
    iconKey: 'walk',
  });
  expect(mockInsert.mock.calls[1][0]).not.toHaveProperty('id');
});
it('recognizes a replay after response loss without overwriting canonical title or reminders', async () => {
  mockSingle
    .mockResolvedValueOnce({ data: null, error: { code: 'NETWORK_LOST' } })
    .mockResolvedValueOnce({ data: null, error: { code: '23505' } });
  mockMaybeSingle.mockResolvedValue({ data: canonical, error: null });
  await expect(createSchedule(input)).rejects.toMatchObject({
    code: 'NETWORK_LOST',
  });
  await expect(
    createSchedule({ ...input, title: 'edited retry', reminderMinutes: [5] }),
  ).rejects.toMatchObject({
    code: 'SCHEDULE_ALREADY_SAVED',
    schedule: { id, title: 'original schedule', reminderMinutes: [60] },
  });
  expect(mockInsert.mock.calls.map(call => call[0].id)).toEqual([id, id]);
  expect(mockEq.mock.calls).toEqual([
    ['id', id],
    ['user_id', 'owner'],
    ['pet_id', 'pet'],
  ]);
  expect(
    mockFrom.mock.results.every(result => !('update' in result.value)),
  ).toBe(true);
});
it.each([
  null,
  { ...canonical, user_id: 'other' },
  { ...canonical, pet_id: 'other' },
  { ...canonical, sync_status: 'deleted' },
])(
  'does not recover a conflicting row outside the owner/pet scope',
  async data => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '23505' } });
    mockMaybeSingle.mockResolvedValue({ data, error: null });
    await expect(createSchedule(input)).rejects.toMatchObject({
      code: '23505',
    });
  },
);
it('rejects invalid submission identity and changed authentication before inserting', async () => {
  await expect(
    createSchedule({ ...input, submission: { id: 'bad', ownerId: 'owner' } }),
  ).rejects.toThrow('SCHEDULE_SUBMISSION_INVALID');
  expect(mockFrom).not.toHaveBeenCalled();
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'changed' } },
    error: null,
  });
  await expect(createSchedule(input)).rejects.toThrow(
    'SCHEDULE_SUBMISSION_OWNER_CHANGED',
  );
  expect(mockFrom).not.toHaveBeenCalled();
});
it('propagates a failed recovery query and rejects a mismatched successful response', async () => {
  mockSingle.mockResolvedValueOnce({ data: null, error: { code: '23505' } });
  mockMaybeSingle.mockResolvedValueOnce({
    data: null,
    error: { code: 'OFFLINE' },
  });
  await expect(createSchedule(input)).rejects.toMatchObject({
    code: 'OFFLINE',
  });
  mockSingle.mockResolvedValueOnce({ data: { id: 'wrong' }, error: null });
  await expect(createSchedule(input)).rejects.toThrow(
    'SCHEDULE_SUBMISSION_RESPONSE_INVALID',
  );
});

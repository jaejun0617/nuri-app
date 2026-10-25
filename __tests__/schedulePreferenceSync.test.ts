import type { PetSchedule } from '../src/services/supabase/schedules';
import type { ActiveScheduleAlarm } from '../src/services/schedules/activeAlarm';
import { reconcileScheduleNotificationPreference, syncAccountScheduleNotificationPreference } from '../src/services/schedules/preferenceSync';

let mockOwner = 'owner-a';
let mockGeneration = 0;
const mockFetch = jest.fn<Promise<PetSchedule[]>, [string]>();
const mockActive = jest.fn<Promise<ActiveScheduleAlarm[]>, []>();
const mockLatest = jest.fn<Promise<PetSchedule>, [string]>();
const mockSetEnabled = jest.fn(async (_enabled: boolean) => { mockGeneration++; });
const mockUpsert = jest.fn().mockResolvedValue({ status: 'scheduled' });
const mockSettings = jest.fn().mockResolvedValue({ enabled: true });
const mockRpc = jest.fn();
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: { getState: () => ({ session: { user: { id: mockOwner } } }) } }));
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('../src/services/supabase/schedules', () => ({ fetchNotificationSchedules: (owner: string) => mockFetch(owner), fetchScheduleById: (id: string) => mockLatest(id) }));
jest.mock('../src/services/schedules/activeAlarm', () => ({ readActiveScheduleAlarms: () => mockActive() }));
jest.mock('../src/services/schedules/notifications', () => ({
  captureScheduleNotificationLifecycle: () => ({ generation: mockGeneration }),
  getScheduleNotificationSettings: () => mockSettings(),
  setScheduleNotificationEnabled: (value: boolean) => mockSetEnabled(value),
  upsertScheduleNotification: (...args: unknown[]) => mockUpsert(...args),
}));
function schedule(id: string, overrides: Partial<PetSchedule> = {}): PetSchedule {
  return { id, userId: 'owner-a', petId: 'pet-a', title: 'QA', note: null, startsAt: '2026-11-01T00:00:00Z', endsAt: null, allDay: false,
    category: 'other', subCategory: null, iconKey: 'calendar', colorKey: 'brand', reminderMinutes: [10], repeatRule: 'none', repeatInterval: 1, repeatUntil: null,
    linkedMemoryId: null, completedAt: null, source: 'manual', externalCalendarId: null, externalEventId: null, syncStatus: 'local', createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z', ...overrides };
}
beforeEach(() => {
  jest.clearAllMocks(); mockOwner = 'owner-a'; mockGeneration++;
  mockFetch.mockResolvedValue([]); mockActive.mockResolvedValue([]);
  mockSettings.mockResolvedValue({ enabled: true }); mockUpsert.mockResolvedValue({ status: 'scheduled' });
  mockLatest.mockImplementation(async id => schedule(id));
});
it('OFF cancels through the existing engine without querying or changing schedules', async () => {
  await reconcileScheduleNotificationPreference('owner-a', false);
  expect(mockSetEnabled).toHaveBeenCalledWith(false);
  expect(mockFetch).not.toHaveBeenCalled(); expect(mockUpsert).not.toHaveBeenCalled();
});
it('ON restores only eligible owner records and does not interrupt a ringing occurrence', async () => {
  const future = schedule('future');
  const repeat = schedule('repeat', { startsAt: '2026-01-01T00:00:00Z', repeatRule: 'daily' });
  mockFetch.mockResolvedValue([future, repeat, schedule('completed', { completedAt: '2026-10-25T00:00:00Z' }), schedule('deleted', { syncStatus: 'deleted' }), schedule('none', { reminderMinutes: [] }), schedule('foreign', { userId: 'owner-b' }), schedule('ringing')]);
  mockLatest.mockImplementation(async id => id === 'repeat' ? repeat : future);
  mockActive.mockResolvedValue([{ alarmId: 'ringing::10::0', scheduleId: 'ringing', petId: 'pet-a', token: 'token', title: 'QA', body: 'QA', occurrenceAtMillis: 1000 }]);
  await reconcileScheduleNotificationPreference('owner-a', true);
  expect(mockUpsert.mock.calls.map(args => args[0].id)).toEqual(['future', 'repeat']);
  expect(mockUpsert).toHaveBeenCalledWith(repeat, { generation: mockGeneration }, true);
});
it('does not enable native alarms after an account switch while loading', async () => {
  mockFetch.mockImplementation(async () => { mockOwner = 'owner-b'; return [schedule('late')]; });
  await expect(reconcileScheduleNotificationPreference('owner-a', true)).rejects.toThrow('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  expect(mockSetEnabled).not.toHaveBeenCalled(); expect(mockUpsert).not.toHaveBeenCalled();
});
it('does not resurrect work invalidated by logout or an intervening toggle', async () => {
  mockFetch.mockImplementation(async () => { mockGeneration++; return [schedule('late')]; });
  await expect(reconcileScheduleNotificationPreference('owner-a', true)).rejects.toThrow('NURI_NOTIFICATION_ACCOUNT_CHANGED');
  expect(mockSetEnabled).not.toHaveBeenCalled();
});
it('keeps the native preference unchanged if the schedule query fails', async () => {
  mockFetch.mockRejectedValue(new Error('offline'));
  await expect(reconcileScheduleNotificationPreference('owner-a', true)).rejects.toThrow('offline');
  expect(mockSetEnabled).not.toHaveBeenCalled();
});
it('reports incomplete reservations instead of equating account consent with OS delivery', async () => {
  mockFetch.mockResolvedValue([schedule('one')]); mockUpsert.mockResolvedValue({ status: 'missing-permission' });
  await expect(reconcileScheduleNotificationPreference('owner-a', true)).rejects.toThrow('NURI_NOTIFICATION_SCHEDULE_REARM_INCOMPLETE');
});
it('preserves a legacy device preference when the account has no schedule key', async () => {
  mockRpc.mockResolvedValue({ data: { categories: {} }, error: null });
  await syncAccountScheduleNotificationPreference('owner-a');
  expect(mockSetEnabled).not.toHaveBeenCalled(); expect(mockFetch).not.toHaveBeenCalled();
});
it('does not silently treat malformed preferences as consent', async () => {
  mockRpc.mockResolvedValue({ data: { categories: { schedule: 'yes' } }, error: null });
  await expect(syncAccountScheduleNotificationPreference('owner-a')).rejects.toThrow('NURI_NOTIFICATION_SETTINGS_INVALID');
  expect(mockSetEnabled).not.toHaveBeenCalled();
});
it('rechecks the latest version instead of restoring a stale edited or completed row', async () => {
  mockFetch.mockResolvedValue([schedule('edited'), schedule('completed')]);
  mockLatest.mockImplementation(async id => schedule(id, id === 'completed' ? { completedAt: '2026-10-25T00:00:00Z' } : { title: 'Updated' }));
  await reconcileScheduleNotificationPreference('owner-a', true);
  expect(mockUpsert).toHaveBeenCalledTimes(1);
  expect(mockUpsert.mock.calls[0][0].title).toBe('Updated');
});
it('does not recreate a schedule deleted during the restore query', async () => {
  mockFetch.mockResolvedValue([schedule('deleted-late')]);
  mockLatest.mockRejectedValue({ code: 'PGRST116' });
  await reconcileScheduleNotificationPreference('owner-a', true);
  expect(mockUpsert).not.toHaveBeenCalled();
});

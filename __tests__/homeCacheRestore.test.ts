import { useRecordStore } from '../src/store/recordStore';
import { useScheduleStore } from '../src/store/scheduleStore';
import { fetchMemoriesByPetPage, type MemoryRecord } from '../src/services/supabase/memories';
import { fetchSchedulesByPet, type PetSchedule } from '../src/services/supabase/schedules';

jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoriesByPetPage: jest.fn(), encodeMemoriesCursor: () => null,
}));
jest.mock('../src/services/supabase/schedules', () => ({ fetchSchedulesByPet: jest.fn() }));
const record: MemoryRecord = {
  id: 'cached', petId: 'pet', title: 'cached', category: 'diary', tags: [],
  imagePaths: [], createdAt: '2026-10-28T01:00:00Z',
};
const schedule: PetSchedule = {
  id: 'cached', userId: 'owner', petId: 'pet', title: 'cached', note: null,
  startsAt: '2026-10-28T01:00:00Z', endsAt: null, allDay: false,
  category: 'walk', subCategory: null, iconKey: 'walk', colorKey: 'brand',
  reminderMinutes: [], repeatRule: 'none', repeatInterval: 1, repeatUntil: null,
  linkedMemoryId: null, completedAt: null, source: 'manual',
  externalCalendarId: null, externalEventId: null, syncStatus: 'local',
  createdAt: '2026-10-28T01:00:00Z', updatedAt: '2026-10-28T01:00:00Z',
};
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('not initialized'); };
  const promise = new Promise<T>(finish => { resolve = finish; });
  return { promise, resolve };
}
beforeEach(() => {
  useRecordStore.getState().clearAll();
  useScheduleStore.getState().clearAll();
  jest.clearAllMocks();
});

it('does not restore deleted records over a successful empty server snapshot', () => {
  const store = useRecordStore.getState();
  store.replaceAll('pet', [record]);
  store.removeOneLocal('pet', record.id);
  store.restoreFromCache('pet', [record]);
  expect(useRecordStore.getState().getPetState('pet').items).toEqual([]);
  expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual([]);
  expect(useRecordStore.getState().selectRecordById(record.id)).toBeNull();
});
it('uses disk records only as a preview without cancelling an in-flight canonical empty response', async () => {
  const pending = deferred<Awaited<ReturnType<typeof fetchMemoriesByPetPage>>>();
  jest.mocked(fetchMemoriesByPetPage).mockReturnValueOnce(pending.promise);
  const store = useRecordStore.getState(), task = store.bootstrap('pet');
  const requestSeq = useRecordStore.getState().getPetState('pet').requestSeq;
  store.restoreFromCache('pet', [record]);
  expect(useRecordStore.getState().getPetState('pet')).toMatchObject({
    status: 'loading', requestSeq, items: [expect.objectContaining({ id: 'cached' })],
  });
  pending.resolve({ items: [], nextCursor: null, hasMore: false });
  await task;
  expect(useRecordStore.getState().getPetState('pet')).toMatchObject({ status: 'ready', items: [] });
  expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual([]);
});
it('still starts canonical bootstrap after an early disk preview', async () => {
  const store = useRecordStore.getState();
  store.restoreFromCache('pet', [record]);
  expect(useRecordStore.getState().getPetState('pet').status).toBe('idle');
  jest.mocked(fetchMemoriesByPetPage).mockResolvedValueOnce({ items: [], hasMore: false, nextCursor: null });
  await store.bootstrap('pet');
  expect(fetchMemoriesByPetPage).toHaveBeenCalledTimes(1);
  expect(useRecordStore.getState().getPetState('pet').items).toEqual([]);
});
it('keeps offline error state visible while recovering available disk records', () => {
  const store = useRecordStore.getState();
  store.ensurePetState('pet');
  useRecordStore.setState(state => ({ byPetId: {
    ...state.byPetId, pet: { ...state.byPetId.pet, status: 'error', errorMessage: 'offline' },
  } }));
  store.restoreFromCache('pet', [record]);
  expect(useRecordStore.getState().getPetState('pet')).toMatchObject({
    status: 'error', errorMessage: 'offline', items: [expect.objectContaining({ id: 'cached' })],
  });
});
it('does not let disk schedules replace a confirmed empty schedule list', () => {
  const store = useScheduleStore.getState();
  store.replaceAll('pet', []);
  store.restoreFromCache('pet', [schedule]);
  expect(useScheduleStore.getState().getPetState('pet')).toMatchObject({ status: 'ready', items: [] });
});
it('preserves schedule request identity while showing cache and then accepts the server result', async () => {
  const pending = deferred<PetSchedule[]>();
  jest.mocked(fetchSchedulesByPet).mockReturnValueOnce(pending.promise);
  const store = useScheduleStore.getState(), task = store.bootstrap('pet');
  const requestSeq = useScheduleStore.getState().getPetState('pet').requestSeq;
  store.restoreFromCache('pet', [schedule]);
  expect(useScheduleStore.getState().getPetState('pet')).toMatchObject({ status: 'loading', requestSeq, items: [schedule] });
  pending.resolve([]);
  await task;
  expect(useScheduleStore.getState().getPetState('pet')).toMatchObject({ status: 'ready', items: [] });
});
it('does not restore a different pet or overwrite current nonempty records and schedules', () => {
  const records = useRecordStore.getState(), schedules = useScheduleStore.getState();
  records.restoreFromCache('other', [record]);
  schedules.restoreFromCache('other', [schedule]);
  expect(useRecordStore.getState().getPetState('other').items).toEqual([]);
  expect(useScheduleStore.getState().getPetState('other').items).toEqual([]);
  records.replaceAll('pet', [{ ...record, title: 'current' }]);
  schedules.replaceAll('pet', [{ ...schedule, title: 'current' }]);
  records.restoreFromCache('pet', [record]);
  schedules.restoreFromCache('pet', [schedule]);
  expect(useRecordStore.getState().getPetState('pet').items[0].title).toBe('current');
  expect(useScheduleStore.getState().getPetState('pet').items[0].title).toBe('current');
});

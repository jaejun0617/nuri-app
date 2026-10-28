import { useRecordStore } from '../src/store/recordStore';
import {
  fetchMemoriesByPetPage,
  type MemoryRecord,
} from '../src/services/supabase/memories';

jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoriesByPetPage: jest.fn(),
  encodeMemoriesCursor: (row: { id: string }) => row.id,
}));

const fetchPage = jest.mocked(fetchMemoriesByPetPage);
type Page = Awaited<ReturnType<typeof fetchMemoriesByPetPage>>;
const row = (id: string, title = id): MemoryRecord => ({
  id, title, petId: 'pet', category: 'diary', tags: [], imagePaths: [],
  createdAt: '2026-10-28T01:00:00Z',
});
const page = (items: MemoryRecord[]): Page => ({
  items, nextCursor: null, hasMore: false,
});
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('not initialized'); };
  let reject: (error: Error) => void = () => { throw new Error('not initialized'); };
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useRecordStore.getState().clearAll();
  fetchPage.mockReset();
});

it.each(['bootstrap', 'refresh', 'loadMore'] as const)(
  'does not resurrect a deleted record from an earlier %s response',
  async operation => {
    const pending = deferred<Page>();
    const store = useRecordStore.getState();
    if (operation !== 'bootstrap') store.replaceAll('pet', [row('deleted')]);
    if (operation === 'loadMore') {
      useRecordStore.setState(state => ({ byPetId: {
        ...state.byPetId,
        pet: { ...state.byPetId.pet, hasMore: true },
      } }));
    }
    fetchPage.mockReturnValueOnce(pending.promise);
    const task = store[operation]('pet');
    store.removeOneLocal('pet', 'deleted');
    pending.resolve(page([row('deleted')]));
    await task;
    expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual([]);
    expect(useRecordStore.getState().selectRecordById('deleted')).toBeNull();
    expect(useRecordStore.getState().getPetState('pet').items).toEqual([]);
  },
);

it.each(['update', 'insert', 'replace'] as const)(
  'does not overwrite a newer local %s with an earlier refresh response',
  async mutation => {
    const pending = deferred<Page>(), store = useRecordStore.getState();
    store.replaceAll('pet', [row('original')]);
    fetchPage.mockReturnValueOnce(pending.promise);
    const task = store.refresh('pet');
    if (mutation === 'update') store.updateOneLocal('pet', 'original', { title: 'edited' });
    if (mutation === 'insert') store.upsertOneLocal('pet', row('new'));
    if (mutation === 'replace') store.replaceAll('pet', [row('replacement')]);
    pending.resolve(page([row('original')]));
    await task;
    const state = useRecordStore.getState();
    if (mutation === 'update') expect(state.selectRecordById('original')?.title).toBe('edited');
    if (mutation === 'insert') expect(state.selectTimelineIdsByPetId('pet')).toContain('new');
    if (mutation === 'replace') expect(state.selectTimelineIdsByPetId('pet')).toEqual(['replacement']);
    expect(state.getPetState('pet').status).toBe('ready');
  },
);

it('starts a fresh refresh after a mutation instead of joining the pre-mutation task', async () => {
  const old = deferred<Page>(), fresh = deferred<Page>(), store = useRecordStore.getState();
  store.replaceAll('pet', [row('deleted')]);
  fetchPage.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const first = store.refresh('pet');
  store.removeOneLocal('pet', 'deleted');
  const second = store.refresh('pet');
  const calls = fetchPage.mock.calls.length;
  old.resolve(page([row('deleted')]));
  await first;
  fresh.resolve(page([row('fresh')]));
  await second;
  expect(calls).toBe(2);
  expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual(['fresh']);
});

it.each(['clearPet', 'clearAll'] as const)(
  'does not apply an old owner/request after %s and a new bootstrap',
  async clear => {
    const old = deferred<Page>(), fresh = deferred<Page>(), store = useRecordStore.getState();
    fetchPage.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const first = store.bootstrap('pet');
    if (clear === 'clearPet') store.clearPet('pet');
    else store.clearAll();
    const second = store.bootstrap('pet');
    fresh.resolve(page([row('current-owner')]));
    await second;
    old.resolve(page([row('old-owner')]));
    await first;
    expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual(['current-owner']);
    expect(useRecordStore.getState().selectRecordById('old-owner')).toBeNull();
  },
);

it('ignores an obsolete page failure after a successful local mutation', async () => {
  const pending = deferred<Page>(), store = useRecordStore.getState();
  store.replaceAll('pet', [row('original')]);
  useRecordStore.setState(state => ({ byPetId: {
    ...state.byPetId, pet: { ...state.byPetId.pet, hasMore: true },
  } }));
  fetchPage.mockReturnValueOnce(pending.promise);
  const task = store.loadMore('pet');
  store.updateOneLocal('pet', 'original', { title: 'edited' });
  pending.reject(new Error('old page failed'));
  await task;
  expect(useRecordStore.getState().getPetState('pet')).toMatchObject({
    status: 'ready', errorMessage: null,
  });
});

it('continues sharing a refresh when no intervening mutation exists', async () => {
  const pending = deferred<Page>(), store = useRecordStore.getState();
  fetchPage.mockReturnValueOnce(pending.promise);
  const first = store.refresh('pet'), second = store.refresh('pet');
  pending.resolve(page([row('shared')]));
  await Promise.all([first, second]);
  expect(fetchPage).toHaveBeenCalledTimes(1);
  expect(useRecordStore.getState().selectTimelineIdsByPetId('pet')).toEqual(['shared']);
});

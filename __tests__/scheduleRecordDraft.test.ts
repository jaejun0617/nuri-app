import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveRecordCreateDraft,
  loadRecordCreateDraft,
  clearRecordCreateDraft,
  saveScheduleRecordRecovery,
  loadScheduleRecordRecovery,
  clearScheduleRecordRecovery,
  adoptLegacyRecordCreateDraft,
  type RecordCreateDraft,
} from '../src/services/local/recordDraft';

const scope = { userId: 'u', petId: 'p', scheduleId: 's' };
const draft: RecordCreateDraft = {
  petId: 'p',
  title: '산책',
  content: '함께 걸어요',
  occurredAt: '2026-10-05',
  selectedTags: [],
  mainCategoryKey: 'walk',
  otherSubCategoryKey: null,
  selectedEmotion: null,
  selectedImages: [],
  updatedAt: '2026-10-05T01:00:00Z',
};
const storage = new Map<string, string>();
beforeEach(() => {
  jest.clearAllMocks();
  storage.clear();
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async key => {
    storage.delete(key);
  });
});
it('isolates schedule drafts by user, pet and schedule without overwriting ordinary drafts', async () => {
  await saveRecordCreateDraft({ ...draft, title: '일반 기록' });
  await saveRecordCreateDraft(draft, scope);
  expect((await loadRecordCreateDraft())?.title).toBe('일반 기록');
  expect(await loadRecordCreateDraft(scope)).toEqual(draft);
  for (const other of [
    { ...scope, userId: 'other' },
    { ...scope, petId: 'other' },
    { ...scope, scheduleId: 'other' },
  ]) {
    expect(await loadRecordCreateDraft(other)).toBeNull();
    expect(await loadScheduleRecordRecovery(other)).toBeNull();
  }
  await clearRecordCreateDraft(scope);
  expect((await loadRecordCreateDraft())?.title).toBe('일반 기록');
});
it('keeps pending record recovery separate from editable draft clearing', async () => {
  await saveRecordCreateDraft(draft, scope);
  await saveScheduleRecordRecovery(scope, 'memory');
  await clearRecordCreateDraft(scope);
  expect(await loadScheduleRecordRecovery(scope)).toBe('memory');
  await clearScheduleRecordRecovery(scope);
  expect(await loadScheduleRecordRecovery(scope)).toBeNull();
});
it('restores medical details and the single expense total without changing other draft fields', async () => {
  const medicalDraft: RecordCreateDraft = {
    ...draft,
    mainCategoryKey: 'health',
    priceText: '24000',
    healthCare: { kind: 'hospital', hospitalName: '누리병원', diagnosis: '검진', medication: '복약 메모' },
  };
  await saveRecordCreateDraft(medicalDraft);
  expect(await loadRecordCreateDraft()).toEqual(medicalDraft);
});
it('propagates storage failures instead of treating unknown recovery state as no record', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await expect(loadScheduleRecordRecovery(scope)).rejects.toThrow('disk');
});

it('isolates ordinary drafts by owner and pet while preserving a stable submission ID', async () => {
  const ordinary = { userId: 'u', petId: 'p' };
  const submitted = { ...draft, submissionId: '8bb826c0-5c0b-4aa4-9fba-55e3840ae64d' };
  await saveRecordCreateDraft(submitted, ordinary);
  expect(await loadRecordCreateDraft(ordinary)).toEqual(submitted);
  expect(await loadRecordCreateDraft({ ...ordinary, userId: 'other' })).toBeNull();
  expect(await loadRecordCreateDraft({ ...ordinary, petId: 'other' })).toBeNull();
  expect(await loadRecordCreateDraft(scope)).toBeNull();
  await expect(saveRecordCreateDraft({ ...draft, petId: 'other' }, ordinary)).rejects.toThrow('RECORD_DRAFT_SCOPE_MISMATCH');
  await clearRecordCreateDraft({ ...ordinary, userId: 'other' });
  expect(await loadRecordCreateDraft(ordinary)).toEqual(submitted);
});
it('never implicitly loads legacy data into a scoped draft and adopts only the verified matching pet', async () => {
  await saveRecordCreateDraft(draft);
  const ordinary = { userId: 'u', petId: 'p' };
  expect(await loadRecordCreateDraft(ordinary)).toBeNull();
  expect(await adoptLegacyRecordCreateDraft({ ...ordinary, petId: 'other' })).toBeNull();
  expect(await loadRecordCreateDraft()).toEqual(draft);
  expect(await adoptLegacyRecordCreateDraft(ordinary)).toEqual(draft);
  expect(await loadRecordCreateDraft(ordinary)).toEqual(draft);
  expect(await loadRecordCreateDraft()).toBeNull();
});
it('keeps legacy content when adoption fails to write and rejects malformed content without deleting it', async () => {
  await saveRecordCreateDraft(draft);
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await expect(adoptLegacyRecordCreateDraft({ userId: 'u', petId: 'p' })).rejects.toThrow('disk full');
  expect(await loadRecordCreateDraft()).toEqual(draft);
  storage.set('nuri.record-create-draft.v1', '{broken');
  await expect(loadRecordCreateDraft()).rejects.toThrow('RECORD_DRAFT_INVALID');
  expect(storage.get('nuri.record-create-draft.v1')).toBe('{broken');
});
it('serializes clear behind an in-flight autosave instead of reviving the removed draft', async () => {
  let complete: (() => void) | undefined;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce((key, value) => new Promise<void>(resolve => {
    complete = () => { storage.set(key, value); resolve(); };
  }));
  const ordinary = { userId: 'u', petId: 'p' };
  const write = saveRecordCreateDraft(draft, ordinary);
  const clear = clearRecordCreateDraft(ordinary);
  await Promise.resolve(); await Promise.resolve();
  expect(complete).toBeDefined(); complete?.();
  await write; await clear;
  expect(await loadRecordCreateDraft(ordinary)).toBeNull();
});

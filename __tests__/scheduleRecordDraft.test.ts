import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveRecordCreateDraft,
  loadRecordCreateDraft,
  clearRecordCreateDraft,
  saveScheduleRecordRecovery,
  loadScheduleRecordRecovery,
  clearScheduleRecordRecovery,
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
it('propagates storage failures instead of treating unknown recovery state as no record', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk'));
  await expect(loadScheduleRecordRecovery(scope)).rejects.toThrow('disk');
});

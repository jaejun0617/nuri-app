import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveWalkDraft,
  loadWalkDraft,
  prepareWalkSubmission,
  clearCommittedWalkDraft,
  purgeWalkDraftsAfterFinalDeletion,
  walkDraftKey,
  walkDraftPayload,
  type WalkDraftFields,
} from '../src/services/walk/product/drafts';
const owner = '11111111-1111-4111-8111-111111111111',
  pet = '22222222-2222-4222-8222-222222222222',
  session = '33333333-3333-4333-8333-333333333333';
const s = { ownerId: owner, petId: pet, clientSessionId: session };
const value: WalkDraftFields = {
  title: '산책',
  content: '메모',
  emotion: null,
  tags: ['#산책'],
  photos: [
    {
      key: 'picked',
      uri: 'file:///synthetic-photo.jpg',
      mimeType: 'image/jpeg',
    },
  ],
};
let db: Map<string, string>;
beforeEach(() => {
  db = new Map();
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => db.get(key) ?? null,
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    async (key: string, text: string) => {
      db.set(key, text);
    },
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(
    async (key: string) => {
      db.delete(key);
    },
  );
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => [
    ...db.keys(),
  ]);
});
it('draft key binds owner+pet+session; fields restore exactly including photos', async () => {
  await saveWalkDraft(s, value);
  expect((await loadWalkDraft(s))?.fields).toEqual(value);
  expect(
    await loadWalkDraft({
      ...s,
      clientSessionId: '44444444-4444-4444-8444-444444444444',
    }),
  ).toBeNull();
  expect(
    await loadWalkDraft({
      ...s,
      ownerId: '55555555-5555-4555-8555-555555555555',
    }),
  ).toBeNull();
});
it('stable submission preserves original identity/snapshot after lost response and edited draft', async () => {
  const identity = jest
    .fn()
    .mockReturnValueOnce('66666666-6666-4666-8666-666666666666')
    .mockReturnValueOnce('77777777-7777-4777-8777-777777777777');
  const a = await prepareWalkSubmission(s, value, identity);
  await saveWalkDraft(s, { ...value, content: '수정된 초안' });
  const b = await prepareWalkSubmission(
    s,
    { ...value, content: '수정된 초안' },
    identity,
  );
  expect(b.submission).toEqual(a.submission);
  expect(b.fields.content).toBe('수정된 초안');
  expect(identity).toHaveBeenCalledTimes(2);
});
it('compare-and-delete cannot erase a newer edit or different scope', async () => {
  const a = await saveWalkDraft(s, value);
  await saveWalkDraft(s, { ...value, title: '새 제목' });
  expect(await clearCommittedWalkDraft(s, a)).toBe(false);
  expect((await loadWalkDraft(s))?.fields.title).toBe('새 제목');
  const b = await loadWalkDraft(s);
  expect(await clearCommittedWalkDraft(s, b!)).toBe(true);
});
it('malformed drafts are preserved rather than overwritten/cleared', async () => {
  db.set(walkDraftKey(s), '{broken');
  await expect(saveWalkDraft(s, value)).rejects.toThrow();
  expect(db.get(walkDraftKey(s))).toBe('{broken');
});
it('GPS input limits match D without metric or source fields', () => {
  expect(Object.keys(walkDraftPayload(value))).toEqual([
    'title',
    'content',
    'emotion',
    'tags',
  ]);
  for (const fields of [
    { ...value, title: 'x'.repeat(101) },
    { ...value, content: 'x'.repeat(5001) },
    { ...value, tags: Array(21).fill('#a') },
    { ...value, photos: Array(11).fill(value.photos[0]) },
  ])
    expect(() => walkDraftPayload(fields)).toThrow();
});
it('confirmed final purge fences in-flight new-key write, queued edits and only exact pet', async () => {
  const deleted = { ...s, ownerId: '88888888-8888-4888-8888-888888888888' };
  const otherPet = {
    ...deleted,
    petId: '99999999-9999-4999-8999-999999999999',
  };
  await saveWalkDraft(otherPet, value);
  await saveWalkDraft(s, value);
  let finish!: () => void;
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(
    (key: string, text: string) =>
      new Promise<void>(resolve => {
        finish = () => {
          db.set(key, text);
          resolve();
        };
      }),
  );
  const writing = saveWalkDraft(deleted, value);
  for (let i = 0; i < 8 && !finish; i++) await Promise.resolve();
  expect(finish).toBeDefined();
  const queued = saveWalkDraft(deleted, { ...value, title: 'late' }).catch(
    error => error,
  );
  const purge = purgeWalkDraftsAfterFinalDeletion(
    deleted.ownerId,
    deleted.petId,
    'PET_FINAL',
  );
  finish();
  await writing;
  expect(await queued).toMatchObject({ message: 'WALK_FINAL_SCOPE_DELETED' });
  await purge;
  expect(db.has(walkDraftKey(deleted))).toBe(false);
  expect(db.has(walkDraftKey(otherPet))).toBe(true);
  expect(db.has(walkDraftKey(s))).toBe(true);
  await expect(
    prepareWalkSubmission(deleted, value, () => session),
  ).rejects.toThrow('WALK_FINAL_SCOPE_DELETED');
});

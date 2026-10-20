import AsyncStorage from '@react-native-async-storage/async-storage';
import { commitWalkComposer } from '../src/services/walk/product/composer';
import { walkRecordRepository } from '../src/services/walk/server/supabaseWalkRecordRepository';
import { enqueuePendingMemoryUpload } from '../src/services/local/uploadQueue';
import {
  prepareWalkSubmission,
  loadWalkDraft,
  saveWalkDraft,
  type WalkDraftFields,
} from '../src/services/walk/product/drafts';
import type { WalkRecordCommit } from '../src/services/walk/server/recordRepository';

jest.mock('../src/services/walk/server/supabaseWalkRecordRepository', () => ({
  walkRecordRepository: { create: jest.fn() },
}));
jest.mock('../src/services/local/uploadQueue', () => ({
  enqueuePendingMemoryUpload: jest.fn(),
}));
const owner = '11111111-1111-4111-8111-111111111111',
  pet = '22222222-2222-4222-8222-222222222222',
  session = '33333333-3333-4333-8333-333333333333';
const s = { ownerId: owner, petId: pet, clientSessionId: session };
const v: WalkDraftFields = {
  title: '원본 제목',
  content: '원본 내용',
  emotion: null,
  tags: ['#산책'],
  photos: [
    { key: 'photo', uri: 'file:///synthetic.jpg', mimeType: 'image/jpeg' },
  ],
};
const id = '44444444-4444-4444-8444-444444444444';
function commit(memoryId = id, replayed = false): WalkRecordCommit {
  return {
    replayed,
    activity: null,
    reward: null,
    record: {
      version: 1,
      source: 'GPS_TRACKED',
      clientSessionId: session,
      petId: pet,
      sessionDeleted: false,
      recordState: 'RECORDED',
      summary: null,
      claim: null,
      memory: {
        id: memoryId,
        petId: pet,
        title: '서버 원본',
        content: '서버 내용',
        emotion: null,
        tags: [],
        category: 'walk',
        occurredAt: '2026-10-20',
        createdAt: '2026-10-20T00:00:00.000Z',
        updatedAt: '2026-10-20T00:00:00.000Z',
        imagePath: null,
        imagePaths: [],
      },
    },
  };
}
beforeEach(() => {
  const db = new Map<string, string>();
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => db.get(key) ?? null,
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    async (key: string, value: string) => {
      db.set(key, value);
    },
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(
    async (key: string) => {
      db.delete(key);
    },
  );
  (enqueuePendingMemoryUpload as jest.Mock).mockResolvedValue({
    taskId: 'durable',
  });
});
it('successful atomic commit uploads only against the canonical ID and clears exact draft', async () => {
  await prepareWalkSubmission(s, v, () => id);
  (walkRecordRepository.create as jest.Mock).mockResolvedValue(commit());
  const r = await commitWalkComposer(
    { ownerId: owner, petId: pet, current: () => true },
    s,
    v,
  );
  expect(r.retained).toBe(false);
  expect(r.commit.record.memory?.title).toBe('서버 원본');
  expect(enqueuePendingMemoryUpload).toHaveBeenCalledWith(
    expect.objectContaining({ memoryId: id, userId: owner, petId: pet }),
  );
  expect(await loadWalkDraft(s)).toBeNull();
});
it('lost response → edited draft → original replay preserves photos/new text and original payload identity', async () => {
  const original = await prepareWalkSubmission(s, v, () => id);
  (walkRecordRepository.create as jest.Mock)
    .mockRejectedValueOnce(new Error('response lost'))
    .mockResolvedValueOnce(commit(id, true));
  const scope = { ownerId: owner, petId: pet, current: () => true };
  await expect(commitWalkComposer(scope, s, v)).rejects.toThrow(
    'response lost',
  );
  const edited = { ...v, content: '응답 유실 후 수정' };
  await saveWalkDraft(s, edited);
  const r = await commitWalkComposer(scope, s, edited);
  expect(r.retained).toBe(true);
  expect(r.commit.reward).toBeNull();
  expect(enqueuePendingMemoryUpload).not.toHaveBeenCalled();
  expect(walkRecordRepository.create).toHaveBeenLastCalledWith(
    expect.objectContaining({
      memoryId: original.submission.memoryId,
      requestId: original.submission.requestId,
      record: expect.objectContaining({ content: v.content }),
    }),
  );
  expect((await loadWalkDraft(s))?.fields).toEqual(edited);
});
it('other-device original ID never receives this draft photos or optimistic fields', async () => {
  await prepareWalkSubmission(s, v, () => id);
  (walkRecordRepository.create as jest.Mock).mockResolvedValue(
    commit('55555555-5555-4555-8555-555555555555', true),
  );
  const r = await commitWalkComposer(
    { ownerId: owner, petId: pet, current: () => true },
    s,
    v,
  );
  expect(r.retained).toBe(true);
  expect(r.commit.record.memory?.title).toBe('서버 원본');
  expect(enqueuePendingMemoryUpload).not.toHaveBeenCalled();
  expect((await loadWalkDraft(s))?.fields.photos).toEqual(v.photos);
});
it('photo persistence failure retains committed-ID recovery draft', async () => {
  await prepareWalkSubmission(s, v, () => id);
  (walkRecordRepository.create as jest.Mock).mockResolvedValue(commit());
  (enqueuePendingMemoryUpload as jest.Mock).mockRejectedValue(
    new Error('storage failed'),
  );
  const r = await commitWalkComposer(
    { ownerId: owner, petId: pet, current: () => true },
    s,
    v,
  );
  expect(r.retained).toBe(true);
  expect((await loadWalkDraft(s))?.submission?.memoryId).toBe(id);
});
it('owner/pet changes after RPC block upload/clear continuation', async () => {
  await prepareWalkSubmission(s, v, () => id);
  let current = true;
  (walkRecordRepository.create as jest.Mock).mockImplementation(async () => {
    current = false;
    return commit();
  });
  await expect(
    commitWalkComposer(
      { ownerId: owner, petId: pet, current: () => current },
      s,
      v,
    ),
  ).rejects.toMatchObject({ code: 'WALK_PRODUCT_CONTEXT_CHANGED' });
  expect(enqueuePendingMemoryUpload).not.toHaveBeenCalled();
  expect(await loadWalkDraft(s)).not.toBeNull();
});

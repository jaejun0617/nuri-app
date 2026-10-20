import { saveLinkedWalkBody } from '../src/services/walk/product/edit';
import { updateMemoryFields } from '../src/services/supabase/memories';
import { walkRecordRepository } from '../src/services/walk/server/supabaseWalkRecordRepository';
import { enqueuePendingMemoryUpload } from '../src/services/local/uploadQueue';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { invalidateWalkProduct } from '../src/services/walk/product/invalidation';
import type { WalkMemorySourceSummary, WalkRecordView } from '../src/services/walk/server/recordRepository';

jest.mock('../src/services/supabase/memories', () => ({ updateMemoryFields: jest.fn() }));
jest.mock('../src/services/walk/server/supabaseWalkRecordRepository', () => ({ walkRecordRepository: { get: jest.fn() } }));
jest.mock('../src/services/local/uploadQueue', () => ({ enqueuePendingMemoryUpload: jest.fn(), processPendingMemoryUploads: jest.fn() }));
const scope = { ownerId: 'owner', petId: 'pet', current: () => true };
const source: WalkMemorySourceSummary = { version: 1, source: 'GPS_TRACKED', petId: 'pet', memoryId: 'original', clientSessionId: 'session', recordState: 'RECORDED', sessionDeleted: true, summary: null };
const record: WalkRecordView = { version: 1, source: 'GPS_TRACKED', petId: 'pet', clientSessionId: 'session', recordState: 'RECORDED', sessionDeleted: true, summary: null, claim: null, memory: { id: 'original', petId: 'pet', title: '서버 기록', content: null, emotion: null, tags: [], category: 'walk', occurredAt: '2026-10-19', createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z', imagePath: null, imagePaths: [] } };
const body = { title: '수정한 제목', content: '내용', emotion: null, tags: ['#산책'], photos: [] };
beforeEach(() => { jest.clearAllMocks(); appQueryClient.clear(); jest.mocked(walkRecordRepository.get).mockResolvedValue(record); });
afterEach(() => appQueryClient.clear());
it('linked edit derives unchanged immutable fields from canonical original, including deleted session', async () => {
  const result = await saveLinkedWalkBody(scope, source, body, null);
  expect(updateMemoryFields).toHaveBeenCalledWith({ memoryId: 'original', title: body.title, content: body.content, emotion: null, tags: body.tags, category: 'walk', subCategory: null, occurredAt: '2026-10-19' });
  expect(result.id).toBe('original'); expect(result.title).toBe('서버 기록'); expect(enqueuePendingMemoryUpload).not.toHaveBeenCalled();
});
it('refuses a different original or oversized photo recovery before mutation', async () => {
  await expect(saveLinkedWalkBody(scope, { ...source, memoryId: 'different' }, body, null)).rejects.toMatchObject({ code: 'WALK_INVALID_RECORD_RELATION' });
  expect(updateMemoryFields).not.toHaveBeenCalled();
  await expect(saveLinkedWalkBody(scope, source, body, Array.from({ length: 11 }, (_, i) => ({ kind: 'existing' as const, path: `synthetic/${i}` })))).rejects.toMatchObject({ code: 'WALK_INVALID_RECORD_INPUT' });
});
it('late owner context after read cannot update body/photos', async () => {
  let current = true; jest.mocked(walkRecordRepository.get).mockImplementation(async () => { current = false; return record; });
  await expect(saveLinkedWalkBody({ ...scope, current: () => current }, source, body, null)).rejects.toMatchObject({ code: 'WALK_PRODUCT_CONTEXT_CHANGED' }); expect(updateMemoryFields).not.toHaveBeenCalled();
});
it('Memory delete invalidates linked projection/history and existing activity caches but preserves distance cache', () => {
  for (const leaf of ['progression', 'history', 'prompt', 'sources']) appQueryClient.setQueryData(['walk', 'owner', 'pet', leaf], 'snapshot');
  appQueryClient.setQueryData(['walk', 'other-owner', 'pet', 'sources'], 'other');
  invalidateWalkProduct(scope, 'MEMORY_DELETE');
  expect(appQueryClient.getQueryState(['walk', 'owner', 'pet', 'progression'])?.isInvalidated).toBe(false);
  expect(appQueryClient.getQueryState(['walk', 'owner', 'pet', 'sources'])?.isInvalidated).toBe(true);
  expect(appQueryClient.getQueryState(['walk', 'other-owner', 'pet', 'sources'])?.isInvalidated).toBe(false);
  expect(appQueryClient.getQueryData(['walk', 'owner', 'activity-revision'])).toBe(1);
});
it('session delete invalidates canonical distance and projection without removing Memory/XP', () => {
  appQueryClient.setQueryData(['walk', 'owner', 'pet', 'progression'], 'canonical');
  invalidateWalkProduct(scope, 'SESSION_DELETE');
  expect(appQueryClient.getQueryState(['walk', 'owner', 'pet', 'progression'])?.isInvalidated).toBe(true);
  expect(appQueryClient.getQueryData(['walk', 'owner', 'activity-revision'])).toBeUndefined();
});

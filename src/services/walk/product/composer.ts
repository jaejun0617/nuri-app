import {
  WalkRecordError,
  type WalkRecordCommit,
} from '../server/recordRepository';
import { walkRecordRepository } from '../server/supabaseWalkRecordRepository';
import {
  prepareWalkSubmission,
  clearCommittedWalkDraft,
  sameWalkFields,
  walkDraftPayload,
  type WalkDraftFields,
  type WalkDraftScope,
} from './drafts';
import { assertWalkScope, walkRequest, type WalkUiScope } from './requests';
import { enqueuePendingMemoryUpload } from '../../local/uploadQueue';

function uuid(): string {
  if (typeof globalThis.crypto?.getRandomValues !== 'function')
    throw new WalkRecordError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] % 16) + 64;
  bytes[8] = (bytes[8] % 64) + 128;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(
    16,
    20,
  )}-${h.slice(20)}`;
}
const defaults = {
  prepare: prepareWalkSubmission,
  clear: clearCommittedWalkDraft,
  create: walkRecordRepository.create,
  identity: uuid,
  enqueue: enqueuePendingMemoryUpload,
};
export async function commitWalkComposer(
  scope: WalkUiScope,
  draftScope: WalkDraftScope,
  current: WalkDraftFields,
  deps = defaults,
): Promise<
  Readonly<{
    commit: WalkRecordCommit;
    retained: boolean;
    photoQueued: boolean;
  }>
> {
  assertWalkScope(scope);
  if (scope.ownerId !== draftScope.ownerId || scope.petId !== draftScope.petId)
    throw new WalkRecordError('WALK_OWNER_MISMATCH', false);
  const saved = await walkRequest(scope, () =>
    deps.prepare(draftScope, current, deps.identity),
  );
  const submission = saved.submission;
  const commit = await walkRequest(scope, () =>
    deps.create({
      clientSessionId: draftScope.clientSessionId,
      petId: scope.petId,
      memoryId: submission.memoryId,
      requestId: submission.requestId,
      record: walkDraftPayload(submission.fields),
    }),
  );
  const memory = commit.record.memory;
  if (!memory) throw new WalkRecordError('WALK_INVALID_RECORD_RESPONSE', true);
  // A replay may belong to another device, or to a previous draft revision.
  // Never merge current text/photos into that original implicitly.
  if (commit.replayed || !sameWalkFields(saved.fields, submission.fields))
    return { commit, retained: true, photoQueued: false };
  let photoQueued = false;
  if (submission.fields.photos.length) {
    try {
      await walkRequest(scope, () =>
        deps.enqueue({
          userId: scope.ownerId,
          petId: scope.petId,
          memoryId: memory.id,
          mode: 'create',
          finalEntries: submission.fields.photos.map(p => ({
            kind: 'pending' as const,
            key: p.key,
            uri: p.uri,
            mimeType: p.mimeType,
          })),
        }),
      );
      photoQueued = true;
    } catch {
      assertWalkScope(scope);
      return { commit, retained: true, photoQueued: false };
    }
  }
  const cleared = await walkRequest(scope, () => deps.clear(draftScope, saved));
  return { commit, retained: !cleared, photoQueued };
}

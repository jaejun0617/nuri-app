import { updateMemoryFields } from '../../supabase/memories';
import {
  enqueuePendingMemoryUpload,
  processPendingMemoryUploads,
  type PendingMemoryUploadEntry,
} from '../../local/uploadQueue';
import { walkRecordRepository } from '../server/supabaseWalkRecordRepository';
import {
  WalkRecordError,
  type WalkMemorySourceSummary,
} from '../server/recordRepository';
import { walkDraftPayload, type WalkDraftFields } from './drafts';
import { walkRequest, type WalkUiScope } from './requests';
import { canonicalWalkMemory } from './presentation';

export async function saveLinkedWalkBody(
  scope: WalkUiScope,
  source: WalkMemorySourceSummary,
  body: WalkDraftFields,
  images: readonly PendingMemoryUploadEntry[] | null,
) {
  walkDraftPayload(body);
  if (images && images.length > 10)
    throw new WalkRecordError('WALK_INVALID_RECORD_INPUT', false);
  const before = await walkRequest(scope, () =>
    walkRecordRepository.get(source.clientSessionId, scope.petId),
  );
  if (
    !before.memory ||
    before.memory.id !== source.memoryId ||
    before.recordState !== 'RECORDED'
  )
    throw new WalkRecordError('WALK_INVALID_RECORD_RELATION', false);
  // Existing update helper also writes category/date. Supply their canonical
  // unchanged values; the body never supplies any trusted source field.
  await walkRequest(scope, () =>
    updateMemoryFields({
      memoryId: before.memory!.id,
      title: body.title.trim(),
      content: body.content || null,
      emotion: body.emotion,
      tags: [...body.tags],
      category: 'walk',
      subCategory: null,
      occurredAt: before.memory!.occurredAt,
    }),
  );
  if (images) {
    await walkRequest(scope, () =>
      enqueuePendingMemoryUpload({
        userId: scope.ownerId,
        petId: scope.petId,
        memoryId: source.memoryId,
        mode: 'edit',
        finalEntries: [...images],
      }),
    );
    // Durable upload task remains recoverable when immediate processing fails.
    await walkRequest(scope, () =>
      processPendingMemoryUploads({ userId: scope.ownerId }),
    ).catch(() => undefined);
  }
  const after = await walkRequest(scope, () =>
    walkRecordRepository.get(source.clientSessionId, scope.petId),
  );
  if (!after.memory || after.memory.id !== source.memoryId)
    throw new WalkRecordError('WALK_INVALID_RECORD_RELATION', false);
  return canonicalWalkMemory(after.memory);
}

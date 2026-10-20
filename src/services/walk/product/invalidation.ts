import { appQueryClient } from '../../query/appQueryClient';
import { purgeWalkDraftsAfterFinalDeletion } from './drafts';
import { assertWalkScope, type WalkUiScope } from './requests';

export type WalkProductEvent =
  | 'ACCEPTED_FINISH'
  | 'MEMORY_COMMIT'
  | 'MEMORY_DELETE'
  | 'SESSION_DELETE'
  | 'PROMPT_DISMISS';
export function invalidateWalkProduct(
  scope: WalkUiScope,
  event: WalkProductEvent,
): void {
  assertWalkScope(scope);
  const leaves =
    event === 'PROMPT_DISMISS'
      ? ['prompt']
      : event === 'MEMORY_COMMIT' || event === 'MEMORY_DELETE'
      ? ['prompt', 'history', 'sources', 'record']
      : ['progression', 'prompt', 'history', 'sources', 'record'];
  for (const leaf of leaves)
    appQueryClient
      .invalidateQueries({
        queryKey: ['walk', scope.ownerId, scope.petId, leaf],
      })
      .catch(() => undefined);
  if (event === 'MEMORY_COMMIT' || event === 'MEMORY_DELETE') {
    // Existing Timeline reloads counts/streak/titles/Account XP from recordStore's
    // entity version. Home observes this cache revision for its title disk cache.
    appQueryClient.setQueryData<number>(
      ['walk', scope.ownerId, scope.petId, 'memory-revision'],
      old => (old ?? 0) + 1,
    );
    appQueryClient.setQueryData<number>(
      ['walk', scope.ownerId, 'activity-revision'],
      old => (old ?? 0) + 1,
    );
    appQueryClient
      .invalidateQueries({ queryKey: ['monthly-expenses'] })
      .catch(() => undefined);
    appQueryClient
      .invalidateQueries({ queryKey: ['health-report', 'month', scope.petId] })
      .catch(() => undefined);
    appQueryClient
      .invalidateQueries({ queryKey: ['activity-ranking'] })
      .catch(() => undefined);
  }
}
// F calls this only after confirmed final server/native deletion. Ordinary
// logout only isolates cache and leaves recoverable drafts untouched.
export async function purgeWalkProductAfterFinalDeletion(
  ownerId: string,
  petId: string | null,
  confirmation: 'ACCOUNT_FINAL' | 'PET_FINAL',
): Promise<void> {
  await purgeWalkDraftsAfterFinalDeletion(ownerId, petId, confirmation);
  const queryKey = petId ? ['walk', ownerId, petId] : ['walk', ownerId];
  await appQueryClient.cancelQueries({ queryKey });
  appQueryClient.removeQueries({ queryKey });
}

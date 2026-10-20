import { NativeModules, Platform } from 'react-native';
import { normalizeWalkUuid } from '../domain';
import type { AccountDeletionResult } from '../../supabase/auth';
import { purgeWalkProductAfterFinalDeletion } from './invalidation';
import { WalkProductError } from '../runtime/productNative';

export type WalkFinalDeletionScope = Readonly<{
  ticket: string;
  ownerId: string;
  petId: string | null;
}>;
type Module = {
  productGetBinding(owner: string): Promise<string>;
  productCommand(
    owner: string,
    epoch: string,
    op: string,
    input: string,
  ): Promise<string>;
  finalCleanupCommand(op: string, ticket: string): Promise<string>;
};
function module(): Module | null {
  if (Platform.OS !== 'android') return null;
  const v: unknown = NativeModules.NuriWalk;
  if (!v) return null; // This platform/runtime has no local Walk storage.
  if (
    typeof v !== 'object' ||
    !['productGetBinding', 'productCommand', 'finalCleanupCommand'].every(
      k => typeof (v as Record<string, unknown>)[k] === 'function',
    )
  )
    throw new WalkProductError('WALK_SERVICE_UNAVAILABLE');
  return v as Module;
}
function decode(value: unknown): WalkFinalDeletionScope {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 3)
    throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
  return {
    ticket: normalizeWalkUuid(v.ticket),
    ownerId: normalizeWalkUuid(v.ownerId),
    petId: v.petId === null ? null : normalizeWalkUuid(v.petId),
  };
}
// Capture while authenticated/bound, before logout or destructive RPC. The
// opaque Native capability survives unbinding and never rebinds an old owner.
export async function captureWalkFinalDeletion(
  owner: string,
  pet: string | null,
): Promise<WalkFinalDeletionScope | null> {
  const m = module();
  if (!m) return null;
  const ownerId = normalizeWalkUuid(owner),
    petId = pet === null ? null : normalizeWalkUuid(pet);
  const epoch = await m.productGetBinding(ownerId);
  const ticket = normalizeWalkUuid(
    await m.productCommand(
      ownerId,
      epoch,
      'CAPTURE_FINAL_CLEANUP',
      JSON.stringify({ petId }),
    ),
  );
  return { ticket, ownerId, petId };
}
export function isConfirmedFinalAccountDeletion(
  result: AccountDeletionResult,
): boolean {
  const final = [
    'db_deleted',
    'cleanup_pending',
    'completed',
    'completed_with_cleanup_pending',
  ];
  return (
    final.includes(result.status) &&
    result.actualStatus !== null &&
    final.includes(result.actualStatus) &&
    !result.canRestore
  );
}
const flights = new Map<string, Promise<void>>();
const unpersistedConfirmations = new Map<string, WalkFinalDeletionScope>();
async function drain(
  scope: WalkFinalDeletionScope,
  confirm: boolean,
): Promise<void> {
  const m = module();
  if (!m) return;
  if (
    confirm &&
    (await m.finalCleanupCommand('CONFIRM', scope.ticket)) !== 'OK'
  )
    throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
  // Confirmation is durable before any JS cleanup. A process loss can replay
  // this exact scope on next boot, without auth/network/GPS or lookup inference.
  await purgeWalkProductAfterFinalDeletion(
    scope.ownerId,
    scope.petId,
    scope.petId === null ? 'ACCOUNT_FINAL' : 'PET_FINAL',
  );
  let result: string;
  do {
    result = await m.finalCleanupCommand('STEP', scope.ticket);
    if (!['MORE', 'DONE'].includes(result))
      throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
  } while (result === 'MORE');
  if ((await m.finalCleanupCommand('ACK', scope.ticket)) !== 'OK')
    throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
}
function once(scope: WalkFinalDeletionScope, confirm: boolean) {
  const old = flights.get(scope.ticket);
  if (old) return old;
  const work = drain(scope, confirm);
  flights.set(scope.ticket, work);
  work
    .finally(() => {
      if (flights.get(scope.ticket) === work) flights.delete(scope.ticket);
    })
    .catch(() => undefined);
  return work;
}
export async function confirmWalkFinalDeletion(
  scope: WalkFinalDeletionScope | null,
): Promise<void> {
  if (scope) await once(decode(scope), true);
}
export async function queueConfirmedWalkFinalDeletion(
  scope: WalkFinalDeletionScope | null,
): Promise<boolean> {
  if (!scope) return true;
  unpersistedConfirmations.set(scope.ticket, scope);
  try {
    await confirmWalkFinalDeletion(scope);
    unpersistedConfirmations.delete(scope.ticket);
    return true;
  } catch {
    return false;
  } // Authoritative server deletion is still successful.
}
export async function resumeConfirmedWalkFinalDeletions(): Promise<void> {
  const m = module();
  if (!m) return;
  for (const scope of unpersistedConfirmations.values()) {
    await once(scope, true);
    unpersistedConfirmations.delete(scope.ticket);
  }
  const raw: unknown = JSON.parse(await m.finalCleanupCommand('PENDING', ''));
  if (!Array.isArray(raw) || raw.length > 256)
    throw new WalkProductError('WALK_INVALID_PRODUCT_CHECKPOINT');
  for (const value of raw) await once(decode(value), false);
}

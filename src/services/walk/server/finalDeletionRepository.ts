import { normalizeWalkTimestamp, normalizeWalkUuid } from '../domain';
import type { WalkRpcTransport } from './repository';
export type WalkFinalDeletionTransport = (
  name: string,
  parameters: Record<string, unknown>,
  signal?: AbortSignal,
) => ReturnType<WalkRpcTransport>;

export type WalkFinalPurpose = 'ACCOUNT_FINAL' | 'PET_FINAL';
// Native must generate/persist the 32 random bytes BEFORE prepare. This module
// never persists, logs or generates a replacement capability on a retry.
export type WalkFinalDeletionIntent = Readonly<{
  requestId: string;
  purpose: WalkFinalPurpose;
  petId: string | null;
  capability: string;
  resourceBinding?: string;
}>;
export type WalkFinalDeletionReceipt = Readonly<{
  version: 1;
  requestId: string;
  purpose: WalkFinalPurpose;
  resourceBinding: string;
  state: 'PENDING' | 'FINAL' | 'ACKNOWLEDGED';
  registeredAt: string;
  confirmedAt: string | null;
  acknowledgedAt: string | null;
}>;
export class WalkFinalDeletionError extends Error {
  readonly preserveIntent = true;
  constructor(readonly code: string, readonly retryable: boolean) {
    super('Walk deletion proof is unavailable');
    this.name = 'WalkFinalDeletionError';
  }
}
const invalid = (): never => {
  throw new WalkFinalDeletionError('WALK_DELETE_RESPONSE_INVALID', true);
};
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return invalid();
  return v as Record<string, unknown>;
}
function intent(v: WalkFinalDeletionIntent): WalkFinalDeletionIntent {
  try {
    const requestId = normalizeWalkUuid(v.requestId);
    if (
      !['ACCOUNT_FINAL', 'PET_FINAL'].includes(v.purpose) ||
      !/^[0-9a-f]{64}$/.test(v.capability) ||
      (v.resourceBinding !== undefined &&
        !/^[0-9a-f]{64}$/.test(v.resourceBinding))
    )
      return invalid();
    const petId = v.petId === null ? null : normalizeWalkUuid(v.petId);
    if ((v.purpose === 'ACCOUNT_FINAL') !== (petId === null)) return invalid();
    return { ...v, requestId, petId };
  } catch {
    return invalid();
  }
}
function timestamp(v: unknown): string {
  try {
    return normalizeWalkTimestamp(v);
  } catch {
    return invalid();
  }
}
function receipt(
  data: unknown,
  i: WalkFinalDeletionIntent,
): WalkFinalDeletionReceipt {
  const r = object(data);
  if (
    r.version !== 1 ||
    r.requestId !== i.requestId ||
    r.purpose !== i.purpose ||
    typeof r.resourceBinding !== 'string' ||
    !/^[0-9a-f]{64}$/.test(r.resourceBinding) ||
    (i.resourceBinding !== undefined &&
      i.resourceBinding !== r.resourceBinding) ||
    !['PENDING', 'FINAL', 'ACKNOWLEDGED'].includes(String(r.state))
  )
    return invalid();
  const registeredAt = timestamp(r.registeredAt);
  const confirmedAt = r.confirmedAt === null ? null : timestamp(r.confirmedAt);
  const acknowledgedAt =
    r.acknowledgedAt === null ? null : timestamp(r.acknowledgedAt);
  if (
    (r.state === 'PENDING' &&
      (confirmedAt !== null || acknowledgedAt !== null)) ||
    (r.state === 'FINAL' &&
      (confirmedAt === null || acknowledgedAt !== null)) ||
    (r.state === 'ACKNOWLEDGED' &&
      (confirmedAt === null || acknowledgedAt === null))
  )
    return invalid();
  return {
    version: 1,
    requestId: i.requestId,
    purpose: i.purpose,
    resourceBinding: r.resourceBinding,
    state: r.state as WalkFinalDeletionReceipt['state'],
    registeredAt,
    confirmedAt,
    acknowledgedAt,
  };
}
const known = new Set([
  'WALK_DELETE_INPUT_INVALID',
  'WALK_DELETE_OWNER_UNAVAILABLE',
  'WALK_DELETE_TARGET_UNAVAILABLE',
  'WALK_DELETE_REQUEST_CONFLICT',
  'WALK_DELETE_REQUEST_STALE',
  'WALK_DELETE_RECEIPT_LIMIT',
  'WALK_DELETE_GENERATION_UNAVAILABLE',
  'WALK_DELETE_RECEIPT_UNAVAILABLE',
  'WALK_DELETE_NOT_FINAL',
]);
function failure(e: unknown): never {
  if (e && typeof e === 'object') {
    const x = e as Record<string, unknown>;
    if (
      ['22023', '42501'].includes(String(x.code)) &&
      typeof x.details === 'string'
    ) {
      try {
        const d = object(JSON.parse(x.details));
        if (
          d.walkErrorVersion === 1 &&
          typeof d.walkCode === 'string' &&
          known.has(d.walkCode)
        )
          throw new WalkFinalDeletionError(d.walkCode, false);
      } catch (error) {
        if (error instanceof WalkFinalDeletionError && !error.retryable)
          throw error;
      }
    }
  }
  throw new WalkFinalDeletionError('WALK_DELETE_UNKNOWN_RETRYABLE', true);
}

export function createWalkFinalDeletionRepository(
  authenticated: WalkFinalDeletionTransport,
  capabilityOnly: WalkFinalDeletionTransport,
) {
  async function call(
    port: WalkFinalDeletionTransport,
    name: string,
    i: WalkFinalDeletionIntent,
    prepare = false,
    signal?: AbortSignal,
  ) {
    try {
      if (signal?.aborted) return failure(null);
      const parameters = {
        p_request_id: i.requestId,
        p_purpose: i.purpose,
        p_capability: i.capability,
        ...(prepare ? { p_pet_id: i.petId } : {}),
      };
      const result = await port(name, parameters, signal);
      if (signal?.aborted) return failure(null);
      if (result.error) return failure(result.error);
      return receipt(result.data, i);
    } catch (e) {
      if (e instanceof WalkFinalDeletionError) throw e;
      return failure(e);
    }
  }
  return {
    // Native Owner must abort on captured owner/foreground generation change;
    // a late prepare response may not authorize destructive continuation.
    prepare(input: WalkFinalDeletionIntent, signal: AbortSignal) {
      return call(
        authenticated,
        'prepare_walk_final_deletion_v1',
        intent(input),
        true,
        signal,
      );
    },
    recover(input: WalkFinalDeletionIntent) {
      return call(
        capabilityOnly,
        'recover_walk_final_deletion_v1',
        intent(input),
      );
    },
    ack(
      input: WalkFinalDeletionIntent,
      proof: WalkFinalDeletionReceipt,
      localCleanupComplete: true,
    ) {
      const i = intent(input);
      const checked = receipt(proof, i);
      if (localCleanupComplete !== true || checked.state !== 'FINAL')
        throw new WalkFinalDeletionError(
          'WALK_DELETE_LOCAL_CLEANUP_REQUIRED',
          false,
        );
      return call(capabilityOnly, 'ack_walk_final_deletion_v1', {
        ...i,
        resourceBinding: checked.resourceBinding,
      });
    },
  };
}

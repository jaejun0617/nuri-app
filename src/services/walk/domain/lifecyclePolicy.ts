import {
  WalkDomainError,
  walkFailure,
  walkSuccess,
  type WalkResult,
} from './errorCodes';
import type { WalkReplayIdentity, WalkTombstone } from './types';
import { normalizeWalkTimestamp } from './finishPayload';
import { normalizeWalkUuid } from './units';

export type WalkDeleteKind =
  | 'ROUTE_ONLY_DELETE'
  | 'MEMORY_DELETE'
  | 'SESSION_DELETE'
  | 'PENDING_LOCAL_DELETE'
  | 'ACCOUNT_FINAL_DELETE'
  | 'PET_FINAL_DELETE';

export function getWalkDeletionEffects(kind: WalkDeleteKind) {
  switch (kind) {
    case 'ROUTE_ONLY_DELETE':
      return {
        progression: 'KEEP',
        level: 'KEEP',
        route: 'DELETE',
        memory: 'KEEP',
        xp: 'KEEP',
        claim: 'KEEP',
        milestone: 'KEEP',
        tombstone: 'KEEP',
        allWalkData: 'KEEP',
      } as const;
    case 'MEMORY_DELETE':
      return {
        progression: 'KEEP',
        level: 'KEEP',
        route: 'KEEP',
        memory: 'DELETE',
        xp: 'KEEP',
        claim: 'KEEP',
        milestone: 'KEEP',
        tombstone: 'KEEP',
        recreate: 'DENY',
        recordActivity: 'EXISTING_DELETE_POLICY',
        allWalkData: 'KEEP',
      } as const;
    case 'SESSION_DELETE':
      return {
        progression: 'EXCLUDE',
        level: 'RECALCULATE',
        route: 'DELETE',
        memory: 'KEEP',
        xp: 'KEEP',
        claim: 'KEEP',
        milestone: 'KEEP',
        tombstone: 'KEEP_MINIMAL',
        allWalkData: 'KEEP',
      } as const;
    case 'PENDING_LOCAL_DELETE':
      return {
        progression: 'NOT_CONFIRMED',
        level: 'KEEP',
        route: 'DELETE_AFTER_RECONCILIATION',
        memory: 'NONE',
        xp: 'NONE',
        claim: 'NONE',
        outbox: 'RECONCILE_BEFORE_CANCEL',
        allWalkData: 'KEEP',
      } as const;
    case 'ACCOUNT_FINAL_DELETE':
    case 'PET_FINAL_DELETE':
      return {
        progression: 'DELETE',
        level: 'DELETE',
        route: 'DELETE',
        memory: 'EXISTING_FINAL_DELETE_POLICY',
        xp: 'EXISTING_FINAL_DELETE_POLICY',
        claim: 'DELETE',
        milestone: 'DELETE',
        tombstone: 'DELETE',
        outbox: 'DELETE',
        allWalkData: 'DELETE',
      } as const;
  }
}

// NOT_ACCEPTED_FINAL must be a serialized cancellation receipt, not a missing
// row observed while a finish request could still be in flight.
export function reconcilePendingDeletion(
  serverState:
    | 'UNKNOWN'
    | 'NOT_FOUND'
    | 'ACCEPTED'
    | 'NOT_ACCEPTED_FINAL'
    | 'ALREADY_DELETED',
) {
  switch (serverState) {
    case 'UNKNOWN':
    case 'NOT_FOUND':
      return 'WAIT_FOR_SERVER';
    case 'ACCEPTED':
      return 'DELETE_ACCEPTED_SESSION';
    case 'NOT_ACCEPTED_FINAL':
    case 'ALREADY_DELETED':
      return 'CANCEL_LOCAL_OUTBOX';
  }
}

function normalizeIdentity(identity: WalkReplayIdentity): WalkReplayIdentity {
  if (!/^[0-9a-f]{64}$/.test(identity.payloadDigest))
    throw new WalkDomainError('WALK_INVALID_PAYLOAD');
  return {
    clientSessionId: normalizeWalkUuid(identity.clientSessionId),
    ownerScope: {
      userId: normalizeWalkUuid(identity.ownerScope.userId),
      petId: normalizeWalkUuid(identity.ownerScope.petId),
    },
    payloadDigest: identity.payloadDigest,
  };
}

// Explicit allowlist projection: no spread of the full session into a receipt.
export function createWalkTombstone(
  source: WalkReplayIdentity & Readonly<{ recordClaimExists: boolean }>,
  deletedAt: string,
): WalkTombstone {
  return {
    ...normalizeIdentity(source),
    deletedAt: normalizeWalkTimestamp(deletedAt),
    recordClaimExists: source.recordClaimExists,
  };
}

export function checkWalkFinishReplay(
  input: WalkReplayIdentity,
  existing:
    | (WalkReplayIdentity & Readonly<{ kind: 'ACCEPTED' | 'DELETED' }>)
    | null,
): WalkResult<'CREATE' | 'RETURN_EXISTING'> {
  const incoming = normalizeIdentity(input);
  if (!existing) return walkSuccess('CREATE');
  const stored = normalizeIdentity(existing);
  // Scope MUST come from a verified server context; this comparison is not auth.
  if (
    incoming.ownerScope.userId !== stored.ownerScope.userId ||
    incoming.ownerScope.petId !== stored.ownerScope.petId
  ) {
    return walkFailure('WALK_OWNER_MISMATCH');
  }
  if (incoming.clientSessionId !== stored.clientSessionId)
    return walkFailure('WALK_PAYLOAD_CONFLICT');
  if (existing.kind === 'DELETED') return walkFailure('WALK_SESSION_DELETED');
  return incoming.payloadDigest === stored.payloadDigest
    ? walkSuccess('RETURN_EXISTING')
    : walkFailure('WALK_PAYLOAD_CONFLICT');
}

export function checkRouteRevision(
  requested: bigint,
  current: bigint,
  routeDeleted: boolean,
): WalkResult<true> {
  if (
    typeof requested !== 'bigint' ||
    typeof current !== 'bigint' ||
    requested < 0n ||
    current < 0n ||
    requested !== current ||
    routeDeleted
  )
    return walkFailure('WALK_ROUTE_REVISION_CONFLICT');
  return walkSuccess(true);
}

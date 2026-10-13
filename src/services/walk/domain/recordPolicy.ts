import { walkFailure, walkSuccess, type WalkResult } from './errorCodes';
import type {
  WalkAcceptedContribution,
  WalkPendingSyncState,
  WalkRecordClaim,
  WalkSettlementOutcome,
} from './types';
import { assertWalkNonNegative, normalizeWalkUuid } from './units';

type RewardInput =
  | Readonly<{ source: 'MANUAL'; memoryExists: boolean }>
  | (Omit<WalkAcceptedContribution, 'clientSessionId'> &
      Readonly<{ source: 'GPS_TRACKED'; memoryExists: boolean }>)
  | Readonly<{
      source: 'GPS_TRACKED';
      syncState: WalkPendingSyncState;
      memoryExists: false;
    }>;

// Account XP amount/caps/streaks stay exclusively in the existing record policy.
export function getWalkRewardPolicy(input: RewardInput) {
  const manual = input.source === 'MANUAL';
  const accepted =
    input.source === 'GPS_TRACKED' && input.syncState === 'ACCEPTED_SERVER';
  const memoryExists = input.memoryExists;
  let progressionDistanceM = 0n;
  if (input.source === 'GPS_TRACKED' && input.syncState === 'ACCEPTED_SERVER') {
    assertWalkNonNegative(input.acceptedDistanceM, 'DISTANCE');
    if (!input.deleted && input.eligibility === 'PROGRESSION_ELIGIBLE')
      progressionDistanceM = input.acceptedDistanceM;
  }
  const existingRecordPolicy =
    memoryExists && (manual || accepted) ? 'EXISTING_RECORD_POLICY' : 'NONE';
  return {
    progressionDistanceM,
    accountXp: existingRecordPolicy,
    gpsBonusXp: 0,
    includedInRecordCount: memoryExists && (manual || accepted),
    streak: existingRecordPolicy,
    linkedRecordAllowed:
      accepted &&
      input.source === 'GPS_TRACKED' &&
      input.syncState === 'ACCEPTED_SERVER' &&
      !input.deleted,
    manualFallbackAllowed:
      input.source === 'GPS_TRACKED' && input.syncState === 'REJECTED_SERVER',
  } as const;
}

export type WalkCreateRecordPlan = Readonly<{
  kind: 'CREATE_ATOMIC';
  sessionId: string;
  memoryId: string;
  requestId: string;
  rewardSource: Readonly<{
    eventType: 'walk_timeline_post';
    sourceType: 'timeline_memory';
    sourceId: string;
  }>;
}>;
export type WalkRecordPlan =
  | WalkCreateRecordPlan
  | Readonly<{ kind: 'RETURN_EXISTING'; claim: WalkRecordClaim }>;

function validSettlement(
  outcome: WalkSettlementOutcome,
  ledger: string | null,
): boolean {
  if (outcome === 'XP_AWARDED')
    return (
      typeof ledger === 'string' && ledger.length > 0 && ledger.length <= 128
    );
  return (
    (outcome === 'ZERO_XP_VALID' ||
      outcome === 'RECORD_CREATED_NO_XP_BY_POLICY') &&
    ledger === null
  );
}

export function planWalkRecordClaim(
  input: Readonly<{
    sessionId: string;
    memoryId: string;
    requestId: string;
    serverAccepted: boolean;
    sessionDeleted: boolean;
    existingClaim: WalkRecordClaim | null;
    originalMemoryExists: boolean;
  }>,
): WalkResult<WalkRecordPlan> {
  if (input.sessionDeleted) return walkFailure('WALK_SESSION_DELETED');
  if (!input.serverAccepted) return walkFailure('WALK_SESSION_REJECTED');
  const sessionId = normalizeWalkUuid(input.sessionId);
  const memoryId = normalizeWalkUuid(input.memoryId);
  const requestId = normalizeWalkUuid(input.requestId);
  const claim = input.existingClaim;
  if (claim) {
    try {
      normalizeWalkUuid(claim.originalMemoryId);
      normalizeWalkUuid(claim.requestId);
      normalizeWalkUuid(claim.sessionId);
    } catch {
      return walkFailure('WALK_INVALID_RECORD_RELATION');
    }
    if (
      normalizeWalkUuid(claim.sessionId) !== sessionId ||
      !validSettlement(claim.settlementOutcome, claim.xpLedgerReference)
    ) {
      return walkFailure('WALK_RECORD_ALREADY_CLAIMED');
    }
    if (!input.originalMemoryExists)
      return walkFailure('WALK_RECORD_RECREATE_FORBIDDEN');
    // Other devices/retries receive the ORIGINAL memory and settled outcome,
    // even when their candidate memory/request IDs differ. Never award again.
    return walkSuccess({ kind: 'RETURN_EXISTING', claim });
  }
  if (input.originalMemoryExists)
    return walkFailure('WALK_INVALID_RECORD_RELATION');
  return walkSuccess({
    kind: 'CREATE_ATOMIC',
    sessionId,
    memoryId,
    requestId,
    rewardSource: {
      eventType: 'walk_timeline_post',
      sourceType: 'timeline_memory',
      sourceId: memoryId,
    },
  });
}

type RewardSettlement =
  | Readonly<{ ok: false }>
  | Readonly<{
      ok: true;
      outcome: WalkSettlementOutcome;
      xpLedgerReference: string | null;
    }>;

function validAtomicPlan(plan: WalkCreateRecordPlan): boolean {
  try {
    normalizeWalkUuid(plan.sessionId);
    normalizeWalkUuid(plan.requestId);
    const memoryId = normalizeWalkUuid(plan.memoryId);
    return (
      plan.kind === 'CREATE_ATOMIC' &&
      plan.rewardSource.eventType === 'walk_timeline_post' &&
      plan.rewardSource.sourceType === 'timeline_memory' &&
      normalizeWalkUuid(plan.rewardSource.sourceId) === memoryId
    );
  } catch {
    return false;
  }
}

export function settleWalkRecordClaim(
  plan: WalkCreateRecordPlan,
  reward: RewardSettlement,
):
  | WalkResult<WalkRecordClaim>
  | Readonly<{
      ok: false;
      error: 'WALK_REWARD_SETTLEMENT_FAILED';
      rollbackRequired: true;
      preserveDraft: true;
      value?: never;
    }> {
  if (
    !validAtomicPlan(plan) ||
    !reward.ok ||
    !validSettlement(reward.outcome, reward.xpLedgerReference)
  ) {
    return {
      ok: false,
      error: 'WALK_REWARD_SETTLEMENT_FAILED',
      rollbackRequired: true,
      preserveDraft: true,
    };
  }
  // A plan is NOT a DB lock. Phase 5B must persist memory + daily activity +
  // XP result + claim in ONE transaction, with unique constraints on both IDs.
  return walkSuccess({
    sessionId: plan.sessionId,
    originalMemoryId: plan.memoryId,
    requestId: plan.requestId,
    settlementOutcome: reward.outcome,
    xpLedgerReference: reward.xpLedgerReference,
  });
}

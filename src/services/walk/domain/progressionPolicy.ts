import { WalkDomainError } from './errorCodes';
import type { WalkContribution, WalkPendingContribution } from './types';
import { assertWalkNonNegative, toWalkDecimal } from './units';

export const WALK_PROGRESSION_POLICY_VERSION = 1 as const;

export function getThresholdForLevel(level: bigint): bigint {
  if (typeof level !== 'bigint' || level < 1n)
    throw new WalkDomainError('WALK_INVALID_LEVEL');
  return 500n * level * (level - 1n);
}

export function getLevelForLifetimeDistance(distanceM: bigint): bigint {
  assertWalkNonNegative(distanceM, 'DISTANCE');
  let low = 1n;
  let high = 2n;
  while (getThresholdForLevel(high) <= distanceM) high *= 2n;
  // Integer search avoids float sqrt/rounding at large exact thresholds.
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (getThresholdForLevel(middle) <= distanceM) low = middle;
    else high = middle;
  }
  return low;
}

export function getProgressWithinLevel(distanceM: bigint): Readonly<{
  numeratorM: bigint;
  denominatorM: bigint;
}> {
  const level = getLevelForLifetimeDistance(distanceM);
  const floor = getThresholdForLevel(level);
  return {
    numeratorM: distanceM - floor,
    denominatorM: getThresholdForLevel(level + 1n) - floor,
  };
}

export function getDistanceToNextLevel(distanceM: bigint): bigint {
  return (
    getThresholdForLevel(getLevelForLifetimeDistance(distanceM) + 1n) -
    distanceM
  );
}

export function getProgressionSnapshot(distanceM: bigint) {
  const level = getLevelForLifetimeDistance(distanceM);
  return {
    policyVersion: WALK_PROGRESSION_POLICY_VERSION,
    lifetimeDistanceM: distanceM,
    level,
    thresholdM: getThresholdForLevel(level),
    nextThresholdM: getThresholdForLevel(level + 1n),
    progress: getProgressWithinLevel(distanceM),
    distanceToNextLevelM: getDistanceToNextLevel(distanceM),
  } as const;
}

export type WalkProgressionSnapshot = ReturnType<typeof getProgressionSnapshot>;

export function toProgressionWire(snapshot: WalkProgressionSnapshot) {
  return {
    policyVersion: snapshot.policyVersion,
    lifetimeDistanceM: toWalkDecimal(snapshot.lifetimeDistanceM),
    level: toWalkDecimal(snapshot.level),
    thresholdM: toWalkDecimal(snapshot.thresholdM),
    nextThresholdM: toWalkDecimal(snapshot.nextThresholdM),
    progress: {
      numeratorM: toWalkDecimal(snapshot.progress.numeratorM),
      denominatorM: toWalkDecimal(snapshot.progress.denominatorM),
    },
    distanceToNextLevelM: toWalkDecimal(snapshot.distanceToNextLevelM),
  };
}

function assertUniqueSessionIds(
  sessions: readonly { readonly clientSessionId: string }[],
): void {
  const ids = new Set<string>();
  for (const session of sessions) {
    if (!session.clientSessionId || ids.has(session.clientSessionId))
      throw new WalkDomainError('WALK_PAYLOAD_CONFLICT');
    ids.add(session.clientSessionId);
  }
}

export function aggregateConfirmedDistance(
  sessions: readonly WalkContribution[],
): bigint {
  assertUniqueSessionIds(sessions);
  return sessions.reduce((total, session) => {
    if (session.syncState !== 'ACCEPTED_SERVER') return total;
    assertWalkNonNegative(session.acceptedDistanceM, 'DISTANCE');
    return !session.deleted && session.eligibility === 'PROGRESSION_ELIGIBLE'
      ? total + session.acceptedDistanceM
      : total;
  }, 0n);
}

// resolvedSessionIds includes accepted, rejected AND deleted receipts returned
// by reconciliation. The server total replaces the local confirmed projection.
export function getWalkProgressView(
  serverConfirmedDistanceM: bigint,
  localPending: readonly WalkPendingContribution[],
  resolvedSessionIds: readonly string[],
) {
  assertWalkNonNegative(serverConfirmedDistanceM, 'DISTANCE');
  assertUniqueSessionIds(localPending);
  const resolved = new Set(resolvedSessionIds);
  const pendingDistanceM = localPending.reduce((total, session) => {
    assertWalkNonNegative(session.measuredDistanceM, 'DISTANCE');
    return session.syncState !== 'REJECTED_SERVER' &&
      !resolved.has(session.clientSessionId)
      ? total + session.measuredDistanceM
      : total;
  }, 0n);
  return {
    confirmed: getProgressionSnapshot(serverConfirmedDistanceM),
    provisional: getProgressionSnapshot(
      serverConfirmedDistanceM + pendingDistanceM,
    ),
    pendingDistanceM,
    provisionalIsCanonical: false,
    provisionalGrantsRewards: false,
  } as const;
}

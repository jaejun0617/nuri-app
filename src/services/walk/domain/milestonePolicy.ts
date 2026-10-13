import type { WalkEligibility } from './types';
import { assertWalkNonNegative } from './units';

export type WalkLifetimeMilestone = 'FIRST_GPS_WALK' | '10_KM' | '100_KM';
export type WalkSessionFeedback =
  | 'SESSION_500_M'
  | 'SESSION_1_KM'
  | 'SESSION_20_MIN';

export function getCrossedLifetimeMilestones(
  input: Readonly<{
    previousDistanceM: bigint;
    nextDistanceM: bigint;
    previousEligibleSessionCount: bigint;
    nextEligibleSessionCount: bigint;
    eligibility: WalkEligibility;
    earned: readonly WalkLifetimeMilestone[];
  }>,
): WalkLifetimeMilestone[] {
  for (const value of [
    input.previousDistanceM,
    input.nextDistanceM,
    input.previousEligibleSessionCount,
    input.nextEligibleSessionCount,
  ])
    assertWalkNonNegative(value, 'DISTANCE');
  if (input.eligibility !== 'PROGRESSION_ELIGIBLE') return [];
  const candidates: WalkLifetimeMilestone[] = [];
  if (
    input.previousEligibleSessionCount === 0n &&
    input.nextEligibleSessionCount > 0n
  )
    candidates.push('FIRST_GPS_WALK');
  if (input.previousDistanceM < 10000n && input.nextDistanceM >= 10000n)
    candidates.push('10_KM');
  if (input.previousDistanceM < 100000n && input.nextDistanceM >= 100000n)
    candidates.push('100_KM');
  return candidates.filter(key => !input.earned.includes(key));
}

export function getCrossedSessionFeedback(
  input: Readonly<{
    previousDistanceM: bigint;
    nextDistanceM: bigint;
    previousActiveDurationMs: bigint;
    nextActiveDurationMs: bigint;
    shown: readonly WalkSessionFeedback[];
  }>,
): WalkSessionFeedback[] {
  assertWalkNonNegative(input.previousDistanceM, 'DISTANCE');
  assertWalkNonNegative(input.nextDistanceM, 'DISTANCE');
  assertWalkNonNegative(input.previousActiveDurationMs, 'DURATION');
  assertWalkNonNegative(input.nextActiveDurationMs, 'DURATION');
  const candidates: WalkSessionFeedback[] = [];
  if (input.previousDistanceM < 500n && input.nextDistanceM >= 500n)
    candidates.push('SESSION_500_M');
  if (input.previousDistanceM < 1000n && input.nextDistanceM >= 1000n)
    candidates.push('SESSION_1_KM');
  if (
    input.previousActiveDurationMs < 1200000n &&
    input.nextActiveDurationMs >= 1200000n
  )
    candidates.push('SESSION_20_MIN');
  return candidates.filter(key => !input.shown.includes(key));
}

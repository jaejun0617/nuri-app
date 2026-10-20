import {
  getProgressionSnapshot,
  normalizeWalkTimestamp,
  normalizeWalkUuid,
  parseWalkInteger,
  toProgressionWire,
  type WalkLifetimeMilestone,
} from '../domain';
import { WalkServerError, type WalkRpcTransport } from './repository';

export type WalkHistoricalMilestone = Readonly<{
  key: WalkLifetimeMilestone;
  policyVersion: 1;
  thresholdM: string;
  earnedAt: string;
  sourceSessionId: string | null;
}>;
export type PetWalkProgression = ReturnType<typeof toProgressionWire> &
  Readonly<{
    petId: string;
    eligibleSessionCount: string;
    milestones: readonly WalkHistoricalMilestone[];
  }>;
const fail = (): never => {
  throw new WalkServerError('WALK_INVALID_PROGRESSION_RESPONSE', true);
};
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return fail();
  return input as Record<string, unknown>;
}
function decimal(input: unknown): string {
  try {
    const n = parseWalkInteger(input, 'DISTANCE');
    if (n.toString() !== input) return fail();
    return n.toString();
  } catch {
    return fail();
  }
}
function identifier(input: unknown): string {
  try {
    return normalizeWalkUuid(input);
  } catch {
    return fail();
  }
}
const thresholds = {
  FIRST_GPS_WALK: '0',
  '10_KM': '10000',
  '100_KM': '100000',
} as const;
function milestone(input: unknown): WalkHistoricalMilestone {
  const v = record(input);
  if (v.key !== 'FIRST_GPS_WALK' && v.key !== '10_KM' && v.key !== '100_KM')
    return fail();
  if (v.policyVersion !== 1 || decimal(v.thresholdM) !== thresholds[v.key])
    return fail();
  let earnedAt: string;
  try {
    earnedAt = normalizeWalkTimestamp(v.earnedAt);
  } catch {
    return fail();
  }
  return {
    key: v.key,
    policyVersion: 1,
    thresholdM: thresholds[v.key],
    earnedAt,
    sourceSessionId:
      v.sourceSessionId === null ? null : identifier(v.sourceSessionId),
  };
}
export function decodePetWalkProgression(
  input: unknown,
  expectedPetId: string,
): PetWalkProgression {
  const v = record(input),
    petId = identifier(v.petId);
  if (petId !== normalizeWalkUuid(expectedPetId) || v.policyVersion !== 1)
    return fail();
  const distance = decimal(v.lifetimeDistanceM),
    eligibleSessionCount = decimal(v.eligibleSessionCount);
  if (distance !== '0' && eligibleSessionCount === '0') return fail();
  // Validate the canonical server result against the frozen pure policy. This
  // does not fabricate a server total or turn provisional distance canonical.
  const expected = toProgressionWire(getProgressionSnapshot(BigInt(distance)));
  const progress = record(v.progress);
  if (
    decimal(v.level) !== expected.level ||
    decimal(v.thresholdM) !== expected.thresholdM ||
    decimal(v.nextThresholdM) !== expected.nextThresholdM ||
    decimal(v.distanceToNextLevelM) !== expected.distanceToNextLevelM ||
    decimal(progress.numeratorM) !== expected.progress.numeratorM ||
    decimal(progress.denominatorM) !== expected.progress.denominatorM
  )
    return fail();
  if (!Array.isArray(v.milestones) || v.milestones.length > 3) return fail();
  const milestones = v.milestones.map(milestone);
  if (new Set(milestones.map(m => m.key)).size !== milestones.length)
    return fail();
  // Historical receipts may exceed CURRENT distance after a session deletion.
  // Reconstruct only validated fields; future additive fields stay unconsumed.
  return { ...expected, petId, eligibleSessionCount, milestones };
}
export function createWalkProgressionRepository(transport: WalkRpcTransport) {
  return {
    async get(pet: string): Promise<PetWalkProgression> {
      const petId = normalizeWalkUuid(pet);
      let response: Readonly<{ data: unknown; error: unknown }>;
      try {
        response = await transport('get_pet_walk_progression_v1', {
          p_pet_id: petId,
        });
      } catch {
        throw new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
      }
      if (response.error) {
        const e = record(response.error);
        if (
          (e.code === '42501' || e.code === '22023') &&
          typeof e.details === 'string'
        ) {
          let details: unknown;
          try {
            details = JSON.parse(e.details);
          } catch {
            details = null;
          }
          if (
            details &&
            typeof details === 'object' &&
            'walkErrorVersion' in details &&
            details.walkErrorVersion === 1 &&
            'walkCode' in details &&
            (details.walkCode === 'WALK_OWNER_MISMATCH' ||
              details.walkCode === 'WALK_INVALID_IDENTIFIER')
          ) {
            throw new WalkServerError(details.walkCode, false);
          }
        }
        throw new WalkServerError('WALK_SYNC_UNKNOWN_RETRYABLE', true);
      }
      return decodePetWalkProgression(response.data, petId);
    },
  };
}

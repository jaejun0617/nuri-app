import { appQueryClient } from '../../query/appQueryClient';
import { getCrossedSessionFeedback, type WalkSessionFeedback } from '../domain';
import { decodePetWalkProgression } from '../server/progressionRepository';
import { floorWalkFilteredDistanceM } from '../server/repository';
import type { WalkNativeSnapshot } from '../runtime/nativeWalk';

export const WALK_SESSION_FEEDBACK_COPY: Record<WalkSessionFeedback, string> = {
  SESSION_500_M: '함께 500m를 걸었어요.',
  SESSION_1_KM: '함께 1km를 걸었어요.',
  SESSION_20_MIN: '함께 20분을 걸었어요.',
};

// Read only an already validated, same-owner/pet server cache. Never fetch or
// project a local lifetime total just to establish level-up feedback.
export function cachedWalkLevel(
  ownerId: string,
  petId: string,
): string | undefined {
  const cached = appQueryClient
    .getQueryCache()
    .findAll({
      queryKey: ['walk', ownerId, petId, 'progression'],
    })
    .filter(q => q.state.status === 'success' && !q.state.isInvalidated)
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
  for (const query of cached) {
    try {
      return decodePetWalkProgression(query.state.data, petId).level;
    } catch {
      /* Invalid cache is not a trusted baseline. */
    }
  }
  return undefined;
}

// Screen-lifetime ephemeral feedback only; no persistence, XP or milestones.
export function createWalkSessionFeedback() {
  let session: string | null = null;
  let previous: { distance: bigint; active: bigint } | null = null;
  const shown = new Set<WalkSessionFeedback>();
  return {
    begin(id: string) {
      session = id;
      previous = { distance: 0n, active: 0n };
      shown.clear();
    },
    suspend() {
      previous = null;
    },
    update(snapshot: WalkNativeSnapshot): WalkSessionFeedback[] {
      if (
        !snapshot.distanceSummary ||
        typeof snapshot.distanceSummary.acceptedDistanceM !== 'string' ||
        typeof snapshot.elapsedActiveMs !== 'string'
      )
        return [];
      const distance = BigInt(
        floorWalkFilteredDistanceM(snapshot.distanceSummary.acceptedDistanceM),
      );
      const active = BigInt(snapshot.elapsedActiveMs);
      if (session !== snapshot.sessionId) {
        session = snapshot.sessionId;
        previous = null;
        shown.clear();
      }
      const seed = !previous || snapshot.runtimeState !== 'WALKING';
      const crossed = getCrossedSessionFeedback({
        previousDistanceM: seed ? 0n : previous!.distance,
        nextDistanceM: distance,
        previousActiveDurationMs: seed ? 0n : previous!.active,
        nextActiveDurationMs: active,
        shown: [...shown],
      });
      for (const key of crossed) shown.add(key);
      previous = { distance, active };
      return seed ? [] : crossed;
    },
  };
}

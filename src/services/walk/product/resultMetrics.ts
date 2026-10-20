import type { WalkProductCheckpoint } from '../runtime/productNative';
import { productFinishPayload } from '../runtime/productNative';
import type { WalkNativeSnapshot } from '../runtime/nativeWalk';

export function walkProductResultMetrics(
  c: WalkProductCheckpoint | null,
  s: WalkNativeSnapshot | null,
) {
  const state = c?.receipt?.state;
  if (state === 'DELETED' || state === 'NOT_ACCEPTED_FINAL')
    return { distanceM: null, activeMs: '0' };
  if (state === 'ACCEPTED_SERVER')
    return {
      distanceM: c?.receipt?.summary?.acceptedDistanceM ?? null,
      activeMs: c?.receipt?.summary?.activeDurationMs ?? '0',
    };
  const payload = c?.payloadJson ? productFinishPayload(c) : null;
  return {
    distanceM:
      s?.distanceSummary?.acceptedDistanceM ?? c?.filteredDistanceM ?? null,
    activeMs: s?.elapsedActiveMs ?? payload?.activeDurationMs ?? '0',
  };
}

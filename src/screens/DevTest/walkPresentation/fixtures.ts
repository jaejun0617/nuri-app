import type { WalkMapPoint } from '../../../services/walk/runtime/distanceProjection';
import type { PresentationState } from './model';

// Public city-hall fixture. Never submit these points to the runtime or persistence.
export const PUBLIC_ROUTE: readonly WalkMapPoint[] = [
  { latitude: 37.5665, longitude: 126.978 },
  { latitude: 37.5665, longitude: 126.979 },
  { latitude: 37.5673, longitude: 126.979 },
  { latitude: 37.5673, longitude: 126.978 },
];
export function fixtureMetrics(state: PresentationState) {
  const empty = state === 'PRE_WALK' || state === 'GPS_ACQUIRING';
  return {
    distanceM: empty ? null : '2430',
    activeMs: empty ? '0' : '1920000',
  };
}

export {
  calculateDistanceMeters,
  isValidGeographicCoordinate,
  type GeographicCoordinate as TravelCoordinate,
} from '../location/coordinates';

export type DistanceSortDirection = 'ascending' | 'descending';

function normalizeDistanceMeters(distanceMeters: number | null): number | null {
  return distanceMeters !== null &&
    Number.isFinite(distanceMeters) &&
    distanceMeters >= 0
    ? distanceMeters
    : null;
}

export function compareNullableDistanceMeters(
  leftDistance: number | null,
  rightDistance: number | null,
  direction: DistanceSortDirection,
): number {
  const normalizedLeft = normalizeDistanceMeters(leftDistance);
  const normalizedRight = normalizeDistanceMeters(rightDistance);
  if (normalizedLeft === null && normalizedRight === null) return 0;
  if (normalizedLeft === null) return 1;
  if (normalizedRight === null) return -1;

  return direction === 'ascending'
    ? normalizedLeft - normalizedRight
    : normalizedRight - normalizedLeft;
}

export function estimateWalkMinutes(
  distanceMeters: number | null,
): number | null {
  if (
    distanceMeters === null ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return null;
  }

  // Straight-line distance is converted to a conservative walking route
  // estimate, then divided by an ordinary 4.2 km/h walking pace.
  const routeDistance = distanceMeters * 1.6;
  return Math.max(1, Math.round(routeDistance / 70));
}

export function formatDistanceLabel(distanceMeters: number | null): string {
  const normalizedDistance = normalizeDistanceMeters(distanceMeters);
  if (normalizedDistance === null) return '거리 확인 중';
  if (normalizedDistance < 1000) return `${normalizedDistance}m`;
  return `${(normalizedDistance / 1000).toFixed(1)}km`;
}

export function formatDurationLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return `약 ${minutes}분`;
}

export function buildWalkingTravelLabel(params: {
  distanceMeters: number | null;
  estimatedMinutes?: number | null;
}): string {
  const normalizedDistance = normalizeDistanceMeters(params.distanceMeters);
  const distanceLabel = formatDistanceLabel(normalizedDistance);
  if (normalizedDistance === null) {
    return distanceLabel;
  }

  const preferredMinutes = params.estimatedMinutes;
  const estimatedMinutes =
    typeof preferredMinutes === 'number' &&
    Number.isFinite(preferredMinutes) &&
    preferredMinutes > 0
      ? Math.round(preferredMinutes)
      : estimateWalkMinutes(normalizedDistance);
  const durationLabel = formatDurationLabel(estimatedMinutes);

  return durationLabel
    ? `도보 ${durationLabel} · ${distanceLabel}`
    : distanceLabel;
}

export type TravelCoordinate = {
  latitude: number;
  longitude: number;
};

export function calculateDistanceMeters(
  origin: TravelCoordinate,
  target: TravelCoordinate,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDiff = toRadians(target.latitude - origin.latitude);
  const lngDiff = toRadians(target.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const targetLat = toRadians(target.latitude);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(lngDiff / 2) ** 2;

  return Math.round(
    2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

export function estimateWalkMinutes(
  distanceMeters: number | null,
): number | null {
  if (distanceMeters === null) return null;

  const routeDistance = distanceMeters * 1.6;
  return Math.max(15, Math.min(90, Math.round(routeDistance / 70)));
}

export function formatDistanceLabel(distanceMeters: number | null): string {
  if (distanceMeters === null) return '거리 확인 중';
  if (distanceMeters < 1000) return `${distanceMeters}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function formatDurationLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return `약 ${minutes}분`;
}

export function buildWalkingTravelLabel(params: {
  distanceMeters: number | null;
  estimatedMinutes?: number | null;
}): string {
  const distanceLabel = formatDistanceLabel(params.distanceMeters);
  if (params.distanceMeters === null) {
    return distanceLabel;
  }

  const preferredMinutes = params.estimatedMinutes;
  const estimatedMinutes =
    typeof preferredMinutes === 'number' &&
    Number.isFinite(preferredMinutes) &&
    preferredMinutes > 0
      ? Math.round(preferredMinutes)
      : estimateWalkMinutes(params.distanceMeters);
  const durationLabel = formatDurationLabel(estimatedMinutes);

  return durationLabel
    ? `도보 ${durationLabel} · ${distanceLabel}`
    : distanceLabel;
}

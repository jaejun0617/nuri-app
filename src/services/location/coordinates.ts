export type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function isValidGeographicCoordinate(
  coordinate: GeographicCoordinate | null | undefined,
): coordinate is GeographicCoordinate {
  if (!coordinate) return false;

  const { latitude, longitude } = coordinate;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function calculateDistanceMeters(
  origin: GeographicCoordinate | null | undefined,
  target: GeographicCoordinate | null | undefined,
): number | null {
  if (
    !isValidGeographicCoordinate(origin) ||
    !isValidGeographicCoordinate(target)
  ) {
    return null;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(target.latitude - origin.latitude);
  const longitudeDelta = toRadians(target.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const targetLatitude = toRadians(target.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return Math.round(
    2 *
      EARTH_RADIUS_METERS *
      Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine)),
  );
}

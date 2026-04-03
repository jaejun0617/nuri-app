import type { Region } from 'react-native-maps';

import type { MapViewportSnapshot } from '../../store/mapViewportStore';

export type MutableViewport = Omit<MapViewportSnapshot, 'updatedAt'>;

export type CoordinatePoint = {
  id?: string | null;
  latitude: number;
  longitude: number;
};

export const PRETTY_ZOOM_LEVEL = 15.5;
export const PRETTY_DELTA = 0.008;
export const PRETTY_PREVIEW_DELTA = 0.006;
export const MIN_ZOOM_LEVEL = 4;
export const MAX_ZOOM_LEVEL = 18;
export const MIN_DELTA = 0.0025;
export const MAX_DELTA = 120;

const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function hasValidCoordinate(
  point:
    | Pick<CoordinatePoint, 'latitude' | 'longitude'>
    | null
    | undefined,
) {
  return Boolean(
    point &&
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude),
  );
}

export function filterValidCoordinatePoints<T extends CoordinatePoint>(
  points: ReadonlyArray<T>,
): T[] {
  return points.filter(hasValidCoordinate);
}

export function normalizeSelectedItemId(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export function buildDefaultViewport(): MutableViewport {
  return {
    centerLatitude: DEFAULT_CENTER.latitude,
    centerLongitude: DEFAULT_CENTER.longitude,
    zoomLevel: PRETTY_ZOOM_LEVEL,
    selectedItemId: null,
  };
}

export function buildViewportKey(viewport: MutableViewport | null | undefined) {
  if (!viewport) {
    return 'null';
  }

  return [
    viewport.centerLatitude.toFixed(5),
    viewport.centerLongitude.toFixed(5),
    viewport.zoomLevel.toFixed(2),
    viewport.selectedItemId ?? '',
  ].join(':');
}

export function normalizeViewport(
  viewport: MapViewportSnapshot | MutableViewport | null | undefined,
): MutableViewport {
  if (!viewport) {
    return buildDefaultViewport();
  }

  return {
    centerLatitude: viewport.centerLatitude,
    centerLongitude: viewport.centerLongitude,
    zoomLevel: clamp(viewport.zoomLevel, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL),
    selectedItemId: normalizeSelectedItemId(viewport.selectedItemId),
  };
}

export function longitudeDeltaFromZoomLevel(zoomLevel: number) {
  return clamp(360 / 2 ** zoomLevel, MIN_DELTA, MAX_DELTA);
}

export function zoomLevelFromLongitudeDelta(longitudeDelta: number) {
  return clamp(
    Math.log2(360 / Math.max(longitudeDelta, MIN_DELTA)),
    MIN_ZOOM_LEVEL,
    MAX_ZOOM_LEVEL,
  );
}

export function viewportToRegion(
  viewport: MapViewportSnapshot | MutableViewport | null | undefined,
  aspectRatio: number,
): Region {
  const normalized = normalizeViewport(viewport);
  const longitudeDelta = longitudeDeltaFromZoomLevel(normalized.zoomLevel);

  return {
    latitude: normalized.centerLatitude,
    longitude: normalized.centerLongitude,
    latitudeDelta: clamp(longitudeDelta * aspectRatio, MIN_DELTA, MAX_DELTA),
    longitudeDelta,
  };
}

export function regionToViewport(
  region: Region,
  selectedItemId: string | null,
): MutableViewport {
  return {
    centerLatitude: region.latitude,
    centerLongitude: region.longitude,
    zoomLevel: zoomLevelFromLongitudeDelta(region.longitudeDelta),
    selectedItemId: normalizeSelectedItemId(selectedItemId),
  };
}

export function buildRegionFromPoint(
  point: CoordinatePoint,
  delta: number = PRETTY_DELTA,
): Region {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function buildRegionFromPoints(
  points: ReadonlyArray<CoordinatePoint>,
): Region | null {
  const validPoints = filterValidCoordinatePoints(points);
  if (!validPoints.length) {
    return null;
  }

  if (validPoints.length === 1) {
    return buildRegionFromPoint(validPoints[0]);
  }

  const latitudes = validPoints.map(point => point.latitude);
  const longitudes = validPoints.map(point => point.longitude);
  const maxLatitude = Math.max(...latitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLongitude = Math.min(...longitudes);

  return {
    latitude: (maxLatitude + minLatitude) / 2,
    longitude: (maxLongitude + minLongitude) / 2,
    latitudeDelta: clamp((maxLatitude - minLatitude) * 1.45, PRETTY_DELTA, MAX_DELTA),
    longitudeDelta: clamp(
      (maxLongitude - minLongitude) * 1.45,
      PRETTY_DELTA,
      MAX_DELTA,
    ),
  };
}

export function buildViewportFromPoints(
  points: ReadonlyArray<CoordinatePoint>,
  selectedItemId?: string | null,
): MutableViewport | null {
  const validPoints = filterValidCoordinatePoints(points);
  const region = buildRegionFromPoints(validPoints);
  if (!region) {
    return null;
  }

  return regionToViewport(
    region,
    selectedItemId ?? validPoints[0]?.id ?? null,
  );
}

export function buildViewportFromCoordinate(
  point: CoordinatePoint,
  selectedItemId?: string | null,
): MutableViewport {
  if (!hasValidCoordinate(point)) {
    return buildDefaultViewport();
  }

  return regionToViewport(
    buildRegionFromPoint(point),
    selectedItemId ?? point.id ?? null,
  );
}

export function areRegionsEquivalent(left: Region, right: Region) {
  return (
    Math.abs(left.latitude - right.latitude) < 0.0008 &&
    Math.abs(left.longitude - right.longitude) < 0.0008 &&
    Math.abs(left.latitudeDelta - right.latitudeDelta) < 0.0008 &&
    Math.abs(left.longitudeDelta - right.longitudeDelta) < 0.0008
  );
}

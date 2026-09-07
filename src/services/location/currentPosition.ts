// 파일: src/services/location/currentPosition.ts
// 역할:
// - 현재 위도/경도를 Promise 형태로 가져오는 공용 서비스
// - 날씨/위치 기반 기능이 같은 옵션을 재사용할 수 있도록 중앙화

import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

import {
  calculateDistanceMeters,
  isValidGeographicCoordinate,
} from './coordinates';

export type LocationCoordinateSource = 'gps' | 'network' | 'cached' | 'default';

export type DeviceCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt?: number | null;
  source?: LocationCoordinateSource;
};

const LAST_COORDINATES_KEY = '@nuri/location/lastCoordinates';
export const LOCATION_STALE_AFTER_MS = 2 * 60 * 1000;
export const LOCATION_AUTO_REFRESH_INTERVAL_MS = 15 * 1000;
export const LOCATION_WEAK_SIGNAL_ACCURACY_METERS = 1000;
export const LOCATION_MEANINGFUL_MOVEMENT_METERS = 50;
export const LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS = 3000;
export const DEFAULT_LOCATION_FALLBACK_COORDINATES: DeviceCoordinates = {
  latitude: 37.5665,
  longitude: 126.978,
  accuracy: null,
  capturedAt: 0,
  source: 'default',
};
const FAST_LOCATION_TIMEOUT_MS = LOCATION_DEFENSIVE_FALLBACK_TIMEOUT_MS;
const FAST_LOCATION_MAX_AGE_MS = 15000;
const PRECISE_LOCATION_TIMEOUT_MS = 10000;
const LOCATION_TIMESTAMP_TOLERANCE_MS = 1000;

export function buildLocationCoordinateKey(
  coords: Pick<DeviceCoordinates, 'latitude' | 'longitude'> | null,
) {
  if (!isValidGeographicCoordinate(coords)) {
    return 'no-coordinates';
  }

  return `${coords.latitude.toFixed(5)}:${coords.longitude.toFixed(5)}`;
}

function normalizeCapturedAt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function toCachedCoordinates(coords: DeviceCoordinates): DeviceCoordinates {
  return {
    ...coords,
    source: 'cached',
  };
}

export function getLocationCapturedAt(
  coords: DeviceCoordinates | null,
): number | null {
  if (!coords) return null;
  const capturedAt = normalizeCapturedAt(coords.capturedAt);
  return capturedAt > 0 ? capturedAt : null;
}

export function getLocationAgeMs(
  coords: DeviceCoordinates | null,
  now = Date.now(),
): number | null {
  const capturedAt = getLocationCapturedAt(coords);
  if (!capturedAt) return null;
  return Math.max(0, now - capturedAt);
}

export function isFreshLocationCoordinates(
  coords: DeviceCoordinates | null,
  now = Date.now(),
): boolean {
  if (!coords) return false;
  if (!isValidGeographicCoordinate(coords)) return false;
  if ((coords.source ?? 'cached') === 'cached') return false;
  if (coords.source === 'default') return false;
  const ageMs = getLocationAgeMs(coords, now);
  if (ageMs === null) return false;
  return ageMs <= LOCATION_STALE_AFTER_MS;
}

export function isWeakLocationSignal(
  coords: DeviceCoordinates | null,
): boolean {
  if (!coords) {
    return false;
  }

  return (
    typeof coords.accuracy === 'number' &&
    coords.accuracy >= LOCATION_WEAK_SIGNAL_ACCURACY_METERS
  );
}

export function isPreciseLocationCoordinates(
  coords: DeviceCoordinates | null,
): boolean {
  if (!isFreshLocationCoordinates(coords)) {
    return false;
  }

  if (!coords) {
    return false;
  }

  return (
    coords.source === 'gps' &&
    typeof coords.accuracy === 'number' &&
    coords.accuracy < LOCATION_WEAK_SIGNAL_ACCURACY_METERS
  );
}

export function shouldPromoteLocationCoordinates(
  current: DeviceCoordinates | null,
  next: DeviceCoordinates,
): boolean {
  if (!isValidGeographicCoordinate(next)) return false;
  if (!current) return true;
  if (!isValidGeographicCoordinate(current)) return true;

  const currentSource = current.source ?? 'cached';
  const nextIsLive = next.source !== 'cached' && next.source !== 'default';
  if (!nextIsLive) {
    return false;
  }

  if (
    (currentSource === 'cached' || currentSource === 'default') &&
    nextIsLive
  ) {
    return true;
  }

  const currentCapturedAt = getLocationCapturedAt(current) ?? 0;
  const nextCapturedAt = getLocationCapturedAt(next) ?? 0;
  if (
    currentCapturedAt > 0 &&
    nextCapturedAt > 0 &&
    nextCapturedAt + LOCATION_TIMESTAMP_TOLERANCE_MS < currentCapturedAt
  ) {
    return false;
  }

  if (current.source === 'default' && next.source !== 'default') return true;
  if (
    !isFreshLocationCoordinates(current) &&
    (next.source ?? 'cached') !== 'cached' &&
    next.source !== 'default'
  ) {
    return true;
  }

  const currentAccuracy = current.accuracy ?? Number.MAX_SAFE_INTEGER;
  const nextAccuracy = next.accuracy ?? Number.MAX_SAFE_INTEGER;
  if ((current.source ?? 'network') !== 'gps' && next.source === 'gps') {
    if (nextAccuracy <= currentAccuracy + 50) {
      return true;
    }
  }

  if (nextAccuracy + 30 < currentAccuracy) {
    return true;
  }

  const distanceMeters = calculateDistanceMeters(current, next);
  if (
    distanceMeters !== null &&
    distanceMeters >= LOCATION_MEANINGFUL_MOVEMENT_METERS
  ) {
    return true;
  }

  // A newer same-area sample refreshes age/source metadata without allowing
  // sub-50 m GPS jitter to change the coordinate identity used by queries.
  return nextCapturedAt > currentCapturedAt;
}

export function reconcileLocationCoordinates(
  current: DeviceCoordinates | null,
  next: DeviceCoordinates,
): DeviceCoordinates | null {
  if (!shouldPromoteLocationCoordinates(current, next)) {
    return current;
  }
  if (!current || !isValidGeographicCoordinate(current)) {
    return next;
  }

  const distanceMeters = calculateDistanceMeters(current, next);
  const currentAccuracy = current.accuracy ?? Number.MAX_SAFE_INTEGER;
  const nextAccuracy = next.accuracy ?? Number.MAX_SAFE_INTEGER;
  const isGpsSourceUpgrade =
    (current.source ?? 'network') !== 'gps' &&
    next.source === 'gps' &&
    nextAccuracy <= currentAccuracy + 50;
  const isAccuracyUpgrade =
    isGpsSourceUpgrade || nextAccuracy + 30 < currentAccuracy;
  const isLiveSourceUpgrade =
    (current.source === 'cached' || current.source === 'default') &&
    next.source !== 'cached' &&
    next.source !== 'default';

  if (
    isLiveSourceUpgrade ||
    isAccuracyUpgrade ||
    (distanceMeters !== null &&
      distanceMeters >= LOCATION_MEANINGFUL_MOVEMENT_METERS)
  ) {
    return next;
  }

  return {
    ...current,
    accuracy:
      next.accuracy !== null && nextAccuracy < currentAccuracy
        ? next.accuracy
        : current.accuracy,
    capturedAt: Math.max(
      getLocationCapturedAt(current) ?? 0,
      getLocationCapturedAt(next) ?? 0,
    ),
  };
}

export function getFreshDeviceCoordinates(
  coords: DeviceCoordinates | null,
  now = Date.now(),
): DeviceCoordinates | null {
  return isFreshLocationCoordinates(coords, now) ? coords : null;
}

function requestCoordinates(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  source: LocationCoordinateSource;
}): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          capturedAt:
            typeof position.timestamp === 'number' &&
            Number.isFinite(position.timestamp)
              ? position.timestamp
              : Date.now(),
          source: options.source,
        });
      },
      error => {
        reject(error);
      },
      {
        ...options,
      },
    );
  });
}

export async function getLastCoordinates(): Promise<DeviceCoordinates | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_COORDINATES_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DeviceCoordinates | null;
    if (!parsed) return null;
    if (!isValidGeographicCoordinate(parsed)) {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
      capturedAt: normalizeCapturedAt(parsed.capturedAt),
      // Persistence is only a bootstrap aid. A restored sample must never be
      // treated as a live device fix, even when it was originally GPS-backed.
      source: 'cached',
    };
  } catch {
    return null;
  }
}

async function saveLastCoordinates(coords: DeviceCoordinates) {
  if (coords.source === 'default') {
    return;
  }

  try {
    await AsyncStorage.setItem(LAST_COORDINATES_KEY, JSON.stringify(coords));
  } catch {
    // noop
  }
}

export async function getCurrentCoordinates(): Promise<DeviceCoordinates> {
  try {
    const precise = await requestCoordinates({
      enableHighAccuracy: true,
      timeout: 18000,
      maximumAge: 0,
      source: 'gps',
    });
    await saveLastCoordinates(precise);
    return precise;
  } catch {
    try {
      const balanced = await requestCoordinates({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
        source: 'network',
      });
      await saveLastCoordinates(balanced);
      return balanced;
    } catch (fallbackError) {
      const cached = await getLastCoordinates();
      if (cached) {
        return toCachedCoordinates(cached);
      }
      throw fallbackError;
    }
  }
}

export async function getDefensiveFallbackCoordinates(): Promise<DeviceCoordinates> {
  const cached = await getLastCoordinates();
  if (cached) {
    return toCachedCoordinates(cached);
  }

  return {
    ...DEFAULT_LOCATION_FALLBACK_COORDINATES,
    capturedAt: Date.now(),
  };
}

export async function getQuickCurrentCoordinates(): Promise<DeviceCoordinates> {
  try {
    const quick = await requestCoordinates({
      enableHighAccuracy: false,
      timeout: FAST_LOCATION_TIMEOUT_MS,
      maximumAge: FAST_LOCATION_MAX_AGE_MS,
      source: 'network',
    });
    await saveLastCoordinates(quick);
    return quick;
  } catch {
    return getDefensiveFallbackCoordinates();
  }
}

export async function getPreciseCurrentCoordinates(): Promise<DeviceCoordinates> {
  const precise = await requestCoordinates({
    enableHighAccuracy: true,
    timeout: PRECISE_LOCATION_TIMEOUT_MS,
    maximumAge: 0,
    source: 'gps',
  });
  await saveLastCoordinates(precise);
  return precise;
}

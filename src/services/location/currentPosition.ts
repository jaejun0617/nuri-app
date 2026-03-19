// 파일: src/services/location/currentPosition.ts
// 역할:
// - 현재 위도/경도를 Promise 형태로 가져오는 공용 서비스
// - 날씨/위치 기반 기능이 같은 옵션을 재사용할 수 있도록 중앙화

import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

export type LocationCoordinateSource = 'gps' | 'network' | 'cached';

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
const FAST_LOCATION_TIMEOUT_MS = 3500;
const FAST_LOCATION_MAX_AGE_MS = 15000;
const PRECISE_LOCATION_TIMEOUT_MS = 10000;

function getCoordinatesKey(coords: DeviceCoordinates) {
  return `${coords.latitude.toFixed(4)}:${coords.longitude.toFixed(4)}`;
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
  if ((coords.source ?? 'cached') === 'cached') return false;
  const ageMs = getLocationAgeMs(coords, now);
  if (ageMs === null) return false;
  return ageMs <= LOCATION_STALE_AFTER_MS;
}

export function shouldPromoteLocationCoordinates(
  current: DeviceCoordinates | null,
  next: DeviceCoordinates,
): boolean {
  if (!current) return true;
  if ((current.source ?? 'cached') === 'cached') return true;
  if (getCoordinatesKey(current) !== getCoordinatesKey(next)) return true;

  const currentAccuracy = current.accuracy ?? Number.MAX_SAFE_INTEGER;
  const nextAccuracy = next.accuracy ?? Number.MAX_SAFE_INTEGER;
  if ((current.source ?? 'network') !== 'gps' && next.source === 'gps') {
    return nextAccuracy <= currentAccuracy + 50;
  }

  return nextAccuracy + 30 < currentAccuracy;
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
    if (
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number'
    ) {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
      capturedAt: normalizeCapturedAt(parsed.capturedAt),
      source:
        parsed.source === 'gps' ||
        parsed.source === 'network' ||
        parsed.source === 'cached'
          ? parsed.source
          : 'cached',
    };
  } catch {
    return null;
  }
}

async function saveLastCoordinates(coords: DeviceCoordinates) {
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
    return getCurrentCoordinates();
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

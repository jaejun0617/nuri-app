// 파일: src/store/weatherStore.ts
// 역할:
// - 좌표 bucket별 날씨 번들을 메모리에 유지하는 zustand store
// - 홈 <-> 상세 이동과 미세 위치 변화에서 weather-cache 재호출을 줄이기 위한 TTL 캐시

import { create } from 'zustand';

import type { DeviceCoordinates } from '../services/location/currentPosition';
import { getWeatherCoordBucketKey } from '../services/weather/coordBucket';
import type { WeatherGuideBundle } from '../services/weather/guide';
import { WEATHER_PREVIEW_MAX_AGE_MS } from '../services/weather/policy';

type WeatherStoreEntry = {
  savedAt: number;
  bundle: WeatherGuideBundle;
};

type CurrentWeatherSnapshot = {
  coords: DeviceCoordinates;
  savedAt: number;
  bundle: WeatherGuideBundle;
};

type WeatherStoreState = {
  byCoordsKey: Record<string, WeatherStoreEntry>;
  currentSnapshot: CurrentWeatherSnapshot | null;
  getFreshEntry: (coords: DeviceCoordinates) => WeatherStoreEntry | null;
  getFreshBundle: (coords: DeviceCoordinates) => WeatherGuideBundle | null;
  getFreshCurrentSnapshot: () => CurrentWeatherSnapshot | null;
  saveBundle: (coords: DeviceCoordinates, bundle: WeatherGuideBundle) => void;
  clearExpired: () => void;
};

export function getWeatherStoreCoordsKey(coords: DeviceCoordinates) {
  return getWeatherCoordBucketKey(coords);
}

export const useWeatherStore = create<WeatherStoreState>((set, get) => ({
  byCoordsKey: {},
  currentSnapshot: null,
  getFreshEntry: coords => {
    const entry = get().byCoordsKey[getWeatherStoreCoordsKey(coords)];
    if (!entry) return null;
    if (Date.now() - entry.savedAt > WEATHER_PREVIEW_MAX_AGE_MS) {
      return null;
    }
    return entry;
  },
  getFreshBundle: coords => {
    return get().getFreshEntry(coords)?.bundle ?? null;
  },
  getFreshCurrentSnapshot: () => {
    const snapshot = get().currentSnapshot;
    if (!snapshot) return null;
    if (Date.now() - snapshot.savedAt > WEATHER_PREVIEW_MAX_AGE_MS) {
      return null;
    }
    return snapshot;
  },
  saveBundle: (coords, bundle) => {
    const savedAt = Date.now();
    const coordsKey = getWeatherStoreCoordsKey(coords);
    set(state => ({
      byCoordsKey: {
        ...state.byCoordsKey,
        [coordsKey]: {
          savedAt,
          bundle,
        },
      },
      currentSnapshot: {
        coords,
        savedAt,
        bundle,
      },
    }));
  },
  clearExpired: () => {
    const now = Date.now();
    const nextEntries = Object.fromEntries(
      Object.entries(get().byCoordsKey).filter(
        ([, entry]) => now - entry.savedAt <= WEATHER_PREVIEW_MAX_AGE_MS,
      ),
    );
    const currentSnapshot = get().currentSnapshot;
    set({
      byCoordsKey: nextEntries,
      currentSnapshot:
        currentSnapshot && now - currentSnapshot.savedAt <= WEATHER_PREVIEW_MAX_AGE_MS
          ? currentSnapshot
          : null,
    });
  },
}));

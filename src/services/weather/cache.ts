// 파일: src/services/weather/cache.ts
// 역할:
// - 좌표별 날씨 번들을 AsyncStorage에 짧게 캐시
// - 홈/상세 날씨 화면이 같은 캐시 정책을 재사용하도록 중앙화

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DeviceCoordinates } from '../location/currentPosition';
import type { WeatherGuideBundle } from './guide';
import { WEATHER_PREVIEW_MAX_AGE_MS } from './policy';

const WEATHER_GUIDE_CACHE_KEY = '@nuri/weather-guide-cache/v5';

type WeatherGuideCacheEntry = {
  savedAt: number;
  bundle: WeatherGuideBundle;
};

type WeatherGuideCacheStore = Record<string, WeatherGuideCacheEntry>;

function getCoordsKey(coords: DeviceCoordinates) {
  return `${coords.latitude.toFixed(3)}:${coords.longitude.toFixed(3)}`;
}

async function readWeatherGuideCacheStore(): Promise<WeatherGuideCacheStore> {
  const raw = await AsyncStorage.getItem(WEATHER_GUIDE_CACHE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as WeatherGuideCacheStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeWeatherGuideCacheStore(store: WeatherGuideCacheStore) {
  await AsyncStorage.setItem(WEATHER_GUIDE_CACHE_KEY, JSON.stringify(store));
}

export async function loadCachedWeatherGuideBundle(
  coords: DeviceCoordinates,
): Promise<WeatherGuideBundle | null> {
  const store = await readWeatherGuideCacheStore();
  const entry = store[getCoordsKey(coords)];

  if (!entry) return null;
  if (Date.now() - entry.savedAt > WEATHER_PREVIEW_MAX_AGE_MS) {
    delete store[getCoordsKey(coords)];
    await writeWeatherGuideCacheStore(store);
    return null;
  }

  return entry.bundle;
}

export async function saveCachedWeatherGuideBundle(
  coords: DeviceCoordinates,
  bundle: WeatherGuideBundle,
) {
  const store = await readWeatherGuideCacheStore();
  const nextStore: WeatherGuideCacheStore = {
    ...store,
    [getCoordsKey(coords)]: {
      savedAt: Date.now(),
      bundle,
    },
  };

  await writeWeatherGuideCacheStore(nextStore);
}

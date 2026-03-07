// 파일: src/hooks/useWeatherGuide.ts
// 역할:
// - 위치 권한, 좌표, 동 이름, 날씨/대기질 API를 TanStack Query + Zustand 조합으로 연결
// - 메모리 TTL -> AsyncStorage TTL -> API 순서로 조회해 화면 왕복 시 재호출을 줄이기

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getBrandedErrorMeta } from '../services/app/errors';
import { getFallbackDistrictLabel } from '../services/location/district';
import { fetchOpenMeteoAirQuality, fetchOpenMeteoForecast } from '../services/weather/api';
import {
  loadCachedWeatherGuideBundle,
  saveCachedWeatherGuideBundle,
} from '../services/weather/cache';
import { buildWeatherGuideBundleFromApi } from '../services/weather/mapper';
import { getWeatherGuideBundle, type WeatherGuideBundle } from '../services/weather/guide';
import { useWeatherStore, getWeatherStoreCoordsKey } from '../store/weatherStore';
import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';

const WEATHER_QUERY_STALE_MS = 10 * 60 * 1000;
const WEATHER_QUERY_GC_MS = 15 * 60 * 1000;

export type WeatherGuideState = {
  loading: boolean;
  bundle: WeatherGuideBundle;
  error: string | null;
  refresh: () => Promise<void>;
  usingMock: boolean;
};

function getWeatherGuideErrorMessage(error: unknown) {
  const meta = getBrandedErrorMeta(error, 'generic');
  return meta.message;
}

function getLocationFallbackMessage(input: {
  permission: ReturnType<typeof useCurrentLocation>['permission'];
  locationError: string | null;
  districtError: string | null;
}) {
  if (input.permission === 'blocked') {
    return '위치 권한이 꺼져 있어 최근 확인한 날씨를 먼저 보여드릴게요.';
  }
  if (input.permission === 'denied') {
    return '위치 권한이 없어 최근 확인한 날씨를 먼저 보여드릴게요.';
  }
  if (input.locationError || input.districtError) {
    return '현재 위치를 잠시 찾지 못해 최근 확인한 날씨를 먼저 보여드릴게요.';
  }
  return null;
}

export function useWeatherGuide(
  initialDistrict = '현재 위치',
  initialBundle?: WeatherGuideBundle,
): WeatherGuideState {
  const queryClient = useQueryClient();
  const location = useCurrentLocation();
  const districtState = useDistrict({
    coordinates: location.coordinates,
    loading: location.loading,
    error: location.error,
  });

  const resolvedDistrict = useMemo(
    () =>
      districtState.district ??
      (location.coordinates
        ? getFallbackDistrictLabel(location.coordinates)
        : initialDistrict),
    [districtState.district, initialDistrict, location.coordinates],
  );

  const coordsKey = useMemo(
    () => (location.coordinates ? getWeatherStoreCoordsKey(location.coordinates) : null),
    [location.coordinates],
  );

  const memoryEntry = useMemo(() => {
    if (!location.coordinates) return null;
    useWeatherStore.getState().clearExpired();
    return useWeatherStore.getState().getFreshEntry(location.coordinates);
  }, [location.coordinates]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDiskCache() {
      if (!location.coordinates || memoryEntry || initialBundle || !coordsKey) return;

      const cachedBundle = await loadCachedWeatherGuideBundle(location.coordinates);
      if (!cachedBundle || cancelled) return;

      useWeatherStore.getState().saveBundle(location.coordinates, cachedBundle);
      queryClient.setQueryData(['weather-guide', coordsKey], cachedBundle);
    }

    hydrateDiskCache().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [coordsKey, initialBundle, location.coordinates, memoryEntry, queryClient]);

  const weatherQuery = useQuery<WeatherGuideBundle>({
    queryKey: ['weather-guide', coordsKey],
    enabled: !!location.coordinates && !!coordsKey,
    staleTime: WEATHER_QUERY_STALE_MS,
    gcTime: WEATHER_QUERY_GC_MS,
    initialData: initialBundle ?? memoryEntry?.bundle,
    initialDataUpdatedAt: memoryEntry?.savedAt ?? (initialBundle ? Date.now() : undefined),
    queryFn: async () => {
      if (!location.coordinates) {
        throw new Error('현재 위치를 아직 확인하지 못했어요.');
      }

      const [forecast, airQuality] = await Promise.all([
        fetchOpenMeteoForecast(location.coordinates),
        fetchOpenMeteoAirQuality(location.coordinates),
      ]);

      return buildWeatherGuideBundleFromApi({
        district: resolvedDistrict,
        coords: location.coordinates,
        forecast,
        airQuality,
      });
    },
  });

  useEffect(() => {
    if (!location.coordinates || !weatherQuery.data) return;

    useWeatherStore.getState().saveBundle(location.coordinates, weatherQuery.data);
    saveCachedWeatherGuideBundle(location.coordinates, weatherQuery.data).catch(() => {});
  }, [location.coordinates, weatherQuery.data]);

  const bundle = useMemo(() => {
    const sourceBundle =
      weatherQuery.data ?? initialBundle ?? getWeatherGuideBundle(resolvedDistrict);

    if (resolvedDistrict === '현재 위치') return sourceBundle;
    if (sourceBundle.district === resolvedDistrict) return sourceBundle;

    return {
      ...sourceBundle,
      district: resolvedDistrict,
    };
  }, [initialBundle, resolvedDistrict, weatherQuery.data]);

  const error = useMemo(() => {
    const locationFallback = getLocationFallbackMessage({
      permission: location.permission,
      locationError: location.error,
      districtError: districtState.error,
    });

    if (locationFallback && !location.coordinates) {
      return locationFallback;
    }

    if (weatherQuery.error) {
      return memoryEntry || initialBundle
        ? '최근 확인한 날씨를 먼저 보여드릴게요. 연결이 안정되면 새 정보로 바뀝니다.'
        : getWeatherGuideErrorMessage(weatherQuery.error);
    }

    return locationFallback;
  }, [
    districtState.error,
    initialBundle,
    location.coordinates,
    location.error,
    location.permission,
    memoryEntry,
    weatherQuery.error,
  ]);

  const refresh = useCallback(async () => {
    await location.refresh();
    if (coordsKey) {
      await queryClient.invalidateQueries({ queryKey: ['weather-guide', coordsKey] });
    }
    await weatherQuery.refetch();
  }, [coordsKey, location, queryClient, weatherQuery]);

  const loading =
    !weatherQuery.data &&
    !initialBundle &&
    (location.loading || districtState.loading || weatherQuery.isLoading);

  return {
    loading,
    bundle,
    error,
    refresh,
    usingMock: (!location.coordinates && !weatherQuery.data) || (!!error && !weatherQuery.data),
  };
}

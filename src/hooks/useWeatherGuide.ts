// 파일: src/hooks/useWeatherGuide.ts
// 역할:
// - 위치 권한, 좌표, 동 이름, 날씨/대기질 API를 TanStack Query + Zustand 조합으로 연결
// - 메모리 TTL -> AsyncStorage TTL -> API 순서로 조회해 화면 왕복 시 재호출을 줄이기

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createLatestRequestController } from '../services/app/async';
import { getBrandedErrorMeta } from '../services/app/errors';
import { getFallbackDistrictLabel } from '../services/location/district';
import { fetchOpenMeteoAirQuality, fetchOpenMeteoForecast } from '../services/weather/api';
import {
  loadCachedWeatherGuideBundle,
  saveCachedWeatherGuideBundle,
} from '../services/weather/cache';
import { buildWeatherGuideBundleFromApi } from '../services/weather/mapper';
import {
  createPreviewWeatherGuideBundle,
  createUnavailableWeatherGuideBundle,
  type WeatherGuideBundle,
} from '../services/weather/guide';
import {
  WEATHER_FOCUS_REFRESH_MS,
  WEATHER_QUERY_GC_MS,
  WEATHER_QUERY_STALE_MS,
} from '../services/weather/policy';
import { useWeatherStore, getWeatherStoreCoordsKey } from '../store/weatherStore';
import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';

export type WeatherGuideState = {
  loading: boolean;
  bundle: WeatherGuideBundle;
  error: string | null;
  refresh: () => Promise<void>;
  isUnavailable: boolean;
  isPreview: boolean;
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
    return '위치 권한이 꺼져 있어 실제 날씨 정보를 확인할 수 없어요.';
  }
  if (input.permission === 'denied') {
    return '위치 권한이 없어 실제 날씨 정보를 확인할 수 없어요.';
  }
  if (input.locationError || input.districtError) {
    return '현재 위치를 잠시 찾지 못해 실제 날씨 정보를 불러오지 못했어요.';
  }
  return null;
}

export function useWeatherGuide(
  initialDistrict = '현재 위치',
  initialBundle?: WeatherGuideBundle,
): WeatherGuideState {
  const queryClient = useQueryClient();
  const location = useCurrentLocation();
  const [diskPreviewBundle, setDiskPreviewBundle] = useState<WeatherGuideBundle | null>(null);
  const lastRefreshRequestAtRef = useRef(0);
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
    const request = createLatestRequestController();

    async function hydrateDiskPreview() {
      const requestId = request.begin();
      if (!location.coordinates || memoryEntry || initialBundle) return;

      const cachedBundle = await loadCachedWeatherGuideBundle(location.coordinates);
      if (!cachedBundle || !request.isCurrent(requestId)) return;

      setDiskPreviewBundle(cachedBundle);
    }

    setDiskPreviewBundle(null);
    hydrateDiskPreview().catch(() => {});

    return () => {
      request.cancel();
    };
  }, [initialBundle, location.coordinates, memoryEntry]);

  const weatherQuery = useQuery<WeatherGuideBundle>({
    queryKey: ['weather-guide', coordsKey],
    enabled: !!location.coordinates && !!coordsKey,
    staleTime: WEATHER_QUERY_STALE_MS,
    gcTime: WEATHER_QUERY_GC_MS,
    refetchOnMount: true,
    queryFn: async () => {
      if (!location.coordinates) {
        throw new Error('현재 위치를 아직 확인하지 못했어요.');
      }

      const previewCandidate =
        initialBundle ?? memoryEntry?.bundle ?? diskPreviewBundle ?? null;
      const [forecastResult, airQualityResult] = await Promise.allSettled([
        fetchOpenMeteoForecast(location.coordinates),
        fetchOpenMeteoAirQuality(location.coordinates),
      ]);

      if (forecastResult.status !== 'fulfilled') {
        throw forecastResult.reason;
      }

      return buildWeatherGuideBundleFromApi({
        district: resolvedDistrict,
        coords: location.coordinates,
        forecast: forecastResult.value,
        airQuality:
          airQualityResult.status === 'fulfilled' ? airQualityResult.value : null,
        fallbackAirQualityMetrics: previewCandidate?.airQualityMetrics,
        fallbackAirQualityConcern: previewCandidate?.airQualityConcern,
      });
    },
  });

  useEffect(() => {
    if (!location.coordinates || !weatherQuery.data) return;

    useWeatherStore.getState().saveBundle(location.coordinates, weatherQuery.data);
    saveCachedWeatherGuideBundle(location.coordinates, weatherQuery.data).catch(() => {});
  }, [location.coordinates, weatherQuery.data]);

  const previewBundle = useMemo(() => {
    if (weatherQuery.data || weatherQuery.error) return null;
    const candidate = initialBundle ?? memoryEntry?.bundle ?? diskPreviewBundle;
    if (!candidate) return null;
    return createPreviewWeatherGuideBundle(candidate, resolvedDistrict);
  }, [
    diskPreviewBundle,
    initialBundle,
    memoryEntry,
    resolvedDistrict,
    weatherQuery.data,
    weatherQuery.error,
  ]);

  const bundle = useMemo(() => {
    const sourceBundle =
      weatherQuery.data ??
      previewBundle ??
      createUnavailableWeatherGuideBundle(resolvedDistrict);

    if (resolvedDistrict === '현재 위치') return sourceBundle;
    if (sourceBundle.district === resolvedDistrict) return sourceBundle;

    return {
      ...sourceBundle,
      district: resolvedDistrict,
    };
  }, [previewBundle, resolvedDistrict, weatherQuery.data]);

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
      return getWeatherGuideErrorMessage(weatherQuery.error);
    }

    if (previewBundle) {
      return locationFallback;
    }

    return locationFallback;
  }, [
    districtState.error,
    location.coordinates,
    location.error,
    location.permission,
    previewBundle,
    weatherQuery.error,
  ]);

  const refresh = useCallback(async () => {
    await location.refresh();
    if (!coordsKey) return;

    lastRefreshRequestAtRef.current = Date.now();
    await queryClient.invalidateQueries({
      queryKey: ['weather-guide', coordsKey],
      exact: true,
      refetchType: 'active',
    });
  }, [coordsKey, location, queryClient]);

  const shouldRefreshWeather = useCallback(() => {
    if (!coordsKey || !location.coordinates) return false;
    if (weatherQuery.isFetching) return false;

    if (previewBundle || !weatherQuery.data) {
      return true;
    }

    return Date.now() - weatherQuery.dataUpdatedAt >= WEATHER_FOCUS_REFRESH_MS;
  }, [
    coordsKey,
    location.coordinates,
    previewBundle,
    weatherQuery.data,
    weatherQuery.dataUpdatedAt,
    weatherQuery.isFetching,
  ]);

  const requestForegroundRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRequestAtRef.current < 1500) return;
    if (!shouldRefreshWeather()) return;

    lastRefreshRequestAtRef.current = now;
    queryClient
      .invalidateQueries({
        queryKey: ['weather-guide', coordsKey],
        exact: true,
        refetchType: 'active',
      })
      .catch(() => {});
  }, [coordsKey, queryClient, shouldRefreshWeather]);

  useFocusEffect(
    useCallback(() => {
      requestForegroundRefresh();
      return undefined;
    }, [requestForegroundRefresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      requestForegroundRefresh();
    });

    return () => {
      subscription.remove();
    };
  }, [requestForegroundRefresh]);

  const loading =
    !weatherQuery.data &&
    !previewBundle &&
    (location.loading || districtState.loading || weatherQuery.isLoading);

  return {
    loading,
    bundle,
    error,
    refresh,
    isUnavailable: bundle.dataSource === 'unavailable',
    isPreview: bundle.dataSource === 'preview',
  };
}

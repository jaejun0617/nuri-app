// 파일: src/hooks/useWeatherGuide.ts
// 파일 목적:
// - 날씨 도메인에서 필요한 위치, 행정동, 예보, 대기질 데이터를 하나의 읽기 모델로 묶는다.
// 어디서 쓰이는지:
// - 홈 로그인 화면, WeatherInsightScreen, 실내 활동 추천 화면 등 날씨 기반 화면에서 공통으로 사용된다.
// 핵심 역할:
// - 위치 권한 확인, 좌표 확보, district 조회, Open-Meteo fetch, preview/unavailable fallback 구성을 담당한다.
// - 메모리 캐시와 디스크 캐시를 사용해 화면 왕복 시 재요청을 줄인다.
// 데이터·상태 흐름:
// - `useCurrentLocation`과 `useDistrict` 결과를 바탕으로 Query key를 만들고, 최종적으로 `WeatherGuideBundle`을 반환한다.
// - weatherStore는 최신 snapshot 캐시를 유지하고, 이 hook은 화면이 바로 소비할 수 있는 상태 객체를 조합한다.
// 수정 시 주의:
// - 위치 freshness, focus refresh, active refresh 규칙이 함께 맞물려 있으므로 하나만 바꾸면 체감 UX가 흔들린다.
// - iOS 권한 계층이 단순화돼 있는 상태라 권한 흐름 주석이나 로직을 과장하면 안 된다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createLatestRequestController } from '../services/app/async';
import { getBrandedErrorMeta } from '../services/app/errors';
import { getFallbackDistrictLabel } from '../services/location/district';
import {
  getLocationAgeMs,
  isFreshLocationCoordinates,
  LOCATION_AUTO_REFRESH_INTERVAL_MS,
  type DeviceCoordinates,
} from '../services/location/currentPosition';
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
  coordinates: DeviceCoordinates | null;
  hasFreshLocation: boolean;
  usingStaleLocation: boolean;
  locationLabel: string;
};

type UseWeatherGuideOptions = {
  initialCoordinates?: DeviceCoordinates | null;
  autoRefreshOnMount?: boolean;
  autoRefreshOnFocus?: boolean;
  autoRefreshOnActive?: boolean;
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
  options: UseWeatherGuideOptions = {},
): WeatherGuideState {
  const queryClient = useQueryClient();
  const autoRefreshOnMount = options.autoRefreshOnMount ?? true;
  const autoRefreshOnFocus = options.autoRefreshOnFocus ?? true;
  const autoRefreshOnActive = options.autoRefreshOnActive ?? true;
  const currentSnapshot = useMemo(() => {
    useWeatherStore.getState().clearExpired();
    return useWeatherStore.getState().getFreshCurrentSnapshot();
  }, []);
  const location = useCurrentLocation({
    initialCoordinates: options.initialCoordinates ?? currentSnapshot?.coords ?? null,
    autoRefreshOnMount,
    autoRefreshOnActive,
  });
  const [diskPreviewBundle, setDiskPreviewBundle] = useState<WeatherGuideBundle | null>(null);
  const lastRefreshRequestAtRef = useRef(0);
  const districtState = useDistrict({
    coordinates: location.coordinates,
    loading: location.loading,
    error: location.error,
    enabled:
      location.permission === 'granted' &&
      (autoRefreshOnMount || !initialBundle),
    initialDistrict: initialBundle?.district ?? initialDistrict,
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

  const canFetchLiveWeather =
    !!location.coordinates &&
    !!coordsKey &&
    location.permission === 'granted' &&
    location.isFresh;

  const weatherQuery = useQuery<WeatherGuideBundle>({
    queryKey: ['weather-guide', coordsKey],
    enabled: canFetchLiveWeather,
    staleTime: WEATHER_QUERY_STALE_MS,
    gcTime: WEATHER_QUERY_GC_MS,
    refetchOnMount: autoRefreshOnMount,
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

  const shouldRefreshLocation = useCallback(() => {
    if (!location.coordinates) return true;
    if (!location.isFresh) return true;

    const ageMs = getLocationAgeMs(location.coordinates);
    return ageMs === null || ageMs >= LOCATION_AUTO_REFRESH_INTERVAL_MS;
  }, [location.coordinates, location.isFresh]);

  const refresh = useCallback(async () => {
    const refreshedCoordinates = await location.refresh();
    if (!isFreshLocationCoordinates(refreshedCoordinates)) {
      return;
    }
    const nextCoordsKey = refreshedCoordinates
      ? getWeatherStoreCoordsKey(refreshedCoordinates)
      : coordsKey;
    if (!nextCoordsKey) return;

    lastRefreshRequestAtRef.current = Date.now();
    await queryClient.invalidateQueries({
      queryKey: ['weather-guide', nextCoordsKey],
      exact: true,
      refetchType: 'active',
    });
  }, [coordsKey, location, queryClient]);

  const shouldRefreshWeather = useCallback(() => {
    if (!coordsKey || !location.coordinates) return false;
    if (location.permission !== 'granted') return false;
    if (weatherQuery.isFetching) return false;

    if (previewBundle || !weatherQuery.data) {
      return true;
    }

    return Date.now() - weatherQuery.dataUpdatedAt >= WEATHER_FOCUS_REFRESH_MS;
  }, [
    coordsKey,
    location.permission,
    location.coordinates,
    previewBundle,
    weatherQuery.data,
    weatherQuery.dataUpdatedAt,
    weatherQuery.isFetching,
  ]);

  const requestForegroundRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRequestAtRef.current < 1500) return;
    if (!shouldRefreshWeather() && !shouldRefreshLocation()) return;

    lastRefreshRequestAtRef.current = now;
    (async () => {
      const refreshedCoordinates = shouldRefreshLocation()
        ? await location.refresh()
        : location.coordinates;
      const nextCoordsKey = refreshedCoordinates
        ? getWeatherStoreCoordsKey(refreshedCoordinates)
        : coordsKey;
      if (!nextCoordsKey || !isFreshLocationCoordinates(refreshedCoordinates)) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['weather-guide', nextCoordsKey],
        exact: true,
        refetchType: 'active',
      });
    })().catch(() => {});
  }, [
    coordsKey,
    location,
    queryClient,
    shouldRefreshLocation,
    shouldRefreshWeather,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!autoRefreshOnFocus) return undefined;
      requestForegroundRefresh();
      return undefined;
    }, [autoRefreshOnFocus, requestForegroundRefresh]),
  );

  useEffect(() => {
    if (!autoRefreshOnActive) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      requestForegroundRefresh();
    });

    return () => {
      subscription.remove();
    };
  }, [autoRefreshOnActive, requestForegroundRefresh]);

  const loading =
    !weatherQuery.data &&
    !previewBundle &&
    (location.loading || districtState.loading || weatherQuery.isLoading);
  const locationLabel =
    !location.isFresh && location.loading
      ? '새 위치 확인 중'
      : location.isFresh
        ? bundle.district
        : bundle.district === '현재 위치'
          ? '최근 확인 위치'
          : `최근 확인 위치 · ${bundle.district}`;

  return {
    loading,
    bundle,
    error,
    refresh,
    isUnavailable: bundle.dataSource === 'unavailable',
    isPreview: bundle.dataSource === 'preview',
    coordinates: location.coordinates,
    hasFreshLocation: location.isFresh,
    usingStaleLocation: location.isStale,
    locationLabel,
  };
}

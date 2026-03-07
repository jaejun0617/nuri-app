// 파일: src/hooks/useWeatherGuide.ts
// 역할:
// - 위치 권한, 좌표, 동 이름, Open-Meteo API를 묶어 WeatherGuideBundle을 반환
// - 화면에서는 mock/실데이터 차이 없이 같은 모델만 소비하도록 연결

import { useEffect, useMemo, useState } from 'react';

import { getBrandedErrorMeta } from '../services/app/errors';
import { getFallbackDistrictLabel } from '../services/location/district';
import { fetchOpenMeteoAirQuality, fetchOpenMeteoForecast } from '../services/weather/api';
import {
  loadCachedWeatherGuideBundle,
  saveCachedWeatherGuideBundle,
} from '../services/weather/cache';
import { buildWeatherGuideBundleFromApi } from '../services/weather/mapper';
import { getWeatherGuideBundle, type WeatherGuideBundle } from '../services/weather/guide';
import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';

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
  const location = useCurrentLocation();
  const districtState = useDistrict({
    coordinates: location.coordinates,
    loading: location.loading,
    error: location.error,
  });
  const [bundle, setBundle] = useState<WeatherGuideBundle>(
    initialBundle ?? getWeatherGuideBundle(initialDistrict),
  );
  const [loading, setLoading] = useState(!initialBundle);
  const [error, setError] = useState<string | null>(null);

  const resolvedDistrict = useMemo(
    () =>
      districtState.district ??
      (location.coordinates
        ? getFallbackDistrictLabel(location.coordinates)
        : initialDistrict),
    [districtState.district, initialDistrict, location.coordinates],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!location.coordinates) {
        setBundle(getWeatherGuideBundle(resolvedDistrict));
        setError(
          getLocationFallbackMessage({
            permission: location.permission,
            locationError: location.error,
            districtError: districtState.error,
          }),
        );
        setLoading(location.loading || districtState.loading);
        return;
      }

      setLoading(!initialBundle);
      setError(null);

      const cachedBundle = await loadCachedWeatherGuideBundle(location.coordinates);
      if (cancelled) return;

      if (cachedBundle) {
        setBundle(
          resolvedDistrict !== '현재 위치' &&
            cachedBundle.district === '현재 위치'
            ? { ...cachedBundle, district: resolvedDistrict }
            : cachedBundle,
        );
        setLoading(false);
      }

      try {
        const [forecast, airQuality] = await Promise.all([
          fetchOpenMeteoForecast(location.coordinates),
          fetchOpenMeteoAirQuality(location.coordinates),
        ]);

        if (cancelled) return;

        const nextBundle = buildWeatherGuideBundleFromApi({
          district: resolvedDistrict,
          coords: location.coordinates,
          forecast,
          airQuality,
        });

        setBundle(nextBundle);
        await saveCachedWeatherGuideBundle(location.coordinates, nextBundle);
      } catch (nextError) {
        if (cancelled) return;

        if (!cachedBundle) {
          setBundle(getWeatherGuideBundle(resolvedDistrict));
        }

        setError(
          cachedBundle
            ? '최근 확인한 날씨를 먼저 보여드릴게요. 연결이 안정되면 새 정보로 바뀝니다.'
            : getWeatherGuideErrorMessage(nextError),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    districtState.error,
    districtState.loading,
    initialBundle,
    location.coordinates,
    location.error,
    location.loading,
    location.permission,
    resolvedDistrict,
  ]);

  return {
    loading,
    bundle,
    error,
    refresh: location.refresh,
    usingMock: !location.coordinates || !!error,
  };
}

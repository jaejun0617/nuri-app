// 파일: src/hooks/useWeatherGuide.ts
// 역할:
// - 위치 권한, 좌표, 동 이름, Open-Meteo API를 묶어 WeatherGuideBundle을 반환
// - 화면에서는 mock/실데이터 차이 없이 같은 모델만 소비하도록 연결

import { useEffect, useMemo, useState } from 'react';

import { fetchOpenMeteoAirQuality, fetchOpenMeteoForecast } from '../services/weather/api';
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

export function useWeatherGuide(initialDistrict = '일산동'): WeatherGuideState {
  const location = useCurrentLocation();
  const districtState = useDistrict();
  const [bundle, setBundle] = useState<WeatherGuideBundle>(
    getWeatherGuideBundle(initialDistrict),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedDistrict = useMemo(
    () => districtState.district ?? initialDistrict,
    [districtState.district, initialDistrict],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!location.coordinates) {
        setBundle(getWeatherGuideBundle(resolvedDistrict));
        setError(districtState.error ?? location.error);
        setLoading(location.loading || districtState.loading);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [forecast, airQuality] = await Promise.all([
          fetchOpenMeteoForecast(location.coordinates),
          fetchOpenMeteoAirQuality(location.coordinates),
        ]);

        if (cancelled) return;

        setBundle(
          buildWeatherGuideBundleFromApi({
            district: resolvedDistrict,
            coords: location.coordinates,
            forecast,
            airQuality,
          }),
        );
      } catch (nextError) {
        if (cancelled) return;
        setBundle(getWeatherGuideBundle(resolvedDistrict));
        setError(
          nextError instanceof Error && nextError.message.trim()
            ? nextError.message
            : '날씨 정보를 잠시 불러오지 못했어요.',
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
    location.coordinates,
    location.error,
    location.loading,
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

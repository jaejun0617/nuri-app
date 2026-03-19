// 파일: src/hooks/useDistrict.ts
// 역할:
// - 현재 좌표를 바탕으로 행정동 이름을 가져오는 공용 훅
// - 위치 권한/좌표/동 이름 상태를 날씨 화면에서 재사용할 수 있게 연결

import { useEffect, useState } from 'react';

import { createLatestRequestController } from '../services/app/async';
import type { DeviceCoordinates } from '../services/location/currentPosition';
import {
  getFallbackDistrictLabel,
  normalizeDistrictLabel,
  resolveDistrictFromCoordinates,
} from '../services/location/district';

export type DistrictState = {
  loading: boolean;
  district: string | null;
  normalizedDistrict: string | null;
  city: string | null;
  province: string | null;
  source: 'kakao' | 'fallback' | null;
  error: string | null;
};

export function useDistrict(input: {
  coordinates: DeviceCoordinates | null;
  loading: boolean;
  error: string | null;
  enabled?: boolean;
  initialDistrict?: string | null;
}): DistrictState {
  const initialDistrict = input.initialDistrict?.trim() || null;
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState<string | null>(initialDistrict);
  const [city, setCity] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [source, setSource] = useState<'kakao' | 'fallback' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coordinatesKey = input.coordinates
    ? `${input.coordinates.latitude.toFixed(3)}:${input.coordinates.longitude.toFixed(3)}`
    : null;
  const sourceError = input.error;

  useEffect(() => {
    if (!initialDistrict) return;
    setDistrict(current => current ?? initialDistrict);
  }, [initialDistrict]);

  useEffect(() => {
    const request = createLatestRequestController();

    if (input.enabled === false) {
      setLoading(input.loading);
      setError(sourceError);
      request.cancel();
      return;
    }

    if (!input.coordinates) {
      setDistrict(initialDistrict);
      setCity(null);
      setProvince(null);
      setSource(null);
      setError(sourceError);
      setLoading(false);
      request.cancel();
      return;
    }

    const coordinates = input.coordinates;
    const fallbackDistrict = getFallbackDistrictLabel(coordinates);

    async function run() {
      const requestId = request.begin();
      setLoading(true);
      setDistrict(fallbackDistrict);
      setCity(null);
      setProvince(null);
      setSource('fallback');
      setError(null);

      try {
        const resolved = await resolveDistrictFromCoordinates(coordinates);
        if (!request.isCurrent(requestId)) return;
        setDistrict(resolved.district);
        setCity(resolved.city);
        setProvince(resolved.province);
        setSource(resolved.source);
      } catch (nextError) {
        if (!request.isCurrent(requestId)) return;
        setDistrict(fallbackDistrict);
        setCity(null);
        setProvince(null);
        setSource('fallback');
        setError(
          nextError instanceof Error && nextError.message.trim()
            ? nextError.message
            : '동 이름을 불러오지 못했어요.',
        );
      } finally {
        if (request.isCurrent(requestId)) {
          setLoading(false);
        }
      }
    }

    run().catch(() => {});

    return () => {
      request.cancel();
    };
  }, [
    coordinatesKey,
    initialDistrict,
    input.coordinates,
    input.enabled,
    input.loading,
    sourceError,
  ]);

  useEffect(() => {
    if (input.coordinates) return;
    setError(sourceError);
  }, [input.coordinates, sourceError]);

  return {
    loading: input.loading || loading,
    district,
    normalizedDistrict: normalizeDistrictLabel(district),
    city,
    province,
    source,
    error,
  };
}

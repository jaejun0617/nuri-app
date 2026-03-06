// 파일: src/hooks/useDistrict.ts
// 역할:
// - 현재 좌표를 바탕으로 행정동 이름을 가져오는 공용 훅
// - 위치 권한/좌표/동 이름 상태를 날씨 화면에서 재사용할 수 있게 연결

import { useEffect, useState } from 'react';

import { resolveDistrictFromCoordinates } from '../services/location/district';
import { useCurrentLocation } from './useCurrentLocation';

export type DistrictState = {
  loading: boolean;
  district: string | null;
  source: 'kakao' | 'fallback' | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDistrict(): DistrictState {
  const location = useCurrentLocation();
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState<string | null>(null);
  const [source, setSource] = useState<'kakao' | 'fallback' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location.coordinates) {
      setDistrict(null);
      setSource(null);
      setError(location.error);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const resolved = await resolveDistrictFromCoordinates(
          location.coordinates!,
        );
        if (cancelled) return;
        setDistrict(resolved.district);
        setSource(resolved.source);
      } catch (nextError) {
        if (cancelled) return;
        setDistrict(null);
        setSource(null);
        setError(
          nextError instanceof Error && nextError.message.trim()
            ? nextError.message
            : '동 이름을 불러오지 못했어요.',
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
  }, [location.coordinates, location.error]);

  return {
    loading: location.loading || loading,
    district,
    source,
    error,
    refresh: location.refresh,
  };
}

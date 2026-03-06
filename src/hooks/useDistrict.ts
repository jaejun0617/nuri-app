// 파일: src/hooks/useDistrict.ts
// 역할:
// - 현재 좌표를 바탕으로 행정동 이름을 가져오는 공용 훅
// - 위치 권한/좌표/동 이름 상태를 날씨 화면에서 재사용할 수 있게 연결

import { useEffect, useState } from 'react';

import type { DeviceCoordinates } from '../services/location/currentPosition';
import { resolveDistrictFromCoordinates } from '../services/location/district';

export type DistrictState = {
  loading: boolean;
  district: string | null;
  source: 'kakao' | 'fallback' | null;
  error: string | null;
};

export function useDistrict(input: {
  coordinates: DeviceCoordinates | null;
  loading: boolean;
  error: string | null;
}): DistrictState {
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState<string | null>(null);
  const [source, setSource] = useState<'kakao' | 'fallback' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.coordinates) {
      setDistrict(null);
      setSource(null);
      setError(input.error);
      setLoading(false);
      return;
    }

    const coordinates = input.coordinates;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const resolved = await resolveDistrictFromCoordinates(coordinates);
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
  }, [input.coordinates, input.error]);

  return {
    loading: input.loading || loading,
    district,
    source,
    error,
  };
}

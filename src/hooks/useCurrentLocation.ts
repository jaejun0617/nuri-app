// 파일: src/hooks/useCurrentLocation.ts
// 역할:
// - 위치 권한 요청과 현재 좌표 획득을 묶는 공용 훅
// - 날씨 API 연결 전 단계에서도 loading / error / refresh 인터페이스를 먼저 고정

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  getCurrentCoordinates,
  type DeviceCoordinates,
} from '../services/location/currentPosition';
import {
  getLocationPermissionStatus,
  requestLocationPermission,
  type LocationPermissionStatus,
} from '../services/location/permission';

export type CurrentLocationState = {
  loading: boolean;
  permission: LocationPermissionStatus;
  coordinates: DeviceCoordinates | null;
  error: string | null;
  refresh: () => Promise<void>;
};

function toLocationErrorMessage(
  permission: LocationPermissionStatus,
  error: unknown,
) {
  if (permission === 'blocked') {
    return '위치 권한이 꺼져 있어 현재 위치를 확인할 수 없어요.';
  }
  if (permission === 'denied') {
    return '위치 권한이 없어 현재 지역을 불러오지 못했어요.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return '현재 위치를 불러오는 중 잠시 멈췄어요.';
}

export function useCurrentLocation(): CurrentLocationState {
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] =
    useState<LocationPermissionStatus>('unavailable');
  const [coordinates, setCoordinates] = useState<DeviceCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permissionRef = useRef<LocationPermissionStatus>('unavailable');
  const coordinatesRef = useRef<DeviceCoordinates | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const now = Date.now();
    if (coordinatesRef.current && now - lastRefreshAtRef.current < 1500) {
      return;
    }

    const task = (async () => {
      setLoading(current => (coordinatesRef.current ? current : true));
      setError(null);

      try {
        const status = await getLocationPermissionStatus();
        const resolvedPermission =
          status === 'granted' ? status : await requestLocationPermission();

        setPermission(resolvedPermission);
        permissionRef.current = resolvedPermission;

        if (resolvedPermission !== 'granted') {
          setCoordinates(null);
          setError(toLocationErrorMessage(resolvedPermission, null));
          return;
        }

        const nextCoordinates = await getCurrentCoordinates();
        setCoordinates(nextCoordinates);
        lastRefreshAtRef.current = Date.now();
      } catch (nextError) {
        setError(toLocationErrorMessage(permissionRef.current, nextError));
      } finally {
        setLoading(false);
      }
    })();

    refreshInFlightRef.current = task;
    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return {
    loading,
    permission,
    coordinates,
    error,
    refresh,
  };
}

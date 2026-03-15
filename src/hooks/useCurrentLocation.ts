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
  refresh: () => Promise<DeviceCoordinates | null>;
};

type UseCurrentLocationOptions = {
  initialCoordinates?: DeviceCoordinates | null;
  autoRefreshOnMount?: boolean;
  autoRefreshOnActive?: boolean;
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

export function useCurrentLocation(
  options: UseCurrentLocationOptions = {},
): CurrentLocationState {
  const {
    initialCoordinates = null,
    autoRefreshOnMount = true,
    autoRefreshOnActive = true,
  } = options;
  const [loading, setLoading] = useState(!initialCoordinates);
  const [permission, setPermission] = useState<LocationPermissionStatus>(
    initialCoordinates ? 'granted' : 'unavailable',
  );
  const [coordinates, setCoordinates] = useState<DeviceCoordinates | null>(
    initialCoordinates,
  );
  const [error, setError] = useState<string | null>(null);
  const permissionRef = useRef<LocationPermissionStatus>(
    initialCoordinates ? 'granted' : 'unavailable',
  );
  const coordinatesRef = useRef<DeviceCoordinates | null>(initialCoordinates);
  const refreshInFlightRef = useRef<Promise<DeviceCoordinates | null> | null>(
    null,
  );
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!initialCoordinates) return;
    setCoordinates(current => current ?? initialCoordinates);
    coordinatesRef.current = coordinatesRef.current ?? initialCoordinates;
    setPermission(current => (current === 'unavailable' ? 'granted' : current));
    permissionRef.current =
      permissionRef.current === 'unavailable' ? 'granted' : permissionRef.current;
    setLoading(false);
  }, [initialCoordinates]);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const now = Date.now();
    if (coordinatesRef.current && now - lastRefreshAtRef.current < 1500) {
      return coordinatesRef.current;
    }

    const task = (async (): Promise<DeviceCoordinates | null> => {
      setLoading(current => (coordinatesRef.current ? current : true));
      setError(null);

      try {
        const status = await getLocationPermissionStatus();
        const resolvedPermission =
          status === 'granted'
            ? status
            : status === 'unavailable'
              ? await requestLocationPermission()
              : status;

        setPermission(resolvedPermission);
        permissionRef.current = resolvedPermission;

        if (resolvedPermission !== 'granted') {
          if (!coordinatesRef.current) {
            setCoordinates(null);
          }
          setError(toLocationErrorMessage(resolvedPermission, null));
          return coordinatesRef.current;
        }

        const nextCoordinates = await getCurrentCoordinates();
        setCoordinates(nextCoordinates);
        coordinatesRef.current = nextCoordinates;
        setError(null);
        lastRefreshAtRef.current = Date.now();
        return nextCoordinates;
      } catch (nextError) {
        setError(toLocationErrorMessage(permissionRef.current, nextError));
        return coordinatesRef.current;
      } finally {
        setLoading(false);
      }
    })();

    refreshInFlightRef.current = task;
    try {
      return await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoRefreshOnMount) {
      setLoading(false);
      return;
    }
    refresh().catch(() => {});
  }, [autoRefreshOnMount, refresh]);

  useEffect(() => {
    if (!autoRefreshOnActive) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [autoRefreshOnActive, refresh]);

  return {
    loading,
    permission,
    coordinates,
    error,
    refresh,
  };
}

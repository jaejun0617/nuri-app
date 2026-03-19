// 파일: src/hooks/useCurrentLocation.ts
// 역할:
// - 위치 권한 요청과 현재 좌표 획득을 묶는 공용 훅
// - 날씨 API 연결 전 단계에서도 loading / error / refresh 인터페이스를 먼저 고정

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  getLocationCapturedAt,
  getLocationAgeMs,
  getLastCoordinates,
  getPreciseCurrentCoordinates,
  getQuickCurrentCoordinates,
  isFreshLocationCoordinates,
  LOCATION_AUTO_REFRESH_INTERVAL_MS,
  shouldPromoteLocationCoordinates,
  type DeviceCoordinates,
  type LocationCoordinateSource,
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
  source: LocationCoordinateSource | null;
  isFresh: boolean;
  isStale: boolean;
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  isRefining: boolean;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permissionRef = useRef<LocationPermissionStatus>(
    initialCoordinates ? 'granted' : 'unavailable',
  );
  const coordinatesRef = useRef<DeviceCoordinates | null>(initialCoordinates);
  const refreshInFlightRef = useRef<Promise<DeviceCoordinates | null> | null>(
    null,
  );
  const refineRequestIdRef = useRef(0);
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
    if (initialCoordinates) return;

    let mounted = true;

    getLastCoordinates()
      .then(cached => {
        if (!mounted || !cached) return;
        setCoordinates(current => current ?? cached);
        coordinatesRef.current = coordinatesRef.current ?? cached;
        setLoading(false);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [initialCoordinates]);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  const applyCoordinates = useCallback((nextCoordinates: DeviceCoordinates) => {
    setCoordinates(current => {
      if (!shouldPromoteLocationCoordinates(current, nextCoordinates)) {
        return current;
      }
      return nextCoordinates;
    });

    if (shouldPromoteLocationCoordinates(coordinatesRef.current, nextCoordinates)) {
      coordinatesRef.current = nextCoordinates;
    }
  }, []);

  const shouldRefreshLocation = useCallback(() => {
    if (!coordinatesRef.current) return true;
    if (!isFreshLocationCoordinates(coordinatesRef.current)) return true;

    const ageMs = getLocationAgeMs(coordinatesRef.current);
    return ageMs === null || ageMs >= LOCATION_AUTO_REFRESH_INTERVAL_MS;
  }, []);

  const refineWithPreciseCoordinates = useCallback(async () => {
    const requestId = ++refineRequestIdRef.current;
    setIsRefining(true);

    try {
      const preciseCoordinates = await getPreciseCurrentCoordinates();
      if (refineRequestIdRef.current !== requestId) {
        return;
      }

      applyCoordinates(preciseCoordinates);
      setError(null);
      lastRefreshAtRef.current = Date.now();
    } catch {
      // noop
    } finally {
      if (refineRequestIdRef.current === requestId) {
        setIsRefining(false);
      }
    }
  }, [applyCoordinates]);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const now = Date.now();
    if (coordinatesRef.current && now - lastRefreshAtRef.current < 1500) {
      return coordinatesRef.current;
    }

    const task = (async (): Promise<DeviceCoordinates | null> => {
      refineRequestIdRef.current += 1;
      setIsRefining(false);
      setLoading(current => current || !isFreshLocationCoordinates(coordinatesRef.current));
      setIsRefreshing(true);
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
          refineRequestIdRef.current += 1;
          if (!coordinatesRef.current) {
            setCoordinates(null);
          }
          setError(toLocationErrorMessage(resolvedPermission, null));
          return coordinatesRef.current;
        }

        const nextCoordinates = await getQuickCurrentCoordinates();
        applyCoordinates(nextCoordinates);
        setError(null);
        lastRefreshAtRef.current = Date.now();

        if (nextCoordinates.source !== 'gps') {
          refineWithPreciseCoordinates().catch(() => {});
        }

        return nextCoordinates;
      } catch (nextError) {
        refineRequestIdRef.current += 1;
        setIsRefining(false);
        setError(toLocationErrorMessage(permissionRef.current, nextError));
        return coordinatesRef.current;
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
    })();

    refreshInFlightRef.current = task;
    try {
      return await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [applyCoordinates, refineWithPreciseCoordinates]);

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
      if (state === 'active' && shouldRefreshLocation()) {
        refresh().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, [autoRefreshOnActive, refresh, shouldRefreshLocation]);

  return {
    loading,
    permission,
    coordinates,
    source: coordinates?.source ?? null,
    isFresh: isFreshLocationCoordinates(coordinates),
    isStale: Boolean(coordinates) && !isFreshLocationCoordinates(coordinates),
    lastUpdatedAt: getLocationCapturedAt(coordinates),
    isRefreshing,
    isRefining,
    error,
    refresh,
  };
}

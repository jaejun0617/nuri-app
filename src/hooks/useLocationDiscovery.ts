import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';
import { searchLocationDiscovery } from '../services/locationDiscovery/service';
import {
  buildLocationCoordinateKey,
  getLocationAgeMs,
  getFreshDeviceCoordinates,
  LOCATION_AUTO_REFRESH_INTERVAL_MS,
} from '../services/location/currentPosition';
import { isValidGeographicCoordinate } from '../services/location/coordinates';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoverySearchScope,
  LocationDiscoveryVerificationStatus,
} from '../services/locationDiscovery/types';

export type LocationDiscoveryState = {
  loading: boolean;
  refreshing: boolean;
  searching: boolean;
  items: LocationDiscoveryItem[];
  error: string | null;
  verificationStatus: LocationDiscoveryVerificationStatus;
  permission: ReturnType<typeof useCurrentLocation>['permission'];
  coordinates: ReturnType<typeof useCurrentLocation>['coordinates'];
  district: string | null;
  normalizedDistrict: string | null;
  city: string | null;
  hasFreshLocation: boolean;
  usingStaleLocation: boolean;
  scope: LocationDiscoverySearchScope;
  refresh: () => Promise<void>;
};

export type LocationDiscoveryCoordinateOverride = {
  latitude: number;
  longitude: number;
  label: string;
} | null;

export function useLocationDiscovery(input: {
  domain: LocationDiscoveryDomain;
  query: string;
  coordinateOverride?: LocationDiscoveryCoordinateOverride;
}): LocationDiscoveryState {
  const locationState = useCurrentLocation({
    autoRefreshOnMount: true,
    autoRefreshOnActive: true,
  });
  const districtState = useDistrict({
    coordinates: locationState.coordinates,
    loading: locationState.loading,
    error: locationState.error,
  });

  const normalizedQuery = useMemo(
    () => input.query.trim().replace(/\s+/g, ' '),
    [input.query],
  );
  const refreshLocation = locationState.refresh;
  const hasSearchQuery = normalizedQuery.length >= 2;
  const overrideCoordinates = useMemo(() => {
    if (!input.coordinateOverride) return null;

    const coordinate = {
      latitude: input.coordinateOverride.latitude,
      longitude: input.coordinateOverride.longitude,
    };
    if (!isValidGeographicCoordinate(coordinate)) return null;

    return {
      ...coordinate,
      accuracy: null,
      capturedAt: null,
      source: 'cached' as const,
    };
  }, [input.coordinateOverride]);
  const freshDeviceCoordinates = getFreshDeviceCoordinates(
    locationState.coordinates,
  );
  const searchCoordinates = overrideCoordinates ?? freshDeviceCoordinates;
  const usingDefaultFallback = locationState.coordinates?.source === 'default';
  const awaitingFreshLocation =
    !hasSearchQuery &&
    !searchCoordinates &&
    (locationState.loading ||
      locationState.isRefreshing ||
      locationState.isRefining);
  const distanceCoordinatesKey = buildLocationCoordinateKey(
    freshDeviceCoordinates,
  );
  const searchCoordinatesKey = buildLocationCoordinateKey(searchCoordinates);
  const district = districtState.district?.trim() || null;
  const normalizedDistrict =
    districtState.normalizedDistrict?.trim() || district;
  const scope = useMemo<LocationDiscoverySearchScope>(
    () => ({
      displayLabel:
        input.coordinateOverride?.label ??
        (usingDefaultFallback || !freshDeviceCoordinates
          ? locationState.loading ||
            locationState.isRefreshing ||
            locationState.isRefining
            ? '새 위치 확인 중'
            : '현재 위치를 확인할 수 없음'
          : district ?? '현재 위치'),
      queryLabel:
        input.coordinateOverride || !freshDeviceCoordinates
          ? null
          : districtState.city && district
          ? `${districtState.city} ${district}`.trim()
          : district,
      searchCoordinates,
      anchorCoordinates: freshDeviceCoordinates,
      distanceLabel: !freshDeviceCoordinates
        ? locationState.loading ||
          locationState.isRefreshing ||
          locationState.isRefining
          ? '새 위치 확인 중'
          : '위치 확인 후 거리 표시'
        : '현재 위치 기준',
    }),
    [
      district,
      districtState.city,
      freshDeviceCoordinates,
      input.coordinateOverride,
      locationState.isRefining,
      locationState.isRefreshing,
      locationState.loading,
      searchCoordinates,
      usingDefaultFallback,
    ],
  );

  const query = useQuery({
    queryKey: [
      'location-discovery',
      input.domain,
      hasSearchQuery ? normalizedQuery : 'nearby',
      searchCoordinatesKey,
      distanceCoordinatesKey,
      input.coordinateOverride ? 'map-center' : 'device',
    ],
    queryFn: async () =>
      searchLocationDiscovery(input.domain, {
        query: hasSearchQuery ? normalizedQuery : null,
        scope,
        useNearbySearch: !hasSearchQuery,
      }),
    enabled: hasSearchQuery || Boolean(searchCoordinates),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const refetchLocationDiscovery = query.refetch;

  const shouldRefreshLocation = useCallback(() => {
    if (!locationState.coordinates) return true;
    if (!locationState.isFresh) return true;

    const ageMs = getLocationAgeMs(locationState.coordinates);
    return ageMs === null || ageMs >= LOCATION_AUTO_REFRESH_INTERVAL_MS;
  }, [locationState.coordinates, locationState.isFresh]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldRefreshLocation()) {
        return undefined;
      }

      (async () => {
        const nextCoordinates = await refreshLocation();
        const nextFreshCoordinates = getFreshDeviceCoordinates(nextCoordinates);
        if (!nextFreshCoordinates) {
          if (hasSearchQuery || input.coordinateOverride) {
            await refetchLocationDiscovery();
          }
          return;
        }
        const nextCoordinatesKey =
          buildLocationCoordinateKey(nextFreshCoordinates);
        if (nextCoordinatesKey !== distanceCoordinatesKey) {
          // The coordinate-keyed query will fetch for the new location. Refetching
          // here would also issue a request for the obsolete coordinate bucket.
          return;
        }
        await refetchLocationDiscovery();
      })().catch(() => {});

      return undefined;
    }, [
      hasSearchQuery,
      input.coordinateOverride,
      distanceCoordinatesKey,
      refetchLocationDiscovery,
      refreshLocation,
      shouldRefreshLocation,
    ]),
  );

  return {
    loading: (awaitingFreshLocation || query.isLoading) && !query.data,
    refreshing:
      (query.isRefetching || locationState.isRefreshing) && !hasSearchQuery,
    searching: query.isFetching && hasSearchQuery,
    items: query.data?.items ?? [],
    error:
      (query.error instanceof Error ? query.error.message : null) ??
      (!hasSearchQuery ? locationState.error : null),
    verificationStatus: query.data?.verificationStatus ?? 'unknown',
    permission: locationState.permission,
    coordinates: freshDeviceCoordinates,
    district,
    normalizedDistrict,
    city: districtState.city,
    hasFreshLocation: Boolean(freshDeviceCoordinates),
    usingStaleLocation:
      !overrideCoordinates &&
      locationState.coordinates?.source !== 'default' &&
      locationState.isStale,
    scope: query.data?.scope ?? scope,
    refresh: async () => {
      const nextCoordinates = await refreshLocation();
      const nextFreshCoordinates = getFreshDeviceCoordinates(nextCoordinates);
      if (
        !nextFreshCoordinates &&
        !hasSearchQuery &&
        !input.coordinateOverride
      ) {
        return;
      }

      const nextCoordinatesKey = buildLocationCoordinateKey(
        nextFreshCoordinates,
      );
      if (nextCoordinatesKey !== distanceCoordinatesKey) {
        return;
      }

      await query.refetch();
    },
  };
}

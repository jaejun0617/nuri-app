import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';
import { searchLocationDiscovery } from '../services/locationDiscovery/service';
import {
  getLocationAgeMs,
  isFreshLocationCoordinates,
  LOCATION_AUTO_REFRESH_INTERVAL_MS,
} from '../services/location/currentPosition';
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
  const overrideCoordinates = input.coordinateOverride
    ? {
        accuracy: null,
        capturedAt: Date.now(),
        latitude: input.coordinateOverride.latitude,
        longitude: input.coordinateOverride.longitude,
        source: 'cached' as const,
      }
    : null;
  const effectiveCoordinates = overrideCoordinates ?? locationState.coordinates;
  const usingDefaultFallback = locationState.coordinates?.source === 'default';
  const coordinatesKey = effectiveCoordinates
    ? `${effectiveCoordinates.latitude.toFixed(3)}:${effectiveCoordinates.longitude.toFixed(3)}`
    : 'no-coordinates';
  const district = districtState.district?.trim() || null;
  const normalizedDistrict = districtState.normalizedDistrict?.trim() || district;
  const scope = useMemo<LocationDiscoverySearchScope>(
    () => ({
      displayLabel:
        input.coordinateOverride?.label ??
        (usingDefaultFallback
          ? '서울 시청'
          : !locationState.isFresh && locationState.loading
          ? '새 위치 확인 중'
          : district ?? (locationState.isFresh ? '현재 위치' : '최근 확인 위치')),
      queryLabel:
        input.coordinateOverride ? null : districtState.city && district
          ? `${districtState.city} ${district}`.trim()
          : district,
      anchorCoordinates: effectiveCoordinates,
      distanceLabel:
        input.coordinateOverride
          ? `${input.coordinateOverride.label} 기준`
          : usingDefaultFallback
            ? '기본 위치 기준'
            : !locationState.isFresh && locationState.loading
              ? '새 위치 확인 중'
              : locationState.isFresh
                ? '현재 위치 기준'
                : '최근 확인 위치 기준',
    }),
    [
      district,
      districtState.city,
      effectiveCoordinates,
      input.coordinateOverride,
      locationState.isFresh,
      locationState.loading,
      usingDefaultFallback,
    ],
  );

  const query = useQuery({
    queryKey: [
      'location-discovery',
      input.domain,
      hasSearchQuery ? normalizedQuery : 'nearby',
      coordinatesKey,
      input.coordinateOverride ? 'map-center' : 'device',
    ],
    queryFn: async () =>
      searchLocationDiscovery(input.domain, {
        query: hasSearchQuery ? normalizedQuery : null,
        scope,
        useNearbySearch: !hasSearchQuery,
      }),
    enabled: hasSearchQuery || Boolean(effectiveCoordinates),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: previous => previous,
  });

  const shouldRefreshLocation = useCallback(() => {
    if (!locationState.coordinates) return true;
    if (!locationState.isFresh) return true;

    const ageMs = getLocationAgeMs(locationState.coordinates);
    return ageMs === null || ageMs >= LOCATION_AUTO_REFRESH_INTERVAL_MS;
  }, [locationState.coordinates, locationState.isFresh]);

  useFocusEffect(
    useCallback(() => {
      if (input.coordinateOverride) {
        return undefined;
      }

      if (!shouldRefreshLocation()) {
        return undefined;
      }

      (async () => {
        const nextCoordinates = await refreshLocation();
        if (hasSearchQuery || !isFreshLocationCoordinates(nextCoordinates)) {
          return;
        }
        await query.refetch();
      })().catch(() => {});

      return undefined;
    }, [
      hasSearchQuery,
      input.coordinateOverride,
      query,
      refreshLocation,
      shouldRefreshLocation,
    ]),
  );

  return {
    loading:
      ((locationState.loading && !effectiveCoordinates && !hasSearchQuery) ||
        query.isLoading) &&
      !query.data,
    refreshing: query.isRefetching && !hasSearchQuery,
    searching: query.isFetching && hasSearchQuery,
    items: query.data?.items ?? [],
    error:
      (query.error instanceof Error ? query.error.message : null) ??
      (!hasSearchQuery ? locationState.error : null),
    verificationStatus: query.data?.verificationStatus ?? 'unknown',
    permission: locationState.permission,
    coordinates: effectiveCoordinates,
    district,
    normalizedDistrict,
    city: districtState.city,
    hasFreshLocation: locationState.isFresh,
    usingStaleLocation: locationState.isStale,
    scope: query.data?.scope ?? scope,
    refresh: async () => {
      const nextCoordinates = hasSearchQuery || input.coordinateOverride
        ? effectiveCoordinates
        : await refreshLocation();

      if (
        !hasSearchQuery &&
        !input.coordinateOverride &&
        !isFreshLocationCoordinates(nextCoordinates)
      ) {
        return;
      }

      await query.refetch();
    },
  };
}

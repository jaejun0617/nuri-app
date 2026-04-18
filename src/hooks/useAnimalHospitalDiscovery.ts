import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';
import type {
  AnimalHospitalPublicHospital,
  AnimalHospitalSearchScope,
} from '../domains/animalHospital/types';
import { searchAnimalHospitals } from '../services/animalHospital/service';
import {
  getLocationAgeMs,
  isFreshLocationCoordinates,
  LOCATION_AUTO_REFRESH_INTERVAL_MS,
} from '../services/location/currentPosition';

export type AnimalHospitalDiscoveryState = {
  loading: boolean;
  refreshing: boolean;
  searching: boolean;
  items: AnimalHospitalPublicHospital[];
  error: string | null;
  permission: ReturnType<typeof useCurrentLocation>['permission'];
  coordinates: ReturnType<typeof useCurrentLocation>['coordinates'];
  district: string | null;
  normalizedDistrict: string | null;
  city: string | null;
  hasFreshLocation: boolean;
  usingStaleLocation: boolean;
  scope: AnimalHospitalSearchScope;
  refresh: () => Promise<void>;
};

export function useAnimalHospitalDiscovery(input: {
  query: string;
}): AnimalHospitalDiscoveryState {
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
  const coordinatesKey = locationState.coordinates
    ? `${locationState.coordinates.latitude.toFixed(3)}:${locationState.coordinates.longitude.toFixed(3)}`
    : 'no-coordinates';
  const district = districtState.district?.trim() || null;
  const hasCoordinates = Boolean(locationState.coordinates);
  const shouldRunQuery = hasSearchQuery || hasCoordinates || !locationState.loading;
  const scope = useMemo<AnimalHospitalSearchScope>(
    () => ({
      displayLabel:
        !locationState.coordinates && !hasSearchQuery
          ? '기본 검색'
          : !locationState.isFresh && locationState.loading
          ? '새 위치 확인 중'
          : district ?? (locationState.isFresh ? '현재 위치' : '최근 확인 위치'),
      queryLabel:
        districtState.city && district
          ? `${districtState.city} ${district}`.trim()
          : district,
      anchorCoordinates: locationState.coordinates,
      distanceLabel:
        !locationState.coordinates && !hasSearchQuery
          ? '기본 검색 기준'
          : !locationState.isFresh && locationState.loading
          ? '새 위치 확인 중'
          : locationState.isFresh
            ? '현재 위치 기준'
            : '최근 확인 위치 기준',
    }),
    [
      district,
      districtState.city,
      locationState.coordinates,
      locationState.isFresh,
      locationState.loading,
      hasSearchQuery,
    ],
  );

  const query = useQuery({
    queryKey: [
      'animal-hospital-discovery',
      hasSearchQuery ? normalizedQuery : 'nearby',
      coordinatesKey,
    ],
    queryFn: async () =>
      searchAnimalHospitals({
        query: hasSearchQuery ? normalizedQuery : null,
        scope,
        useNearbySearch: !hasSearchQuery,
      }),
    enabled: shouldRunQuery,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnReconnect: false,
    placeholderData: previous => previous,
  });
  const refetchAnimalHospitals = query.refetch;

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
        if (hasSearchQuery || !isFreshLocationCoordinates(nextCoordinates)) {
          return;
        }
        await refetchAnimalHospitals();
      })().catch(() => {});

      return undefined;
    }, [hasSearchQuery, refetchAnimalHospitals, refreshLocation, shouldRefreshLocation]),
  );

  return {
    loading:
      query.isLoading && !query.data,
    refreshing: query.isRefetching && !hasSearchQuery,
    searching: query.isFetching && hasSearchQuery,
    items: query.data?.items ?? [],
    error:
      (query.error instanceof Error ? query.error.message : null) ??
      (!hasSearchQuery ? locationState.error : null),
    permission: locationState.permission,
    coordinates: locationState.coordinates,
    district,
    normalizedDistrict: districtState.normalizedDistrict?.trim() || district,
    city: districtState.city,
    hasFreshLocation: locationState.isFresh,
    usingStaleLocation: locationState.isStale,
    scope: query.data?.scope ?? scope,
    refresh: async () => {
      const nextCoordinates = hasSearchQuery
        ? locationState.coordinates
        : await refreshLocation();

      if (!hasSearchQuery && !isFreshLocationCoordinates(nextCoordinates)) {
        return;
      }

      await refetchAnimalHospitals();
    },
  };
}

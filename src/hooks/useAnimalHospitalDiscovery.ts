import { useCallback, useEffect, useMemo, useState } from 'react';
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

const ANIMAL_HOSPITAL_LOCATION_BOOTSTRAP_TIMEOUT_MS = 2500;

export type AnimalHospitalDiscoveryState = {
  loading: boolean;
  refreshing: boolean;
  searching: boolean;
  items: AnimalHospitalPublicHospital[];
  error: string | null;
  permission: ReturnType<typeof useCurrentLocation>['permission'];
  permissionAccuracy: ReturnType<typeof useCurrentLocation>['permissionAccuracy'];
  coordinates: ReturnType<typeof useCurrentLocation>['coordinates'];
  district: string | null;
  normalizedDistrict: string | null;
  city: string | null;
  hasFreshLocation: boolean;
  usingStaleLocation: boolean;
  hasPreciseLocation: boolean;
  hasWeakLocationSignal: boolean;
  scope: AnimalHospitalSearchScope;
  refresh: () => Promise<void>;
  requestPreciseRefresh: () => Promise<boolean>;
};

export function useAnimalHospitalDiscovery(input: {
  query: string;
  open24HoursOnly?: boolean;
  exoticAnimalCareOnly?: boolean;
}): AnimalHospitalDiscoveryState {
  const [locationBootstrapTimedOut, setLocationBootstrapTimedOut] =
    useState(false);
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
    ? `${locationState.coordinates.latitude.toFixed(
        4,
      )}:${locationState.coordinates.longitude.toFixed(4)}`
    : 'no-coordinates';
  const district = districtState.district?.trim() || null;
  const hasCoordinates = Boolean(locationState.coordinates);
  const usesApproximatePermission =
    locationState.permission === 'granted' &&
    locationState.permissionAccuracy === 'approximate';
  const shouldRunQuery =
    hasSearchQuery ||
    hasCoordinates ||
    !locationState.loading ||
    locationBootstrapTimedOut;

  useEffect(() => {
    if (hasCoordinates || !locationState.loading) {
      setLocationBootstrapTimedOut(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setLocationBootstrapTimedOut(true);
    }, ANIMAL_HOSPITAL_LOCATION_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [hasCoordinates, locationState.loading]);
  const scope = useMemo<AnimalHospitalSearchScope>(() => {
    const coordinates = locationState.coordinates;
    const locationIsApproximate =
      usesApproximatePermission || locationState.isWeakSignal;
    const locationIsStale = Boolean(coordinates) && locationState.isStale;
    const displayLabel = hasSearchQuery
      ? '전국 검색'
      : !coordinates
      ? '기본 검색'
      : district ?? '현재 위치';
    const distanceLabel = hasSearchQuery
      ? !coordinates
        ? '검색어 기준'
        : locationIsStale
          ? '거리는 최근 위치 기준'
          : locationIsApproximate
            ? '거리는 대략 위치 기준'
            : '거리는 현재 위치 기준'
      : !coordinates
      ? '기본 검색 기준'
      : locationIsStale
        ? '최근 위치 기준'
        : locationIsApproximate
          ? '대략 위치 기준'
          : '현재 위치 기준';

    return {
      displayLabel,
      queryLabel:
        districtState.city && district
          ? `${districtState.city} ${district}`.trim()
          : district,
      anchorCoordinates: coordinates,
      distanceLabel,
    };
  }, [
    district,
    districtState.city,
    hasSearchQuery,
    locationState.coordinates,
    locationState.isStale,
    locationState.isWeakSignal,
    usesApproximatePermission,
  ]);

  const query = useQuery({
    queryKey: [
      'animal-hospital-discovery',
      hasSearchQuery ? normalizedQuery : 'nearby',
      input.open24HoursOnly
        ? 'open24'
        : input.exoticAnimalCareOnly
          ? 'exotic'
          : 'nearby',
      coordinatesKey,
    ],
    queryFn: async () =>
      searchAnimalHospitals({
        query: hasSearchQuery ? normalizedQuery : null,
        scope,
        useNearbySearch: !hasSearchQuery,
        open24HoursOnly: Boolean(input.open24HoursOnly),
        exoticAnimalCareOnly: Boolean(input.exoticAnimalCareOnly),
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
        if (!hasSearchQuery && !isFreshLocationCoordinates(nextCoordinates)) {
          return;
        }
        await refetchAnimalHospitals();
      })().catch(() => {});

      return undefined;
    }, [
      hasSearchQuery,
      refetchAnimalHospitals,
      refreshLocation,
      shouldRefreshLocation,
    ]),
  );

  return {
    loading: query.isLoading && !query.data,
    refreshing: query.isRefetching && !hasSearchQuery,
    searching: query.isFetching && hasSearchQuery,
    items: query.data?.items ?? [],
    error:
      (query.error instanceof Error ? query.error.message : null) ??
      (!hasSearchQuery ? locationState.error : null),
    permission: locationState.permission,
    permissionAccuracy: locationState.permissionAccuracy,
    coordinates: locationState.coordinates,
    district,
    normalizedDistrict: districtState.normalizedDistrict?.trim() || district,
    city: districtState.city,
    hasFreshLocation: locationState.isFresh,
    usingStaleLocation: locationState.isStale,
    hasPreciseLocation: locationState.isPrecise,
    hasWeakLocationSignal: locationState.isWeakSignal,
    scope: query.data?.scope ?? scope,
    refresh: async () => {
      const nextCoordinates = await refreshLocation();

      if (!hasSearchQuery && !isFreshLocationCoordinates(nextCoordinates)) {
        return;
      }

      await refetchAnimalHospitals();
    },
    requestPreciseRefresh: async () => {
      const result = await locationState.requestPreciseRefresh();

      if (result.coordinates) {
        await refetchAnimalHospitals();
      }

      return result.grantedPrecise;
    },
  };
}

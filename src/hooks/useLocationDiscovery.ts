import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCurrentLocation } from './useCurrentLocation';
import { useDistrict } from './useDistrict';
import { searchLocationDiscovery } from '../services/locationDiscovery/service';
import type {
  LocationDiscoveryDomain,
  LocationDiscoveryItem,
  LocationDiscoverySearchScope,
} from '../services/locationDiscovery/types';

export type LocationDiscoveryState = {
  loading: boolean;
  refreshing: boolean;
  searching: boolean;
  items: LocationDiscoveryItem[];
  error: string | null;
  verificationStatus: 'verified' | 'unverified';
  permission: ReturnType<typeof useCurrentLocation>['permission'];
  coordinates: ReturnType<typeof useCurrentLocation>['coordinates'];
  district: string | null;
  normalizedDistrict: string | null;
  city: string | null;
  scope: LocationDiscoverySearchScope;
  refresh: () => Promise<void>;
};

export function useLocationDiscovery(input: {
  domain: LocationDiscoveryDomain;
  query: string;
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
  const hasSearchQuery = normalizedQuery.length >= 2;
  const coordinatesKey = locationState.coordinates
    ? `${locationState.coordinates.latitude.toFixed(3)}:${locationState.coordinates.longitude.toFixed(3)}`
    : 'no-coordinates';
  const district = districtState.district?.trim() || null;
  const normalizedDistrict = districtState.normalizedDistrict?.trim() || district;
  const scope = useMemo<LocationDiscoverySearchScope>(
    () => ({
      displayLabel: district ?? '현재 위치',
      queryLabel:
        districtState.city && district
          ? `${districtState.city} ${district}`.trim()
          : district,
      anchorCoordinates: locationState.coordinates,
      distanceLabel: '현재 위치 기준',
    }),
    [district, districtState.city, locationState.coordinates],
  );

  const query = useQuery({
    queryKey: [
      'location-discovery',
      input.domain,
      hasSearchQuery ? normalizedQuery : 'nearby',
      coordinatesKey,
    ],
    queryFn: async () =>
      searchLocationDiscovery(input.domain, {
        query: hasSearchQuery ? normalizedQuery : null,
        scope,
        useNearbySearch: !hasSearchQuery,
      }),
    enabled: hasSearchQuery || Boolean(locationState.coordinates),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: previous => previous,
  });

  return {
    loading:
      (locationState.loading && !locationState.coordinates && !hasSearchQuery) ||
      query.isLoading,
    refreshing: query.isRefetching && !hasSearchQuery,
    searching: query.isFetching && hasSearchQuery,
    items: query.data?.items ?? [],
    error:
      (query.error instanceof Error ? query.error.message : null) ??
      (!hasSearchQuery ? locationState.error : null),
    verificationStatus: query.data?.verificationStatus ?? 'unverified',
    permission: locationState.permission,
    coordinates: locationState.coordinates,
    district,
    normalizedDistrict,
    city: districtState.city,
    scope: query.data?.scope ?? scope,
    refresh: async () => {
      if (!hasSearchQuery) {
        await locationState.refresh();
      }
      await query.refetch();
    },
  };
}

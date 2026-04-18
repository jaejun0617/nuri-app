import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  resolveLocationDiscoveryThumbnail,
  type LocationDiscoveryThumbnailInput,
} from '../services/locationDiscovery/thumbnail';
import type { LocationDiscoveryItem } from '../services/locationDiscovery/types';

const LOCATION_DISCOVERY_THUMBNAIL_STALE_MS = 30 * 60 * 1000;
const LOCATION_DISCOVERY_THUMBNAIL_GC_MS = 6 * 60 * 60 * 1000;

export function buildLocationDiscoveryThumbnailQueryKey(
  item: Pick<
    LocationDiscoveryThumbnailInput,
    'id' | 'domain' | 'name' | 'address' | 'latitude' | 'longitude'
  >,
) {
  return [
    'location-discovery-thumbnail',
    item.domain,
    item.id,
    item.name,
    item.address,
    item.latitude.toFixed(4),
    item.longitude.toFixed(4),
  ] as const;
}

export function useLocationDiscoveryThumbnail(item: LocationDiscoveryItem) {
  return useQuery({
    queryKey: buildLocationDiscoveryThumbnailQueryKey(item),
    queryFn: async () => resolveLocationDiscoveryThumbnail(item),
    staleTime: LOCATION_DISCOVERY_THUMBNAIL_STALE_MS,
    gcTime: LOCATION_DISCOVERY_THUMBNAIL_GC_MS,
    enabled: item.domain === 'walk',
    placeholderData: previous => previous,
  });
}

export function usePrefetchLocationDiscoveryThumbnails(
  items: ReadonlyArray<LocationDiscoveryItem>,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const targets = items.slice(0, 6);
    targets.forEach(item => {
      queryClient
        .prefetchQuery({
          queryKey: buildLocationDiscoveryThumbnailQueryKey(item),
          queryFn: async () => resolveLocationDiscoveryThumbnail(item),
          staleTime: LOCATION_DISCOVERY_THUMBNAIL_STALE_MS,
          gcTime: LOCATION_DISCOVERY_THUMBNAIL_GC_MS,
        })
        .catch(() => {});
    });
  }, [items, queryClient]);
}

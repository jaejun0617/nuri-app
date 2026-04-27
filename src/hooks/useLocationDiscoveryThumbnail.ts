import { usePlaceEnrichment, usePrefetchPlaceEnrichment } from './usePlaceEnrichment';
import type { LocationDiscoveryItem } from '../services/locationDiscovery/types';
import {
  buildLocationDiscoveryPlaceEnrichmentTarget,
  buildPlaceEnrichmentQueryKey,
} from '../services/placeEnrichment/service';

export function buildLocationDiscoveryThumbnailQueryKey(
  item: Pick<LocationDiscoveryItem, 'id' | 'domain'>,
) {
  return buildPlaceEnrichmentQueryKey({
    domain: 'walk',
    placeId: item.id,
    requestedFields: ['thumbnail'],
  });
}

export function useLocationDiscoveryThumbnail(item: LocationDiscoveryItem) {
  const target = buildLocationDiscoveryPlaceEnrichmentTarget(item);
  const enrichmentQuery = usePlaceEnrichment(target, {
    enabled: item.domain === 'walk',
  });

  return {
    ...enrichmentQuery,
    data: enrichmentQuery.data?.thumbnailUrl ?? item.thumbnailUrl,
    photoAttributionLabel: enrichmentQuery.data?.photoAttributionLabel ?? null,
  };
}

export function usePrefetchLocationDiscoveryThumbnails(
  items: ReadonlyArray<LocationDiscoveryItem>,
) {
  usePrefetchPlaceEnrichment(
    items.slice(0, 6).map(buildLocationDiscoveryPlaceEnrichmentTarget),
  );
}

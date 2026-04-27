import { useMemo } from 'react';

import type { AnimalHospitalPublicHospital } from '../domains/animalHospital/types';
import {
  buildAnimalHospitalPlaceEnrichmentTarget,
  mergeAnimalHospitalPlaceEnrichment,
} from '../services/placeEnrichment/service';
import { usePlaceEnrichment, usePrefetchPlaceEnrichment } from './usePlaceEnrichment';

export function useAnimalHospitalEnrichedItem(
  item: AnimalHospitalPublicHospital | null,
  options?: {
    includeDetails?: boolean;
  },
) {
  const target = item
    ? buildAnimalHospitalPlaceEnrichmentTarget(item, {
        includeDetails: Boolean(options?.includeDetails),
      })
    : null;
  const enrichmentQuery = usePlaceEnrichment(target);

  const enrichedItem = useMemo(
    () =>
      item ? mergeAnimalHospitalPlaceEnrichment(item, enrichmentQuery.data) : null,
    [enrichmentQuery.data, item],
  );

  return {
    ...enrichmentQuery,
    data: enrichedItem,
    overlay: enrichmentQuery.data,
  };
}

export function useAnimalHospitalThumbnail(
  item: AnimalHospitalPublicHospital | null,
) {
  const enrichedItemQuery = useAnimalHospitalEnrichedItem(item);

  return {
    ...enrichedItemQuery,
    data: enrichedItemQuery.data?.thumbnailUrl ?? item?.thumbnailUrl ?? null,
  };
}

export function usePrefetchAnimalHospitalThumbnails(
  items: ReadonlyArray<AnimalHospitalPublicHospital>,
) {
  usePrefetchPlaceEnrichment(
    items.slice(0, 6).map(item => buildAnimalHospitalPlaceEnrichmentTarget(item)),
  );
}

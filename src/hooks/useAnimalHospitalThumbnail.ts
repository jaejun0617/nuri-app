import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { AnimalHospitalPublicHospital } from '../domains/animalHospital/types';
import {
  buildLocationDiscoveryThumbnailQueryKey,
} from './useLocationDiscoveryThumbnail';
import {
  resolveLocationDiscoveryThumbnail,
  type LocationDiscoveryThumbnailInput,
} from '../services/locationDiscovery/thumbnail';

const ANIMAL_HOSPITAL_THUMBNAIL_STALE_MS = 30 * 60 * 1000;
const ANIMAL_HOSPITAL_THUMBNAIL_GC_MS = 6 * 60 * 60 * 1000;

function toAnimalHospitalThumbnailInput(
  item: AnimalHospitalPublicHospital,
): LocationDiscoveryThumbnailInput | null {
  if (item.latitude === null || item.longitude === null) {
    return null;
  }

  return {
    id: item.id,
    domain: 'animalHospital',
    name: item.name,
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    thumbnailUrl: null,
  };
}

export function useAnimalHospitalThumbnail(item: AnimalHospitalPublicHospital) {
  const thumbnailInput = toAnimalHospitalThumbnailInput(item);

  return useQuery({
    queryKey: thumbnailInput
      ? buildLocationDiscoveryThumbnailQueryKey(thumbnailInput)
      : ['animal-hospital-thumbnail', item.id, 'no-coordinate'],
    queryFn: async () =>
      thumbnailInput
        ? resolveLocationDiscoveryThumbnail(thumbnailInput)
        : null,
    staleTime: ANIMAL_HOSPITAL_THUMBNAIL_STALE_MS,
    gcTime: ANIMAL_HOSPITAL_THUMBNAIL_GC_MS,
    enabled: Boolean(thumbnailInput),
    placeholderData: previous => previous,
  });
}

export function usePrefetchAnimalHospitalThumbnails(
  items: ReadonlyArray<AnimalHospitalPublicHospital>,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    items.slice(0, 6).forEach(item => {
      const thumbnailInput = toAnimalHospitalThumbnailInput(item);
      if (!thumbnailInput) {
        return;
      }

      queryClient
        .prefetchQuery({
          queryKey: buildLocationDiscoveryThumbnailQueryKey(thumbnailInput),
          queryFn: async () => resolveLocationDiscoveryThumbnail(thumbnailInput),
          staleTime: ANIMAL_HOSPITAL_THUMBNAIL_STALE_MS,
          gcTime: ANIMAL_HOSPITAL_THUMBNAIL_GC_MS,
        })
        .catch(() => {});
    });
  }, [items, queryClient]);
}

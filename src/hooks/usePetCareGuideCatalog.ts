import { useQuery } from '@tanstack/react-query';

import {
  fetchPetCareGuideCatalogResult,
  type PetCareGuideCatalogResult,
} from '../services/guides/service';
import type { GuideDataSource, PetCareGuide } from '../services/guides/types';

const GUIDE_CATALOG_QUERY_KEY = ['pet-care-guides', 'catalog'] as const;
const EMPTY_GUIDES: PetCareGuide[] = [];

type UsePetCareGuideCatalogState = {
  guides: PetCareGuide[];
  source: GuideDataSource;
  sourceReason: PetCareGuideCatalogResult['reason'];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type UsePetCareGuideCatalogOptions = {
  enabled?: boolean;
};

export function usePetCareGuideCatalog(
  options: UsePetCareGuideCatalogOptions = {},
): UsePetCareGuideCatalogState {
  const enabled = options.enabled ?? true;
  const query = useQuery({
    queryKey: GUIDE_CATALOG_QUERY_KEY,
    queryFn: fetchPetCareGuideCatalogResult,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    guides: query.data?.guides ?? EMPTY_GUIDES,
    source: query.data?.source ?? 'remote-empty',
    sourceReason: query.data?.reason ?? 'empty-success',
    loading: enabled && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}

import { useQuery } from '@tanstack/react-query';

import { fetchPetCareGuideCatalog } from '../services/guides/service';
import type { PetCareGuide } from '../services/guides/types';

const GUIDE_CATALOG_QUERY_KEY = ['pet-care-guides', 'catalog'] as const;
const EMPTY_GUIDES: PetCareGuide[] = [];

type UsePetCareGuideCatalogState = {
  guides: PetCareGuide[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function usePetCareGuideCatalog(): UsePetCareGuideCatalogState {
  const query = useQuery({
    queryKey: GUIDE_CATALOG_QUERY_KEY,
    queryFn: fetchPetCareGuideCatalog,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    guides: query.data ?? EMPTY_GUIDES,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}

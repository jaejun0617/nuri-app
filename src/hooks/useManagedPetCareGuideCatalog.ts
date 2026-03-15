import { useQuery } from '@tanstack/react-query';

import { fetchManagedPetCareGuideCatalogForAdmin } from '../services/guides/service';
import type { PetCareGuide } from '../services/guides/types';

export const MANAGED_GUIDE_CATALOG_QUERY_KEY = [
  'pet-care-guides',
  'admin-catalog',
] as const;

type UseManagedPetCareGuideCatalogState = {
  guides: PetCareGuide[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useManagedPetCareGuideCatalog(): UseManagedPetCareGuideCatalogState {
  const query = useQuery({
    queryKey: MANAGED_GUIDE_CATALOG_QUERY_KEY,
    queryFn: fetchManagedPetCareGuideCatalogForAdmin,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    guides: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}

import { useQuery } from '@tanstack/react-query';

import { getManagedPetCareGuideById } from '../services/guides/service';
import type { PetCareGuide } from '../services/guides/types';

type UseManagedPetCareGuideDetailState = {
  guide: PetCareGuide | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useManagedPetCareGuideDetail(
  guideId: string | null | undefined,
): UseManagedPetCareGuideDetailState {
  const normalizedGuideId = guideId?.trim() ?? '';
  const query = useQuery({
    queryKey: ['pet-care-guides', 'admin-detail', normalizedGuideId],
    queryFn: async () => getManagedPetCareGuideById(normalizedGuideId),
    enabled: normalizedGuideId.length > 0,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    guide: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}

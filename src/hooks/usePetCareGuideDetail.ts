import { useQuery } from '@tanstack/react-query';

import { getPetCareGuideById } from '../services/guides/service';
import type { PetCareGuide } from '../services/guides/types';

type UsePetCareGuideDetailState = {
  guide: PetCareGuide | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function usePetCareGuideDetail(
  guideId: string,
): UsePetCareGuideDetailState {
  const normalizedGuideId = guideId.trim();
  const query = useQuery({
    queryKey: ['pet-care-guides', 'detail', normalizedGuideId],
    queryFn: async () => getPetCareGuideById(normalizedGuideId),
    enabled: normalizedGuideId.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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


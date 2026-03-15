import { useQuery } from '@tanstack/react-query';

import { GUIDE_POPULAR_SEARCH_LIMIT } from '../services/guides/config';
import { fetchPopularPetCareGuideSearches } from '../services/guides/service';
import type { GuideSearchKeyword, PetCareGuide, PetGuideSpecies } from '../services/guides/types';

const EMPTY_KEYWORDS: GuideSearchKeyword[] = [];

export function useGuidePopularSearches(input: {
  species: Exclude<PetGuideSpecies, 'common'> | null;
  fallbackCatalog: ReadonlyArray<PetCareGuide>;
  catalogSignature: string;
  enabled?: boolean;
  limit?: number;
}) {
  const limit = input.limit ?? GUIDE_POPULAR_SEARCH_LIMIT;
  const query = useQuery({
    queryKey: [
      'pet-care-guides',
      'popular-searches',
      input.species,
      limit,
      input.catalogSignature,
    ],
    queryFn: () =>
      fetchPopularPetCareGuideSearches(
        {
          species: input.species,
          limit,
        },
        { fallbackCatalog: input.fallbackCatalog },
      ),
    enabled: input.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    keywords: query.data ?? EMPTY_KEYWORDS,
    loading: query.isLoading || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

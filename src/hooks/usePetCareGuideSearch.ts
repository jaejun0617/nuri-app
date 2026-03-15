import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { GUIDE_SEARCH_RESULT_LIMIT } from '../services/guides/config';
import { filterPetCareGuidesBySearch, searchPublishedPetCareGuides } from '../services/guides/service';
import type {
  GuideSearchResponse,
  PetCareGuide,
  PetGuideSpecies,
} from '../services/guides/types';

const EMPTY_GUIDES: PetCareGuide[] = [];

export function usePetCareGuideSearch(input: {
  query: string;
  species: Exclude<PetGuideSpecies, 'common'> | null;
  ageInMonths: number | null;
  fallbackCatalog: ReadonlyArray<PetCareGuide>;
  catalogSignature: string;
  enabled?: boolean;
  limit?: number;
}) {
  const normalizedQuery = input.query.trim();
  const limit = input.limit ?? GUIDE_SEARCH_RESULT_LIMIT;
  const fallbackResponse = useMemo<GuideSearchResponse>(
    () => ({
      guides: normalizedQuery
        ? filterPetCareGuidesBySearch(input.fallbackCatalog, normalizedQuery)
        : [...input.fallbackCatalog],
      source: 'fallback',
    }),
    [input.fallbackCatalog, normalizedQuery],
  );

  const query = useQuery({
    queryKey: [
      'pet-care-guides',
      'search',
      normalizedQuery,
      input.species,
      input.ageInMonths,
      limit,
      input.catalogSignature,
    ],
    queryFn: () =>
      searchPublishedPetCareGuides(
        {
          query: normalizedQuery,
          species: input.species,
          ageInMonths: input.ageInMonths,
          limit,
        },
        { fallbackCatalog: input.fallbackCatalog },
      ),
    enabled: (input.enabled ?? true) && normalizedQuery.length > 0,
    placeholderData: fallbackResponse,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (!normalizedQuery) {
    return {
      guides: EMPTY_GUIDES,
      loading: false,
      error: null,
      source: 'fallback' as const,
    };
  }

  return {
    guides: query.data?.guides ?? fallbackResponse.guides,
    loading: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    source: query.data?.source ?? fallbackResponse.source,
  };
}

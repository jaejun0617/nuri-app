import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearRecentGuideSearches,
  loadRecentGuideSearches,
  removeRecentGuideSearch,
  saveRecentGuideSearch,
  type RecentGuideSearchEntry,
} from '../services/local/guideSearch';

const RECENT_GUIDE_SEARCHES_QUERY_KEY = [
  'pet-care-guides',
  'recent-searches',
] as const;
const EMPTY_RECENT_SEARCHES: RecentGuideSearchEntry[] = [];

export function useRecentPetCareGuideSearches() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: RECENT_GUIDE_SEARCHES_QUERY_KEY,
    queryFn: loadRecentGuideSearches,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const save = useCallback(
    async (value: string) => {
      const next = await saveRecentGuideSearch(value);
      queryClient.setQueryData(RECENT_GUIDE_SEARCHES_QUERY_KEY, next);
      return next;
    },
    [queryClient],
  );

  const remove = useCallback(
    async (value: string) => {
      const next = await removeRecentGuideSearch(value);
      queryClient.setQueryData(RECENT_GUIDE_SEARCHES_QUERY_KEY, next);
      return next;
    },
    [queryClient],
  );

  const clear = useCallback(async () => {
    await clearRecentGuideSearches();
    queryClient.setQueryData(RECENT_GUIDE_SEARCHES_QUERY_KEY, []);
  }, [queryClient]);

  return {
    searches: query.data ?? EMPTY_RECENT_SEARCHES,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    save,
    remove,
    clear,
  };
}

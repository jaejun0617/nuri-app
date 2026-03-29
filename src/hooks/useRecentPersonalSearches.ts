import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearRecentPersonalSearches,
  loadRecentPersonalSearches,
  removeRecentPersonalSearch,
  saveRecentPersonalSearch,
  type PersonalSearchNamespace,
  type RecentPersonalSearchEntry,
} from '../services/local/placeTravelSearch';

const EMPTY_RECENT_SEARCHES: RecentPersonalSearchEntry[] = [];

export function useRecentPersonalSearches(namespace: PersonalSearchNamespace) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['personal-searches', namespace] as const,
    [namespace],
  );
  const query = useQuery({
    queryKey,
    queryFn: () => loadRecentPersonalSearches(namespace),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const save = useCallback(
    async (value: string) => {
      const next = await saveRecentPersonalSearch(namespace, value);
      queryClient.setQueryData(queryKey, next);
      return next;
    },
    [namespace, queryClient, queryKey],
  );

  const remove = useCallback(
    async (value: string) => {
      const next = await removeRecentPersonalSearch(namespace, value);
      queryClient.setQueryData(queryKey, next);
      return next;
    },
    [namespace, queryClient, queryKey],
  );

  const clear = useCallback(async () => {
    await clearRecentPersonalSearches(namespace);
    queryClient.setQueryData(queryKey, []);
  }, [namespace, queryClient, queryKey]);

  return {
    searches: query.data ?? EMPTY_RECENT_SEARCHES,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    save,
    remove,
    clear,
  };
}

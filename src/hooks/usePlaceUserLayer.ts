import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  loadCurrentPetPlaceUserLayerRecords,
  setPetPlaceBookmark,
  upsertPetPlaceUserReport,
  type PetPlaceOwnReportStatus,
  type PetPlaceUserLayerRecord,
} from '../services/supabase/placeTravelUserLayer';
import { useAuthStore } from '../store/authStore';

const EMPTY_RECORDS = new Map<string, PetPlaceUserLayerRecord>();

export function usePlaceUserLayer(options?: { enabled?: boolean }) {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && Boolean(userId);
  const queryKey = useMemo(
    () => ['user-layer', 'pet-place', userId ?? 'guest'] as const,
    [userId],
  );
  const query = useQuery({
    queryKey,
    queryFn: loadCurrentPetPlaceUserLayerRecords,
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      queryClient.setQueryData(queryKey, new Map());
      return new Map<string, PetPlaceUserLayerRecord>();
    }

    const next = await loadCurrentPetPlaceUserLayerRecords();
    queryClient.setQueryData(queryKey, next);
    return next;
  }, [enabled, queryClient, queryKey]);

  const toggleBookmark = useCallback(
    async (targetId: string, shouldBookmark: boolean) => {
      await setPetPlaceBookmark(targetId, shouldBookmark);
      await refresh();
    },
    [refresh],
  );

  const submitReport = useCallback(
    async (targetId: string, reportStatus: PetPlaceOwnReportStatus) => {
      await upsertPetPlaceUserReport({
        targetId,
        reportStatus,
      });
      await refresh();
    },
    [refresh],
  );

  return {
    isLoggedIn: Boolean(userId),
    records: enabled ? query.data ?? EMPTY_RECORDS : EMPTY_RECORDS,
    loading: enabled ? query.isLoading : false,
    error: query.error instanceof Error ? query.error.message : null,
    toggleBookmark,
    submitReport,
    refresh,
  };
}

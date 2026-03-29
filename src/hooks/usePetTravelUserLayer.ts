import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  loadCurrentPetTravelUserLayerRecords,
  upsertPetTravelUserReport,
  type PetTravelUserLayerRecord,
} from '../services/supabase/placeTravelUserLayer';
import type { PetTravelUserReportType } from '../services/petTravel/types';
import { useAuthStore } from '../store/authStore';

const EMPTY_RECORDS = new Map<string, PetTravelUserLayerRecord>();

export function usePetTravelUserLayer(options?: { enabled?: boolean }) {
  const userId = useAuthStore(s => s.session?.user.id ?? null);
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && Boolean(userId);
  const queryKey = useMemo(
    () => ['user-layer', 'pet-travel', userId ?? 'guest'] as const,
    [userId],
  );
  const query = useQuery({
    queryKey,
    queryFn: loadCurrentPetTravelUserLayerRecords,
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      queryClient.setQueryData(queryKey, new Map());
      return new Map<string, PetTravelUserLayerRecord>();
    }

    const next = await loadCurrentPetTravelUserLayerRecords();
    queryClient.setQueryData(queryKey, next);
    return next;
  }, [enabled, queryClient, queryKey]);

  const submitReport = useCallback(
    async (targetId: string, reportType: PetTravelUserReportType) => {
      await upsertPetTravelUserReport({
        targetId,
        reportType,
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
    submitReport,
    refresh,
  };
}

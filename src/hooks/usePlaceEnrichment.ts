import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildPlaceEnrichmentQueryKey,
  demandPlaceEnrichment,
  type PlaceEnrichmentResult,
  type PlaceEnrichmentTarget,
} from '../services/placeEnrichment/service';

const PLACE_ENRICHMENT_STALE_MS = 5 * 60 * 1000;
const PLACE_ENRICHMENT_GC_MS = 6 * 60 * 60 * 1000;
const PLACE_ENRICHMENT_COOLDOWN_MS = 30 * 1000;
const PLACE_ENRICHMENT_PREFETCH_DEBOUNCE_MS = 800;

const recentPrefetchAt = new Map<string, number>();

function shouldPrefetchTarget(target: PlaceEnrichmentTarget) {
  if (target.requestedFields.length === 0) {
    return false;
  }

  const queryKey = buildPlaceEnrichmentQueryKey(target).join(':');
  const lastRequestedAt = recentPrefetchAt.get(queryKey) ?? 0;
  return Date.now() - lastRequestedAt >= PLACE_ENRICHMENT_COOLDOWN_MS;
}

function markTargetPrefetched(target: PlaceEnrichmentTarget) {
  recentPrefetchAt.set(
    buildPlaceEnrichmentQueryKey(target).join(':'),
    Date.now(),
  );
}

async function demandSingleTarget(target: PlaceEnrichmentTarget) {
  const [result] = await demandPlaceEnrichment([target]);
  return result ?? null;
}

export function usePlaceEnrichment(
  target: PlaceEnrichmentTarget | null,
  options?: {
    enabled?: boolean;
  },
) {
  const enabled =
    Boolean(target) &&
    Boolean(options?.enabled ?? true) &&
    Boolean(target?.requestedFields.length);

  return useQuery({
    queryKey: target
      ? buildPlaceEnrichmentQueryKey(target)
      : ['place-enrichment', 'empty', 'empty'],
    queryFn: async () => (target ? demandSingleTarget(target) : null),
    staleTime: PLACE_ENRICHMENT_STALE_MS,
    gcTime: PLACE_ENRICHMENT_GC_MS,
    enabled,
    retry: false,
    placeholderData: previous => previous,
  });
}

export function usePrefetchPlaceEnrichment(
  targets: ReadonlyArray<PlaceEnrichmentTarget>,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const nextTargets = targets
      .slice(0, 6)
      .filter(shouldPrefetchTarget);

    if (nextTargets.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      nextTargets.forEach(markTargetPrefetched);

      demandPlaceEnrichment(nextTargets)
        .then(results => {
          const byKey = new Map<string, PlaceEnrichmentResult>();
          results.forEach(result => {
            byKey.set(`${result.domain}:${result.placeId}`, result);
          });

          nextTargets.forEach(target => {
            const result =
              byKey.get(`${target.domain}:${target.placeId}`) ?? null;
            queryClient.setQueryData(
              buildPlaceEnrichmentQueryKey(target),
              result,
            );
          });
        })
        .catch(() => {});
    }, PLACE_ENRICHMENT_PREFETCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [queryClient, targets]);
}

import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { appQueryClient } from '../services/query/appQueryClient';
import { fetchMemoriesByPetPage, type MemoryRecord } from '../services/supabase/memories';
import { compareTimelineRecords, dedupeTimelineRecords } from '../services/timeline/query';
import { NOTIFICATION_LOOKUP_TIMEOUT_MS } from '../services/notifications/openNotification';
import { withTimeout } from '../services/app/boot';
import { useAuthStore } from '../store/authStore';

type Cursor = Record<string, string> | null;
type Page = { items: MemoryRecord[]; next: Cursor | undefined };

/** Owner-wide summaries must not silently become the currently selected pet.
 * Reuse the existing cursor reader, with an owner/pet/period-specific cache. */
export function useNotificationTimeline(input: {
  enabled: boolean;
  ownerId: string | null;
  petIds: string[];
  period?: { startDate: string; endDate: string };
  isFocused?: boolean;
}) {
  const petKey = [...new Set(input.petIds)].sort().join(',');
  const ownerId = input.ownerId;
  const period = input.period;
  const query = useInfiniteQuery({
    queryKey: ['notifications-v3', ownerId, 'timeline-records', petKey, period?.startDate ?? null, period?.endDate ?? null],
    enabled: input.enabled && Boolean(ownerId),
    initialPageParam: null as Cursor,
    retry: false,
    queryFn: async ({ pageParam }): Promise<Page> => {
      if (!ownerId || useAuthStore.getState().session?.user.id !== ownerId) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      const ids = petKey ? petKey.split(',') : [];
      const pages = await withTimeout(Promise.all(ids.filter(id => pageParam === null || id in pageParam).map(async petId => ({
        petId,
        page: await fetchMemoriesByPetPage({ petId, cursor: pageParam?.[petId] ?? null, prefetchTop: 0, recap: { ownerId, period } }),
      }))), NOTIFICATION_LOOKUP_TIMEOUT_MS, 'notification timeline');
      if (useAuthStore.getState().session?.user.id !== ownerId) throw new Error('NURI_NOTIFICATION_ACCOUNT_CHANGED');
      const next: Record<string, string> = {};
      for (const { petId, page } of pages) if (page.hasMore && page.nextCursor) next[petId] = page.nextCursor;
      return { items: pages.flatMap(result => result.page.items), next: Object.keys(next).length ? next : undefined };
    },
    getNextPageParam: last => last.next,
  }, appQueryClient);
  const wasFocused = useRef(input.isFocused ?? true);
  const refetch = query.refetch;
  useEffect(() => {
    const focused = input.isFocused ?? true;
    if (input.enabled && focused && !wasFocused.current) refetch().catch(() => {});
    wasFocused.current = focused;
  }, [input.enabled, input.isFocused, refetch]);
  const items = useMemo(() => dedupeTimelineRecords(query.data?.pages.flatMap(page => page.items) ?? []).sort(compareTimelineRecords), [query.data]);
  const recordsById = useMemo(() => Object.fromEntries(items.map(item => [item.id, item])), [items]);
  const ids = useMemo(() => items.map(item => item.id), [items]);
  if (!input.enabled) return null;
  return {
    items, recordsById, ids, hasMore: query.hasNextPage,
    status: query.isError ? 'error' as const : query.isPending ? 'loading' as const : query.isFetchingNextPage ? 'loadingMore' as const : query.isRefetching ? 'refreshing' as const : 'ready' as const,
    refresh: async () => { await query.refetch(); },
    loadMore: async () => { if (query.hasNextPage && !query.isFetchingNextPage) await query.fetchNextPage(); },
  };
}

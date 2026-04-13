import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  buildHealthActivityItems,
  buildWeightSummary,
  buildWeightTimelineItems,
  groupHealthActivitiesByYmd,
} from '../services/health-report/viewModel';
import {
  buildHealthReportDateItems,
  buildHealthReportMonthBounds,
  normalizeHealthReportMonthKey,
} from '../services/health-report/month';
import { fetchMemoriesByPetDateRange } from '../services/supabase/memories';
import { fetchPetWeightLogsForMonth } from '../services/supabase/petWeightLogs';
import { fetchSchedulesByPetRange } from '../services/supabase/schedules';

export function useHealthReportMonth(input: {
  petId: string | null;
  monthKey: string;
  fallbackLatestWeightKg?: number | null;
}) {
  const normalizedMonthKey = useMemo(
    () => normalizeHealthReportMonthKey(input.monthKey),
    [input.monthKey],
  );

  const query = useQuery({
    queryKey: ['health-report', 'month', input.petId, normalizedMonthKey],
    enabled: Boolean(input.petId),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!input.petId) {
        throw new Error('건강 리포트를 불러올 아이를 찾지 못했어요.');
      }

      const bounds = buildHealthReportMonthBounds(normalizedMonthKey);
      const [records, schedules, weightResult] = await Promise.all([
        fetchMemoriesByPetDateRange({
          petId: input.petId,
          startYmd: bounds.startYmd,
          endExclusiveYmd: bounds.endExclusiveYmd,
          createdAtStartIso: bounds.startIso,
          createdAtEndExclusiveIso: bounds.endExclusiveIso,
        }),
        fetchSchedulesByPetRange({
          petId: input.petId,
          from: bounds.startIso,
          to: bounds.endInclusiveIso,
        }),
        fetchPetWeightLogsForMonth({
          petId: input.petId,
          monthKey: normalizedMonthKey,
        }),
      ]);

      const activityItems = buildHealthActivityItems(records, schedules);
      const groupedActivities = groupHealthActivitiesByYmd(activityItems);
      const weightTimeline = buildWeightTimelineItems({
        logs: weightResult.logs,
        previousLog: weightResult.previousLog,
      });
      const weightSummary = buildWeightSummary({
        logs: weightResult.logs,
        previousLog: weightResult.previousLog,
        latestSnapshot: weightResult.latestSnapshot,
        fallbackLatestWeightKg: input.fallbackLatestWeightKg,
      });

      return {
        bounds,
        dateItems: buildHealthReportDateItems(normalizedMonthKey),
        activityItems,
        groupedActivities,
        latestActivityYmd: activityItems[0]?.ymd ?? null,
        weightLogs: weightResult.logs,
        previousWeightLog: weightResult.previousLog,
        latestWeightSnapshot: weightResult.latestSnapshot,
        weightTimeline,
        weightSummary,
      };
    },
  });

  return {
    monthKey: normalizedMonthKey,
    data: query.data,
    loading: query.isPending || query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}


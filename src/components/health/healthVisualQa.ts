import { useMemo } from 'react';
import { create } from 'zustand';
import type { useHealthReportMonth } from '../../hooks/useHealthReportMonth';
import {
  buildHealthReportDateItems,
  buildHealthReportMonthBounds,
  normalizeHealthReportMonthKey,
} from '../../services/health-report/month';
import {
  buildWeightSummary,
  buildWeightTimelineItems,
  groupHealthActivitiesByYmd,
  type HealthActivityItem,
} from '../../services/health-report/viewModel';
import type { PetWeightLog } from '../../services/supabase/petWeightLogs';
import { showToast } from '../../store/uiStore';
import { getKstYmd } from '../../utils/date';

type MonthData = NonNullable<ReturnType<typeof useHealthReportMonth>['data']>;

// Session-only display data. Never place samples in persisted stores/query caches.
export const useHealthVisualQaStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}>(set => ({
  enabled: false,
  setEnabled: enabled => set({ enabled: __DEV__ && enabled }),
}));

export function buildHealthVisualQaData(monthKey: string): MonthData {
  const bounds = buildHealthReportMonthBounds(monthKey);
  const today = getKstYmd();
  const anchorDay = today.startsWith(monthKey) ? Number(today.slice(8)) : 20;
  const day = (offset: number) =>
    `${monthKey}-${String(Math.max(1, anchorDay - offset)).padStart(2, '0')}`;
  const rows: Array<{
    title: string;
    subtitle: string;
    kind: HealthActivityItem['kind'];
    iconName: string;
  }> = [
    {
      title: '정기 검진',
      subtitle: '오후 2:00 · 30분 전 알림',
      kind: 'checkup',
      iconName: 'clipboard',
    },
    {
      title: '저녁 약 챙기기',
      subtitle: '오후 8:00 · 식사 후 복약',
      kind: 'medicine',
      iconName: 'droplet',
    },
    {
      title: '산책 후 컨디션 기록',
      subtitle: '평소처럼 잘 걷고 물도 충분히 마셨어요.',
      kind: 'health',
      iconName: 'heart',
    },
    {
      title: '예방접종 후 경과 확인',
      subtitle: '접종 부위와 식욕을 함께 살펴봤어요.',
      kind: 'vaccine',
      iconName: 'shield',
    },
    {
      title: '식사량과 활동량을 함께 확인한 오늘의 긴 건강 관찰 기록',
      subtitle:
        '긴 제목과 메모가 있는 행에서도 날짜와 버튼이 겹치지 않는지 확인하는 샘플이에요.',
      kind: 'symptom',
      iconName: 'activity',
    },
    {
      title: '진료 후 메모',
      subtitle: '다음 검진 때 확인할 내용을 정리했어요.',
      kind: 'hospital',
      iconName: 'plus-square',
    },
  ];
  const activityItems: HealthActivityItem[] = Array.from(
    { length: 18 },
    (_, index) => {
      const row = rows[index % rows.length];
      const schedule = index % 6 < 2;
      const id = `health-visual-qa:${monthKey}:activity:${index}`;
      const ymd = day(index < 6 ? 0 : Math.floor((index - 6) / 3) + 1);
      return {
        ...row,
        id,
        source: schedule ? 'schedule' : 'memory',
        ymd,
        ...(schedule
          ? {
              scheduleId: id,
              scheduleStartsAt: `${ymd}T14:00:00+09:00`,
              reminderMinutes: index % 2 ? [] : [30],
              completedAt: index === 1 ? `${ymd}T00:00:00Z` : null,
            }
          : { memoryId: id }),
      };
    },
  );
  const weightLogs: PetWeightLog[] = [
    5.2, 5.21, 5.18, 5.23, 5.26, 5.25, 5.28, 5.3,
  ].map((weightKg, index) => {
    const measuredOn = day(7 - index);
    return {
      id: `health-visual-qa:${monthKey}:weight:${index}`,
      petId: 'health-visual-qa-pet',
      userId: 'health-visual-qa-user',
      measuredOn,
      weightKg,
      note:
        index % 2
          ? '저녁 식사 전 측정'
          : '산책을 다녀와 잠시 쉬고 측정한 몸무게',
      source: 'health_report',
      createdAt: `${measuredOn}T00:00:00Z`,
      updatedAt: `${measuredOn}T00:00:00Z`,
    };
  });
  return {
    bounds,
    dateItems: buildHealthReportDateItems(monthKey),
    activityItems,
    groupedActivities: groupHealthActivitiesByYmd(activityItems),
    latestActivityYmd: activityItems[0].ymd,
    weightLogs,
    previousWeightLog: null,
    latestWeightSnapshot: null,
    weightTimeline: buildWeightTimelineItems({
      logs: weightLogs,
      previousLog: null,
    }),
    weightSummary: buildWeightSummary({
      logs: weightLogs,
      previousLog: null,
      latestSnapshot: null,
    }),
  };
}

export function useHealthVisualQa(monthKey = normalizeHealthReportMonthKey()) {
  const enabled = useHealthVisualQaStore(state => __DEV__ && state.enabled);
  const data = useMemo(
    () => (enabled ? buildHealthVisualQaData(monthKey) : null),
    [enabled, monthKey],
  );
  return { enabled, data };
}

export function blockHealthVisualQaMutation(itemId?: string): boolean {
  if (
    !itemId?.startsWith('health-visual-qa:') &&
    (!__DEV__ || !useHealthVisualQaStore.getState().enabled)
  )
    return false;
  showToast({
    tone: 'info',
    message: '디자인 확인용 샘플이에요. 실제 기록은 바뀌지 않아요.',
  });
  return true;
}

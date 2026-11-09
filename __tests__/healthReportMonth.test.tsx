import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useHealthReportMonth } from '../src/hooks/useHealthReportMonth';
import { fetchMemoriesByPetDateRange } from '../src/services/supabase/memories';
import { fetchPetWeightLogsForMonth } from '../src/services/supabase/petWeightLogs';
import { fetchSchedulesByPetRange } from '../src/services/supabase/schedules';

jest.mock('../src/services/supabase/memories', () => ({
  fetchMemoriesByPetDateRange: jest.fn(),
}));
jest.mock('../src/services/supabase/petWeightLogs', () => ({
  fetchPetWeightLogsForMonth: jest.fn(),
}));
jest.mock('../src/services/supabase/schedules', () => ({
  fetchSchedulesByPetRange: jest.fn(),
}));

const emptyWeights = { logs: [], previousLog: null, latestSnapshot: null };
const monthKey = '2026-11';
const petId = 'qa-pet';
const queryKey = ['health-report', 'month', petId, monthKey];
const flushUpdates = () => new Promise<void>(resolve => setTimeout(resolve, 0));

it('does not cache the old profile weight when the last weigh-in is deleted during a refetch', async () => {
  jest.mocked(fetchMemoriesByPetDateRange).mockResolvedValue([]);
  jest.mocked(fetchSchedulesByPetRange).mockResolvedValue([]);
  let finishRefetch: (value: typeof emptyWeights) => void = () => {
    throw new Error('Expected the weight refetch to start');
  };
  jest.mocked(fetchPetWeightLogsForMonth)
    .mockResolvedValueOnce({
      ...emptyWeights,
      latestSnapshot: {
        latestWeightKg: 7.42,
        latestMeasuredOn: '2026-11-09',
        latestLogId: 'qa-log',
      },
    })
    .mockImplementationOnce(() => new Promise(resolve => {
      finishRefetch = resolve;
    }));

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let root: TestRenderer.ReactTestRenderer | undefined;
  let current: ReturnType<typeof useHealthReportMonth> | undefined;
  function Probe({ profileWeight }: { profileWeight: number | null }) {
    current = useHealthReportMonth({
      petId,
      monthKey,
      fallbackLatestWeightKg: profileWeight,
    });
    return null;
  }
  const view = (profileWeight: number | null) => (
    <QueryClientProvider client={client}>
      <Probe profileWeight={profileWeight} />
    </QueryClientProvider>
  );

  try {
    await act(async () => { root = TestRenderer.create(view(7.42)); });
    await act(flushUpdates);
    expect(current?.data?.weightSummary.latestWeightKg).toBe(7.42);

    let refetch: Promise<void> | undefined;
    await act(async () => { refetch = client.invalidateQueries({ queryKey }); });
    expect(fetchPetWeightLogsForMonth).toHaveBeenCalledTimes(2);
    await act(async () => { root?.update(view(null)); });
    await act(async () => {
      finishRefetch(emptyWeights);
      await refetch;
      await flushUpdates();
    });

    expect(current?.loading).toBe(false);
    expect(current?.data?.weightSummary.latestWeightKg).toBeNull();
    expect(client.getQueryData<NonNullable<typeof current>['data']>(queryKey)
      ?.weightSummary.latestWeightKg).toBeNull();

    // A profile-only weight remains visible, without changing the cached result.
    await act(async () => { root?.update(view(5)); });
    expect(current?.data?.weightSummary.latestWeightKg).toBe(5);
    expect(client.getQueryData<NonNullable<typeof current>['data']>(queryKey)
      ?.weightSummary.latestWeightKg).toBeNull();
  } finally {
    await act(async () => { root?.unmount(); });
    client.clear();
  }
});

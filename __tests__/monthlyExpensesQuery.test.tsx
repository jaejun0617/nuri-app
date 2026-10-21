import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMonthlyExpenses } from '../src/hooks/useMonthlyExpenses';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { fetchMonthlyExpenses, invalidateMonthlyExpenses, MONTHLY_EXPENSE_QUERY_KEY, summarizeExpenses, type MonthlyExpenseSummary } from '../src/services/records/expenses';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: (select: (state: { session: { user: { id: string } } }) => unknown) => select({ session: { user: { id: 'qa-user' } } }) }));
jest.mock('../src/services/records/expenses', () => ({ ...jest.requireActual('../src/services/records/expenses'), fetchMonthlyExpenses: jest.fn() }));

describe('monthly expense request boundaries', () => {
  let tree: TestRenderer.ReactTestRenderer;
  let observed: ReturnType<typeof useMonthlyExpenses>;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Probe({ month, enabled = true }: { month: string; enabled?: boolean }) { observed = useMonthlyExpenses(month, enabled); return null; }
  const view = (month: string, enabled = true) => <QueryClientProvider client={client}><Probe month={month} enabled={enabled} /></QueryClientProvider>;
  const pending = new Map<string, { resolve: (value: MonthlyExpenseSummary) => void; signal?: AbortSignal }>();
  beforeEach(() => {
    jest.clearAllMocks(); pending.clear();
    jest.mocked(fetchMonthlyExpenses).mockImplementation((_user, month, signal) => new Promise(resolve => { pending.set(month, { resolve, signal }); }));
  });
  afterEach(async () => { await act(async () => tree?.unmount()); client.clear(); appQueryClient.clear(); });
  it('cancels a departing month and never shows its late data under a new month', async () => {
    await act(async () => { tree = TestRenderer.create(view('2026-10')); });
    expect(fetchMonthlyExpenses).toHaveBeenCalledWith('qa-user', '2026-10', expect.any(AbortSignal));
    await act(async () => tree.update(view('2026-09')));
    expect(pending.get('2026-10')?.signal?.aborted).toBe(true);
    expect(observed!.data).toBeUndefined();
    await act(async () => { pending.get('2026-09')?.resolve(summarizeExpenses([])); await new Promise(resolve => setTimeout(resolve, 0)); });
    await act(async () => { pending.get('2026-10')?.resolve({ ...summarizeExpenses([]), total: 999 }); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(observed!.data?.total).toBe(0);
  });
  it('performs no source query for the design-only preview', async () => {
    await act(async () => { tree = TestRenderer.create(view('2026-10', false)); });
    expect(fetchMonthlyExpenses).not.toHaveBeenCalled();
  });
  it('invalidates old and new month caches, including the same key used by More', async () => {
    const oldKey = [...MONTHLY_EXPENSE_QUERY_KEY, 'qa-user', '2026-09'];
    const newKey = [...MONTHLY_EXPENSE_QUERY_KEY, 'qa-user', '2026-10'];
    appQueryClient.setQueryData(oldKey, summarizeExpenses([]));
    appQueryClient.setQueryData(newKey, summarizeExpenses([]));
    invalidateMonthlyExpenses();
    expect(appQueryClient.getQueryState(oldKey)?.isInvalidated).toBe(true);
    expect(appQueryClient.getQueryState(newKey)?.isInvalidated).toBe(true);
  });
});

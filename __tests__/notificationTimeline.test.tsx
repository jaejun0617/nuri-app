import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { useNotificationTimeline } from '../src/hooks/useNotificationTimeline';
import type { FetchMemoriesPageResult, MemoryRecord } from '../src/services/supabase/memories';

const mockFetch = jest.fn<Promise<FetchMemoriesPageResult>, [Record<string, unknown>]>();
let mockOwner = 'owner';
jest.mock('../src/services/query/appQueryClient', () => {
  const { QueryClient } = jest.requireActual('@tanstack/react-query');
  return { appQueryClient: new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }) };
});
jest.mock('../src/store/authStore', () => ({ useAuthStore: { getState: () => ({ session: { user: { id: mockOwner } } }) } }));
jest.mock('../src/services/supabase/memories', () => ({ fetchMemoriesByPetPage: (input: Record<string, unknown>) => mockFetch(input) }));
const record = (id: string, petId: string): MemoryRecord => ({ id, petId, title: id, tags: [], imagePaths: [], category: 'diary', occurredAt: '2026-10-22', createdAt: '2026-10-22T00:00:00Z' });
const period = { startDate: '2026-10-19', endDate: '2026-10-26' };
let result: ReturnType<typeof useNotificationTimeline>;
function Harness({ range = period }: { range?: typeof period | null }) {
  result = useNotificationTimeline({ enabled: true, ownerId: 'owner', petIds: ['pet-b', 'pet-a'], period: range ?? undefined });
  return null;
}
async function settle() { for (let i = 0; i < 5; i += 1) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
beforeEach(() => { jest.clearAllMocks(); appQueryClient.clear(); mockOwner = 'owner'; });
afterEach(() => appQueryClient.clear());

it('fetches each owned pet with the fixed server period and merges their actual records', async () => {
  mockFetch.mockImplementation(async input => ({ items: [record(`${input.petId}-record`, String(input.petId))], hasMore: false, nextCursor: null }));
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<Harness />); }); await settle();
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(mockFetch).toHaveBeenCalledWith({ petId: 'pet-a', cursor: null, prefetchTop: 0, recap: { ownerId: 'owner', period } });
  expect(mockFetch).toHaveBeenCalledWith({ petId: 'pet-b', cursor: null, prefetchTop: 0, recap: { ownerId: 'owner', period } });
  expect(result?.items.map(item => item.petId).sort()).toEqual(['pet-a', 'pet-b']);
  expect(result?.status).toBe('ready');
  await act(async () => tree.unmount());
});
it('paginates unfinished pets only and clearing the range uses a separate cache without changing ownership', async () => {
  mockFetch.mockImplementation(async input => ({ items: [record(`${input.petId}-${input.cursor ?? 'first'}`, String(input.petId))], hasMore: input.petId === 'pet-a' && !input.cursor, nextCursor: input.petId === 'pet-a' && !input.cursor ? 'cursor-a' : null }));
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<Harness />); }); await settle();
  await act(async () => { await result?.loadMore(); }); await settle();
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(mockFetch).toHaveBeenLastCalledWith({ petId: 'pet-a', cursor: 'cursor-a', prefetchTop: 0, recap: { ownerId: 'owner', period } });
  await act(async () => tree.update(<Harness range={null} />)); await settle();
  expect(mockFetch).toHaveBeenCalledWith({ petId: 'pet-a', cursor: null, prefetchTop: 0, recap: { ownerId: 'owner', period: undefined } });
  expect(appQueryClient.getQueryCache().getAll().every(query => query.queryKey[1] === 'owner')).toBe(true);
  expect(result?.items.every(item => ['pet-a', 'pet-b'].includes(item.petId))).toBe(true);
  await act(async () => tree.unmount());
});
it('rejects a late old-owner page instead of showing or caching it as success', async () => {
  let finish!: (result: FetchMemoriesPageResult) => void;
  mockFetch.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<Harness />); });
  mockOwner = 'other';
  await act(async () => { finish({ items: [record('late', 'pet-a')], hasMore: false, nextCursor: null }); }); await settle();
  expect(result?.items).toEqual([]);
  expect(result?.status).toBe('error');
  await act(async () => tree.unmount());
});

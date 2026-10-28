import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationPreferences } from '../src/hooks/useNotificationPreferences';

const owner = '11111111-1111-4111-8111-111111111111';
let mockOwner = owner;
const mockRpc = jest.fn();
jest.mock('../src/store/authStore', () => ({ useAuthStore: Object.assign((selector: (s: { session: { user: { id: string } } }) => unknown) => selector({ session: { user: { id: mockOwner } } }), { getState: () => ({ session: { user: { id: mockOwner } } }) }) }));
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('../src/services/notifications/pushTokenLifecycle', () => ({ syncPushNotificationDevice: jest.fn().mockResolvedValue(true) }));
jest.mock('../src/services/schedules/preferenceSync', () => ({ reconcileScheduleNotificationPreference: jest.fn().mockResolvedValue(undefined) }));

function deferred() {
  let resolve!: (value: { data: unknown; error: unknown }) => void;
  const promise = new Promise<{ data: unknown; error: unknown }>(done => { resolve = done; });
  return { promise, resolve };
}
let current: ReturnType<typeof useNotificationPreferences>;
let mirror: ReturnType<typeof useNotificationPreferences>;
function Harness({ second = false }: { second?: boolean }) {
  const result = useNotificationPreferences();
  if (second) mirror = result; else current = result;
  return null;
}
const key = ['notifications-v3', owner, 'preferences'];
const initial = { pushOptIn: false, categories: { service: false, community: false } };
beforeEach(() => { jest.clearAllMocks(); mockOwner = owner; notifyManager.setScheduler(callback => callback()); });
afterEach(() => notifyManager.setScheduler(callback => setTimeout(callback, 0)));

it.each([true, false])('mirrors the pending toggle and restores confirmed state on failure: success=%s', async success => {
  const save = deferred();
  mockRpc.mockImplementation((_name: string, args?: object) => args ? save.promise : Promise.resolve({ data: initial, error: null }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<QueryClientProvider client={client}><Harness /><Harness second /></QueryClientProvider>); });
  let write!: Promise<unknown>;
  await act(async () => { write = current.update('service', true).catch(error => error); });
  expect(current.displayedCategories.service).toBe(true);
  expect(mirror.displayedCategories.service).toBe(true);
  expect(client.getQueryData(key)).toEqual(initial);
  const saved = { pushOptIn: true, categories: { service: true, community: false } };
  await act(async () => { save.resolve(success ? { data: saved, error: null } : { data: null, error: new Error('offline') }); await write; });
  expect(mirror.displayedCategories.service).toBe(success);
  expect(current.displayedCategories.community).toBe(false);
  await act(async () => renderer.unmount()); client.clear();
});

it('keeps a confirmed server result in the account cache after the sheet unmounts', async () => {
  // Separate the confirmed write from this fixture's immediate GC timer.
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });
  const save = deferred();
  mockRpc.mockImplementation((_name: string, args?: object) => args ? save.promise : Promise.resolve({ data: initial, error: null }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  try {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
    let write!: Promise<unknown>;
    await act(async () => { write = current.update('service', true); });
    await act(async () => renderer.unmount());
    const saved = { pushOptIn: true, categories: { service: true, community: false } };
    await act(async () => { save.resolve({ data: saved, error: null }); await write; });
    expect(client.getQueryData(key)).toEqual(saved);
    await act(async () => jest.runOnlyPendingTimers());
    expect(client.getQueryData(key)).toBeUndefined();
  } finally {
    client.clear();
    jest.useRealTimers();
  }
});

it('does not commit the old account response after an account switch', async () => {
  const save = deferred();
  const secondAccount = { pushOptIn: true, categories: { community: true, service: false } };
  mockRpc.mockImplementation((_name: string, args?: object) => args ? save.promise : Promise.resolve({ data: mockOwner === owner ? initial : secondAccount, error: null }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  let write!: Promise<unknown>;
  await act(async () => { write = current.update('service', true).catch(error => error); });
  mockOwner = '22222222-2222-4222-8222-222222222222';
  await act(async () => { save.resolve({ data: { pushOptIn: true, categories: { service: true } }, error: null }); await write; });
  // The old query may be immediately garbage-collected after its observer moves.
  expect([undefined, initial]).toContainEqual(client.getQueryData(key));
  expect(client.getQueryData(['notifications-v3', mockOwner, 'preferences'])).toEqual(secondAccount);
  await act(async () => renderer.unmount()); client.clear();
});

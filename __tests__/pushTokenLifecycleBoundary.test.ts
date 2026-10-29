import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { syncPushNotificationDevice } from '../src/services/notifications/pushTokenLifecycle';

type AuthSnapshot = { session: Session | null };
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
function session(owner: string): Session {
  return {
    access_token: `fixture-access-${owner}`,
    refresh_token: 'fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: owner, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-10-29T00:00:00Z' },
  };
}
let mockAuth: AuthSnapshot = { session: session(ownerA) };
const mockOwnerListeners = new Set<(next: AuthSnapshot, previous: AuthSnapshot) => void>();
const mockPreference = jest.fn();
const mockInvoke = jest.fn();
const mockBind = jest.fn();
const mockClear = jest.fn();
jest.mock('../src/store/authStore', () => ({ useAuthStore: {
  getState: () => mockAuth,
  subscribe: (listener: (next: AuthSnapshot, previous: AuthSnapshot) => void) => {
    mockOwnerListeners.add(listener);
    return () => mockOwnerListeners.delete(listener);
  },
} }));
jest.mock('../src/services/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ maybeSingle: () => mockPreference() }) }),
  functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
} }));
jest.mock('../src/services/notifications/nativePush', () => ({
  getNativePushToken: async () => 'fixture-provider-token-not-a-real-registration',
  bindNativePushOwner: (owner: string) => mockBind(owner),
  clearNativePushOwner: (owner: string) => mockClear(owner),
}));
function changeOwner(owner: string) {
  const previous = mockAuth;
  mockAuth = { session: session(owner) };
  for (const listener of mockOwnerListeners) listener(mockAuth, previous);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
type DeviceResponse = { data: { registered: boolean }; error: Error | null };
const registered: DeviceResponse = { data: { registered: true }, error: null };
const originalOS = Platform.OS;
beforeEach(() => {
  Platform.OS = 'android';
  jest.clearAllMocks();
  mockAuth = { session: session(ownerA) };
  mockPreference.mockResolvedValue({ data: { push_opt_in: true }, error: null });
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('fixture-install-device');
  mockInvoke.mockImplementation(async (_name: string, input: { body: { action: string } }) =>
    input.body.action === 'status' ? { data: { configured: true }, error: null } : registered);
  mockBind.mockResolvedValue(true);
  mockClear.mockResolvedValue(undefined);
});
afterEach(() => expect(mockOwnerListeners.size).toBe(0));
afterAll(() => { Platform.OS = originalOS; });

it('serializes A then B registration so a delayed A cannot commit after B in this runtime', async () => {
  const startedA = deferred<void>();
  const finishA = deferred<DeviceResponse>();
  const commits: string[] = [];
  mockInvoke.mockImplementation(async (_name: string, input: { body: { action: string }; headers: { Authorization: string } }) => {
    if (input.body.action === 'status') return { data: { configured: true }, error: null };
    if (input.headers.Authorization === `Bearer fixture-access-${ownerA}`) {
      startedA.resolve();
      const response = await finishA.promise;
      commits.push(ownerA);
      return response;
    }
    commits.push(ownerB);
    return registered;
  });
  const first = syncPushNotificationDevice();
  await startedA.promise;
  changeOwner(ownerB);
  const second = syncPushNotificationDevice();
  // Drain already-resolved IO without resolving A's register operation.
  for (let step = 0; step < 20; step += 1) await Promise.resolve();
  const beforeASettled = [...commits];
  finishA.resolve(registered);
  await expect(first).resolves.toBe(false);
  await expect(second).resolves.toBe(true);
  expect(beforeASettled).toEqual([]);
  expect(commits).toEqual([ownerA, ownerB]);
  expect(mockBind.mock.calls).toEqual([[ownerB]]);
});

it('does not reuse A registration or bind its late result after A to B to A', async () => {
  const started = deferred<void>();
  const finish = deferred<DeviceResponse>();
  let registrations = 0;
  mockInvoke.mockImplementation(async (_name: string, input: { body: { action: string } }) => {
    if (input.body.action === 'status') return { data: { configured: true }, error: null };
    registrations += 1;
    if (registrations === 1) { started.resolve(); return finish.promise; }
    return registered;
  });
  const first = syncPushNotificationDevice();
  await started.promise;
  changeOwner(ownerB);
  const intermediate = syncPushNotificationDevice();
  changeOwner(ownerA);
  const current = syncPushNotificationDevice();
  finish.resolve(registered);
  const results = await Promise.all([first, intermediate, current]);
  expect(current).not.toBe(first);
  expect(results).toEqual([false, false, true]);
  expect(registrations).toBe(2);
  expect(mockBind.mock.calls).toEqual([[ownerA]]);
});

it('shares concurrent same-owner requests without duplicating registration', async () => {
  const first = syncPushNotificationDevice();
  const second = syncPushNotificationDevice();
  expect(second).toBe(first);
  await expect(first).resolves.toBe(true);
  expect(mockInvoke.mock.calls.map(([, input]) => input.body.action)).toEqual(['status', 'register']);
  expect(mockBind.mock.calls).toEqual([[ownerA]]);
});

it('allows B to register after an explicit A registration failure', async () => {
  const started = deferred<void>();
  const finish = deferred<DeviceResponse>();
  mockInvoke.mockImplementation(async (_name: string, input: { body: { action: string }; headers: { Authorization: string } }) => {
    if (input.body.action === 'status') return { data: { configured: true }, error: null };
    if (input.headers.Authorization === `Bearer fixture-access-${ownerA}`) { started.resolve(); return finish.promise; }
    return registered;
  });
  const first = syncPushNotificationDevice();
  const outcome = first.then(value => value, (error: unknown) => error);
  await started.promise;
  changeOwner(ownerB);
  const second = syncPushNotificationDevice();
  finish.resolve({ data: { registered: false }, error: new Error('registration rejected') });
  await expect(outcome).resolves.toEqual(new Error('registration rejected'));
  await expect(second).resolves.toBe(true);
  expect(mockBind.mock.calls).toEqual([[ownerB]]);
});

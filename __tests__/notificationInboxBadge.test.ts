import { QueryClient } from '@tanstack/react-query';
import { NativeModules, Platform } from 'react-native';
import { appQueryClient } from '../src/services/query/appQueryClient';
import { observeInboxBadge } from '../src/services/notifications/inboxBadgeSync';
import { syncNativeInboxBadge, parseNotificationTap } from '../src/services/notifications/nativePush';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
type Snapshot = { session: { user: { id: string } } | null };
let mockAuth: Snapshot = { session: { user: { id: ownerA } } };
const mockListeners = new Set<(next: Snapshot, previous: Snapshot) => void>();
const mockFetch = jest.fn<Promise<number>, []>();
const mockSync = jest.fn<Promise<string>, [string, number, number, number]>();
let mockServerTime = 1000;
jest.mock('../src/store/authStore', () => ({ useAuthStore: {
  getState: () => mockAuth,
  subscribe: (listener: (next: Snapshot, previous: Snapshot) => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
} }));
jest.mock('../src/services/notifications/userNotifications', () => ({
  fetchNotificationBadgeSnapshot: async () => {
    const count = await mockFetch();
    return { count, observedAt: ++mockServerTime, validUntil: count === 0 ? null : 10000 };
  },
}));
jest.mock('../src/services/query/appQueryClient', () => {
  const { QueryClient: Client } = jest.requireActual<{ QueryClient: typeof QueryClient }>('@tanstack/react-query');
  return { appQueryClient: new Client({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }) };
});
const originalOS = Platform.OS;
const originalBridge: unknown = NativeModules.NuriPushNotifications;
const queryKey = ['notifications-v3', ownerA, 'unread', 'snapshot-v1'];
const settle = () => new Promise<void>(done => setTimeout(done, 0));
function changeOwner(owner: string) {
  const previous = mockAuth;
  mockAuth = { session: { user: { id: owner } } };
  mockListeners.forEach(listener => listener(mockAuth, previous));
}
beforeEach(() => {
  jest.clearAllMocks();
  mockServerTime = 1000;
  appQueryClient.clear();
  mockAuth = { session: { user: { id: ownerA } } };
  Platform.OS = 'android';
  NativeModules.NuriPushNotifications = {
    getToken: jest.fn(), bindOwner: jest.fn(), clearOwner: jest.fn(),
    consumeInitialTap: jest.fn(), getChannelStates: jest.fn(), syncInboxBadge: mockSync,
  };
  mockFetch.mockResolvedValue(3);
  mockSync.mockResolvedValue('updated');
});
afterEach(() => { appQueryClient.clear(); expect(mockListeners.size).toBe(0); });
afterAll(() => { Platform.OS = originalOS; NativeModules.NuriPushNotifications = originalBridge; });

it('shares the authoritative unread query and sends 3 -> 2 -> 0 without local subtraction', async () => {
  const badge = observeInboxBadge(ownerA);
  await settle();
  expect(mockSync).toHaveBeenLastCalledWith(ownerA, 3, expect.any(Number), 10000);
  mockFetch.mockResolvedValue(2);
  await appQueryClient.invalidateQueries({ queryKey });
  await settle();
  expect(mockSync).toHaveBeenLastCalledWith(ownerA, 2, expect.any(Number), 10000);
  mockFetch.mockResolvedValue(0);
  await appQueryClient.invalidateQueries({ queryKey });
  await settle();
  expect(mockSync).toHaveBeenLastCalledWith(ownerA, 0, expect.any(Number), 0);
  const stamps = mockSync.mock.calls.map(call => call[2]);
  expect(stamps.every((stamp, i) => i === 0 || stamp > stamps[i - 1])).toBe(true);
  badge.stop();
});

it('does not clear the badge on a failed or offline lookup', async () => {
  const badge = observeInboxBadge(ownerA);
  await settle();
  mockSync.mockClear();
  mockFetch.mockRejectedValue(new Error('offline'));
  await appQueryClient.invalidateQueries({ queryKey });
  await settle();
  expect(mockSync).not.toHaveBeenCalled();
  badge.stop();
});

it('rejects a late old-owner result even after A -> B -> A', async () => {
  let resolve!: (count: number) => void;
  mockFetch.mockImplementation(() => new Promise(done => { resolve = done; }));
  const badge = observeInboxBadge(ownerA);
  changeOwner(ownerB);
  changeOwner(ownerA);
  resolve(9);
  await settle();
  badge.syncAfterOwnerBound();
  expect(mockSync).not.toHaveBeenCalled();
  badge.stop();
});

it('can apply the already-fetched count after native owner binding without another RPC', async () => {
  const badge = observeInboxBadge(ownerA);
  await settle();
  mockSync.mockClear();
  badge.syncAfterOwnerBound();
  expect(mockSync).toHaveBeenCalledWith(ownerA, 3, expect.any(Number), 10000);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  badge.stop();
});

it('keeps an older APK usable without pretending its bridge supports badge sync', async () => {
  delete NativeModules.NuriPushNotifications.syncInboxBadge;
  await expect(syncNativeInboxBadge(ownerA, 3, 10, 20)).resolves.toBe('unsupported');
  expect(mockSync).not.toHaveBeenCalled();
});

it.each([-1, 1.5, Number.NaN])('rejects invalid count %s', async count => {
  await expect(syncNativeInboxBadge(ownerA, count, 10)).rejects.toThrow('NURI_NOTIFICATION_BADGE_INVALID');
  expect(mockSync).not.toHaveBeenCalled();
});

it('accepts only the fixed inbox destination and never treats a summary tap as read', () => {
  expect(parseNotificationTap({ id: 'inbox', source: 'inbox', recipientUserId: ownerA }))
    .toEqual({ id: 'inbox', source: 'inbox', recipientUserId: ownerA });
  expect(parseNotificationTap({ id: 'Admin', source: 'inbox', recipientUserId: ownerA })).toBeNull();
  expect(parseNotificationTap({ id: 'inbox', source: 'inbox', recipientUserId: 'other' })).toBeNull();
});

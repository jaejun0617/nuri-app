import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationDetailScreen from '../src/screens/Notifications/NotificationDetailScreen';
import type { RootStackParamList } from '../src/navigation/RootNavigator';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

const mockDispatch = jest.fn();
const mockFetch = jest.fn();
const mockReady = jest.fn();
const mockNavigation = { dispatch: mockDispatch, goBack: jest.fn(), setParams: jest.fn(), isFocused: () => mockFocused };
let mockFocused = true;
let mockOwner = 'owner';
type AuthState = { session: { user: { id: string } } };
const mockOwnerListeners = new Set<(next: AuthState, previous: AuthState) => void>();
const receipt = { id: 'notice', source: 'user' as const, ownerId: 'owner', requestId: 'request' };
let mockParams: RootStackParamList['NotificationDetail'];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockParams }),
  StackActions: {
    push: (name: string, params: unknown) => ({ type: 'PUSH', payload: { name, params } }),
    replace: (name: string, params: unknown) => ({ type: 'REPLACE', payload: { name, params } }),
  },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) }));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign((selector: (state: AuthState) => unknown) => selector({ session: { user: { id: mockOwner } } }), {
    getState: () => ({ session: { user: { id: mockOwner } } }),
    subscribe: (listener: (next: AuthState, previous: AuthState) => void) => {
      mockOwnerListeners.add(listener);
      return () => mockOwnerListeners.delete(listener);
    },
  }),
}));
jest.mock('../src/store/petStore', () => ({ usePetStore: { getState: () => ({ selectedPetId: 'pet', pets: [] }) } }));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));
jest.mock('../src/hooks/useNotificationInbox', () => ({ notificationKeys: { owner: (id: string | null) => ['notifications-v3', id] } }));
jest.mock('../src/hooks/useNotificationDestinationRead', () => ({
  useNotificationDestinationRead: (_receipt: unknown, ready: boolean) => {
    mockReady(ready);
    return { readError: false, retryRead: jest.fn() };
  },
}));
jest.mock('../src/services/notifications/userNotifications', () => ({ fetchNotificationDetail: (...args: unknown[]) => mockFetch(...args) }));
jest.mock('../src/screens/Notifications/NotificationDesign', () => {
  const runtime = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual('react-native');
  return Object.fromEntries(['NotificationCanvas', 'NotificationHeader', 'NotificationDetailDesign', 'NotificationState'].map(name => [name, (props: Record<string, unknown>) => runtime.createElement(View, { ...props, testID: name })]));
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const item = (actionTarget: UserNotificationItem['actionTarget']): UserNotificationItem => ({
  id: 'notice', source: 'user', title: 'Notice', body: 'Body', type: 'event', createdAt: '2026-10-28T00:00:00Z', readAt: null, actionTarget,
});
let renderer: Renderer.ReactTestRenderer | undefined;
let client: QueryClient;
async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}
async function render(cached?: UserNotificationItem) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (cached) client.setQueryData(['notifications-v3', 'owner', 'detail', 'user', 'notice'], cached);
  await act(async () => {
    renderer = Renderer.create(<QueryClientProvider client={client}><NotificationDetailScreen /></QueryClientProvider>);
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = 'owner'; mockFocused = true;
  mockParams = { id: 'notice', source: 'user', notificationOpen: receipt, resolveTargetOnLoad: true };
});
afterEach(async () => {
  if (renderer) await act(async () => renderer?.unmount());
  renderer = undefined;
  client?.clear();
  mockOwnerListeners.clear();
});
it('shows an actual request screen while pending, then replaces it once without reading the target early', async () => {
  const pending = deferred<UserNotificationItem>();
  mockFetch.mockReturnValue(pending.promise);
  await render();
  expect(renderer?.root.findByProps({ testID: 'NotificationState' }).props).toMatchObject({ loading: true, message: '알림을 확인하고 있어요' });
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(false);
  await act(async () => pending.resolve(item({ kind: 'community_comment', postId: 'post', commentId: 'comment' })));
  await settle();
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'REPLACE', payload: { name: 'CommunityComments', params: { postId: 'post', commentId: 'comment', notificationOpen: receipt } } });
  expect(mockReady).toHaveBeenLastCalledWith(false);
  mockFetch.mockResolvedValue(item({ kind: 'community_comment', postId: 'post', commentId: 'comment' }));
  await act(async () => { await client.invalidateQueries(); });
  await settle();
  expect(mockDispatch).toHaveBeenCalledTimes(1);
});
it.each(['notification_detail', 'unavailable'] as const)('retains a readable %s detail instead of redirecting to Home', async kind => {
  mockFetch.mockResolvedValue(item({ kind }));
  await render(); await settle();
  expect(renderer?.root.findAllByProps({ testID: 'NotificationDetailDesign' }).length).toBeGreaterThan(0);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(true);
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ resolveTargetOnLoad: undefined });
});
it('keeps failure retry and Back available without redirecting or reading', async () => {
  mockFetch.mockRejectedValue(new Error('offline'));
  await render(); await settle();
  expect(renderer?.root.findByProps({ testID: 'NotificationState' }).props.message).toBe('알림을 불러오지 못했어요');
  expect(renderer?.root.findByProps({ testID: 'NotificationState' }).props.retry).toEqual(expect.any(Function));
  expect(renderer?.root.findByProps({ testID: 'NotificationHeader' }).props.onBack).toBe(mockNavigation.goBack);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(false);
});
it('does not present a cached target as freshly resolved after its verification fails', async () => {
  mockFetch.mockRejectedValue(new Error('offline'));
  await render(item({ kind: 'activity' })); await settle();
  expect(renderer?.root.findByProps({ testID: 'NotificationState' }).props.message).toBe('알림을 불러오지 못했어요');
  expect(renderer?.root.findAllByProps({ testID: 'NotificationDetailDesign' })).toHaveLength(0);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(false);
});
it('does not redirect a late result after Back', async () => {
  const pending = deferred<UserNotificationItem>();
  mockFetch.mockReturnValue(pending.promise);
  await render();
  mockFocused = false;
  await act(async () => pending.resolve(item({ kind: 'activity' })));
  await settle();
  expect(mockDispatch).not.toHaveBeenCalled();
});
it('rejects a pending result across owner A to B to A without consuming it', async () => {
  const pending = deferred<UserNotificationItem>();
  mockFetch.mockReturnValue(pending.promise);
  await render();
  for (const next of ['other', 'owner']) {
    const previous = { session: { user: { id: mockOwner } } };
    mockOwner = next;
    mockOwnerListeners.forEach(listener => listener({ session: { user: { id: next } } }, previous));
  }
  await act(async () => pending.resolve(item({ kind: 'activity' })));
  await settle();
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(false);
});
it('does not query a receipt belonging to another account', async () => {
  mockOwner = 'other';
  await render(); await settle();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(renderer?.root.findByProps({ testID: 'NotificationState' }).props).toMatchObject({ message: '현재 계정에서 확인할 수 없는 알림이에요' });
});
it('preserves the ordinary explicit detail action contract', async () => {
  mockParams = { ...mockParams, resolveTargetOnLoad: undefined };
  mockFetch.mockResolvedValue(item({ kind: 'activity' }));
  await render(); await settle();
  expect(renderer?.root.findAllByProps({ testID: 'NotificationDetailDesign' }).length).toBeGreaterThan(0);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockReady).toHaveBeenLastCalledWith(true);
});

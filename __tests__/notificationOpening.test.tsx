import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useOpenNotification } from '../src/hooks/useOpenNotification';
import { useNotificationDestinationRead } from '../src/hooks/useNotificationDestinationRead';
import { resolveNotificationDestination, type NotificationOpenReceipt } from '../src/services/notifications/openNotification';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

const mockFetch = jest.fn();
const mockRead = jest.fn();
const mockInvalidate = jest.fn();
const mockToast = jest.fn();
const mockDispatch = jest.fn();
let mockOwner = 'qa-owner';
let mockFocused = true;
const mockListeners = new Map<string, (event: { data: { closing: boolean } }) => void>();
let mockOwnerListener: ((next: { session: { user: { id: string } } }, previous: { session: { user: { id: string } } }) => void) | undefined;
const mockNavigation = {
  dispatch: mockDispatch,
  isFocused: () => mockFocused,
  getState: () => ({ routeNames: ['AppTabs', 'NotificationTimeline'] }),
  addListener: (name: string, listener: (event: { data: { closing: boolean } }) => void) => {
    mockListeners.set(name, listener);
    return () => mockListeners.delete(name);
  },
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  StackActions: {
    push: (name: string, params: unknown) => ({ type: 'PUSH', payload: { name, params } }),
    replace: (name: string, params: unknown) => ({ type: 'REPLACE', payload: { name, params } }),
  },
}));
jest.mock('../src/services/notifications/userNotifications', () => ({
  fetchNotificationDetail: (...args: unknown[]) => mockFetch(...args),
  markUserNotificationRead: (...args: unknown[]) => mockRead(...args),
}));
jest.mock('../src/services/query/appQueryClient', () => ({ appQueryClient: { invalidateQueries: (...args: unknown[]) => mockInvalidate(...args) } }));
jest.mock('../src/hooks/useNotificationInbox', () => ({ notificationKeys: { owner: (id: string) => ['notifications-v3', id] } }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: {
  getState: () => ({ session: { user: { id: mockOwner } } }),
  subscribe: (listener: typeof mockOwnerListener) => { mockOwnerListener = listener; return () => { mockOwnerListener = undefined; }; },
} }));
jest.mock('../src/store/petStore', () => ({ usePetStore: { getState: () => ({ selectedPetId: 'selected-pet', pets: [] }) } }));
jest.mock('../src/store/uiStore', () => ({ showToast: (...args: unknown[]) => mockToast(...args) }));

const receipt: NotificationOpenReceipt = { id: 'notice', source: 'user', ownerId: 'qa-owner', requestId: 'request-1' };
const item = (target: UserNotificationItem['actionTarget']): UserNotificationItem => ({
  id: receipt.id, source: receipt.source, title: 'Notice', body: 'Body', type: 'event', createdAt: '2026-10-28T00:00:00Z', readAt: null, actionTarget: target,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks(); mockListeners.clear(); mockOwner = 'qa-owner'; mockFocused = true;
  mockFetch.mockResolvedValue(item({ kind: 'schedule', petId: 'pet', scheduleId: 'schedule' }));
  mockRead.mockResolvedValue(undefined); mockInvalidate.mockResolvedValue(undefined);
});

describe('typed notification destinations', () => {
  it.each([
    [{ kind: 'community_comment', postId: 'post', commentId: 'comment' }, 'CommunityComments'],
    [{ kind: 'community_post', postId: 'post' }, 'CommunityDetail'],
    [{ kind: 'schedule', scheduleId: 'schedule', petId: 'pet' }, 'ScheduleDetail'],
    [{ kind: 'title', titleId: 'title', petId: 'pet' }, 'PetActivityAchievements'],
    [{ kind: 'activity' }, 'PetActivityAchievements'],
    [{ kind: 'record', memoryId: 'memory', petId: 'pet' }, 'NotificationTimeline'],
    [{ kind: 'pet_anniversary', petId: 'other-pet' }, 'NotificationTimeline'],
    [{ kind: 'unavailable' }, 'NotificationDetail'],
    [{ kind: 'notification_detail' }, 'NotificationDetail'],
  ] as const)('resolves %s without an intermediate Home route', (target, route) => {
    const destination = resolveNotificationDestination(item(target), receipt, 'selected-pet');
    expect(destination.name).toBe(route);
    expect(destination.params.notificationOpen).toBe(receipt);
  });
  it('keeps the fixed period and explicit pet rather than silently clearing them', () => {
    const destination = resolveNotificationDestination(item({ kind: 'timeline_period', petId: 'other-pet', startDate: '2026-10-19', endDate: '2026-10-26' }), receipt, 'selected-pet');
    expect(destination).toMatchObject({ name: 'NotificationTimeline', params: { screen: 'TimelineMain', params: { petId: 'other-pet', ymFilter: null, notificationPeriod: { startDate: '2026-10-19', endDate: '2026-10-26' } } } });
  });
  it('keeps an owner-wide recap owner-wide rather than substituting the selected pet', () => {
    const target = item({ kind: 'timeline_period', petId: null, startDate: '2026-10-19', endDate: '2026-10-26' });
    const first = resolveNotificationDestination(target, receipt, 'pet-a');
    const second = resolveNotificationDestination(target, receipt, 'pet-b');
    expect(first).toEqual(second);
    expect(first).toMatchObject({ name: 'NotificationTimeline', params: { params: { notificationScope: 'owner', petId: undefined } } });
  });
});

describe('origin-owned open request', () => {
  let open!: ReturnType<typeof useOpenNotification>['open'];
  function Harness({ mode = 'push' }: { mode?: 'push' | 'replace' }) { open = useOpenNotification(mode).open; return null; }
  it.each(['push', 'replace'] as const)('fetches first, dispatches once in %s mode and never reads at the origin', async mode => {
    const pending = deferred<UserNotificationItem>(); mockFetch.mockReturnValue(pending.promise);
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness mode={mode} />); });
    let request!: Promise<void>;
    act(() => { request = open(receipt); open(receipt); });
    expect(mockFetch).toHaveBeenCalledTimes(1); expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(item({ kind: 'schedule', petId: 'pet', scheduleId: 'schedule' })); await request; });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: mode.toUpperCase(), payload: expect.objectContaining({ name: 'ScheduleDetail' }) }));
    expect(mockRead).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it.each(['blur', 'owner', 'unmount'] as const)('rejects late lookup after %s, including return to the same owner', async change => {
    const pending = deferred<UserNotificationItem>(); mockFetch.mockReturnValue(pending.promise);
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness />); });
    let request!: Promise<void>; act(() => { request = open(receipt); });
    if (change === 'unmount') await act(async () => tree.unmount());
    await act(async () => {
      if (change === 'blur') mockListeners.get('blur')?.({ data: { closing: false } });
      if (change === 'owner') {
        mockOwnerListener?.({ session: { user: { id: 'other' } } }, { session: { user: { id: 'qa-owner' } } });
        mockOwnerListener?.({ session: { user: { id: 'qa-owner' } } }, { session: { user: { id: 'other' } } });
      }
      pending.resolve(item({ kind: 'community_post', postId: 'post' })); await request;
    });
    expect(mockDispatch).not.toHaveBeenCalled(); expect(mockRead).not.toHaveBeenCalled();
    if (change !== 'unmount') await act(async () => tree.unmount());
  });
  it('preserves the origin and unread state on lookup failure and permits explicit retry', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness />); });
    await act(async () => { await open(receipt); });
    expect(mockDispatch).not.toHaveBeenCalled(); expect(mockRead).not.toHaveBeenCalled(); expect(mockToast).toHaveBeenCalledTimes(1);
    await act(async () => { await open(receipt); });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
});

describe('destination-owned read receipt', () => {
  let result!: ReturnType<typeof useNotificationDestinationRead>;
  function Harness({ ready, ownerReceipt = receipt }: { ready: boolean; ownerReceipt?: NotificationOpenReceipt }) { result = useNotificationDestinationRead(ownerReceipt, ready); return null; }
  it('requires both native presentation and successful domain data, not merely mount or focus', async () => {
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready={false} />); });
    expect(mockRead).not.toHaveBeenCalled();
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    expect(mockRead).not.toHaveBeenCalled();
    await act(async () => { tree.update(<Harness ready />); });
    expect(mockRead).toHaveBeenCalledTimes(1); expect(mockRead).toHaveBeenCalledWith(receipt);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications-v3', 'qa-owner'] });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); tree.update(<Harness ready />); });
    expect(mockRead).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
  it('does not mark a closing, unfocused or wrong-owner destination read', async () => {
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: true } }); });
    mockFocused = false;
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    mockFocused = true; mockOwner = 'other';
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    expect(mockRead).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('does not loop or fake success on failure and retries only when requested', async () => {
    mockRead.mockRejectedValueOnce(new Error('offline'));
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    expect(result.readError).toBe(true); expect(mockRead).toHaveBeenCalledTimes(1); expect(mockInvalidate).not.toHaveBeenCalled();
    await act(async () => { tree.update(<Harness ready />); });
    expect(mockRead).toHaveBeenCalledTimes(1);
    await act(async () => result.retryRead());
    expect(mockRead).toHaveBeenCalledTimes(2); expect(result.readError).toBe(false);
    await act(async () => tree.unmount());
  });
  it('does not rearm an old receipt when A returns after an owner change before data readiness', async () => {
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready={false} />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    await act(async () => {
      mockOwner = 'other';
      mockOwnerListener?.({ session: { user: { id: 'other' } } }, { session: { user: { id: 'qa-owner' } } });
      mockOwner = 'qa-owner';
      mockOwnerListener?.({ session: { user: { id: 'qa-owner' } } }, { session: { user: { id: 'other' } } });
      tree.update(<Harness ready />);
    });
    expect(mockRead).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('does not show a late A read failure after A to B to A', async () => {
    const pending = deferred<void>(); mockRead.mockReturnValueOnce(pending.promise);
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    await act(async () => {
      mockOwner = 'other';
      mockOwnerListener?.({ session: { user: { id: 'other' } } }, { session: { user: { id: 'qa-owner' } } });
      mockOwner = 'qa-owner';
      mockOwnerListener?.({ session: { user: { id: 'qa-owner' } } }, { session: { user: { id: 'other' } } });
      pending.reject(new Error('old read failed'));
    });
    expect(result.readError).toBe(false);
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('preserves canonical read invalidation after Back without another read or stale UI', async () => {
    const pending = deferred<void>(); mockRead.mockReturnValueOnce(pending.promise);
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    await act(async () => { mockListeners.get('blur')?.({ data: { closing: false } }); });
    await act(async () => { pending.resolve(); });
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['notifications-v3', 'qa-owner'] });
    expect(mockToast).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
  it('keeps the newer completed receipt when an older read settles last', async () => {
    const pending = deferred<void>(); mockRead.mockReturnValueOnce(pending.promise);
    const newer = { ...receipt, id: 'new-notice', requestId: 'request-2' };
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => { tree = Renderer.create(<Harness ready />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    await act(async () => { tree.update(<Harness ready ownerReceipt={newer} />); });
    await act(async () => { mockListeners.get('transitionEnd')?.({ data: { closing: false } }); });
    expect(mockRead.mock.calls).toEqual([[receipt], [newer]]);
    await act(async () => { pending.resolve(); });
    await act(async () => { tree.update(<Harness ready={false} ownerReceipt={newer} />); });
    await act(async () => { tree.update(<Harness ready ownerReceipt={newer} />); });
    expect(mockRead.mock.calls).toEqual([[receipt], [newer]]);
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
});

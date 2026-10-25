import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import { useNotificationPreview } from '../src/hooks/useNotificationInbox';
import HomeQuickNotificationsScreen from '../src/screens/Notifications/HomeQuickNotificationsScreen';
import type { UserNotificationItem } from '../src/services/notifications/userNotifications';

const mockNavigate = { replace: jest.fn(), goBack: jest.fn(), isFocused: () => true };
const mockMarkAll = jest.fn().mockResolvedValue(undefined);
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockRpc = jest.fn<Promise<{ data: unknown; error: null }>, [string, Record<string, unknown>?]>();
let mockOwner = '11111111-1111-4111-8111-111111111111';
let mockState: { items?: UserNotificationItem[]; unread?: number; loading?: boolean; error?: boolean } = {};
let mockUseActualHook = false;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigate }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: Object.assign((selector: (state: { session: { user: { id: string } } }) => unknown) => selector({ session: { user: { id: mockOwner } } }), { getState: () => ({ session: { user: { id: mockOwner } } }) }) }));
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (name: string, args?: Record<string, unknown>) => mockRpc(name, args) } }));
jest.mock('../src/hooks/useNotificationInbox', () => {
  const actual = jest.requireActual('../src/hooks/useNotificationInbox');
  return { ...actual, useNotificationPreview: () => mockUseActualHook ? actual.useNotificationPreview() : ({
    userId: mockOwner,
    list: { data: mockState.items ? { items: mockState.items, unreadCount: mockState.unread, timeZone: 'Asia/Seoul' } : undefined, isSuccess: !mockState.loading && !mockState.error, isPending: Boolean(mockState.loading), isError: Boolean(mockState.error), refetch: mockRefetch },
    unread: { data: mockState.unread, refetch: mockRefetch }, markAll: mockMarkAll,
  }) };
});
const item = (index: number, read = false): UserNotificationItem => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, source: 'user', title: `알림 ${index}`, body: '확인할 내용', type: 'notice', category: 'news', readAt: read ? '2026-10-25T00:01:00Z' : null, createdAt: '2026-10-25T00:00:00Z', actionTarget: { kind: 'notification_detail' },
});
const provider = (children: React.ReactNode) => <ThemeProvider theme={createTheme('light')}>{children}</ThemeProvider>;
beforeEach(() => { jest.clearAllMocks(); mockUseActualHook = false; mockOwner = '11111111-1111-4111-8111-111111111111'; mockState = {}; });

it.each([[0, 0], [1, 1], [2, 2], [3, 3], [10, 10], [10, 2], [10, 0]])('shows at most three recent rows for total %s/unread %s without making read rows empty', async (total, unread) => {
  mockState = { items: Array.from({ length: Math.min(total, 3) }, (_, i) => item(i + 1, i >= unread)), unread };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(provider(<HomeQuickNotificationsScreen />)); });
  const hosts = (testID: string) => renderer.root.findAll(node => typeof node.type === 'string' && node.props.testID === testID);
  expect(hosts('home-quick-notification-row')).toHaveLength(Math.min(total, 3));
  expect(hosts('home-quick-notifications-empty')).toHaveLength(total ? 0 : 1);
  expect(hosts('home-quick-unread-dot')).toHaveLength(Math.min(unread, 3));
  await act(async () => renderer.root.findByProps({ testID: 'home-quick-notifications-all' }).props.onPress());
  expect(mockNavigate.replace).toHaveBeenCalledWith('UserNotifications', { entrySource: 'home' });
  await act(async () => renderer.root.findByProps({ testID: 'home-quick-notifications-all' }).props.onPress());
  expect(mockNavigate.replace).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});
it('does not consume unread rows by opening the preview; read-all delegates the full server scope', async () => {
  mockState = { items: [item(1), item(2), item(3)], unread: 10 };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(provider(<HomeQuickNotificationsScreen />)); });
  expect(mockMarkAll).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByProps({ accessibilityLabel: '전체 알림 모두 읽음' }).props.onPress());
  expect(mockMarkAll).toHaveBeenCalledTimes(1);
  expect(mockMarkAll).toHaveBeenCalledWith();
  await act(async () => renderer.root.findAllByProps({ testID: 'home-quick-notification-row' })[0].props.onPress());
  expect(mockNavigate.replace).toHaveBeenCalledWith('NotificationDetail', { id: item(1).id, source: 'user' });
  await act(async () => renderer.unmount());
});
it.each([{ loading: true }, { error: true }])('does not present a loading/failure response as an empty inbox', async state => {
  mockState = state;
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(provider(<HomeQuickNotificationsScreen />)); });
  expect(renderer.root.findAllByProps({ testID: 'home-quick-notifications-empty' })).toHaveLength(0);
  await act(async () => renderer.unmount());
});
it.each([{ items: [] }, { items: [item(1, true)] }])('distinguishes an offline cached response from a fresh empty inbox', async ({ items }) => {
  mockState = { items, unread: 0, error: true };
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(provider(<HomeQuickNotificationsScreen />)); });
  expect(renderer.root.findAllByProps({ testID: 'home-quick-notifications-empty' })).toHaveLength(0);
  if (items.length) expect(renderer.root.findAllByProps({ testID: 'home-quick-notifications-cached' }).length).toBeGreaterThan(0);
  else expect(renderer.root.findAll(node => node.props.children === '알림을 불러오지 못했어요').length).toBeGreaterThan(0);
  await act(async () => renderer.unmount());
});
it('requests only three rows and shares the canonical whole-inbox unread query', async () => {
  mockUseActualHook = true;
  mockRpc.mockImplementation(async name => name === 'get_user_notification_unread_count_v1'
    ? { data: 10, error: null }
    : { data: { items: [], unreadCount: 10, hasMore: true, timeZone: 'Asia/Seoul' }, error: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let renderer!: TestRenderer.ReactTestRenderer;
  function Harness() { useNotificationPreview(); return null; }
  await act(async () => { renderer = TestRenderer.create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  expect(mockRpc).toHaveBeenCalledWith('get_user_notifications_v3', { p_limit: 3, p_cursor_at: null, p_cursor_id: null, p_cursor_source: null });
  expect(client.getQueryCache().findAll().map(query => query.queryKey)).toEqual(expect.arrayContaining([
    ['notifications-v3', mockOwner, 'preview'], ['notifications-v3', mockOwner, 'unread'],
  ]));
  expect(client.getQueryCache().findAll().some(query => query.queryKey.includes('list'))).toBe(false);
  await act(async () => renderer.unmount());
  client.clear();
});
it('rejects a queued old-owner query instead of placing new-owner data in its cache key', async () => {
  mockUseActualHook = true;
  mockRpc.mockImplementation(async name => name === 'get_user_notification_unread_count_v1'
    ? { data: 0, error: null } : { data: { items: [], unreadCount: 0, hasMore: false, timeZone: 'Asia/Seoul' }, error: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let renderer!: TestRenderer.ReactTestRenderer;
  function Harness() { useNotificationPreview(); return null; }
  await act(async () => { renderer = TestRenderer.create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  const previous = client.getQueryCache().find({ queryKey: ['notifications-v3', mockOwner, 'preview'] });
  if (!previous) throw new Error('INITIAL_QUERY_REQUIRED');
  mockOwner = '22222222-2222-4222-8222-222222222222';
  let failure: unknown;
  await act(async () => { try { await previous.fetch(); } catch (error) { failure = error; } });
  expect(failure).toEqual(expect.objectContaining({ message: 'NURI_NOTIFICATION_ACCOUNT_CHANGED' }));
  await act(async () => renderer.unmount()); client.clear();
});

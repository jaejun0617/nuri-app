import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationInbox } from '../src/hooks/useNotificationInbox';
import HomeQuickNotificationsScreen from '../src/screens/Notifications/HomeQuickNotificationsScreen';

const mockReplace = jest.fn();
const mockNavigation = { replace: mockReplace };
const mockRpc = jest.fn<
  Promise<{ data: unknown; error: null }>,
  [string, Record<string, unknown>?]
>();
let mockOwner = '11111111-1111-4111-8111-111111111111';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: { session: { user: { id: string } } }) => unknown) =>
      selector({ session: { user: { id: mockOwner } } }),
    { getState: () => ({ session: { user: { id: mockOwner } } }) },
  ),
}));
jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args?: Record<string, unknown>) => mockRpc(name, args),
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = '11111111-1111-4111-8111-111111111111';
  mockRpc.mockImplementation(async name =>
    name === 'get_user_notification_unread_count_v1'
      ? { data: 0, error: null }
      : {
          data: {
            items: [],
            unreadCount: 0,
            hasMore: false,
            timeZone: 'Asia/Seoul',
          },
          error: null,
        },
  );
});

it('redirects an obsolete preview route once, without rendering a second notification surface', async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<HomeQuickNotificationsScreen />);
  });
  expect(tree.toJSON()).toBeNull();
  expect(mockReplace).toHaveBeenCalledWith('UserNotifications', {
    entrySource: 'home',
  });
  await act(async () => {
    tree.update(<HomeQuickNotificationsScreen />);
  });
  expect(mockReplace).toHaveBeenCalledTimes(1);
  await act(async () => tree.unmount());
});

it('uses the whole inbox and canonical unread query rather than a three-row Home preview', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let tree!: TestRenderer.ReactTestRenderer;
  function Harness() {
    useNotificationInbox();
    return null;
  }
  await act(async () => {
    tree = TestRenderer.create(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  expect(mockRpc).toHaveBeenCalledWith('get_user_notifications_v3', {
    p_limit: 30,
    p_cursor_at: null,
    p_cursor_id: null,
    p_cursor_source: null,
  });
  expect(
    client
      .getQueryCache()
      .findAll()
      .map(query => query.queryKey),
  ).toEqual(
    expect.arrayContaining([
      ['notifications-v3', mockOwner, 'list'],
      ['notifications-v3', mockOwner, 'unread', 'snapshot-v1'],
    ]),
  );
  expect(
    client
      .getQueryCache()
      .findAll()
      .some(query => query.queryKey.includes('preview')),
  ).toBe(false);
  await act(async () => tree.unmount());
  client.clear();
});

it('rejects a queued old-owner query rather than retaining new-owner data under the previous key', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let tree!: TestRenderer.ReactTestRenderer;
  function Harness() {
    useNotificationInbox();
    return null;
  }
  await act(async () => {
    tree = TestRenderer.create(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
  });
  const previous = client
    .getQueryCache()
    .find({ queryKey: ['notifications-v3', mockOwner, 'list'] });
  if (!previous) throw new Error('INITIAL_QUERY_REQUIRED');
  mockOwner = '22222222-2222-4222-8222-222222222222';
  let failure: unknown;
  await act(async () => {
    try {
      await previous.fetch();
    } catch (error) {
      failure = error;
    }
  });
  expect(failure).toEqual(
    expect.objectContaining({ message: 'NURI_NOTIFICATION_ACCOUNT_CHANGED' }),
  );
  await act(async () => tree.unmount());
  client.clear();
});

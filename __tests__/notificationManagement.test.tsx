import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import UserNotificationsScreen from '../src/screens/Notifications/UserNotificationsScreen';
import { StyleSheet } from 'react-native';

const mockDismiss = jest
  .fn<Promise<void>, [unknown]>()
  .mockResolvedValue(undefined);
const mockMarkAll = jest.fn().mockResolvedValue(undefined);
const mockOpen = jest.fn().mockResolvedValue(undefined);
const mockBack = jest.fn();
const mockMore = jest.fn();
let mockEntry = 'home';
let mockCurrent = true;
let mockEmpty = false;
let mockError = false;
let mockLoading = false;
const mockItem = {
  id: '22222222-2222-4222-8222-222222222222',
  source: 'user',
  title: '소식',
  body: '본문',
  category: 'news',
  readAt: null,
  createdAt: '2026-11-05T00:00:00Z',
  actionTarget: { kind: 'notification_detail' },
};
jest.mock('../src/hooks/useOpenNotification', () => ({
  useOpenNotification: () => ({ open: mockOpen, opening: false }),
}));
jest.mock('../src/hooks/useOwnerOperation', () => ({
  useOwnerOperation: () => () => () => mockCurrent,
}));
jest.mock('../src/store/uiStore', () => ({
  showToast: jest.fn(),
  openMoreDrawer: () => mockMore(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockBack,
    canGoBack: () => true,
  }),
  useRoute: () => ({ params: { entrySource: mockEntry } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('../src/hooks/useNotificationInbox', () => ({
  useNotificationInbox: () => ({
    userId: 'qa-owner',
    list: {
      data: {
        pages: [{ items: mockEmpty ? [] : [mockItem], timeZone: 'Asia/Seoul' }],
      },
      isSuccess: !mockError && !mockLoading,
      isPending: mockLoading,
      isError: mockError,
      isRefetching: false,
      isFetchingNextPage: false,
      refetch: jest.fn().mockResolvedValue(undefined),
    },
    unread: {
      data: mockEmpty ? 0 : 1,
      refetch: jest.fn().mockResolvedValue(undefined),
    },
    dismiss: mockDismiss,
    markAll: mockMarkAll,
  }),
}));
let tree: Renderer.ReactTestRenderer;
const render = async () => {
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider theme={createTheme('light')}>
        <UserNotificationsScreen />
      </ThemeProvider>,
    );
  });
};
const action = (testID: string) =>
  tree.root.findAll(
    node =>
      node.props.testID === testID && typeof node.props.onPress === 'function',
  )[0];
const dialog = () => tree.root.findAll(node => node.props.surfaceVariant === 'menuGlass' && typeof node.props.onConfirm === 'function')[0];
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockDismiss.mockResolvedValue(undefined);
  mockCurrent = true;
  mockEmpty = false;
  mockError = false;
  mockLoading = false;
  mockEntry = 'home';
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.useRealTimers();
});

it.each([false, true])(
  'requires an explicit NURI confirmation for deletion; all=%s',
  async all => {
    await render();
    act(() =>
      action(
        all
          ? 'notifications-delete-all'
          : `notification-delete-user-${mockItem.id}`,
      ).props.onPress(),
    );
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(dialog().props).toMatchObject({
      visible: true,
      surfaceVariant: 'menuGlass',
      confirmLabel: '삭제하기',
    });
    await act(async () => dialog().props.onConfirm());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledWith(all ? null : mockItem);
    expect(dialog().props.visible).toBe(false);
    expect(mockMarkAll).not.toHaveBeenCalled();
  },
);
it('cancel closes only the dialog and does not delete or navigate', async () => {
  await render();
  act(() => action('notifications-delete-all').props.onPress());
  act(() => dialog().props.onCancel());
  expect(dialog().props.visible).toBe(false);
  expect(mockDismiss).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});
it('blocks an old confirmation after an account generation changes', async () => {
  await render();
  act(() => action('notifications-delete-all').props.onPress());
  mockCurrent = false;
  await act(async () => dialog().props.onConfirm());
  expect(mockDismiss).not.toHaveBeenCalled();
});
it('does not issue a duplicate delete and preserves retry after a failed response', async () => {
  let reject!: (reason: Error) => void;
  mockDismiss.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await render();
  act(() => action('notifications-delete-all').props.onPress());
  act(() => {
    dialog().props.onConfirm();
    dialog().props.onConfirm();
  });
  expect(mockDismiss).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('NETWORK_FAILURE')));
  expect(dialog().props).toMatchObject({
    visible: true,
    confirmLoading: false,
  });
  await act(async () => dialog().props.onConfirm());
  expect(mockDismiss).toHaveBeenCalledTimes(2);
});
it('opening a row does not delete it', async () => {
  await render();
  const row = tree.root.findAll(
    node =>
      node.props.accessibilityLabel === '누리 소식, 소식, 읽지 않음' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => row.props.onPress());
  expect(mockOpen).toHaveBeenCalledWith({ id: mockItem.id, source: 'user' });
  expect(mockDismiss).not.toHaveBeenCalled();
});
it('keeps open and delete actions vertically centered on the same row', async () => {
  await render();
  const row = tree.root.findAll(node => node.props.accessibilityLabel === '누리 소식, 소식, 읽지 않음' && typeof node.props.onPress === 'function')[0];
  const trailing = row.findAll(node => StyleSheet.flatten(node.props.style)?.alignSelf === 'center')[0];
  expect(StyleSheet.flatten(trailing.props.style)).toMatchObject({ minHeight:44, justifyContent:'center' });
});
it.each([false, true])(
  'shows the retention notice at the end, including empty=%s',
  async empty => {
    mockEmpty = empty;
    await render();
    expect(tree.root.findAll(node => node.props.children === '알림은 도착한 날부터 30일 후 자동 삭제돼요.').length).toBeGreaterThan(0);
  },
);
it.each(['home', 'more'])(
  'restores the entry destination for %s',
  async entry => {
    mockEntry = entry;
    await render();
    const back = tree.root.findAll(
      node =>
        node.props.accessibilityLabel === '뒤로가기' &&
        typeof node.props.onPress === 'function',
    )[0];
    act(() => back.props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
    if (entry === 'more')
      await act(async () => {
        jest.runAllTimers();
      });
  },
);

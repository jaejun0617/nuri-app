import React from 'react';
import { Alert } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import UserNotificationsScreen from '../src/screens/Notifications/UserNotificationsScreen';

const mockDismiss = jest.fn(async () => {}),
  mockMarkAll = jest.fn(async () => {}),
  mockNavigate = jest.fn();
const mockItem = {
  id: '22222222-2222-4222-8222-222222222222',
  source: 'user',
  title: '소식',
  body: '본문',
  category: 'news',
  readAt: null,
  createdAt: '2026-10-25T00:00:00Z',
  actionTarget: { kind: 'notification_detail' },
};
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    canGoBack: () => true,
  }),
  useRoute: () => ({ params: undefined }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('../src/hooks/useNotificationInbox', () => ({
  useNotificationInbox: () => ({
    list: {
      data: { pages: [{ items: [mockItem], timeZone: 'Asia/Seoul' }] },
      isSuccess: true,
      isRefetching: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    },
    unread: { data: 1, refetch: jest.fn() },
    dismiss: mockDismiss,
    markAll: mockMarkAll,
  }),
}));
describe('notification management preserves deletion without altering the reference layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it.each([false, true])(
    'deletes only after confirmation; all=%s',
    async all => {
      const alert = jest.spyOn(Alert, 'alert');
      let tree!: Renderer.ReactTestRenderer;
      await act(async () => {
        tree = Renderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <UserNotificationsScreen />
          </ThemeProvider>,
        );
      });
      const row = tree.root.findAll(
        node =>
          node.props.accessibilityLabel === '누리 소식, 소식, 읽지 않음' &&
          typeof node.props.onLongPress === 'function',
      )[0];
      act(() => row.props.onLongPress());
      expect(mockDismiss).not.toHaveBeenCalled();
      const menu = alert.mock.calls.at(-1)?.[2];
      act(() =>
        menu
          ?.find(b => b.text === (all ? '전체 알림 삭제' : '이 알림 삭제'))
          ?.onPress?.(),
      );
      expect(mockDismiss).not.toHaveBeenCalled();
      await act(async () => {
        alert.mock.calls
          .at(-1)?.[2]
          ?.find(b => b.text === '삭제')
          ?.onPress?.();
      });
      expect(mockDismiss).toHaveBeenCalledWith(all ? null : mockItem);
      expect(mockMarkAll).not.toHaveBeenCalled();
      await act(async () => tree.unmount());
      alert.mockRestore();
    },
  );
  it('opening a notification does not delete it', async () => {
    let tree!: Renderer.ReactTestRenderer;
    await act(async () => {
      tree = Renderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <UserNotificationsScreen />
        </ThemeProvider>,
      );
    });
    const row = tree.root.findAll(
      node =>
        node.props.accessibilityLabel === '누리 소식, 소식, 읽지 않음' &&
        typeof node.props.onPress === 'function',
    )[0];
    act(() => row.props.onPress());
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('NotificationDetail', {
      id: mockItem.id,
      source: 'user',
    });
    await act(async () => tree.unmount());
  });
});

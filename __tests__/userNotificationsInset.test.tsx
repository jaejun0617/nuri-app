import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createTheme } from '../src/app/theme/theme';
import UserNotificationsScreen from '../src/screens/Notifications/UserNotificationsScreen';

const mockNavigation = {
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: undefined }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('../src/hooks/useNotificationInbox', () => ({
  useNotificationInbox: () => ({
    list: {
      data: { pages: [{ items: [], timeZone: 'Asia/Seoul' }] },
      isSuccess: false,
      isRefetching: false,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    },
    unread: { data: 0, refetch: jest.fn() },
    markAll: jest.fn(),
  }),
}));

const mockedUseSafeAreaInsets = useSafeAreaInsets as jest.MockedFunction<
  typeof useSafeAreaInsets
>;

jest.mock('../src/hooks/useOpenNotification', () => ({ useOpenNotification: () => ({ open: jest.fn(), opening: false }) }));

describe('UserNotifications screen inset layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSafeAreaInsets.mockReturnValue({
      top: 24,
      bottom: 24,
      left: 7,
      right: 9,
    });
  });

  it('adds the screen-local top gap and preserves the bottom inset contract', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <UserNotificationsScreen />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const rootView = renderer.root.findAllByType(View)[0];
    const rootStyle = StyleSheet.flatten(rootView.props.style);
    expect(rootStyle.paddingTop).toBe(24);
    expect(rootStyle.paddingBottom).toBeUndefined();
    expect(rootStyle.paddingLeft).toBeUndefined();
    expect(rootStyle.paddingRight).toBeUndefined();

    const list = renderer.root.findByType(FlatList);
    const listContentStyle = StyleSheet.flatten(
      list.props.contentContainerStyle,
    );
    expect(listContentStyle.paddingBottom).toBe(56);

    await act(async () => {
      renderer.unmount();
    });
  });
});

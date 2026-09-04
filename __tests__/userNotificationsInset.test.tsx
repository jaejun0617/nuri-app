import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createTheme } from '../src/app/theme/theme';
import UserNotificationsScreen from '../src/screens/Notifications/UserNotificationsScreen';
import { fetchUserNotifications } from '../src/services/notifications/userNotifications';

const mockNavigation = {
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('../src/services/notifications/userNotifications', () => ({
  dismissAllUserNotifications: jest.fn(() => Promise.resolve(0)),
  dismissUserNotification: jest.fn(() => Promise.resolve()),
  fetchUserNotifications: jest.fn(() => Promise.resolve([])),
  markUserNotificationRead: jest.fn(() => Promise.resolve()),
}));

const mockedFetchUserNotifications =
  fetchUserNotifications as jest.MockedFunction<typeof fetchUserNotifications>;
const mockedUseSafeAreaInsets =
  useSafeAreaInsets as jest.MockedFunction<typeof useSafeAreaInsets>;

describe('UserNotifications screen inset layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchUserNotifications.mockResolvedValue([]);
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
    expect(rootStyle.paddingTop).toBe(28);
    expect(rootStyle.paddingBottom).toBeUndefined();
    expect(rootStyle.paddingLeft).toBeUndefined();
    expect(rootStyle.paddingRight).toBeUndefined();

    const list = renderer.root.findByType(FlatList);
    const listContentStyle = StyleSheet.flatten(
      list.props.contentContainerStyle,
    );
    expect(listContentStyle.paddingBottom).toBe(42);

    await act(async () => {
      renderer.unmount();
    });
  });
});

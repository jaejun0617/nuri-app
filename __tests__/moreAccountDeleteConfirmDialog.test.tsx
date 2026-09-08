import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import MoreDrawerContent from '../src/screens/More/MoreDrawerContent';
import { useAuthStore } from '../src/store/authStore';

type MockProps = React.PropsWithChildren<Record<string, unknown>>;

const CONFIRM_DIALOG_HOST = 'ConfirmDialogMock';
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: jest.fn(),
    useNavigation: () => mockNavigation,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/components/common/ConfirmDialog', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  return {
    __esModule: true,
    default: (props: MockProps) =>
      ReactRuntime.createElement(CONFIRM_DIALOG_HOST, props),
  };
});

jest.mock('../src/components/common/PremiumNoticeModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/pets/PetThemePicker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/components/navigation/AppNavigationToolbar', () => {
  const ReactRuntime = jest.requireActual('react') as typeof React;
  return {
    __esModule: true,
    default: (props: MockProps) =>
      ReactRuntime.createElement('AppNavigationToolbarMock', props),
  };
});

jest.mock('../src/services/notifications/userNotifications', () => ({
  fetchUserNotificationUnreadCount: jest.fn(() => Promise.resolve(0)),
}));

describe('More account deletion confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      status: 'logged_in',
      session: null,
      profile: { nickname: 'QA 사용자', role: 'user' },
      profileSyncStatus: 'ready',
      profileErrorMessage: null,
      passwordRecoveryFlow: { status: 'inactive', startedAt: null },
      accountDeletionGate: null,
      booted: true,
      isLoggedIn: true,
    });
  });

  afterEach(() => {
    useAuthStore.setState({
      status: 'guest',
      session: null,
      profile: { nickname: null, role: 'user' },
      profileSyncStatus: 'idle',
      profileErrorMessage: null,
      accountDeletionGate: null,
      booted: true,
      isLoggedIn: false,
    });
  });

  it('opts only account deletion into keyboard-aware confirmation', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const dialogs = renderer.root.findAll(
      node => String(node.type) === CONFIRM_DIALOG_HOST,
    );
    expect(dialogs).toHaveLength(2);

    const deleteDialog = dialogs.find(
      dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺',
    );
    const logoutDialog = dialogs.find(
      dialog => dialog.props.title === '로그아웃할까요?',
    );

    if (!deleteDialog || !logoutDialog) {
      throw new Error('Expected account confirmation dialogs were not rendered');
    }

    expect(deleteDialog.props.keyboardAware).toBe(true);
    expect(deleteDialog.props.confirmDisabled).toBe(true);
    expect(deleteDialog.props.message).toContain('7일의 유예기간');
    expect(logoutDialog.props.keyboardAware).toBeUndefined();

    await TestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('reserves the measured fixed toolbar height from the scroll viewport', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const toolbar = renderer.root.find(
      node => String(node.type) === 'AppNavigationToolbarMock',
    );
    await TestRenderer.act(async () => {
      toolbar.props.onLayout({ nativeEvent: { layout: { height: 96 } } });
    });

    const scroll = renderer.root.findByProps({
      testID: 'more-menu-scroll',
    });
    expect(scroll.type).toBe(ScrollView);
    expect(StyleSheet.flatten(scroll.props.style)).toEqual(
      expect.objectContaining({ marginBottom: 96 }),
    );
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 18 }),
    );

    await TestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});

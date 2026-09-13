import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';

import { createTheme } from '../src/app/theme/theme';
import MoreDrawerContent from '../src/screens/More/MoreDrawerContent';
import { useAuthStore } from '../src/store/authStore';
import { usePetStore } from '../src/store/petStore';
import {
  closeMoreDrawer,
  preserveMoreDrawerReturnPosition,
  useUiStore,
} from '../src/store/uiStore';

type MockProps = React.PropsWithChildren<Record<string, unknown>>;

const CONFIRM_DIALOG_HOST = 'ConfirmDialogMock';
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
};
const mockPerformAccountDeletion = jest.fn();

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

jest.mock('../src/services/auth/session', () => ({
  performAccountDeletion: (...args: unknown[]) =>
    mockPerformAccountDeletion(...args),
  performLogout: jest.fn(),
}));

describe('More account deletion confirmation', () => {
  const originalPets = usePetStore.getState();
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = callback => {
      callback(0);
      return 1;
    };
    useAuthStore.setState({
      status: 'logged_in',
      session: { user: { id: 'qa-user' } } as never,
      profile: { nickname: 'QA 사용자', role: 'user' },
      profileSyncStatus: 'ready',
      profileErrorMessage: null,
      passwordRecoveryFlow: { status: 'inactive', startedAt: null },
      accountDeletionGate: null,
      booted: true,
      isLoggedIn: true,
    });
    usePetStore.setState({
      pets: [{ id: 'pet', name: 'QA' }],
      selectedPetId: 'pet',
    });
    useUiStore.setState({
      moreDrawerOpen: false,
      moreDrawerScrollOffset: 0,
      moreDrawerRestorePending: false,
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
    usePetStore.setState(originalPets);
    useUiStore.setState({
      moreDrawerOpen: false,
      moreDrawerScrollOffset: 0,
      moreDrawerRestorePending: false,
    });
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('keeps all 18 functional entries in the four approved groups', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    for (const title of [
      '나의 반려동물',
      '활동 및 기록',
      '소통 및 정보',
      '앱 서비스 설정',
    ]) {
      expect(renderer.root.findByProps({ children: title })).toBeDefined();
    }

    const expectedEntryIds = [
      'pet-manage',
      'important-schedule',
      'memory-diary',
      'health-report',
      'pet-activity-achievements',
      'indoor-activities',
      'community',
      'nuri-ranking',
      'tips',
      'walk-nearby',
      'animal-hospital',
      'my-profile',
      'theme',
      'notification',
      'user-notifications',
      'community-blocked-users',
      'policy-center',
      'logout',
    ];

    const renderedEntryIds = new Set(
      renderer.root
        .findAll(
          node =>
            typeof node.props.testID === 'string' &&
            node.props.testID.startsWith('more-entry-'),
        )
        .map(node => node.props.testID),
    );
    expect([...renderedEntryIds].sort()).toEqual(
      expectedEntryIds.map(entryId => `more-entry-${entryId}`).sort(),
    );
    for (const entryId of expectedEntryIds) {
      expect(
        renderer.root.findByProps({ testID: `more-entry-${entryId}` }),
      ).toBeDefined();
    }
    expect(renderer.root.findByProps({ testID: 'account-delete-entry' })).toBeDefined();

    await TestRenderer.act(async () => renderer.unmount());
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
    expect(dialogs).toHaveLength(3);

    const deleteDialog = dialogs.find(
      dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺',
    );
    const acknowledgementDialog = dialogs.find(
      dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요',
    );
    const logoutDialog = dialogs.find(
      dialog => dialog.props.title === '로그아웃할까요?',
    );

    if (!deleteDialog || !acknowledgementDialog || !logoutDialog) {
      throw new Error('Expected account confirmation dialogs were not rendered');
    }

    expect(deleteDialog.props.keyboardAware).toBe(true);
    expect(deleteDialog.props.confirmDisabled).toBe(true);
    expect(deleteDialog.props.message).toContain('7일의 유예기간');
    expect(acknowledgementDialog.props.keyboardAware).toBeUndefined();
    expect(acknowledgementDialog.props.confirmDisabled).toBe(true);
    expect(logoutDialog.props.keyboardAware).toBeUndefined();

    await TestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('requires acknowledgement before opening the destructive phrase step', async () => {
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

    const startButton = renderer.root.findByProps({
      accessibilityLabel: '회원탈퇴 확인 시작',
    });
    TestRenderer.act(() => startButton.props.onPress());

    let acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    let phraseDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺');

    expect(acknowledgementDialog?.props.visible).toBe(true);
    expect(acknowledgementDialog?.props.confirmDisabled).toBe(true);
    expect(phraseDialog?.props.visible).toBe(false);

    TestRenderer.act(() => acknowledgementDialog?.props.onConfirm());
    phraseDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺');
    expect(phraseDialog?.props.visible).toBe(false);
    expect(mockPerformAccountDeletion).not.toHaveBeenCalled();

    TestRenderer.act(() => acknowledgementDialog?.props.onCancel());
    acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    expect(acknowledgementDialog?.props.visible).toBe(false);

    TestRenderer.act(() => startButton.props.onPress());

    const acknowledgementToggle = renderer.root.findByProps({
      testID: 'account-delete-acknowledgement-toggle',
    });
    TestRenderer.act(() => acknowledgementToggle.props.onPress());

    acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    expect(acknowledgementDialog?.props.confirmDisabled).toBe(false);

    TestRenderer.act(() => acknowledgementDialog?.props.onConfirm());

    acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    phraseDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺');

    expect(acknowledgementDialog?.props.visible).toBe(false);
    expect(phraseDialog?.props.visible).toBe(true);
    expect(mockPerformAccountDeletion).not.toHaveBeenCalled();

    TestRenderer.act(() => phraseDialog?.props.onCancel());
    phraseDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '정말 NURI를 떠나시겠어요? 🥺');
    expect(phraseDialog?.props.visible).toBe(false);

    await TestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('places an independent expandable guide directly below the acknowledgement', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    TestRenderer.act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: '회원탈퇴 확인 시작' })
        .props.onPress();
    });

    let acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    if (!acknowledgementDialog) throw new Error('Acknowledgement dialog missing');

    expect(
      React.Children.toArray(acknowledgementDialog.props.children).map(
        child => (child as React.ReactElement<{ testID?: string }>).props.testID,
      ),
    ).toEqual([
      'account-delete-acknowledgement-toggle',
      'account-delete-guide-toggle',
    ]);
    expect(
      renderer.root.findAllByProps({ testID: 'account-delete-guide-content' }),
    ).toHaveLength(0);

    TestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'account-delete-guide-toggle' })
        .props.onPress();
    });

    acknowledgementDialog = renderer.root
      .findAll(node => String(node.type) === CONFIRM_DIALOG_HOST)
      .find(dialog => dialog.props.title === '회원탈퇴 전 확인해 주세요');
    expect(acknowledgementDialog?.props.confirmDisabled).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'account-delete-guide-content' }),
    ).toBeDefined();
    expect(
      renderer.root.findByProps({ testID: 'account-delete-guide-toggle' }).props
        .accessibilityState,
    ).toEqual({ expanded: true });

    TestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'account-delete-guide-toggle' })
        .props.onPress();
    });
    expect(
      renderer.root.findAllByProps({ testID: 'account-delete-guide-content' }),
    ).toHaveLength(0);

    await TestRenderer.act(async () => renderer.unmount());
  });

  it('captures a child return offset and consumes it after final layout', async () => {
    const onRequestClose = jest.fn(() => closeMoreDrawer());
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={onRequestClose} />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    const scroll = renderer.root.findByProps({ testID: 'more-menu-scroll' });
    TestRenderer.act(() => {
      scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 620 } } });
      renderer.root.findByProps({ testID: 'more-entry-policy-center' }).props.onPress();
    });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('PolicyCenter', {
      entrySource: 'more',
    });
    expect(useUiStore.getState()).toEqual(
      expect.objectContaining({
        moreDrawerScrollOffset: 620,
        moreDrawerRestorePending: true,
      }),
    );

    await TestRenderer.act(async () => renderer.unmount());

    preserveMoreDrawerReturnPosition(620);
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    const restoredScroll = renderer.root.findByProps({
      testID: 'more-menu-scroll',
    });
    expect(restoredScroll.props.contentOffset).toEqual({ x: 0, y: 620 });
    TestRenderer.act(() => {
      restoredScroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
      restoredScroll.props.onContentSizeChange(360, 1_400);
    });
    expect(useUiStore.getState().moreDrawerRestorePending).toBe(false);

    TestRenderer.act(() => closeMoreDrawer());
    expect(useUiStore.getState()).toEqual(
      expect.objectContaining({
        moreDrawerScrollOffset: 0,
        moreDrawerRestorePending: false,
      }),
    );

    await TestRenderer.act(async () => renderer.unmount());
  });

  it('marks every navigated More child with the More entry source', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <ThemeProvider theme={createTheme('light')}>
          <MoreDrawerContent onRequestClose={jest.fn()} />
        </ThemeProvider>,
      );
      await Promise.resolve();
    });

    const expectedNavigations: Array<[string, string, unknown]> = [
      ['pet-manage', 'PetManagement', { entrySource: 'more' }],
      [
        'important-schedule',
        'ScheduleList',
        { petId: 'pet', entrySource: 'more' },
      ],
      [
        'memory-diary',
        'AppTabs',
        {
          screen: 'TimelineTab',
          params: {
            screen: 'TimelineMain',
            params: { mainCategory: 'all', entrySource: 'more' },
          },
        },
      ],
      [
        'health-report',
        'HealthReport',
        { petId: 'pet', initialTab: 'records', entrySource: 'more' },
      ],
      [
        'pet-activity-achievements',
        'PetActivityAchievements',
        { entrySource: 'more' },
      ],
      [
        'indoor-activities',
        'IndoorActivityRecommendations',
        { entrySource: 'more' },
      ],
      ['community', 'CommunityList', { entrySource: 'more' }],
      ['nuri-ranking', 'NuriRanking', { entrySource: 'more' }],
      ['tips', 'GuideList', { entrySource: 'more' }],
      ['walk-nearby', 'WalkSpotList', { entrySource: 'more' }],
      [
        'animal-hospital',
        'AnimalHospitalList',
        { entrySource: 'more' },
      ],
      [
        'user-notifications',
        'UserNotifications',
        { entrySource: 'more' },
      ],
      [
        'community-blocked-users',
        'CommunityBlockedUsers',
        { entrySource: 'more' },
      ],
      ['policy-center', 'PolicyCenter', { entrySource: 'more' }],
    ];

    for (const [entryId, routeName, params] of expectedNavigations) {
      mockNavigation.navigate.mockClear();
      TestRenderer.act(() => {
        renderer.root
          .findByProps({ testID: `more-entry-${entryId}` })
          .props.onPress();
      });
      expect(mockNavigation.navigate).toHaveBeenCalledWith(routeName, params);
    }

    await TestRenderer.act(async () => renderer.unmount());
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

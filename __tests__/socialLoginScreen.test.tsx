import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaView } from 'react-native-safe-area-context';
import fs from 'node:fs';
import path from 'node:path';
import SignInScreen from '../src/screens/Auth/SignInScreen';
import PremiumNoticeModal from '../src/components/common/PremiumNoticeModal';
import { styles } from '../src/screens/Auth/SignInScreen.styles';
import type { useAuthStore } from '../src/store/authStore';
import type { RouteSignInNotice } from '../src/services/auth/notices';
import type { SeasonKey } from '../src/theme/seasonal/season';

type AuthSlice = Pick<
  ReturnType<typeof useAuthStore.getState>,
  | 'accountDeletionGate'
  | 'passwordRecoveryFlow'
  | 'clearPasswordRecovery'
  | 'setAccountDeletionGate'
>;
const mockState: AuthSlice = {
  accountDeletionGate: null,
  passwordRecoveryFlow: { status: 'inactive', startedAt: null },
  clearPasswordRecovery: jest.fn(async () => {}),
  setAccountDeletionGate: jest.fn(),
};
const mockNavigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
};
let mockNotice: RouteSignInNotice | undefined;
let mockSeason: SeasonKey = 'autumn';
let mockRecentProvider: 'kakao' | 'google' | null = null;
let mockReady = true;
let mockTopInset = 24;
const mockClearSession = jest.fn(async () => {});
const mockGoogle = jest.fn(async () => {});
const mockKakao = jest.fn(async () => {});
const mockRestore = jest.fn(async (_requestId: string) => {});
const mockLogout = jest.fn(async () => ({ timedOut: false }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { notice: mockNotice } }),
  useFocusEffect: (callback: () => () => void) => {
    const ReactModule = jest.requireActual<typeof React>('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock('styled-components/native', () => ({
  useTheme: () => ({ colors: { brand: '#6750A4' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({
    top: mockTopInset,
    bottom: 24,
    left: 0,
    right: 0,
  }),
}));
jest.mock('../src/app/ui/AppText', () => 'AppText');
jest.mock(
  '../src/components/common/PremiumNoticeModal',
  () => 'PremiumNoticeModal',
);
jest.mock('../src/app/providers/SeasonPreferenceProvider', () => ({
  useEffectiveSeason: () => mockSeason,
}));
jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (state: AuthSlice) => unknown) =>
    selector(mockState),
}));
jest.mock('../src/store/uiStore', () => ({ showToast: jest.fn() }));
jest.mock('../src/services/auth/recentLoginProvider', () => ({
  getRecentLoginProvider: async () => mockRecentProvider,
}));
jest.mock('../src/services/auth/session', () => ({
  performLogout: () => mockLogout(),
}));
jest.mock('../src/services/app/errors', () => ({
  getBrandedErrorMeta: () => ({
    title: '오류',
    message: '다시 시도해 주세요.',
  }),
}));
jest.mock('../src/services/supabase/auth', () => ({
  clearLocalAuthSession: () => mockClearSession(),
  signInWithGoogle: () => mockGoogle(),
  signInWithKakao: () => mockKakao(),
  cancelAccountDeletion: (id: string) => mockRestore(id),
  getOAuthProviderLabel: (provider: string) => provider,
  getOAuthSignInUserMessage: () => '연결을 확인하고 다시 시도해 주세요.',
  isSocialOAuthProviderReleaseReady: () => mockReady,
}));
jest.mock('../src/utils/scheduleIdleTask', () => ({
  scheduleIdleTask: (task: () => void) => {
    task();
    return { cancel: jest.fn() };
  },
}));

describe('social-only seasonal login', () => {
  let renderer: TestRenderer.ReactTestRenderer;
  const render = async () => {
    await act(async () => {
      renderer = TestRenderer.create(<SignInScreen />);
    });
  };
  const button = (provider: string) =>
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.testID === `social-login-${provider}`)!;

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.accountDeletionGate = null;
    mockState.passwordRecoveryFlow = { status: 'inactive', startedAt: null };
    mockNotice = undefined;
    mockReady = true;
    mockSeason = 'autumn';
    mockTopInset = 24;
    mockRecentProvider = null;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    jest.restoreAllMocks();
  });

  it.each(['spring', 'summer', 'autumn', 'winter'] as const)(
    'renders %s without credential fields or duplicate logo text',
    async season => {
      mockSeason = season;
      await render();
      expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
      const hero = renderer.root
        .findAllByType(Image)
        .find(node => node.props.accessible);
      expect(hero?.props.accessibilityLabel).toContain(
        '누리. 함께한 순간을, 오래도록.',
      );
      expect(hero?.props.resizeMode).toBe('contain');
      const heroContainer = renderer.root
        .findAllByType(View)
        .find(node => node.props.testID === 'social-login-hero');
      expect(StyleSheet.flatten(heroContainer?.props.style).marginTop).toBe(-8);
      const imageStyle = StyleSheet.flatten(hero?.props.style);
      expect(StyleSheet.flatten(heroContainer?.props.style).height).toBeCloseTo(
        (imageStyle.width * 1350) / 836,
      );
      expect(imageStyle.width / imageStyle.height).toBeCloseTo(836 / 1881);
      expect(button('kakao').props.accessibilityLabel).toBe('카카오 로그인');
      expect(button('google').props.accessibilityLabel).toBe(
        'Google로 계속하기',
      );
      expect(renderer.root.findAllByType(Image)).toHaveLength(3);
      expect(mockGoogle).not.toHaveBeenCalled();
      expect(mockClearSession).not.toHaveBeenCalled();
    },
  );

  it.each(['google', 'kakao'])(
    'starts only %s and delegates the callback to existing auth ownership',
    async provider => {
      await render();
      await act(async () => button(provider).props.onPress());
      expect(mockState.clearPasswordRecovery).toHaveBeenCalledTimes(1);
      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(
        provider === 'google' ? mockGoogle : mockKakao,
      ).toHaveBeenCalledTimes(1);
      expect(
        provider === 'google' ? mockKakao : mockGoogle,
      ).not.toHaveBeenCalled();
      expect(mockNavigation.reset).not.toHaveBeenCalled();
    },
  );

  it('bundles the four aligned login images at the same original dimensions', () => {
    for (const file of [
      'autumn.png',
      'winter.png',
      'spring-aligned.png',
      'summer-aligned.png',
    ]) {
      const png = fs.readFileSync(
        path.join(process.cwd(), 'src/assets/seasonal/login/social', file),
      );
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(836);
      expect(png.readUInt32BE(20)).toBe(1881);
    }
  });

  it('locks both providers synchronously and retains the visible label while pending', async () => {
    let finish!: () => void;
    mockGoogle.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    await render();
    await act(async () => {
      button('google').props.onPress();
      button('kakao').props.onPress();
    });
    expect(mockGoogle).toHaveBeenCalledTimes(1);
    expect(mockKakao).not.toHaveBeenCalled();
    expect(button('google').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    expect(button('google').props.accessibilityLabel).toBe('Google로 계속하기');
    expect(button('kakao').props.disabled).toBe(true);
    await act(async () => finish());
    expect(button('google').props.disabled).toBe(false);
  });

  it('restores buttons on provider failure and allows retry', async () => {
    mockKakao.mockRejectedValueOnce(new Error('network'));
    await render();
    await act(async () => button('kakao').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith(
      'kakao 로그인',
      '연결을 확인하고 다시 시도해 주세요.',
    );
    expect(button('kakao').props.disabled).toBe(false);
    await act(async () => button('kakao').props.onPress());
    expect(mockKakao).toHaveBeenCalledTimes(2);
  });

  it('keeps recent provider information and both policy routes', async () => {
    mockRecentProvider = 'google';
    await render();
    expect(button('google').props.accessibilityHint).toBe(
      '최근 로그인한 계정입니다.',
    );
    const recentSlot = button('google')
      .findAllByType(View)
      .find(node => node.props.style === styles.buttonTrailingSpace);
    expect(
      recentSlot?.findByProps({ testID: 'social-login-google-recent' }),
    ).toBeDefined();
    expect(StyleSheet.flatten(styles.buttonTrailingSpace)).toMatchObject({
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'center',
    });
    expect(styles.buttonLeading.flex).toBe(styles.buttonTrailingSpace.flex);
    const links = renderer.root
      .findAllByType(TouchableOpacity)
      .filter(node => node.props.accessibilityRole === 'link');
    expect(links).toHaveLength(2);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('계속 진행하면');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('동의한 것으로');
    await act(async () => {
      links[0].props.onPress();
      links[1].props.onPress();
    });
    expect(mockNavigation.navigate.mock.calls).toEqual([
      ['PolicyDetail', { documentId: 'terms' }],
      ['PolicyDetail', { documentId: 'privacy' }],
    ]);
  });

  it('respects provider release gates without silently exposing email auth', async () => {
    mockReady = false;
    await render();
    expect(
      renderer.root
        .findAllByType(TouchableOpacity)
        .filter(node => node.props.accessibilityRole === 'button'),
    ).toHaveLength(0);
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      '현재 사용할 수 있는 로그인 방식이 없습니다.',
    );
  });

  it.each([
    'logout-success',
    'account-deletion-success',
    'password-reset-success',
  ] as const)(
    'closes %s notice without focusing a removed field',
    async notice => {
      mockNotice = notice;
      await render();
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        notice: undefined,
      });
      await act(async () =>
        renderer.root.findByType(PremiumNoticeModal).props.onConfirm(),
      );
      expect(renderer.root.findAllByType(PremiumNoticeModal)).toHaveLength(0);
    },
  );

  it('retains account recovery and blocks social login behind the gate', async () => {
    mockState.accountDeletionGate = {
      requestId: 'local-fixture',
      userId: 'qa',
      status: 'pending_grace_period',
      requestedAt: null,
      scheduledDeletionAt: '2026-10-16T00:00:00Z',
      canRestore: true,
    };
    await render();
    await act(async () => button('google').props.onPress());
    expect(mockGoogle).not.toHaveBeenCalled();
    const modal = renderer.root.findByType(PremiumNoticeModal);
    await act(async () => {
      modal.props.onConfirm();
      modal.props.onConfirm();
    });
    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(mockRestore).toHaveBeenCalledWith('local-fixture');
    expect(mockState.setAccountDeletionGate).toHaveBeenCalledWith(null);
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Splash' }],
    });
  });

  it('keeps flexible control heights and a scrollable fallback for large fonts', async () => {
    await render();
    expect(
      StyleSheet.flatten(
        renderer.root.findByType(ScrollView).props.contentContainerStyle,
      ),
    ).toEqual({ ...styles.scrollContent, paddingTop: 0 });
    expect(StyleSheet.flatten(styles.socialButton)).toMatchObject({
      minHeight: 52,
    });
    expect(StyleSheet.flatten(styles.socialButton)).not.toHaveProperty(
      'height',
    );
    expect(StyleSheet.flatten(styles.legalLink)).toMatchObject({
      minHeight: 48,
    });
    expect(StyleSheet.flatten(styles.buttonCopy)).toMatchObject({
      flex: 3,
      minWidth: 0,
    });
    expect(styles.actions.justifyContent).toBe('flex-start');
    expect(styles.actions.paddingTop).toBe(8);
  });

  it.each([0, 24, 56])(
    'reduces only the shared top spacing for a %i dp inset',
    async topInset => {
      mockTopInset = topInset;
      await render();
      expect(renderer.root.findByType(SafeAreaView).props.edges).toEqual([
        'left',
        'right',
        'bottom',
      ]);
      const scroll = renderer.root.findByType(ScrollView);
      expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toEqual({
        ...styles.scrollContent,
        paddingTop: Math.max(0, topInset - 32),
      });
      const content = scroll
        .findAllByType(View)
        .filter(
          child =>
            child.props.testID === 'social-login-hero' ||
            child.props.testID === 'social-login-actions',
        );
      expect(content.map(child => child.props.testID)).toEqual([
        'social-login-hero',
        'social-login-actions',
      ]);
      expect(content[0].parent).toBe(content[1].parent);
      expect(StyleSheet.flatten(content[0].props.style).marginTop).toBe(-8);
      const statusBar = renderer.root.findByProps({
        testID: 'social-login-status-bar-background',
      });
      expect(StyleSheet.flatten(statusBar.props.style)).toMatchObject({
        position: 'absolute',
        top: 0,
        backgroundColor: '#FFFFFF',
        height: topInset,
      });
      expect(statusBar.props.pointerEvents).toBe('none');
      expect(statusBar.props.accessible).toBe(false);
      expect(
        scroll.findAllByProps({
          testID: 'social-login-status-bar-background',
        }),
      ).toHaveLength(0);
    },
  );

  it('removes the SignUp route and screen but preserves social onboarding and recovery routes', () => {
    const root = fs.readFileSync(
      path.join(process.cwd(), 'src/navigation/RootNavigator.tsx'),
      'utf8',
    );
    expect(root).not.toMatch(/\bSignUp\b|SignUpScreen/);
    expect(root).toContain('name="NicknameSetup"');
    expect(root).toContain('name="PasswordResetRecovery"');
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'src/screens/Auth/SignUpScreen.tsx'),
      ),
    ).toBe(false);
  });
});

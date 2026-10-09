// Social entry only. OAuth callbacks and onboarding remain owned by the auth bootstrap.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import AppText from '../../app/ui/AppText';
import { useEffectiveSeason } from '../../app/providers/SeasonPreferenceProvider';
import PremiumNoticeModal from '../../components/common/PremiumNoticeModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getBrandedErrorMeta } from '../../services/app/errors';
import { performLogout } from '../../services/auth/session';
import {
  resolveSignInNotice,
  type RouteSignInNotice,
} from '../../services/auth/notices';
import {
  getRecentLoginProvider,
  type RecentLoginProvider,
} from '../../services/auth/recentLoginProvider';
import {
  cancelAccountDeletion,
  clearLocalAuthSession,
  getOAuthProviderLabel,
  getOAuthSignInUserMessage,
  isSocialOAuthProviderReleaseReady,
  signInWithGoogle,
  signInWithKakao,
  type SocialOAuthProvider,
} from '../../services/supabase/auth';
import type { LegalDocumentId } from '../../services/legal/documents';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../store/uiStore';
import { getKstDateParts } from '../../utils/date';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import {
  getSeasonalLoginVisual,
  getSocialLoginLayout,
} from '../../theme/seasonal/login';
import { styles } from './SignInScreen.styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SignInRoute = RouteProp<RootStackParamList, 'SignIn'>;

const PROVIDERS = {
  kakao: {
    label: '카카오 로그인',
    source: require('../../assets/auth/providers/kakao-symbol.png'),
  },
  google: {
    label: 'Google로 계속하기',
    source: require('../../assets/auth/providers/google-g.png'),
  },
} as const;

const SocialButton = memo(function SocialButtonContent({
  provider,
  busy,
  disabled,
  recent,
  onPress,
}: {
  provider: SocialOAuthProvider;
  busy: boolean;
  disabled: boolean;
  recent: boolean;
  onPress: (provider: SocialOAuthProvider) => void;
}) {
  const config = PROVIDERS[provider];
  return (
    <TouchableOpacity
      testID={`social-login-${provider}`}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityHint={recent ? '최근 로그인한 계정입니다.' : undefined}
      accessibilityState={{ disabled, busy }}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onPress(provider)}
      style={[
        styles.socialButton,
        provider === 'kakao' ? styles.kakaoButton : styles.googleButton,
        disabled && !busy ? styles.disabledButton : null,
      ]}
    >
      <View style={styles.buttonLeading}>
        <Image
          accessible={false}
          source={config.source}
          resizeMode="contain"
          style={styles.providerIcon}
        />
      </View>
      <View style={styles.buttonCopy}>
        <AppText
          preset="unifiedLabel"
          styleOverridesPreset
          style={[
            styles.buttonLabel,
            provider === 'kakao' ? styles.kakaoLabel : null,
          ]}
        >
          {config.label}
        </AppText>
      </View>
      <View style={styles.buttonTrailingSpace}>
        {busy ? (
          <ActivityIndicator size="small" color="#1F1F1F" />
        ) : recent ? (
          <AppText
            testID={`social-login-${provider}-recent`}
            preset="caption"
            styleOverridesPreset
            style={styles.recentLabel}
          >
            최근 로그인
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

function formatScheduledDeletionDate(value: string | null) {
  const parts = getKstDateParts(value);
  if (!parts) return '-';
  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(
    parts.day,
  ).padStart(2, '0')}`;
}

export default function SignInScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SignInRoute>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const season = useEffectiveSeason();
  const visual = getSeasonalLoginVisual(season);
  // The image has a plain top band. Keep the shared PO-approved placement while
  // a fixed background protects the status bar when short screens need scrolling.
  const topSpacing = Math.max(0, insets.top - 32);
  const layout = getSocialLoginLayout(
    Math.max(0, viewport.width - insets.left - insets.right),
    Math.max(0, viewport.height - topSpacing - insets.bottom),
  );
  const setAccountDeletionGate = useAuthStore(s => s.setAccountDeletionGate);
  const clearPasswordRecovery = useAuthStore(s => s.clearPasswordRecovery);
  const passwordRecoveryStatus = useAuthStore(
    s => s.passwordRecoveryFlow.status,
  );
  const accountDeletionGate = useAuthStore(s => s.accountDeletionGate);
  const [oauthSubmitting, setOauthSubmitting] =
    useState<SocialOAuthProvider | null>(null);
  const [recoverySubmitting, setRecoverySubmitting] = useState<
    'restore' | 'logout' | null
  >(null);
  const [activeNotice, setActiveNotice] = useState<RouteSignInNotice | null>(
    null,
  );
  const [recentProvider, setRecentProvider] =
    useState<RecentLoginProvider | null>(null);
  const submittingRef = useRef(false);
  const recoveryLock = useRef(false);
  const mountedRef = useRef(true);
  const showKakao = isSocialOAuthProviderReleaseReady('kakao');
  const showGoogle = isSocialOAuthProviderReleaseReady('google');
  const socialDisabled = !!oauthSubmitting || !!accountDeletionGate;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getRecentLoginProvider()
        .then(provider => {
          if (alive) setRecentProvider(provider);
        })
        .catch(() => {
          if (alive) setRecentProvider(null);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const onSocialPress = useCallback(
    async (provider: SocialOAuthProvider) => {
      // The ref also blocks taps arriving before React commits the disabled state.
      if (
        submittingRef.current ||
        accountDeletionGate ||
        !isSocialOAuthProviderReleaseReady(provider)
      )
        return;
      submittingRef.current = true;
      setOauthSubmitting(provider);
      setActiveNotice(null);
      try {
        await clearPasswordRecovery();
        await clearLocalAuthSession();
        if (provider === 'google') await signInWithGoogle();
        else await signInWithKakao();
      } catch (error: unknown) {
        if (mountedRef.current) {
          Alert.alert(
            `${getOAuthProviderLabel(provider)} 로그인`,
            getOAuthSignInUserMessage(error),
          );
        }
      } finally {
        submittingRef.current = false;
        if (mountedRef.current) setOauthSubmitting(null);
      }
    },
    [accountDeletionGate, clearPasswordRecovery],
  );

  useEffect(() => {
    if (passwordRecoveryStatus !== 'active') return;
    clearPasswordRecovery()
      .then(() => clearLocalAuthSession())
      .catch(() => {});
  }, [clearPasswordRecovery, passwordRecoveryStatus]);

  useEffect(() => {
    const notice = route.params?.notice;
    if (
      notice !== 'password-reset-success' &&
      notice !== 'logout-success' &&
      notice !== 'account-deletion-success'
    )
      return;
    const task = scheduleIdleTask(() => {
      setActiveNotice(notice);
      navigation.setParams({ notice: undefined });
    });
    return () => task.cancel();
  }, [navigation, route.params?.notice]);

  const onPressLegalDocument = (documentId: LegalDocumentId) => {
    navigation.navigate('PolicyDetail', { documentId });
  };
  const closeNotice = () => setActiveNotice(null);
  const noticeConfig = activeNotice ? resolveSignInNotice(activeNotice) : null;
  const scheduledDeletionLabel = formatScheduledDeletionDate(
    accountDeletionGate?.scheduledDeletionAt ?? null,
  );

  const handleAccountRecovery = async () => {
    if (!accountDeletionGate || recoveryLock.current) return;
    recoveryLock.current = true;
    setRecoverySubmitting('restore');
    try {
      await cancelAccountDeletion(accountDeletionGate.requestId);
      setAccountDeletionGate(null);
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'account-delete');
      Alert.alert(title, message);
    } finally {
      recoveryLock.current = false;
      if (mountedRef.current) setRecoverySubmitting(null);
    }
  };

  const handleGateLogout = async () => {
    if (recoveryLock.current) return;
    recoveryLock.current = true;
    setRecoverySubmitting('logout');
    try {
      const result = await performLogout(1200);
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
      if (result.timedOut) {
        showToast({
          tone: 'info',
          title: '세션 정리 진행 중',
          message:
            '이 기기에서는 바로 로그아웃되었고 서버 세션 정리는 잠시 이어질 수 있어요.',
        });
      }
    } catch (error) {
      const { title, message } = getBrandedErrorMeta(error, 'logout');
      Alert.alert(title, message);
    } finally {
      recoveryLock.current = false;
      if (mountedRef.current) setRecoverySubmitting(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topSpacing },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View
          testID="social-login-hero"
          style={[styles.hero, { height: layout.heroHeight }]}
        >
          <Image
            accessible
            accessibilityRole="image"
            accessibilityLabel={visual.accessibilityLabel}
            source={visual.source}
            resizeMode="contain"
            style={{ width: layout.imageWidth, height: layout.imageHeight }}
          />
        </View>
        <View
          testID="social-login-actions"
          style={[styles.actions, { minHeight: layout.actionsMinHeight }]}
        >
          {showKakao ? (
            <SocialButton
              provider="kakao"
              busy={oauthSubmitting === 'kakao'}
              disabled={socialDisabled}
              recent={recentProvider === 'kakao'}
              onPress={onSocialPress}
            />
          ) : null}
          {showGoogle ? (
            <SocialButton
              provider="google"
              busy={oauthSubmitting === 'google'}
              disabled={socialDisabled}
              recent={recentProvider === 'google'}
              onPress={onSocialPress}
            />
          ) : null}
          {!showKakao && !showGoogle ? (
            <AppText style={styles.unavailableText}>
              현재 사용할 수 있는 로그인 방식이 없습니다.
            </AppText>
          ) : null}
          <View style={styles.legal}>
            <View style={styles.legalLinks}>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => onPressLegalDocument('terms')}
                style={styles.legalLink}
              >
                <AppText
                  preset="caption"
                  styleOverridesPreset
                  style={styles.legalLinkText}
                >
                  이용약관
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => onPressLegalDocument('privacy')}
                style={styles.legalLink}
              >
                <AppText
                  preset="caption"
                  styleOverridesPreset
                  style={styles.legalLinkText}
                >
                  개인정보처리방침
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <View
        testID="social-login-status-bar-background"
        pointerEvents="none"
        accessible={false}
        style={[styles.statusBarBackground, { height: insets.top }]}
      />
      {noticeConfig && !accountDeletionGate ? (
        <PremiumNoticeModal
          visible
          typographyMode="unified"
          eyebrow={noticeConfig.eyebrow}
          iconName={noticeConfig.iconName}
          titleLines={noticeConfig.titleLines}
          bodyLines={noticeConfig.bodyLines}
          confirmLabel={noticeConfig.confirmLabel}
          accentColor={theme.colors.brand}
          onClose={closeNotice}
          onConfirm={closeNotice}
        />
      ) : null}
      {accountDeletionGate ? (
        <PremiumNoticeModal
          visible
          typographyMode="unified"
          eyebrow="ACCOUNT RECOVERY"
          iconName="user-plus"
          titleLines={['잠시만요! 계정 삭제가 진행 중이에요']}
          bodyLines={[
            `현재 계정은 삭제 대기 상태입니다. (삭제 예정일: ${scheduledDeletionLabel})`,
            '다시 찾아주셔서 정말 반가워요! 계정을 복구하고 NURI와 계속 함께하시겠어요?',
          ]}
          confirmLabel={
            recoverySubmitting === 'restore' ? '복구 중' : '계정 복구하기'
          }
          confirmAccessibilityHint="두 번 탭하면 계정 삭제를 취소하고 앱으로 돌아갑니다."
          accentColor={theme.colors.brand}
          secondaryActions={[
            {
              label:
                recoverySubmitting === 'logout' ? '로그아웃 중' : '로그아웃',
              onPress: handleGateLogout,
            },
          ]}
          onClose={() => {}}
          onConfirm={handleAccountRecovery}
        />
      ) : null}
    </SafeAreaView>
  );
}

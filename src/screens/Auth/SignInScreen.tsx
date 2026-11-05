// Social entry only. OAuth callbacks and onboarding remain owned by the auth bootstrap.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NuriAlert as Alert } from '../../app/ui/NuriAlert';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'styled-components/native';

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
import SocialLoginSurface from './SocialLoginSurface';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SignInRoute = RouteProp<RootStackParamList, 'SignIn'>;

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
    <SocialLoginSurface
      busyProvider={oauthSubmitting}
      recentProvider={recentProvider}
      disabled={socialDisabled}
      onProviderPress={onSocialPress}
      onLegalPress={onPressLegalDocument}
    >
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
    </SocialLoginSurface>
  );
}
